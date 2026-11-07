package br.edu.unimater.plataforma.jira;

import br.edu.unimater.plataforma.api.Contratos.Demanda;
import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.contexto.RequisitoGateway;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.text.Normalizer;
import java.time.Duration;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

@Component
public class JiraClient implements RequisitoGateway {
    private final RestClient http;
    private final String baseUrl, email, token, version, authMode, areaField;
    public JiraClient(@Value("${plataforma.jira.base-url}") String baseUrl,
            @Value("${plataforma.jira.email}") String email, @Value("${plataforma.jira.token}") String token,
            @Value("${plataforma.jira.api-version}") String version,
            @Value("${plataforma.jira.auth-mode}") String authMode,
            @Value("${plataforma.jira.area-field}") String areaField) {
        this.baseUrl = baseUrl; this.email = email; this.token = token;
        this.version = version; this.authMode = authMode; this.areaField = areaField;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.http = RestClient.builder().requestFactory(factory).build();
    }
    @Override
    public Requisito obter(String chave) {
        chave = chave.toUpperCase(Locale.ROOT);
        if (!chave.matches("[A-Z][A-Z0-9_]*-[1-9][0-9]*")) throw ErroApi.entrada("Chave do Jira inválida.");
        if (baseUrl.isBlank() || token.isBlank() || (authMode.equals("basic") && email.isBlank()))
            throw ErroApi.configuracao("Configure JIRA_BASE_URL, JIRA_API_TOKEN e a autenticação do Jira.");
        if (!version.matches("2|3") || !authMode.matches("basic|bearer"))
            throw ErroApi.configuracao("Use JIRA_API_VERSION=2 ou 3 e JIRA_AUTH_MODE=basic ou bearer.");
        URI uri;
        try { uri = URI.create(baseUrl); }
        catch (IllegalArgumentException e) { throw ErroApi.configuracao("JIRA_BASE_URL inválida."); }
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getQuery() != null || uri.getFragment() != null)
            throw ErroApi.configuracao("JIRA_BASE_URL deve ser uma URL HTTPS, sem credenciais ou parâmetros.");
        if (!areaField.isBlank() && !areaField.matches("customfield_[0-9]+"))
            throw ErroApi.configuracao("JIRA_AREA_FIELD deve identificar um campo customfield_número.");
        String fields = "summary,description,status,created,duedate,timeoriginalestimate";
        if (!areaField.isBlank()) fields += "," + areaField;
        try {
            var issue = http.get().uri(baseUrl.replaceAll("/+$", "") + "/rest/api/" + version + "/issue/" + chave
                    + "?fields=" + fields).headers(h -> {
                        h.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
                        if (authMode.equals("bearer")) h.setBearerAuth(token); else h.setBasicAuth(email, token);
                    }).retrieve().body(JsonNode.class);
            if (issue == null || !issue.path("fields").isObject())
                throw new ErroApi(HttpStatus.BAD_GATEWAY, "O Jira retornou uma tarefa sem campos.");
            var f = issue.path("fields");
            String texto = textoAdf(f.path("description")).strip();
            if (texto.isBlank()) throw ErroApi.entrada("A tarefa não possui descrição textual para gerar os cenários.");
            var demanda = new Demanda(chave, status(f.path("status")), f.path("created").asText(),
                    f.path("duedate").isTextual() ? f.path("duedate").asText() : null,
                    f.path("timeoriginalestimate").isNumber()
                            ? f.path("timeoriginalestimate").decimalValue().divide(BigDecimal.valueOf(3600), 4, java.math.RoundingMode.HALF_UP) : null);
            return new Requisito(chave, f.path("summary").asText(), texto,
                    areaField.isBlank() ? "" : textoAdf(f.path(areaField)), demanda);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) throw ErroApi.naoEncontrado();
            if (e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403)
                throw ErroApi.configuracao("O Jira recusou as credenciais ou o acesso à tarefa.");
            throw new ErroApi(HttpStatus.BAD_GATEWAY, "Falha ao consultar o Jira. HTTP " + e.getStatusCode().value() + ".");
        } catch (ResourceAccessException e) {
            throw new ErroApi(HttpStatus.GATEWAY_TIMEOUT, "Não foi possível conectar ao Jira dentro do prazo.");
        }
    }

    // Cloud v3 usa ADF; Data Center/v2 pode fornecer texto simples. Links não expõem atributos extras.
    public static String textoAdf(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) return "";
        if (node.isTextual()) return node.asText();
        if (node.has("value") && node.path("value").isTextual()) return node.path("value").asText();
        String type = node.path("type").asText();
        if (type.equals("text")) return node.path("text").asText();
        if (type.equals("hardBreak")) return "\n";
        if (type.equals("mention")) return "[PESSOA]";
        StringBuilder b = new StringBuilder();
        for (JsonNode child : node.isArray() ? node : node.path("content")) b.append(textoAdf(child));
        if (type.matches("paragraph|heading|listItem|tableRow|codeBlock|blockquote")) b.append('\n');
        if (type.equals("tableCell")) b.append('\t');
        return b.toString();
    }
    private static String status(JsonNode node) {
        String name = Normalizer.normalize(node.path("name").asText(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
        if (name.contains("reprov")) return "REPROVADA";
        if (name.contains("aguard") && name.contains("test")) return "AGUARDANDO_TESTE";
        if (name.contains("test")) return "EM_TESTE";
        return switch (node.path("statusCategory").path("key").asText()) {
            case "done" -> "FINALIZADA";
            case "indeterminate" -> "EM_DESENVOLVIMENTO";
            case "new" -> "A_FAZER";
            default -> throw new ErroApi(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Situação do Jira sem mapeamento. Ajuste o adaptador ao workflow do projeto.");
        };
    }
}
