package br.edu.unimater.plataforma;

import br.edu.unimater.plataforma.api.*;
import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.apuracao.MotorConsenso.Provedor;
import br.edu.unimater.plataforma.banco.*;
import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import br.edu.unimater.plataforma.contexto.*;
import br.edu.unimater.plataforma.ia.*;
import br.edu.unimater.plataforma.jira.JiraEscritaClient;
import br.edu.unimater.plataforma.metrica.ExportacaoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
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

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:completa;DB_CLOSE_DELAY=-1","plataforma.dominio.regras=empresa_id=1; filial_id=2; cancelado=false; excluido=false"})
@AutoConfigureMockMvc
class PlataformaCompletaTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate db;
    @Autowired CatalogoService catalogo;
    @MockitoBean RequisitoGateway requisitos;
    @MockitoBean ModeloGateway modelo;
    @MockitoBean ModelosExternos modelos;
    @MockitoBean ConsultaBancoGateway banco;
    @MockitoBean DocumentacaoGateway documentos;
    @MockitoBean JiraEscritaClient escrita;
    private static final String CENARIOS="""
        {"area":"ESTOQUE","exigeApuracao":false,"cenarios":[{"tipo":"ALTERACAO","titulo":"Consultar saldo",
        "gherkin":"Dado que existe um produto\\nQuando consulto o estoque\\nEntão vejo o saldo",
        "resultadoEsperado":"Saldo conforme os movimentos"}],"pontosAtencao":[]}
        """;
    @BeforeEach void preparar() {
        catalogo.invalidar();
        when(requisitos.obter("PROJ-123")).thenReturn(new RequisitoGateway.Requisito("PROJ-123","Saldo","Consultar saldo do estoque","ESTOQUE",
                new Demanda("PROJ-123","EM_TESTE","2026-11-07T12:00:00Z",null,null)));
        when(modelo.gerar(anyString(),anyString())).thenReturn(resposta(CENARIOS,"GEMINI"));
        when(banco.consultar(anyString())).thenAnswer(inv->{
            String sql=inv.getArgument(0);
            if(sql.contains("information_schema.columns"))return new Resultado(Verificacao.VALIDO,List.of(),List.of(List.of("public","estoque","saldo","numeric","YES")),null,1);
            if(sql.contains("pg_constraint"))return new Resultado(Verificacao.VAZIO,List.of(),List.of(),null,1);
            return new Resultado(Verificacao.VALIDO,List.of(new Coluna("saldo","numeric",2)),List.of(List.of(new BigDecimal("10.00"))),null,2);
        });
    }
    private ModeloGateway.Resposta resposta(String texto,String provedor) {
        return new ModeloGateway.Resposta(texto,"modelo-teste",5,7,10,new BigDecimal("0.001"),"prompt filtrado",Map.of(),provedor,true);
    }
    private long gerar(boolean doc)throws Exception {
        return mapper.readTree(mvc.perform(post("/api/execucoes").contentType("application/json").content("{\"chaveJira\":\"PROJ-123\",\"usarDocumentacao\":"+doc+"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("id").asLong();
    }
    private long apurar(long id)throws Exception {
        return mapper.readTree(mvc.perform(post("/api/execucoes/{id}/apuracoes",id).contentType("application/json").content("""
                {"pergunta":"Saldo estoque","candidatos":[{"provedor":"GEMINI","consulta":"SELECT 10"},{"provedor":"LLAMA","consulta":"SELECT 10"}]}
                """)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("id").asLong();
    }
    @Test void corrigeValoresPreservaReferenciaEHistoricoEExporta()throws Exception {
        long id=gerar(false),apuracao=apurar(id);
        mvc.perform(post("/api/execucoes/{id}/revisao",id).contentType("application/json").content("""
                {"analista":"Ana","decisao":"ACEITO_ALTERACAO","valoresCorrigidos":{"%d":"12,50"},"tempoRevisaoS":15,"comentario":"Regra conferida"}
                """.formatted(apuracao))).andExpect(status().isOk()).andExpect(jsonPath("$.valoresAlterados").value(1));
        mvc.perform(get("/api/execucoes/{id}",id)).andExpect(jsonPath("$.apuracoes[0].valorCorrigido").value("12,50"))
                .andExpect(jsonPath("$.apuracoes[0].resultadoReferencia.linhas[0][0]").value(10.0));
        mvc.perform(get("/api/execucoes/{id}/apuracoes.csv",id)).andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("12,50")));
        mvc.perform(post("/api/execucoes/{id}/revisao",id).contentType("application/json").content("""
                {"analista":"Ana","decisao":"ACEITO","valoresCorrigidos":{},"tempoRevisaoS":5,"comentario":"Correção desfeita"}
                """)).andExpect(status().isOk());
        mvc.perform(get("/api/execucoes/{id}/revisoes",id)).andExpect(jsonPath("$[0].valoresCorrigidos['%d']".formatted(apuracao)).value("12,50"))
                .andExpect(jsonPath("$[1].valoresAlterados").value(0));
        mvc.perform(get("/api/metricas.csv")).andExpect(status().isOk()).andExpect(header().string("Content-Disposition","attachment; filename=\"metricas.csv\""));
    }
    @Test void geraRegressaoSomenteComDocumentacaoSolicitadaEPreservaSnapshot()throws Exception {
        when(documentos.obter("PROJ-123","ESTOQUE")).thenReturn(new DocumentacaoGateway.Documento("https://docs.example/page/1","4","Regra documentada","hash"));
        when(modelo.gerar(anyString(),anyString())).thenReturn(resposta(CENARIOS.replace("ALTERACAO","REGRESSAO"),"GEMINI"));
        long id=gerar(true);
        mvc.perform(get("/api/execucoes/{id}",id)).andExpect(jsonPath("$.cenarios[0].tipo").value("REGRESSAO"))
                .andExpect(jsonPath("$.tarefa.documentacaoRef").value("https://docs.example/page/1"));
        assertThat(db.queryForObject("SELECT documentacao_texto FROM tarefa WHERE id=(SELECT tarefa_id FROM execucao WHERE id=?)",String.class,id)).isEqualTo("Regra documentada");
        verify(modelo).gerar(anyString(),contains("Regra documentada"));
        long semDoc=gerar(false);
        mvc.perform(get("/api/execucoes/{id}",semDoc)).andExpect(jsonPath("$.status").value("ERRO"));
    }
    @Test void geraSqlEmParaleloRefazConsultaRejeitadaEAuditaCustosSemClaude()throws Exception {
        String geracao=CENARIOS.replace("\"exigeApuracao\":false","\"exigeApuracao\":true")
                .replace("\"resultadoEsperado\":\"Saldo conforme os movimentos\"","\"resultadoEsperado\":\"Saldo «VALOR_APURADO»\",\"perguntaApuracao\":\"Saldo estoque da empresa 1 filial 2\"");
        when(modelo.gerar(anyString(),anyString())).thenReturn(resposta(geracao,"GEMINI"));
        when(modelos.disponiveis()).thenReturn(List.of(Provedor.GEMINI,Provedor.LLAMA));
        when(modelos.gerar(eq(Provedor.GEMINI),anyString(),anyString())).thenReturn(
                resposta("{\"consulta\":\"DELETE FROM public.estoque\"}","GEMINI"),resposta("{\"consulta\":\"SELECT saldo FROM public.estoque\"}","GEMINI"));
        when(modelos.gerar(eq(Provedor.LLAMA),anyString(),anyString())).thenReturn(resposta("{\"consulta\":\"SELECT saldo FROM public.estoque\"}","LLAMA"));
        long id=gerar(false);
        mvc.perform(get("/api/execucoes/{id}",id)).andExpect(jsonPath("$.status").value("CONCLUIDA"))
                .andExpect(jsonPath("$.apuracoes[0].origem").value("MODELOS"))
                .andExpect(jsonPath("$.apuracoes[0].desfecho").value("MAIORIA"))
                .andExpect(jsonPath("$.apuracoes[0].candidatos[0].tentativa").value(2))
                .andExpect(jsonPath("$.apuracoes[0].candidatos[0].tokensEntrada").value(10))
                .andExpect(jsonPath("$.custoTotalUsd").value(0.004));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM chamada_modelo WHERE execucao_id=? AND finalidade='SQL'",Integer.class,id)).isEqualTo(3);
        verify(modelos,never()).gerar(eq(Provedor.CLAUDE),anyString(),anyString());
        verify(banco,never()).consultar(startsWith("DELETE"));
    }
    @Test void tresFamiliasConcordantesProduzemUnanimidade()throws Exception {
        String geracao=CENARIOS.replace("\"exigeApuracao\":false","\"exigeApuracao\":true")
                .replace("\"resultadoEsperado\":\"Saldo conforme os movimentos\"","\"resultadoEsperado\":\"Saldo «VALOR_APURADO»\",\"perguntaApuracao\":\"Saldo estoque da empresa 1 filial 2\"");
        when(modelo.gerar(anyString(),anyString())).thenReturn(resposta(geracao,"CLAUDE"));
        when(modelos.disponiveis()).thenReturn(List.of(Provedor.CLAUDE,Provedor.GEMINI,Provedor.LLAMA));
        for(var p:Provedor.values())
            when(modelos.gerar(eq(p),anyString(),anyString())).thenReturn(resposta("{\"consulta\":\"SELECT saldo FROM public.estoque\"}",p.name()));
        long id=gerar(false);
        mvc.perform(get("/api/execucoes/{id}",id)).andExpect(jsonPath("$.status").value("CONCLUIDA"))
                .andExpect(jsonPath("$.apuracoes[0].desfecho").value("UNANIME"))
                .andExpect(jsonPath("$.apuracoes[0].candidatos.length()").value(3));
        assertThat(db.queryForObject("SELECT COUNT(DISTINCT provedor) FROM chamada_modelo WHERE execucao_id=? AND finalidade='SQL'",Integer.class,id)).isEqualTo(3);
    }
    @Test void entradaManualNaoChamaJiraNemIaEValidaGherkin()throws Exception {
        String pedido="{\"chaveJira\":\"MAN-1\",\"titulo\":\"Caso manual\",\"requisito\":\"Requisito fornecido\",\"geracao\":"+CENARIOS+"}";
        var json=mvc.perform(post("/api/execucoes/manuais").contentType("application/json").content(pedido)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id=mapper.readTree(json).path("id").asLong();
        mvc.perform(get("/api/execucoes/{id}",id)).andExpect(jsonPath("$.tarefa.origem").value("MANUAL"))
                .andExpect(jsonPath("$.status").value("CONCLUIDA")).andExpect(jsonPath("$.custoTotalUsd").value(0));
        verifyNoInteractions(modelo,requisitos);
        mvc.perform(post("/api/execucoes/manuais").contentType("application/json").content(pedido.replace("Dado que existe um produto","Texto solto"))).andExpect(status().isBadRequest());
    }
    @Test void lotePreservaFalhasIndividuaisEContinuaProcessamento()throws Exception {
        when(requisitos.obter("PROJ-999")).thenThrow(ErroApi.naoEncontrado());
        mvc.perform(post("/api/lotes").contentType("application/json").content("""
                {"nome":"Referência","chaves":["PROJ-999","PROJ-123"],"usarDocumentacao":false}
                """)).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("CONCLUIDO_COM_ERROS"))
                .andExpect(jsonPath("$.itens[0].status").value("ERRO")).andExpect(jsonPath("$.itens[1].status").value("CONCLUIDA"));
        mvc.perform(post("/api/lotes").contentType("application/json").content("{\"nome\":\"Duplicado\",\"chaves\":[\"PROJ-123\",\"proj-123\"]}"))
                .andExpect(status().isBadRequest());
    }
    @Test void publicaApenasAposRevisaoERepeticaoNaoDuplicaComentario()throws Exception {
        long id=gerar(false);
        mvc.perform(post("/api/execucoes/{id}/jira",id)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/execucoes/{id}/revisao",id).contentType("application/json").content("{\"analista\":\"Ana\",\"decisao\":\"ACEITO\",\"valoresCorrigidos\":{},\"tempoRevisaoS\":10,\"comentario\":\"Conferido\"}"))
                .andExpect(status().isOk());
        when(escrita.comentar(eq("PROJ-123"),anyString())).thenReturn("1001");
        mvc.perform(post("/api/execucoes/{id}/jira",id)).andExpect(status().isOk()).andExpect(jsonPath("$.comentarioId").value("1001"));
        mvc.perform(post("/api/execucoes/{id}/jira",id)).andExpect(status().isOk());
        verify(escrita,times(1)).comentar(eq("PROJ-123"),anyString());
    }
    @Test void csvEscapaSeparadoresQuebrasEAtribuicoesDeFormula() {
        String csv=ExportacaoService.csv(List.of(List.of("=HYPERLINK(\"x\")","valor; com\nquebra",new BigDecimal("12.50"))));
        assertThat(csv).startsWith("\uFEFF\"'=HYPERLINK(\"\"x\"\")\"").contains("\"valor; com\nquebra\";12,50\r\n");
    }
    @Test void falhaDePublicacaoNaoDisparaSegundaTentativaAutomatica()throws Exception {
        long id=gerar(false);
        mvc.perform(post("/api/execucoes/{id}/revisao",id).contentType("application/json").content("{\"analista\":\"Ana\",\"decisao\":\"ACEITO\",\"valoresCorrigidos\":{},\"tempoRevisaoS\":10,\"comentario\":\"Conferido\"}"))
                .andExpect(status().isOk());
        when(escrita.comentar(eq("PROJ-123"),anyString())).thenThrow(ErroApi.configuracao("Publicação sem confirmação."));
        mvc.perform(post("/api/execucoes/{id}/jira",id)).andExpect(status().isServiceUnavailable());
        mvc.perform(post("/api/execucoes/{id}/jira",id)).andExpect(status().isConflict());
        assertThat(db.queryForObject("SELECT status FROM publicacao_jira WHERE execucao_id=?",String.class,id)).isEqualTo("INCERTO");
        verify(escrita,times(1)).comentar(eq("PROJ-123"),anyString());
    }
    @Test void metasDistinguemApuracoesManuaisEAutomaticas()throws Exception {
        long id=gerar(false);apurar(id);
        mvc.perform(get("/api/metricas?origem=MODELOS")).andExpect(status().isOk()).andExpect(jsonPath("$.apuracoesManuais").value(0));
        mvc.perform(get("/api/metricas?origem=MANUAL")).andExpect(status().isOk()).andExpect(jsonPath("$.apuracoesModelos").value(0));
        mvc.perform(get("/api/metricas?origem=INVALIDA")).andExpect(status().isBadRequest());
    }
    @Test void naoPermiteConferenciaEnquantoConsultasEstaoEmAndamento()throws Exception {
        long id=gerar(false);
        when(banco.consultar("SELECT 10")).thenAnswer(inv->{
            mvc.perform(post("/api/execucoes/{id}/revisao",id).contentType("application/json").content("{\"analista\":\"Ana\",\"decisao\":\"ACEITO\",\"valoresCorrigidos\":{},\"tempoRevisaoS\":10,\"comentario\":\"Conferido\"}"))
                    .andExpect(status().isBadRequest());
            return new Resultado(Verificacao.VALIDO,List.of(new Coluna("saldo","numeric",2)),List.of(List.of(new BigDecimal("10.00"))),null,1);
        });
        apurar(id);
        mvc.perform(get("/api/execucoes/{id}",id)).andExpect(jsonPath("$.etapa").value("COMPOSICAO")).andExpect(jsonPath("$.revisao").isEmpty());
    }
    @Test void naoPermiteTrocarRevisaoDurantePublicacaoNoJira()throws Exception {
        long id=gerar(false);
        String pedido="{\"analista\":\"Ana\",\"decisao\":\"ACEITO\",\"valoresCorrigidos\":{},\"tempoRevisaoS\":10,\"comentario\":\"Conferido\"}";
        mvc.perform(post("/api/execucoes/{id}/revisao",id).contentType("application/json").content(pedido)).andExpect(status().isOk());
        when(escrita.comentar(eq("PROJ-123"),anyString())).thenAnswer(inv->{
            mvc.perform(post("/api/execucoes/{id}/revisao",id).contentType("application/json").content(pedido.replace("ACEITO","REJEITADO"))).andExpect(status().isConflict());
            return "1002";
        });
        mvc.perform(post("/api/execucoes/{id}/jira",id)).andExpect(status().isOk());
        mvc.perform(get("/api/execucoes/{id}",id)).andExpect(jsonPath("$.revisao.decisao").value("ACEITO"));
    }
}
