package br.edu.unimater.plataforma.contexto;

import br.edu.unimater.plataforma.api.ErroApi;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Duration;
import java.util.*;
import javax.swing.text.html.*;
import javax.swing.text.html.parser.ParserDelegator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

@Component
public class ConfluenceClient implements DocumentacaoGateway {
    private final String baseUrl, email, token, paginas, versaoApi, auth;
    private final RestClient http;
    public ConfluenceClient(@Value("${plataforma.confluence.base-url:}") String baseUrl,
            @Value("${plataforma.confluence.email:}") String email, @Value("${plataforma.confluence.token:}") String token,
            @Value("${plataforma.confluence.paginas:}") String paginas,
            @Value("${plataforma.confluence.api-version:2}") String versaoApi,
            @Value("${plataforma.confluence.auth-mode:basic}") String auth) {
        this.baseUrl = baseUrl; this.email = email; this.token = token; this.paginas = paginas; this.versaoApi = versaoApi; this.auth = auth;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(30));
        http = RestClient.builder().requestFactory(factory).build();
    }
    public Documento obter(String chaveJira, String area) {
        URI uri;
        try { uri = URI.create(baseUrl); } catch (IllegalArgumentException e) { throw ErroApi.configuracao("CONFLUENCE_BASE_URL inválida."); }
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || token.isBlank() || (!auth.equals("basic") && !auth.equals("bearer")) || (auth.equals("basic") && email.isBlank()))
            throw ErroApi.configuracao("Configure URL HTTPS e autenticação do Confluence.");
        var mapa = new HashMap<String, String>();
        for (String par : paginas.split(",")) {
            if (par.isBlank()) continue;
            var partes = par.strip().split(":", 2);
            if (partes.length != 2 || !partes[1].matches("[1-9][0-9]*")) throw ErroApi.configuracao("CONFLUENCE_PAGINAS deve conter CHAVE:ID ou AREA:ID.");
            mapa.put(partes[0].strip().toUpperCase(Locale.ROOT), partes[1]);
        }
        String id = mapa.getOrDefault(chaveJira.toUpperCase(Locale.ROOT), mapa.get(area.toUpperCase(Locale.ROOT)));
        if (id == null) throw ErroApi.configuracao("Configure a página da tarefa ou área em CONFLUENCE_PAGINAS.");
        String base = baseUrl.replaceAll("/+$", "");
        String caminho = switch (versaoApi) {
            case "2" -> "/api/v2/pages/" + id + "?body-format=storage";
            case "1" -> "/rest/api/content/" + id + "?expand=body.storage,version";
            default -> throw ErroApi.configuracao("CONFLUENCE_API_VERSION deve ser 1 ou 2.");
        };
        try {
            var json = http.get().uri(base + caminho).headers(h -> {
                if (auth.equals("bearer")) h.setBearerAuth(token); else h.setBasicAuth(email, token);
            }).retrieve().body(JsonNode.class);
            String conteudo = json == null ? "" : textoHtml(json.path("body").path("storage").path("value").asText());
            if (conteudo.isBlank() || conteudo.length() > 100000) throw ErroApi.entrada("Documentação vazia ou maior que 100000 caracteres.");
            return new Documento(base + "/pages/viewpage.action?pageId=" + id,
                    json.path("version").path("number").asText(), conteudo, hash(conteudo));
        } catch (RestClientResponseException e) {
            throw ErroApi.configuracao("Confluence recusou a leitura da página. HTTP " + e.getStatusCode().value() + ".");
        } catch (ResourceAccessException e) { throw ErroApi.configuracao("Não foi possível conectar ao Confluence dentro do prazo."); }
    }
    public static String textoHtml(String html) {
        var texto = new StringBuilder();
        try {
            new ParserDelegator().parse(new StringReader(html.replaceAll("(?is)<(script|style)\\b[^>]*>.*?</\\1\\s*>", "")), new HTMLEditorKit.ParserCallback() {
                @Override public void handleText(char[] dados, int pos) { texto.append(dados).append(' '); }
                @Override public void handleEndTag(HTML.Tag tag, int pos) {
                    if (tag.isBlock()) texto.append('\n');
                }
                @Override public void handleSimpleTag(HTML.Tag tag, javax.swing.text.MutableAttributeSet a, int pos) {
                    if (tag == HTML.Tag.BR) texto.append('\n');
                }
            }, true);
            return texto.toString().replaceAll("[ \\t]+", " ").replaceAll(" *\\n *", "\n").strip();
        } catch (IOException e) { throw ErroApi.entrada("Não foi possível ler a documentação."); }
    }
    private static String hash(String texto) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
