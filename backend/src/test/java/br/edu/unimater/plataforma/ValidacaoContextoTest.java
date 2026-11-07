package br.edu.unimater.plataforma;

import br.edu.unimater.plataforma.cenario.GeradorCenarios;
import br.edu.unimater.plataforma.ia.FiltroSaida;
import br.edu.unimater.plataforma.jira.JiraClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ValidacaoContextoTest {
    @Test void removeIdentificadoresERepeteMarcadorParaMesmoValor() {
        var f = new FiltroSaida("Maria da Silva").filtrar(
                "Maria da Silva, maria@example.com, CPF 123.456.789-00. Repetido: maria@example.com");
        assertThat(f.texto()).doesNotContain("Maria da Silva", "maria@example.com", "123.456.789-00");
        String marcador = f.correspondencias().get("maria@example.com");
        assertThat(f.texto().split(java.util.regex.Pattern.quote(marcador), -1)).hasSize(3);
    }
    @Test void extraiTextoAdfSemEnviarAtributosDeMencoes() throws Exception {
        var adf = new ObjectMapper().readTree("""
                {"type":"doc","content":[{"type":"paragraph","content":[
                  {"type":"text","text":"Testar "},
                  {"type":"mention","attrs":{"id":"conta-privada","text":"Maria"}},
                  {"type":"hardBreak"},{"type":"text","text":"Salvar"}]}]}
                """);
        assertThat(JiraClient.textoAdf(adf)).isEqualTo("Testar [PESSOA]\nSalvar\n");
    }
    @Test void validaGherkinERejeitaTextoQueSeriaInterpretadoComoDescricao() {
        assertThat(GeradorCenarios.gherkinValido("Dado que tenho um produto\nQuando salvo\nEntão vejo a confirmação")).isTrue();
        assertThat(GeradorCenarios.gherkinValido("Dado que tenho um produto\nQuando salvo")).isFalse();
        assertThat(GeradorCenarios.gherkinValido("Dado que tenho um produto\nTexto inventado\nQuando salvo\nEntão vejo a confirmação")).isFalse();
    }
}
