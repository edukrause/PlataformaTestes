package br.edu.unimater.plataforma.banco;

import br.edu.unimater.plataforma.api.ErroApi;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class VerificadorSqlTest {
    private final VerificadorSql verificador = new VerificadorSql();

    @ParameterizedTest
    @ValueSource(strings = {
            "SELECT 1", "select sum(preco) AS total from public.produto", "SELECT NULL, 'DELETE; UPDATE' AS texto",
            "WITH totais AS (SELECT sum(preco) AS total FROM public.produto) SELECT total FROM totais",
            "SELECT * FROM (SELECT id FROM public.produto) p WHERE id IN (SELECT id FROM public.produto)",
            "SELECT id FROM public.produto UNION ALL SELECT id FROM public.produto",
            "SELECT round(CAST(preco AS numeric(10, 2)), 2) FROM public.produto",
            "SELECT pg_catalog.sum(preco) FROM public.produto", "SELECT 1; -- comentário final",
            "SELECT count(*) FILTER (WHERE ativo) FROM public.produto"
    })
    void aceitaSubconjuntoDeLeitura(String sql) {
        assertThat(verificador.validar(sql)).isNotBlank();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "DELETE FROM public.produto", "INSERT INTO public.produto VALUES (1)", "UPDATE public.produto SET id=1",
            "SELECT 1; DELETE FROM public.produto", "SELECT 1; SELECT 2", "SELECT * INTO copia FROM public.produto",
            "SELECT * FROM public.produto FOR UPDATE", "SELECT * FROM public.produto FOR SHARE",
            "WITH apagados AS (DELETE FROM public.produto RETURNING *) SELECT * FROM apagados",
            "WITH novos AS (INSERT INTO public.produto VALUES (1) RETURNING *) SELECT * FROM novos",
            "SELECT set_config('transaction_read_only', 'off', true)", "SELECT pg_sleep(60)",
            "SELECT nextval('sequencia')", "SELECT pg_catalog.pg_advisory_lock(1)",
            "SELECT public.sum(preco) FROM public.produto", "SELECT dblink('x', 'DELETE FROM produto')",
            "SELECT * FROM (SELECT * INTO copia FROM public.produto) p", "EXPLAIN SELECT 1",
            "COPY public.produto TO '/tmp/saida'", "SELECT * FROM public.produto WHERE id=?", "isto não é SQL"
    })
    void rejeitaEscritaMultiplasInstrucoesEChamadasNaoPermitidas(String sql) {
        assertThatThrownBy(() -> verificador.validar(sql)).isInstanceOf(ErroApi.class);
    }

    @Test void rejeitaAntesDeAcessarBanco() {
        var banco = mock(ConsultaBancoGateway.class);
        var service = new ConsultaBancoService(verificador, banco);
        assertThatThrownBy(() -> service.consultar("DROP TABLE public.produto")).isInstanceOf(ErroApi.class);
        verifyNoInteractions(banco);
    }
    @ParameterizedTest
    @ValueSource(strings = {
            "SELECT `p`.`id`, IFNULL(`p`.`preco`, 0) AS preco FROM `erp`.`produto` `p`",
            "SELECT DATE_FORMAT(emissao, '%Y-%m') AS mes, SUM(total) FROM erp.pedido GROUP BY DATE_FORMAT(emissao, '%Y-%m')",
            "SELECT YEAR(emissao), COUNT(*) FROM erp.pedido WHERE emissao >= DATE_SUB('2026-01-01', INTERVAL 1 MONTH) GROUP BY YEAR(emissao)",
            "SELECT id FROM erp.pedido LIMIT 10"
    })
    void mysqlAceitaCraseEFuncoesDoDialeto(String sql) {
        assertThat(new VerificadorSql(Dialeto.MYSQL).validar(sql)).isNotBlank();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "DELETE FROM `erp`.`produto`", "SELECT id FROM erp.produto FOR UPDATE", "SELECT id FROM erp.produto LOCK IN SHARE MODE",
            "SELECT SLEEP(5)", "SELECT LOAD_FILE('/etc/passwd')", "SELECT id INTO OUTFILE '/tmp/x' FROM erp.produto",
            "SELECT TO_CHAR(emissao, 'YYYY') FROM erp.pedido", "SELECT BENCHMARK(1000000, MD5('x'))"
    })
    void mysqlRecusaEscritaBloqueioArquivosEFuncoesDeOutroDialeto(String sql) {
        assertThatThrownBy(() -> new VerificadorSql(Dialeto.MYSQL).validar(sql)).isInstanceOf(ErroApi.class);
    }

    @Test void postgresNaoAceitaFuncoesExclusivasDoMysql() {
        assertThatThrownBy(() -> verificador.validar("SELECT IFNULL(preco, 0) FROM public.produto")).isInstanceOf(ErroApi.class);
        assertThat(verificador.validar("SELECT DATE_TRUNC('month', emissao) FROM public.pedido")).isNotBlank();
    }
}
