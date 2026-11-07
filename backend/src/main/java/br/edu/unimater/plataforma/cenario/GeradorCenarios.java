package br.edu.unimater.plataforma.cenario;

import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.ia.ModeloGateway;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.cucumber.gherkin.GherkinParser;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class GeradorCenarios {
    public static final String VERSAO = "cenarios-v1";
    private final ObjectMapper mapper;
    private final String prompt;
    public GeradorCenarios(ObjectMapper mapper) throws IOException {
        this.mapper = mapper;
        prompt = new ClassPathResource("prompts/" + VERSAO + ".txt").getContentAsString(StandardCharsets.UTF_8);
    }
    public record CenarioGerado(String tipo, String titulo, String gherkin, String resultadoEsperado) {}
    public record AtencaoGerada(String tipo, String texto) {}
    public record Geracao(String area, Boolean exigeApuracao, List<CenarioGerado> cenarios, List<AtencaoGerada> pontosAtencao) {}
    public String prompt() { return prompt; }
    public Geracao validar(ModeloGateway.Resposta resposta) {
        try {
            var g = mapper.readValue(resposta.texto(), Geracao.class);
            if (g == null || g.area() == null || !g.area().matches("ESTOQUE|VENDAS|NAO_IDENTIFICADA") || g.exigeApuracao() == null
                    || g.cenarios() == null || g.cenarios().isEmpty() || g.cenarios().size() > 20 || g.pontosAtencao() == null)
                throw new IllegalArgumentException();
            for (var c : g.cenarios()) {
                if (!"ALTERACAO".equals(c.tipo()) || vazio(c.titulo()) || c.titulo().contains("\n") || c.titulo().contains("\r")
                        || vazio(c.resultadoEsperado()) || !gherkinValido(c.gherkin())) throw new IllegalArgumentException();
            }
            for (var a : g.pontosAtencao()) {
                if (a.tipo() == null || !a.tipo().matches("AMBIGUIDADE|MASSA|DOCUMENTACAO") || vazio(a.texto()))
                    throw new IllegalArgumentException();
            }
            return g;
        } catch (IOException | IllegalArgumentException e) {
            throw new ErroApi(HttpStatus.BAD_GATEWAY, "Claude retornou cenários fora do contrato ou Gherkin inválido. Gere novamente.");
        }
    }
    public static boolean gherkinValido(String passos) {
        if (vazio(passos) || !passos.matches("(?s).*?(?m)^\\h*Dado(?:s|a|as)?\\h+\\S.*")
                || !passos.matches("(?s).*?(?m)^\\h*Quando\\h+\\S.*")
                || !passos.matches("(?s).*?(?m)^\\h*Então\\h+\\S.*")) return false;
        // Não admitir títulos, comentários, blocos ou texto solto que o parser poderia interpretar como descrição.
        if (passos.lines().anyMatch(l -> !l.isBlank() && !l.matches("\\h*(?:Dado|Dada|Dados|Dadas|Quando|Então|E|Mas)\\h+\\S.*")))
            return false;
        var envelopes = GherkinParser.builder().build()
                .parse("cenario.feature", ("# language: pt\nFuncionalidade: Teste\nCenário: Caso\n" + passos).getBytes(StandardCharsets.UTF_8))
                .toList();
        return envelopes.stream().noneMatch(e -> e.getParseError().isPresent())
                && envelopes.stream().anyMatch(e -> e.getGherkinDocument().isPresent());
    }
    private static boolean vazio(String s) { return s == null || s.isBlank(); }
}
