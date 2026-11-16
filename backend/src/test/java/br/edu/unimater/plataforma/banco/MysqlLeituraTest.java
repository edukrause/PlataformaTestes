package br.edu.unimater.plataforma.banco;

import br.edu.unimater.plataforma.api.ErroApi;
import java.math.BigDecimal;
import java.sql.*;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import static org.assertj.core.api.Assertions.*;

/** Servidor MySQL descartável, dedicado aos testes. Nunca apontar essas variáveis para homologação. */
@EnabledIfEnvironmentVariable(named = "PLATAFORMA_TEST_MYSQL_URL", matches = ".+")
class MysqlLeituraTest {
    // URL do servidor, sem banco: jdbc:mysql://127.0.0.1:3306/
    private static final String SERVIDOR = System.getenv("PLATAFORMA_TEST_MYSQL_URL");
    private static final String ADMIN = System.getenv().getOrDefault("PLATAFORMA_TEST_MYSQL_ADMIN", "root");
    private static final String SENHA = System.getenv().getOrDefault("PLATAFORMA_TEST_MYSQL_SENHA", "teste-local");
    private static final String SUFIXO = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    private static final String BANCO = "teste_apuracao_" + SUFIXO;
    private static final String USUARIO = "leitura_" + SUFIXO;
    private static final String ESCRITA = "escrita_" + SUFIXO;
    private static boolean bancoCriado, usuariosCriados;

    private static Connection admin() throws SQLException { return DriverManager.getConnection(SERVIDOR, ADMIN, SENHA); }
    private static String url() { return SERVIDOR.replaceAll("/[^/]*$", "/") + BANCO; }

    @BeforeAll static void prepararBancoDescartavel() throws Exception {
        try (var conn = admin(); var stmt = conn.createStatement()) {
            stmt.execute("SET time_zone = '+00:00'");
            stmt.execute("CREATE DATABASE " + BANCO);
            bancoCriado = true;
            stmt.execute("CREATE USER '" + USUARIO + "'@'%' IDENTIFIED BY 'teste-leitura'");
            stmt.execute("CREATE USER '" + ESCRITA + "'@'%' IDENTIFIED BY 'teste-escrita'");
            usuariosCriados = true;
            stmt.execute(sql("CREATE TABLE teste_apuracao.produto(id int, preco decimal(12,3), nome varchar(40), dia date, instante timestamp NULL, ativo tinyint(1))"));
            stmt.execute(sql("INSERT INTO teste_apuracao.produto VALUES (0,12.345,NULL,'2026-11-06','2026-11-06 18:00:00',1),(1,1.200,'Produto B',NULL,NULL,0),(2,3.000,'Produto C',NULL,NULL,1)"));
            stmt.execute(sql("CREATE TABLE teste_apuracao.categoria(empresa int, codigo int, PRIMARY KEY(empresa,codigo))"));
            stmt.execute(sql("CREATE TABLE teste_apuracao.item(categoria_codigo int, empresa int, FOREIGN KEY(empresa,categoria_codigo) REFERENCES teste_apuracao.categoria(empresa,codigo))"));
            stmt.execute(sql("CREATE TABLE teste_apuracao.restrita(segredo text)"));
            for (String tabela : new String[] {"produto", "categoria", "item"})
                stmt.execute("GRANT SELECT ON " + BANCO + "." + tabela + " TO '" + USUARIO + "'@'%'");
            stmt.execute("GRANT SELECT, INSERT ON " + BANCO + ".* TO '" + ESCRITA + "'@'%'");
        }
    }

    @AfterAll static void limparApenasFixturesCriadas() throws Exception {
        try (var conn = admin(); var stmt = conn.createStatement()) {
            if (bancoCriado) stmt.execute("DROP DATABASE " + BANCO);
            if (usuariosCriados) {
                stmt.execute("DROP USER '" + USUARIO + "'@'%'");
                stmt.execute("DROP USER '" + ESCRITA + "'@'%'");
            }
        }
    }

    private static String sql(String consulta) { return consulta.replace("teste_apuracao.", BANCO + "."); }
    private MysqlLeituraGateway banco(int linhas, int timeout, int caracteres) {
        return new MysqlLeituraGateway(new MysqlProperties(true, url(), USUARIO, "teste-leitura", timeout, linhas, caracteres));
    }

    @Test void retornaTiposNulosEAliasesEmConsultaReal() {
        var service = new ConsultaBancoService(new VerificadorSql(Dialeto.MYSQL), banco(10, 5, 10000));
        var resultado = service.consultar(sql("SELECT `id`, preco AS valor, nome, dia, instante, ativo FROM teste_apuracao.produto ORDER BY id"));
        assertThat(resultado.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.VALIDO);
        assertThat(resultado.linhas()).hasSize(3);
        assertThat(resultado.linhas().getFirst().get(1)).isEqualTo(new BigDecimal("12.345"));
        assertThat(resultado.linhas().getFirst().get(2)).isNull();
        assertThat(resultado.linhas().getFirst().get(3).toString()).isEqualTo("2026-11-06");
        assertThat(resultado.linhas().getFirst().get(4).toString()).isEqualTo("2026-11-06T18:00");
        assertThat(resultado.linhas().getFirst().get(5)).isEqualTo(true);
        assertThat(resultado.colunas().get(1).nome()).isEqualTo("valor");
        assertThat(resultado.colunas().get(1).escala()).isEqualTo(3);
    }

