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
    public static final String VERSAO = "cenarios-v2";
    private final ObjectMapper mapper;
    private final String prompt;
    public GeradorCenarios(ObjectMapper mapper) throws IOException {
        this.mapper = mapper;
        prompt = new ClassPathResource("prompts/" + VERSAO + ".txt").getContentAsString(StandardCharsets.UTF_8);
    }
    public record CenarioGerado(String tipo, String titulo, String gherkin, String resultadoEsperado,
            String perguntaApuracao, boolean preservarOrdem) {}
    public record AtencaoGerada(String tipo, String texto) {}
    public record Geracao(String area, Boolean exigeApuracao, List<CenarioGerado> cenarios, List<AtencaoGerada> pontosAtencao) {}
    public String prompt() { return prompt; }
    public Geracao validar(ModeloGateway.Resposta resposta) {
        return validar(resposta, false);
    }
    public Geracao validar(ModeloGateway.Resposta resposta, boolean documentacaoDisponivel) {
        try {
            if (!resposta.completa()) throw new IllegalArgumentException();
            var g = mapper.readValue(resposta.texto(), Geracao.class);
            if (g == null || g.area() == null || !g.area().matches("ESTOQUE|VENDAS|NAO_IDENTIFICADA") || g.exigeApuracao() == null
                    || g.cenarios() == null || g.cenarios().isEmpty() || g.cenarios().size() > 20 || g.pontosAtencao() == null)
                throw new IllegalArgumentException();
            for (var c : g.cenarios()) {
                boolean pergunta = c != null && c.perguntaApuracao() != null && !c.perguntaApuracao().isBlank();
                if (c == null || (pergunta && !g.exigeApuracao())
                        || (!pergunta && ((c.gherkin()!=null&&c.gherkin().contains("«VALOR_APURADO»"))
                        || (c.resultadoEsperado()!=null&&c.resultadoEsperado().contains("«VALOR_APURADO»"))))) throw new IllegalArgumentException();
                if (!("ALTERACAO".equals(c.tipo()) || (documentacaoDisponivel && "REGRESSAO".equals(c.tipo())))
                        || (c.perguntaApuracao() != null && c.perguntaApuracao().length() > 10000)
                        || vazio(c.titulo()) || c.titulo().length()>1000 || c.titulo().contains("\n") || c.titulo().contains("\r")
                        || vazio(c.resultadoEsperado()) || c.resultadoEsperado().length()>30000
                        || c.gherkin()==null || c.gherkin().length()>30000 || !gherkinValido(c.gherkin())) throw new IllegalArgumentException();
            }
            for (var a : g.pontosAtencao()) {
                if (a.tipo() == null || !a.tipo().matches("AMBIGUIDADE|MASSA|DOCUMENTACAO|REGRESSAO") || vazio(a.texto()))
                    throw new IllegalArgumentException();
            }
            return g;
        } catch (IOException | IllegalArgumentException e) {
            throw new ErroApi(HttpStatus.BAD_GATEWAY, "O modelo retornou cenários fora do contrato ou Gherkin inválido.");
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
