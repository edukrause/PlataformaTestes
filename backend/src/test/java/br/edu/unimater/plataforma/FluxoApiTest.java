package br.edu.unimater.plataforma;

import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.api.Contratos.Demanda;
import br.edu.unimater.plataforma.ia.ModeloGateway;
import br.edu.unimater.plataforma.jira.JiraClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
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
    @MockitoBean JiraClient jira;
    @MockitoBean ModeloGateway modelo;
    private static final String GERACAO = """
            {"area":"ESTOQUE","exigeApuracao":true,"cenarios":[{"tipo":"ALTERACAO",
            "titulo":"Consultar saldo","gherkin":"Dado que existe um produto\\nQuando consulto o saldo\\nEntão vejo o saldo atual",
            "resultadoEsperado":"O saldo corresponde aos movimentos do produto."}],"pontosAtencao":[]}
            """;

    private void preparar(String resposta) {
        when(jira.obter("PROJ-123")).thenReturn(new JiraClient.Requisito("PROJ-123", "Consultar saldo",
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
                .andExpect(jsonPath("$.custoTotalUsd").value(0.0012))
                .andExpect(jsonPath("$.cenarios").isEmpty());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM chamada_modelo WHERE execucao_id=?", Integer.class, id)).isEqualTo(1);
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
}
