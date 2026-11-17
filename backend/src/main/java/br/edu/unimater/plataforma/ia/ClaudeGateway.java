package br.edu.unimater.plataforma.ia;

import br.edu.unimater.plataforma.api.ErroApi;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

@Component
@ConditionalOnProperty(name = "plataforma.ia.modo", havingValue = "api")
public class ClaudeGateway implements ModeloGateway {
    private final RestClient http;
    private final FiltroSaida filtro;
    private final String key, modelo, inputPrice, outputPrice;
    private final int maxTokens;
    public ClaudeGateway(FiltroSaida filtro,
            @Value("${plataforma.claude.api-key}") String key,
            @Value("${plataforma.claude.model}") String modelo,
            @Value("${plataforma.claude.max-tokens}") int maxTokens,
            @Value("${plataforma.claude.input-price}") String inputPrice,
            @Value("${plataforma.claude.output-price}") String outputPrice) {
        this.filtro = filtro; this.key = key; this.modelo = modelo; this.maxTokens = maxTokens;
        this.inputPrice = inputPrice; this.outputPrice = outputPrice;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(120));
        http = RestClient.builder().baseUrl("https://api.anthropic.com").requestFactory(factory).build();
    }
    @Override
    public Resposta gerar(String sistema, String contexto) {
        if (key.isBlank() || modelo.isBlank())
            throw ErroApi.configuracao("Configure ANTHROPIC_API_KEY e ANTHROPIC_MODEL.");
        BigDecimal entrada = preco(inputPrice), saida = preco(outputPrice);
        if (maxTokens < 256 || maxTokens > 32000) throw ErroApi.configuracao("ANTHROPIC_MAX_TOKENS deve estar entre 256 e 32000.");
        var filtrado = filtro.filtrar(contexto);
        long inicio = System.nanoTime();
        try {
            var json = http.post().uri("/v1/messages")
                    .header("x-api-key", key).header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("model", modelo, "max_tokens", maxTokens, "system", sistema,
                            "messages", List.of(Map.of("role", "user", "content", filtrado.texto()))))
                    .retrieve().body(JsonNode.class);
            if (json == null) throw new ErroApi(HttpStatus.BAD_GATEWAY, "Claude retornou resposta vazia.");
            StringBuilder texto = new StringBuilder();
            for (var bloco : json.path("content")) {
                if (bloco.path("type").asText().equals("text")) texto.append(bloco.path("text").asText());
            }
            int tokensEntrada = json.path("usage").path("input_tokens").asInt();
            int tokensSaida = json.path("usage").path("output_tokens").asInt();
            var custo = entrada.multiply(BigDecimal.valueOf(tokensEntrada))
                    .add(saida.multiply(BigDecimal.valueOf(tokensSaida))).movePointLeft(6);
            // Mesmo uma resposta truncada é devolvida ao orquestrador, para registrar custo antes da validação.
            return new Resposta(texto.toString(), json.path("model").asText(modelo), tokensEntrada, tokensSaida,
                    (System.nanoTime() - inicio) / 1_000_000, custo, sistema + "\n\n" + filtrado.texto(), filtrado.correspondencias());
        } catch (RestClientResponseException e) {
            throw new ErroApi(HttpStatus.BAD_GATEWAY, "Claude recusou a chamada. HTTP " + e.getStatusCode().value()
                    + ". Confira a chave, o modelo, o saldo e os limites da API.");
        } catch (ResourceAccessException e) {
            throw new ErroApi(HttpStatus.GATEWAY_TIMEOUT, "Claude não respondeu dentro do prazo.");
        }
    }
    private static BigDecimal preco(String valor) {
        try {
            var numero = new BigDecimal(valor);
            if (numero.signum() < 0) throw new NumberFormatException();
            return numero;
        } catch (NumberFormatException e) {
            throw ErroApi.configuracao("Configure ANTHROPIC_INPUT_PRICE e ANTHROPIC_OUTPUT_PRICE com os preços por milhão de tokens.");
        }
    }
}
