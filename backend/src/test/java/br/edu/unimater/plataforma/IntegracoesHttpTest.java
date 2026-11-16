package br.edu.unimater.plataforma;

import br.edu.unimater.plataforma.api.*;
import br.edu.unimater.plataforma.apuracao.MotorConsenso.Provedor;
import br.edu.unimater.plataforma.contexto.*;
import br.edu.unimater.plataforma.ia.*;
import br.edu.unimater.plataforma.jira.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class IntegracoesHttpTest {
    private record Transporte(MockRestServiceServer server,RestClient http) {}
    private Transporte transporte() {
        var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();return new Transporte(server,builder.build());
    }
    private ModelosExternos modelos(Transporte t) {
        var c=new ModelosProperties.Config(true,"chave-teste","modelo-fixado","1","2");
        var cliente=new ModelosExternos(new ModelosProperties(Map.of(Provedor.CLAUDE,c,Provedor.GEMINI,c,Provedor.LLAMA,c),4096),new FiltroSaida("Nome Privado"),RestClient.builder());
        ReflectionTestUtils.setField(cliente,"http",t.http());return cliente;
    }
    @Test void geminiPseudonimizaCalculaTokensDeRaciocinioECusto() {
        var t=transporte();var cliente=modelos(t);
        t.server().expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/modelo-fixado:generateContent"))
                .andExpect(method(HttpMethod.POST)).andExpect(header("x-goog-api-key","chave-teste"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("123.456.789-00"))))
                .andRespond(withSuccess("""
                {"candidates":[{"content":{"parts":[{"thought":true,"text":"interno"},{"text":"{\"consulta\":\"SELECT 1\"}"}]},"finishReason":"STOP"}],
                "modelVersion":"modelo-real","usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":5,"thoughtsTokenCount":3,"totalTokenCount":18}}
                """.replace("{\"consulta\":\"SELECT 1\"}","{\\\"consulta\\\":\\\"SELECT 1\\\"}"),MediaType.APPLICATION_JSON));
        var resposta=cliente.gerar(Provedor.GEMINI,"Responda JSON","CPF 123.456.789-00 Nome Privado");
        assertThat(resposta.texto()).doesNotContain("interno").contains("SELECT 1");
        assertThat(resposta.tokensEntrada()).isEqualTo(10);assertThat(resposta.tokensSaida()).isEqualTo(8);
        assertThat(resposta.custoUsd()).isEqualByComparingTo("0.000026");assertThat(resposta.completa()).isTrue();
        assertThat(resposta.promptEnviado()).doesNotContain("Nome Privado","123.456.789-00");t.server().verify();
    }
    @Test void groqUsaBearerEPreservaTruncamentoParaAuditoria() {
        var t=transporte();var cliente=modelos(t);
        t.server().expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
                .andExpect(header("Authorization","Bearer chave-teste")).andExpect(jsonPath("$.response_format.type").value("json_object"))
                .andRespond(withSuccess("""
                {"model":"llama-real","choices":[{"message":{"content":"{}"},"finish_reason":"length"}],"usage":{"prompt_tokens":3,"completion_tokens":4}}
                """,MediaType.APPLICATION_JSON));
        var resposta=cliente.gerar(Provedor.LLAMA,"Responda JSON","Requisito");
        assertThat(resposta.provedor()).isEqualTo("LLAMA");assertThat(resposta.completa()).isFalse();assertThat(resposta.custoUsd()).isEqualByComparingTo("0.000011");t.server().verify();
    }
    @Test void errosDoProvedorNaoExibemCorpoOuChave() {
        var t=transporte();var cliente=modelos(t);
        t.server().expect(anything()).andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("chave-teste dados internos"));
        assertThatThrownBy(()->cliente.gerar(Provedor.LLAMA,"JSON","Requisito")).isInstanceOf(ErroApi.class)
                .hasMessageContaining("HTTP 401").hasMessageNotContaining("chave-teste").hasMessageNotContaining("dados internos");
        t.server().verify();
    }
    @Test void claudeUsaApiDeMensagensIgnoraRaciocinioECalculaCusto() {
        var t=transporte();var cliente=modelos(t);
        t.server().expect(requestTo("https://api.anthropic.com/v1/messages")).andExpect(method(HttpMethod.POST))
                .andExpect(header("x-api-key","chave-teste")).andExpect(header("anthropic-version","2023-06-01"))
                .andExpect(jsonPath("$.model").value("modelo-fixado")).andExpect(jsonPath("$.max_tokens").value(4096))
                .andExpect(jsonPath("$.system").value(org.hamcrest.Matchers.containsString("Responda somente JSON")))
                .andExpect(jsonPath("$.messages[0].role").value("user"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Nome Privado"))))
                .andRespond(withSuccess("""
                {"model":"claude-real","content":[{"type":"thinking","thinking":"interno"},{"type":"text","text":"{\\"consulta\\":"},{"type":"text","text":"\\"SELECT 1\\"}"}],
                "stop_reason":"end_turn","usage":{"input_tokens":10,"output_tokens":5}}
                """,MediaType.APPLICATION_JSON));
        var resposta=cliente.gerar(Provedor.CLAUDE,"Responda JSON","Requisito de Nome Privado");
        assertThat(resposta.texto()).isEqualTo("{\"consulta\":\"SELECT 1\"}");assertThat(resposta.provedor()).isEqualTo("CLAUDE");
        assertThat(resposta.modelo()).isEqualTo("claude-real");assertThat(resposta.tokensEntrada()).isEqualTo(10);assertThat(resposta.tokensSaida()).isEqualTo(5);
        assertThat(resposta.custoUsd()).isEqualByComparingTo("0.000020");assertThat(resposta.completa()).isTrue();
        assertThat(resposta.promptEnviado()).doesNotContain("Nome Privado");t.server().verify();
    }
    @Test void claudeMarcaTruncamentoEExigeContagemDeTokens() {
        var t=transporte();var cliente=modelos(t);
        t.server().expect(requestTo("https://api.anthropic.com/v1/messages")).andRespond(withSuccess("""
                {"model":"claude-real","content":[{"type":"text","text":"{"}],"stop_reason":"max_tokens","usage":{"input_tokens":3,"output_tokens":4096}}
                """,MediaType.APPLICATION_JSON));
        t.server().expect(requestTo("https://api.anthropic.com/v1/messages")).andRespond(withSuccess("""
                {"content":[{"type":"text","text":"{}"}],"stop_reason":"end_turn"}
                """,MediaType.APPLICATION_JSON));
        assertThat(cliente.gerar(Provedor.CLAUDE,"JSON","Requisito").completa()).isFalse();
        assertThatThrownBy(()->cliente.gerar(Provedor.CLAUDE,"JSON","Requisito")).isInstanceOf(ErroApi.class).hasMessageContaining("tokens");
        t.server().verify();
    }
    @Test void provedorDesabilitadoOuSemChaveNaoEChamado() {
        var desabilitado=new ModelosProperties.Config(false,"chave","modelo","1","2");
        var semChave=new ModelosProperties.Config(true,"","modelo","1","2");
        var cliente=new ModelosExternos(new ModelosProperties(Map.of(Provedor.CLAUDE,desabilitado,Provedor.GEMINI,semChave),4096),new FiltroSaida(""),RestClient.builder());
        assertThat(cliente.disponiveis()).containsExactly(Provedor.GEMINI);
        assertThatThrownBy(()->cliente.validar(Provedor.CLAUDE)).isInstanceOf(ErroApi.class).hasMessageContaining("CLAUDE");
        assertThatThrownBy(()->cliente.validar(Provedor.GEMINI)).isInstanceOf(ErroApi.class);
        assertThatThrownBy(()->cliente.validar(Provedor.LLAMA)).isInstanceOf(ErroApi.class);
    }
    @Test void jiraLeDescricaoAdfEMapeiaMetadadosSemEscrita() {
        var t=transporte();var cliente=new JiraClient("https://jira.example","email@example.com","token-teste","3","basic","customfield_100");
        ReflectionTestUtils.setField(cliente,"http",t.http());
        t.server().expect(requestTo(org.hamcrest.Matchers.containsString("/rest/api/3/issue/PROJ-123?fields=")))
                .andExpect(method(HttpMethod.GET)).andExpect(header("Authorization",org.hamcrest.Matchers.startsWith("Basic ")))
                .andRespond(withSuccess("""
                {"fields":{"summary":"Saldo","description":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Consultar saldo"}]}]},
                "status":{"name":"Em teste","statusCategory":{"key":"indeterminate"}},"created":"2026-11-07T12:00:00Z","duedate":"2026-11-10","timeoriginalestimate":7200,"customfield_100":{"value":"ESTOQUE"}}}
                """,MediaType.APPLICATION_JSON));
        var requisito=cliente.obter("proj-123");assertThat(requisito.texto()).isEqualTo("Consultar saldo");assertThat(requisito.areaHint()).isEqualTo("ESTOQUE");
        assertThat(requisito.demanda().status()).isEqualTo("EM_TESTE");assertThat(requisito.demanda().estimativaH()).isEqualByComparingTo("2");t.server().verify();
    }
    @Test void confluenceLeStoragePreservaVersaoEConverteHtmlSemScripts() {
        var t=transporte();var cliente=new ConfluenceClient("https://docs.example/wiki","email@example.com","token","ESTOQUE:123","2","basic");
        ReflectionTestUtils.setField(cliente,"http",t.http());
        t.server().expect(requestTo("https://docs.example/wiki/api/v2/pages/123?body-format=storage")).andRespond(withSuccess("""
                {"body":{"storage":{"value":"<h2>Saldo &amp; estoque</h2><p>Não incluir cancelados.</p><script>segredo()</script>"}},"version":{"number":4}}
                """,MediaType.APPLICATION_JSON));
        var documento=cliente.obter("PROJ-123","ESTOQUE");assertThat(documento.texto()).contains("Saldo & estoque","Não incluir cancelados").doesNotContain("segredo","<p>");
        assertThat(documento.versao()).isEqualTo("4");assertThat(documento.hash()).hasSize(64);t.server().verify();
    }
    @Test void jiraConfereTransicaoDisponivelEComentaEmAdf() {
        var t=transporte();var leitura=mock(RequisitoGateway.class);
        var cliente=new JiraEscritaClient(leitura,"https://jira.example","email@example.com","token","3","basic",true,"EM_TESTE:31");
        ReflectionTestUtils.setField(cliente,"http",t.http());
        when(leitura.obter("PROJ-123")).thenReturn(new RequisitoGateway.Requisito("PROJ-123","Saldo","Consultar saldo","ESTOQUE",new Contratos.Demanda("PROJ-123","EM_TESTE","2026-11-07",null,BigDecimal.ONE)));
        t.server().expect(requestTo("https://jira.example/rest/api/3/issue/PROJ-123/transitions")).andRespond(withSuccess("{\"transitions\":[{\"id\":\"31\"}]}",MediaType.APPLICATION_JSON));
        t.server().expect(requestTo("https://jira.example/rest/api/3/issue/PROJ-123/transitions")).andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.transition.id").value("31")).andRespond(withNoContent());
        t.server().expect(requestTo("https://jira.example/rest/api/3/issue/PROJ-123/comment")).andExpect(jsonPath("$.body.type").value("doc"))
                .andRespond(withSuccess("{\"id\":\"1001\"}",MediaType.APPLICATION_JSON));
        assertThat(cliente.transicionar("PROJ-123","EM_TESTE").status()).isEqualTo("EM_TESTE");
        assertThat(cliente.comentar("PROJ-123","Cenário aprovado")).isEqualTo("1001");t.server().verify();
    }
}
