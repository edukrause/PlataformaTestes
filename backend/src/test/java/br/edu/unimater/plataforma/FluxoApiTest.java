package br.edu.unimater.plataforma;

import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.api.Contratos.Demanda;
import br.edu.unimater.plataforma.ia.ModeloGateway;
import br.edu.unimater.plataforma.contexto.RequisitoGateway;
import br.edu.unimater.plataforma.banco.ConsultaBancoGateway;
import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:teste;DB_CLOSE_DELAY=-1"})
@AutoConfigureMockMvc
class FluxoApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate db;
    @MockitoBean RequisitoGateway jira;
    @MockitoBean ModeloGateway modelo;
    @MockitoBean ConsultaBancoGateway banco;
    private static final String GERACAO = """
            {"area":"ESTOQUE","exigeApuracao":true,"cenarios":[{"tipo":"ALTERACAO",
            "titulo":"Consultar saldo","gherkin":"Dado que existe um produto\\nQuando consulto o saldo\\nEntão vejo o saldo atual",
            "resultadoEsperado":"O saldo corresponde aos movimentos do produto."}],"pontosAtencao":[]}
            """;

    private void preparar(String resposta) {
        when(jira.obter("PROJ-123")).thenReturn(new RequisitoGateway.Requisito("PROJ-123", "Consultar saldo",
                "Consultar saldo do estoque por produto.", "ESTOQUE",
                new Demanda("PROJ-123", "EM_TESTE", "2026-11-04T12:00:00Z", null, null)));
        when(modelo.gerar(anyString(), anyString())).thenReturn(new ModeloGateway.Resposta(resposta, "modelo-fixado",
                100, 80, 1000, new BigDecimal("0.0012"), "prompt pseudonimizado", Map.of()));
    }
    private long gerar() throws Exception {
        String json = mvc.perform(post("/api/execucoes").contentType("application/json")
                        .content("{\"chaveJira\":\"PROJ-123\",\"usarDocumentacao\":false}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(json).path("id").asLong();
    }
    @Test void geraPersisteConsultaERevisaSemInventarApuracao() throws Exception {
        preparar(GERACAO);
        long id = gerar();
        mvc.perform(get("/api/execucoes/{id}", id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDA"))
                .andExpect(jsonPath("$.tarefa.chaveJira").value("PROJ-123"))
                .andExpect(jsonPath("$.cenarios[0].sintaxeValida").value(true))
                .andExpect(jsonPath("$.exigeApuracao").value(true))
                .andExpect(jsonPath("$.apuracaoDisponivel").value(false))
                .andExpect(jsonPath("$.apuracoes").isEmpty());
        assertThat(db.queryForObject("SELECT tokens_entrada FROM chamada_modelo WHERE execucao_id=?", Integer.class, id)).isEqualTo(100);
        mvc.perform(post("/api/execucoes/{id}/revisao", id).contentType("application/json").content("""
                {"analista":"A1","decisao":"ACEITO","valoresCorrigidos":{},"tempoRevisaoS":30,"comentario":"Conferido"}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.decisao").value("ACEITO"));
        mvc.perform(get("/api/execucoes")).andExpect(status().isOk());
    }
    @Test void registraCustoMesmoQuandoModeloRetornaJsonInvalido() throws Exception {
        preparar("não é JSON");
        long id = gerar();
        mvc.perform(get("/api/execucoes/{id}", id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ERRO"))
                .andExpect(jsonPath("$.custoTotalUsd").value(0.0024))
                .andExpect(jsonPath("$.cenarios").isEmpty());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM chamada_modelo WHERE execucao_id=?", Integer.class, id)).isEqualTo(2);
    }
    @Test void erroDeConfiguracaoFicaNaExecucao() throws Exception {
        preparar(GERACAO);
        when(modelo.gerar(anyString(), anyString())).thenThrow(ErroApi.configuracao("Configure ANTHROPIC_API_KEY."));
        long id = gerar();
        mvc.perform(get("/api/execucoes/{id}", id)).andExpect(jsonPath("$.status").value("ERRO"))
                .andExpect(jsonPath("$.mensagemErro").value("Configure ANTHROPIC_API_KEY."));
    }
    @Test void conversaVinculaExecucaoReal() throws Exception {
        preparar(GERACAO);
        mvc.perform(post("/api/conversas/mensagens").contentType("application/json").content("""
                {"conversaId":null,"texto":"Gere os cenários de PROJ-123","usarDocumentacao":false}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.mensagens.length()").value(2))
                .andExpect(jsonPath("$.mensagens[1].execucaoId").isNumber());
    }
    @Test void rejeitaEntradaInvalidaEEscritaNoJira() throws Exception {
        mvc.perform(post("/api/execucoes").contentType("application/json").content("{\"chaveJira\":\"../segredo\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(jira, modelo);
        mvc.perform(put("/api/demandas/PROJ-123/status").contentType("application/json").content("{\"status\":\"FINALIZADA\"}"))
                .andExpect(status().isNotImplemented());
        mvc.perform(get("/api/execucoes/999999")).andExpect(status().isNotFound());
    }

    @Test void preservaDecisoesAnterioresAoAtualizarRevisao() throws Exception {
        preparar(GERACAO);
        long id = gerar();
        mvc.perform(post("/api/execucoes/{id}/revisao", id).contentType("application/json").content("""
                {"analista":"A1","decisao":"REJEITADO","valoresCorrigidos":{},"tempoRevisaoS":10,"comentario":"Revisar"}
                """)).andExpect(status().isOk());
        mvc.perform(post("/api/execucoes/{id}/revisao", id).contentType("application/json").content("""
                {"analista":"A2","decisao":"ACEITO","valoresCorrigidos":{},"tempoRevisaoS":20,"comentario":"Conferido"}
                """)).andExpect(status().isOk());
        mvc.perform(get("/api/execucoes/{id}", id))
                .andExpect(jsonPath("$.revisao.analista").value("A2"))
                .andExpect(jsonPath("$.revisao.decisao").value("ACEITO"));
        mvc.perform(get("/api/execucoes/{id}/revisoes", id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].decisao").value("REJEITADO"))
                .andExpect(jsonPath("$[1].decisao").value("ACEITO"));
        // A métrica corrente não conta uma mesma execução como aceita e rejeitada.
        assertThat(db.queryForObject("SELECT COUNT(*) FROM revisao WHERE execucao_id=?", Integer.class, id)).isEqualTo(1);
    }

    @Test void revisaoInvalidaNaoApagaHistoricoNemDecisaoAtual() throws Exception {
        preparar(GERACAO);
        long id = gerar();
        mvc.perform(post("/api/execucoes/{id}/revisao", id).contentType("application/json").content("""
                {"analista":"A1","decisao":"ACEITO","valoresCorrigidos":{},"tempoRevisaoS":10,"comentario":"Conferido"}
                """)).andExpect(status().isOk());
        mvc.perform(post("/api/execucoes/{id}/revisao", id).contentType("application/json").content("""
                {"analista":"A2","decisao":"REJEITADO","valoresCorrigidos":{"999":"1"},"tempoRevisaoS":20,"comentario":"Inválida"}
                """)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/execucoes/{id}", id)).andExpect(jsonPath("$.revisao.decisao").value("ACEITO"));
        mvc.perform(get("/api/execucoes/{id}/revisoes", id)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/execucoes/999999/revisoes")).andExpect(status().isNotFound());
    }

    @Test void apuraPersisteCompoeEContaMaioriaSemChamarModelosNovamente() throws Exception {
        preparar(GERACAO);
        long totalAnterior = db.queryForObject("SELECT COUNT(*) FROM apuracao", Long.class);
        long id = gerar();
        long cenario = db.queryForObject("SELECT id FROM cenario WHERE execucao_id=?", Long.class, id);
        when(banco.consultar(anyString())).thenAnswer(inv -> {
            String sql = inv.getArgument(0);
            if (sql.contains("information_schema.columns")) return new Resultado(Verificacao.VALIDO, List.of(),
                    List.of(List.of("public", "estoque", "saldo", "numeric", "YES")), null, 0);
            if (sql.contains("pg_constraint")) return new Resultado(Verificacao.VAZIO, List.of(), List.of(), null, 0);
            return new Resultado(Verificacao.VALIDO, List.of(new Coluna("saldo", "numeric", 2)),
                    List.of(List.of(new BigDecimal(sql.contains("99") ? "99.00" : "10.00"))), null, 12);
        });
        String resposta = mvc.perform(post("/api/execucoes/{id}/apuracoes", id).contentType("application/json").content("""
                {"cenarioId":%d,"pergunta":"Saldo do estoque","preservarOrdem":false,"candidatos":[
                {"provedor":"CLAUDE","consulta":"SELECT 10 AS saldo"},
                {"provedor":"GEMINI","consulta":"SELECT 10.0 AS outro_alias"},
                {"provedor":"LLAMA","consulta":"SELECT 99 AS saldo"}]}
                """.formatted(cenario))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long apuracao = mapper.readTree(resposta).path("id").asLong();
        mvc.perform(get("/api/execucoes/{id}", id)).andExpect(jsonPath("$.apuracaoDisponivel").value(true))
                .andExpect(jsonPath("$.apuracoes[0].desfecho").value("MAIORIA"))
                .andExpect(jsonPath("$.apuracoes[0].origem").value("MANUAL"))
                .andExpect(jsonPath("$.apuracoes[0].resultadoReferencia.colunas[0]").value("saldo"))
                .andExpect(jsonPath("$.apuracoes[0].resultadoReferencia.linhas[0][0]").value(10.0))
                .andExpect(jsonPath("$.apuracoes[0].candidatos.length()").value(3))
                .andExpect(jsonPath("$.cenarios[0].resultadoEsperado").value(org.hamcrest.Matchers.containsString("«A" + apuracao + "»")));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM candidato_sql WHERE apuracao_id=?", Integer.class, apuracao)).isEqualTo(3);
        mvc.perform(get("/api/metricas")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApuracoes").value(totalAnterior + 1)).andExpect(jsonPath("$.desfechos.MAIORIA").value(1));
        verify(modelo, times(1)).gerar(anyString(), anyString());
        // Impede alterar silenciosamente a evidência depois da revisão do analista.
        mvc.perform(post("/api/execucoes/{id}/revisao", id).contentType("application/json").content("""
                {"analista":"A1","decisao":"ACEITO","valoresCorrigidos":{},"tempoRevisaoS":10,"comentario":"Conferido"}
                """)).andExpect(status().isOk());
        clearInvocations(banco);
        mvc.perform(post("/api/execucoes/{id}/apuracoes", id).contentType("application/json").content("""
                {"pergunta":"Saldo","candidatos":[{"provedor":"CLAUDE","consulta":"SELECT 1"}]}
                """)).andExpect(status().isBadRequest());
        verifyNoInteractions(banco);
    }

    @Test void recusaProvedoresDuplicadosECenarioDeOutraExecucaoAntesDeConsultar() throws Exception {
        preparar(GERACAO);
        long id = gerar();
        mvc.perform(post("/api/execucoes/{id}/apuracoes", id).contentType("application/json").content("""
                {"pergunta":"Saldo","candidatos":[{"provedor":"CLAUDE","consulta":"SELECT 1"},{"provedor":"CLAUDE","consulta":"SELECT 1"}]}
                """)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/execucoes/{id}/apuracoes", id).contentType("application/json").content("""
                {"cenarioId":999999,"pergunta":"Saldo","candidatos":[{"provedor":"CLAUDE","consulta":"SELECT 1"}]}
                """)).andExpect(status().isBadRequest());
        verifyNoInteractions(banco);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM apuracao WHERE execucao_id=?", Integer.class, id)).isZero();
    }

    @Test void descartaEscritaEVazioSemInventarReferencia() throws Exception {
        preparar(GERACAO);
        long id = gerar();
        when(banco.consultar(anyString())).thenReturn(new Resultado(Verificacao.VAZIO, List.of(), List.of(), null, 1));
        mvc.perform(post("/api/execucoes/{id}/apuracoes", id).contentType("application/json").content("""
                {"pergunta":"Saldo","candidatos":[{"provedor":"CLAUDE","consulta":"DELETE FROM public.estoque"},
                {"provedor":"GEMINI","consulta":"SELECT 1 WHERE false"}]}
                """)).andExpect(status().isCreated());
        mvc.perform(get("/api/execucoes/{id}", id)).andExpect(jsonPath("$.apuracoes[0].desfecho").value("FALHA"))
                .andExpect(jsonPath("$.apuracoes[0].resultadoReferencia").isEmpty())
                .andExpect(jsonPath("$.apuracoes[0].candidatos[0].verificacao").value("REJEITADO_SINTAXE"));
        verify(banco, never()).consultar(startsWith("DELETE"));
    }
}