    @Test void descartaResultadoInteiroQuandoExcedeLimite() {
        var resultado = banco(2, 5, 10000).consultar(sql("SELECT id FROM teste_apuracao.produto"));
        assertThat(resultado.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.LIMITE_EXCEDIDO);
        assertThat(resultado.linhas()).isEmpty();
        assertThat(banco(3, 5, 10000).consultar(sql("SELECT id FROM teste_apuracao.produto")).linhas()).hasSize(3);
        assertThat(banco(3, 5, 1024).consultar("SELECT REPEAT('x', 1025)").verificacao())
                .isEqualTo(ConsultaBancoGateway.Verificacao.LIMITE_EXCEDIDO);
    }

    @Test void distingueVazioPlanoInvalidoEErroDeExecucao() {
        var banco = banco(10, 5, 10000);
        assertThat(banco.consultar(sql("SELECT id FROM teste_apuracao.produto WHERE 1 = 0")).verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.VAZIO);
        var invalido = banco.consultar(sql("SELECT senha FROM teste_apuracao.nao_existe"));
        assertThat(invalido.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.ERRO_EXPLAIN);
        assertThat(invalido.mensagemErro()).doesNotContain("senha", "nao_existe", "teste-leitura");
        var semPermissao = banco.consultar(sql("SELECT segredo FROM teste_apuracao.restrita"));
        assertThat(semPermissao.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.ERRO_EXPLAIN);
    }

    @Test void transacaoBloqueiaEscritaMesmoSemPassarPeloParser() throws Exception {
        var resultado = new MysqlLeituraGateway(new MysqlProperties(true, url(), USUARIO, "teste-leitura", 5, 10, 10000))
                .consultar(sql("DELETE FROM teste_apuracao.produto"));
        assertThat(resultado.verificacao()).isIn(ConsultaBancoGateway.Verificacao.ERRO_EXPLAIN, ConsultaBancoGateway.Verificacao.ERRO_EXECUCAO);
        try (var conn = admin(); var stmt = conn.createStatement(); var rs = stmt.executeQuery(sql("SELECT COUNT(*) FROM teste_apuracao.produto"))) {
            rs.next();
            assertThat(rs.getInt(1)).isEqualTo(3);
        }
    }

    @Test void cancelaConsultaLenta() {
        var resultado = banco(10, 1, 10000).consultar(sql("SELECT SLEEP(3) FROM teste_apuracao.produto"));
        assertThat(resultado.verificacao()).isIn(ConsultaBancoGateway.Verificacao.ERRO_EXECUCAO, ConsultaBancoGateway.Verificacao.VALIDO);
        if (resultado.verificacao() == ConsultaBancoGateway.Verificacao.ERRO_EXECUCAO)
            assertThat(resultado.mensagemErro()).contains("limite de tempo");
        else // SLEEP interrompido por max_execution_time devolve 1 em vez de erro, conforme a versão do servidor.
            assertThat(resultado.latenciaMs()).isLessThan(8000);
    }

    @Test void recusaContaComPrivilegioDeEscritaEDesativado() {
        var escrita = new MysqlLeituraGateway(new MysqlProperties(true, url(), ESCRITA, "teste-escrita", 5, 10, 10000));
        assertThatThrownBy(() -> escrita.consultar("SELECT 1")).isInstanceOf(ErroApi.class).hasMessageContaining("somente com SELECT");
        var desativado = new MysqlLeituraGateway(new MysqlProperties(false, "", "", "", 5, 10, 10000));
        assertThatThrownBy(() -> desativado.consultar("SELECT 1")).isInstanceOf(ErroApi.class).hasMessageContaining("desativada");
    }

    @Test void catalogoRespeitaPermissoesEPreservaParesDeChaveComposta() {
        var service = new CatalogoService(banco(1000, 5, 100000),
                new CatalogoProperties(java.util.List.of(BANCO), java.util.List.of(BANCO + ".produto.nome"), 2, 10, 1), 0, Dialeto.MYSQL);
        var catalogo = service.obter();
        assertThat(catalogo.tabelas()).extracting(CatalogoService.Tabela::nome).contains("produto", "categoria", "item").doesNotContain("restrita");
        assertThat(catalogo.relacionamentos()).containsExactlyInAnyOrder(
                new CatalogoService.Relacao(BANCO + ".item", "empresa", BANCO + ".categoria", "empresa"),
                new CatalogoService.Relacao(BANCO + ".item", "categoria_codigo", BANCO + ".categoria", "codigo"));
        assertThat(service.selecionar("item").tabelas()).extracting(CatalogoService.Tabela::nome).containsExactlyInAnyOrder("item", "categoria");
        var amostra = service.amostrar(BANCO, "produto", "nome");
        assertThat(amostra.verificacao()).isEqualTo(ConsultaBancoGateway.Verificacao.VALIDO);
        assertThat(amostra.linhas()).hasSize(2).allSatisfy(l -> assertThat(l.getFirst()).isNotNull());
    }
}
