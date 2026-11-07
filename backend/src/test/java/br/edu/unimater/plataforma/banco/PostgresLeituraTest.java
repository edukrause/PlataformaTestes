package br.edu.unimater.plataforma.banco;

import br.edu.unimater.plataforma.api.ErroApi;
import java.math.BigDecimal;
import java.sql.*;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import static org.assertj.core.api.Assertions.*;

/** Banco descartável, sempre dedicado aos testes. Nunca apontar essas variáveis para homologação. */
@EnabledIfEnvironmentVariable(named = "PLATAFORMA_TEST_PG_URL", matches = ".+")
class PostgresLeituraTest {
    private static final String URL = System.getenv("PLATAFORMA_TEST_PG_URL");
    private static final String ADMIN = System.getenv().getOrDefault("PLATAFORMA_TEST_PG_ADMIN", "postgres");
    private static final String SENHA = System.getenv().getOrDefault("PLATAFORMA_TEST_PG_SENHA", "teste-local");
    private static final String SUFIXO = UUID.randomUUID().toString().replace("-", "");
    private static final String SCHEMA = "teste_apuracao_" + SUFIXO;
    private static final String PAPEL = "leitura_" + SUFIXO;
    private static boolean schemaCriado, papelCriado;

    @BeforeAll static void prepararBancoDescartavel() throws Exception {
        try (var conn = DriverManager.getConnection(URL, ADMIN, SENHA); var stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA " + SCHEMA);
            schemaCriado = true;
            stmt.execute("CREATE ROLE " + PAPEL + " LOGIN PASSWORD 'teste-leitura'");
            papelCriado = true;
            stmt.execute(sql("CREATE TABLE teste_apuracao.produto(id integer, preco numeric(12, 3), nome text, dia date, instante timestamptz)"));
            stmt.execute(sql("INSERT INTO teste_apuracao.produto VALUES (0,12.345,NULL,'2026-11-06','2026-11-06 15:00:00-03'),(1,1.200,'Produto B',NULL,NULL),(2,3.000,'Produto C',NULL,NULL)"));
            stmt.execute("GRANT USAGE ON SCHEMA " + SCHEMA + " TO " + PAPEL);
            stmt.execute("GRANT SELECT ON ALL TABLES IN SCHEMA " + SCHEMA + " TO " + PAPEL);
        }
    }

    private PostgresLeituraGateway banco(int linhas, int timeout, int caracteres) {
        return new PostgresLeituraGateway(new PostgresProperties(true, URL, PAPEL, "teste-leitura", timeout, linhas, caracteres));
    }

    private static String sql(String consulta) { return consulta.replace("teste_apuracao.", SCHEMA + "."); }

    @AfterAll static void limparApenasFixturesCriadas() throws Exception {
        try (var conn = DriverManager.getConnection(URL, ADMIN, SENHA); var stmt = conn.createStatement()) {
            if (schemaCriado) stmt.execute("DROP SCHEMA " + SCHEMA + " CASCADE");
            if (papelCriado) stmt.execute("DROP ROLE " + PAPEL);
        }
    }

    @Test void retornaTiposNulosEAliasesEmConsultaReal() {
        var service = new ConsultaBancoService(new VerificadorSql(), banco(10, 5, 10000));
        var resultado = service.consultar(sql("SELECT id, preco, nome, dia, instante FROM teste_apuracao.produto ORDER BY id"));
        assertThat(resultado.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.VALIDO);
        assertThat(resultado.linhas()).hasSize(3);
        assertThat(resultado.linhas().getFirst().get(1)).isEqualTo(new BigDecimal("12.345"));
        assertThat(resultado.linhas().getFirst().get(2)).isNull();
        assertThat(resultado.linhas().getFirst().get(3).toString()).isEqualTo("2026-11-06");
        assertThat(resultado.linhas().getFirst().get(4).toString()).contains("18:00");
        assertThat(resultado.colunas().get(1).escala()).isEqualTo(3);
    }

    @Test void descartaResultadoInteiroQuandoExcedeLimite() {
        var resultado = banco(2, 5, 10000).consultar(sql("SELECT id FROM teste_apuracao.produto"));
        assertThat(resultado.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.LIMITE_EXCEDIDO);
        assertThat(resultado.linhas()).isEmpty();
        assertThat(banco(3, 5, 10000).consultar(sql("SELECT id FROM teste_apuracao.produto")).linhas()).hasSize(3);
        assertThat(banco(3, 5, 1024).consultar("SELECT repeat('x', 1025)").verificacao())
                .isEqualTo(ConsultaBancoGateway.Verificacao.LIMITE_EXCEDIDO);
    }

    @Test void distingueVazioPlanoInvalidoEErroDeExecucao() {
        var banco = banco(10, 5, 10000);
        assertThat(banco.consultar(sql("SELECT id FROM teste_apuracao.produto WHERE false")).verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.VAZIO);
        var invalido = banco.consultar(sql("SELECT senha FROM teste_apuracao.nao_existe"));
        assertThat(invalido.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.ERRO_EXPLAIN);
        assertThat(invalido.mensagemErro()).doesNotContain("senha", "nao_existe", "teste-leitura");
        assertThat(banco.consultar(sql("SELECT 1 / id FROM teste_apuracao.produto")).verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.ERRO_EXECUCAO);
    }

    @Test void bancoBloqueiaEscritaMesmoSemPassarPeloParser() throws Exception {
        var resultado = banco(10, 5, 10000).consultar(sql("DELETE FROM teste_apuracao.produto RETURNING id"));
        assertThat(resultado.verificacao()).isIn(ConsultaBancoGateway.Verificacao.ERRO_EXPLAIN, ConsultaBancoGateway.Verificacao.ERRO_EXECUCAO);
        try (var conn = DriverManager.getConnection(URL, ADMIN, SENHA); var stmt = conn.createStatement();
             var rs = stmt.executeQuery(sql("SELECT COUNT(*) FROM teste_apuracao.produto"))) {
            rs.next();
            assertThat(rs.getInt(1)).isEqualTo(3);
        }
    }

    @Test void cancelaConsultaLenta() {
        var resultado = banco(10, 1, 10000).consultar("SELECT pg_sleep(2)");
        assertThat(resultado.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.ERRO_EXECUCAO);
        assertThat(resultado.mensagemErro()).contains("limite de tempo");
    }

    @Test void flutuantesNaoRecebemEscalaDeInteiro() {
        var resultado = new ConsultaBancoService(new VerificadorSql(), banco(10, 5, 10000))
                .consultar("SELECT CAST(12.34 AS double precision) AS valor");
        assertThat(resultado.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.VALIDO);
        assertThat(resultado.colunas().getFirst().escala()).isEqualTo(-1);
        assertThat(resultado.linhas().getFirst().getFirst()).isEqualTo(12.34d);
    }

    @Test void recusaSuperusuarioEDesativado() {
        var admin = new PostgresLeituraGateway(new PostgresProperties(true, URL, ADMIN, SENHA, 5, 10, 10000));
        assertThatThrownBy(() -> admin.consultar("SELECT 1")).isInstanceOf(ErroApi.class).hasMessageContaining("superusuário");
        var desativado = new PostgresLeituraGateway(new PostgresProperties(false, "", "", "", 5, 10, 10000));
        assertThatThrownBy(() -> desativado.consultar("SELECT 1")).isInstanceOf(ErroApi.class).hasMessageContaining("desativada");
    }
}
