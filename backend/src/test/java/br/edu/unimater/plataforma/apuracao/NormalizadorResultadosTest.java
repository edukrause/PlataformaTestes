package br.edu.unimater.plataforma.apuracao;

import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class NormalizadorResultadosTest {
    private final NormalizadorResultados normalizador = new NormalizadorResultados(new ObjectMapper());

    private Resultado tabela(String[] nomes, int[] escalas, Object[]... linhas) {
        var colunas = new ArrayList<Coluna>();
        for (int c = 0; c < nomes.length; c++) colunas.add(new Coluna(nomes[c], "numeric", escalas[c]));
        return new Resultado(Verificacao.VALIDO, colunas, Arrays.stream(linhas).map(Arrays::asList).toList(), null, 0);
    }
    private Resultado uma(Object valor, int escala) { return tabela(new String[]{"valor"}, new int[]{escala}, new Object[]{valor}); }
    private String hash(Resultado r) { return normalizador.normalizar(r, false).hash(); }

    @Test void ignoraAliasesOrdemDasColunasEDasLinhas() {
        var a = tabela(new String[]{"id", "total"}, new int[]{0, 2}, new Object[]{1, new BigDecimal("12.30")}, new Object[]{2, new BigDecimal("20.00")});
        var b = tabela(new String[]{"soma", "codigo"}, new int[]{2, 0}, new Object[]{new BigDecimal("20"), 2}, new Object[]{new BigDecimal("12.3"), 1});
        assertThat(hash(a)).isEqualTo(hash(b)).hasSize(64);
    }

    @Test void preservaOrdemQuandoRequisitoExige() {
        var a = tabela(new String[]{"id"}, new int[]{0}, new Object[]{1}, new Object[]{2});
        var b = tabela(new String[]{"id"}, new int[]{0}, new Object[]{2}, new Object[]{1});
        assertThat(hash(a)).isEqualTo(hash(b));
        assertThat(normalizador.normalizar(a, true).hash()).isNotEqualTo(normalizador.normalizar(b, true).hash());
    }

    @Test void naoConfundeNuloTextoNumeroEBooleano() {
        assertThat(hash(uma(null, 0))).isNotEqualTo(hash(uma("", 0))).isNotEqualTo(hash(uma("nulo", 0)));
        assertThat(hash(uma(1, 0))).isNotEqualTo(hash(uma("1", 0))).isNotEqualTo(hash(uma(true, 0)));
    }

    @Test void aplicaEscalaConhecidaOuDuasCasasQuandoDesconhecida() {
        assertThat(hash(uma(new BigDecimal("12.345"), -1))).isEqualTo(hash(uma(new BigDecimal("12.35"), 2)));
        assertThat(hash(uma(new BigDecimal("12.345"), 3))).isNotEqualTo(hash(uma(new BigDecimal("12.35"), 2)));
        assertThat(hash(uma(new BigDecimal("0.0000000000000000000001"), 22))).isNotEqualTo(hash(uma(BigDecimal.ZERO, 22)));
    }

    @Test void normalizaInstanteSemConfundirDataETexto() {
        assertThat(hash(uma(OffsetDateTime.parse("2026-11-06T15:00:00-03:00"), 0)))
                .isEqualTo(hash(uma(Instant.parse("2026-11-06T18:00:00Z"), 0)));
        assertThat(hash(uma(LocalDate.parse("2026-11-06"), 0))).isNotEqualTo(hash(uma("2026-11-06", 0)));
    }

    @Test void preservaLinhasDuplicadasERelacaoEntreColunas() {
        var uma = tabela(new String[]{"id"}, new int[]{0}, new Object[]{1});
        var duas = tabela(new String[]{"id"}, new int[]{0}, new Object[]{1}, new Object[]{1});
        assertThat(hash(uma)).isNotEqualTo(hash(duas));
        var cruzado = tabela(new String[]{"a", "b"}, new int[]{0, 0}, new Object[]{1, 2}, new Object[]{2, 1});
        var repetido = tabela(new String[]{"x", "y"}, new int[]{0, 0}, new Object[]{1, 2}, new Object[]{1, 2});
        var pareado = tabela(new String[]{"a", "b"}, new int[]{0, 0}, new Object[]{1, 1}, new Object[]{2, 2});
        assertThat(hash(cruzado)).isNotEqualTo(hash(repetido)).isNotEqualTo(hash(pareado));
    }

    @Test void resolveColunasAmbiguasComPermutacaoGlobal() {
        var a = tabela(new String[]{"a", "b", "c"}, new int[]{0, 0, 0}, new Object[]{1, 2, 3}, new Object[]{2, 3, 1}, new Object[]{3, 1, 2});
        var b = tabela(new String[]{"x", "y", "z"}, new int[]{0, 0, 0}, new Object[]{2, 3, 1}, new Object[]{3, 1, 2}, new Object[]{1, 2, 3});
        assertThat(hash(a)).isEqualTo(hash(b));
    }

    @Test void ambiguidadesExcessivasNaoGeramHashAproximado() {
        var linhas = new Object[6][6];
        for (int l = 0; l < 6; l++) for (int c = 0; c < 6; c++) linhas[l][c] = (l + c) % 6;
        var resultado = tabela(new String[]{"a", "b", "c", "d", "e", "f"}, new int[6], linhas);
        assertThatThrownBy(() -> hash(resultado)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("ambíguas");
        for (Object[] linha : linhas) Arrays.fill(linha, null);
        assertThat(hash(tabela(new String[]{"a", "b", "c", "d", "e", "f"}, new int[6], linhas))).hasSize(64);
    }

    @Test void rejeitaVazioInconsistenteENumeroNaoFinito() {
        assertThatThrownBy(() -> hash(tabela(new String[]{"id"}, new int[]{0}))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> hash(tabela(new String[]{"id"}, new int[]{0}, new Object[]{1, 2}))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> hash(uma(Double.NaN, 2))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void concordaComComparacaoExaustivaDeTabelasDoisPorDois() {
        var porHash = new HashMap<String, String>();
        var porForma = new HashMap<String, String>();
        for (int codigo = 0; codigo < 81; codigo++) {
            int resto = codigo;
            int[][] valores = new int[2][2];
            for (int l = 0; l < 2; l++) for (int c = 0; c < 2; c++) { valores[l][c] = resto % 3; resto /= 3; }
            var alternativas = new ArrayList<String>();
            for (int linha = 0; linha < 2; linha++) for (int coluna = 0; coluna < 2; coluna++)
                alternativas.add("" + valores[linha][coluna] + valores[linha][1-coluna]
                        + valores[1-linha][coluna] + valores[1-linha][1-coluna]);
            String forma = Collections.min(alternativas);
            String hash = hash(tabela(new String[]{"a", "b"}, new int[]{0, 0},
                    new Object[]{valores[0][0], valores[0][1]}, new Object[]{valores[1][0], valores[1][1]}));
            assertThat(porHash.computeIfAbsent(hash, k -> forma)).isEqualTo(forma);
            assertThat(porForma.computeIfAbsent(forma, k -> hash)).isEqualTo(hash);
        }
    }
}
