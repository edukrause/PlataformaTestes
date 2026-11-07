package br.edu.unimater.plataforma;

import br.edu.unimater.plataforma.contexto.RequisitoGateway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:ia-desativada;DB_CLOSE_DELAY=-1",
        "plataforma.ia.modo=desativada",
        "plataforma.postgres.habilitado=false"
})
@AutoConfigureMockMvc
class IaDesativadaTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @MockitoBean RequisitoGateway requisitos;

    @Test void recusaGeracaoAntesDeConsultarJiraOuCriarExecucao() throws Exception {
        mvc.perform(post("/api/execucoes").contentType("application/json")
                        .content("{\"chaveJira\":\"PROJ-123\",\"usarDocumentacao\":false}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").value(
                        "A geração por IA está desativada. O histórico e a revisão continuam disponíveis."));
        verifyNoInteractions(requisitos);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM execucao", Integer.class)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM chamada_modelo", Integer.class)).isZero();
    }

    @Test void leiturasContinuamDisponiveisSemCredenciais() throws Exception {
        mvc.perform(get("/api/saude")).andExpect(status().isOk());
        mvc.perform(get("/api/execucoes")).andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(get("/api/metricas")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalExecucoes").value(0))
                .andExpect(jsonPath("$.totalApuracoes").value(0))
                .andExpect(jsonPath("$.porProvedor.length()").value(3));
        verifyNoInteractions(requisitos);
    }

    @Test void conversaExplicaIndisponibilidadeSemAcionarIntegracao() throws Exception {
        mvc.perform(post("/api/conversas/mensagens").contentType("application/json")
                        .content("{\"texto\":\"Gere os cenários de PROJ-123\",\"usarDocumentacao\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagens[1].texto").value(
                        org.hamcrest.Matchers.containsString("A geração por IA está desativada")))
                .andExpect(jsonPath("$.mensagens[1].execucaoId").doesNotExist());
        verifyNoInteractions(requisitos);
    }

    @Test void consultaManualExigeAtivacaoMasValidaSintaxeAntes() throws Exception {
        mvc.perform(post("/api/banco/consultas").contentType("application/json")
                        .content("{\"consulta\":\"SELECT 1\"}"))
                .andExpect(status().isServiceUnavailable());
        mvc.perform(post("/api/banco/consultas").contentType("application/json")
                        .content("{\"consulta\":\"DELETE FROM public.produto\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/banco/consultas").contentType("application/json")
                        .content("{\"consulta\":\"\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(requisitos);
    }
}
