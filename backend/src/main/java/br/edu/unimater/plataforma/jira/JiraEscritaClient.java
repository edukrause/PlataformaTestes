package br.edu.unimater.plataforma.jira;

import br.edu.unimater.plataforma.api.*;
import br.edu.unimater.plataforma.contexto.RequisitoGateway;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

@Component
public class JiraEscritaClient {
    private final String baseUrl,email,token,version,auth,transicoes;
    private final boolean habilitado;
    private final RequisitoGateway leitura;
    private final RestClient http;
    public JiraEscritaClient(RequisitoGateway leitura,@Value("${plataforma.jira.base-url}") String baseUrl,
            @Value("${plataforma.jira.email}") String email,@Value("${plataforma.jira.token}") String token,
            @Value("${plataforma.jira.api-version}") String version,@Value("${plataforma.jira.auth-mode}") String auth,
            @Value("${plataforma.jira.escrita-habilitada:false}") boolean habilitado,
            @Value("${plataforma.jira.transicoes:}") String transicoes) {
        this.leitura=leitura;this.baseUrl=baseUrl;this.email=email;this.token=token;this.version=version;
        this.auth=auth;this.habilitado=habilitado;this.transicoes=transicoes;
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER).build());factory.setReadTimeout(Duration.ofSeconds(30));
        this.http=RestClient.builder().requestFactory(factory).build();
    }
    public boolean habilitado() { return habilitado; }
    public void validar() {
        if(!habilitado) throw new ErroApi(HttpStatus.NOT_IMPLEMENTED,"A escrita no Jira está desativada. Configure JIRA_ESCRITA_HABILITADA.");
        URI uri;
        try { uri=URI.create(baseUrl); } catch(Exception e) { throw ErroApi.configuracao("JIRA_BASE_URL inválida."); }
        if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null
                ||token.isBlank()||!version.matches("2|3")||!auth.matches("basic|bearer")||(auth.equals("basic")&&email.isBlank()))
            throw ErroApi.configuracao("Configure URL HTTPS e autenticação do Jira.");
    }
    private String caminho(String chave,String sufixo) {
        validar();
        if(!chave.matches("[A-Za-z][A-Za-z0-9_]*-[1-9][0-9]*")) throw ErroApi.entrada("Chave do Jira inválida.");
        return baseUrl.replaceAll("/+$","")+"/rest/api/"+version+"/issue/"+chave.toUpperCase(Locale.ROOT)+sufixo;
    }
    private void autenticar(HttpHeaders h) { if(auth.equals("bearer"))h.setBearerAuth(token);else h.setBasicAuth(email,token); }
    public Contratos.Demanda transicionar(String chave,String status) {
        String url=caminho(chave,"/transitions"),id=null;
        for(String par:transicoes.split(",")) {
            var partes=par.strip().split(":",2);
            if(partes.length==2&&partes[0].equals(status)&&partes[1].matches("[1-9][0-9]*"))id=partes[1];
        }
        if(id==null)throw ErroApi.entrada("Configure a transição desejada em JIRA_TRANSICOES, no formato STATUS:ID.");
        try {
            var json=http.get().uri(url).headers(this::autenticar).retrieve().body(JsonNode.class);
            boolean permitida=false;
            if(json!=null)for(var t:json.path("transitions"))if(t.path("id").asText().equals(id))permitida=true;
            if(!permitida)throw ErroApi.entrada("A transição configurada não está disponível no estado atual da tarefa.");
            http.post().uri(url).headers(this::autenticar).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("transition",Map.of("id",id))).retrieve().toBodilessEntity();
        } catch(RestClientResponseException e) { throw falha(e); }
        catch(ResourceAccessException e) { throw new ErroApi(HttpStatus.GATEWAY_TIMEOUT,"Não foi possível confirmar a transição. Confira o Jira antes de repetir."); }
        return leitura.obter(chave).demanda();
    }
    public String comentar(String chave,String texto) {
        String url=caminho(chave,"/comment");
        if(texto.length()>30000)throw ErroApi.entrada("Os cenários excedem o limite de publicação de 30000 caracteres.");
        Object body=version.equals("3")?Map.of("type","doc","version",1,"content",List.of(Map.of("type","codeBlock",
                "attrs",Map.of("language","gherkin"),"content",List.of(Map.of("type","text","text",texto))))):texto;
        try {
            var json=http.post().uri(url).headers(this::autenticar).contentType(MediaType.APPLICATION_JSON).body(Map.of("body",body)).retrieve().body(JsonNode.class);
            if(json==null||json.path("id").asText().isBlank())throw new ErroApi(HttpStatus.BAD_GATEWAY,"O Jira não confirmou o identificador do comentário. Confira a tarefa antes de repetir.");
            return json.path("id").asText();
        } catch(RestClientResponseException e) { throw falha(e); }
        catch(ResourceAccessException e) { throw new ErroApi(HttpStatus.GATEWAY_TIMEOUT,"Publicação sem confirmação. Confira o Jira antes de repetir."); }
    }
    private ErroApi falha(RestClientResponseException e) { return new ErroApi(HttpStatus.BAD_GATEWAY,"O Jira recusou a operação. HTTP "+e.getStatusCode().value()+"."); }
}
