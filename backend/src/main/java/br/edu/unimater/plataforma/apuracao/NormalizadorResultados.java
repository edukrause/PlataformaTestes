package br.edu.unimater.plataforma.apuracao;

import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

/** Compara tabelas inteiras; nunca ordena as células de cada linha isoladamente. */
@Component
public class NormalizadorResultados {
    private static final int MAX_PERMUTACOES = 120;
    private final ObjectMapper mapper;

    public NormalizadorResultados(ObjectMapper mapper) { this.mapper = mapper; }
    public record Normalizado(String hash, String representacao) {}

    public Normalizado normalizar(Resultado resultado, boolean preservarOrdem) {
        if (resultado.verificacao() != Verificacao.VALIDO || resultado.linhas().isEmpty()
                || resultado.colunas().isEmpty() || resultado.colunas().size() > 64
                || (long) resultado.linhas().size() * resultado.colunas().size() > 100000)
            throw new IllegalArgumentException("Resultado não elegível para normalização.");
        int largura = resultado.colunas().size();
        var celulas = new ArrayList<List<String>>();
        for (var linha : resultado.linhas()) {
            if (linha.size() != largura) throw new IllegalArgumentException("Resultado com linhas de largura inconsistente.");
            var valores = new ArrayList<String>();
            for (int c = 0; c < largura; c++) valores.add(celula(linha.get(c), resultado.colunas().get(c).escala()));
            celulas.add(valores);
        }
        // A assinatura ignora o alias. Colunas ambíguas são permutadas globalmente, mantendo a relação entre células.
        var grupos = new TreeMap<String, List<Integer>>();
        var vetores = new ArrayList<String>();
        for (int c = 0; c < largura; c++) {
            int coluna = c;
            var vetor = celulas.stream().map(l -> l.get(coluna)).toList();
            vetores.add(json(vetor));
            var assinatura = new ArrayList<>(vetor);
            if (!preservarOrdem) Collections.sort(assinatura);
            grupos.computeIfAbsent(json(assinatura), k -> new ArrayList<>()).add(c);
        }
        List<List<Integer>> ordens = List.of(List.of());
        for (var grupo : grupos.values()) {
            var variantes = new ArrayList<List<Integer>>();
            permutar(grupo, vetores, new boolean[grupo.size()], new ArrayList<>(), variantes, MAX_PERMUTACOES / ordens.size());
            var novas = new ArrayList<List<Integer>>();
            for (var ordem : ordens) for (var variante : variantes) {
                var nova = new ArrayList<>(ordem);
                nova.addAll(variante);
                novas.add(nova);
            }
            ordens = novas;
        }
        String melhor = null;
        for (var ordem : ordens) {
            var linhas = new ArrayList<String>();
            for (var linha : celulas) linhas.add(json(ordem.stream().map(linha::get).toList()));
            if (!preservarOrdem) Collections.sort(linhas);
            String forma = json(List.of(largura, linhas));
            if (melhor == null || forma.compareTo(melhor) < 0) melhor = forma;
        }
        try {
            String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(melhor.getBytes(StandardCharsets.UTF_8)));
            return new Normalizado(hash, melhor);
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    private void permutar(List<Integer> grupo, List<String> vetores, boolean[] usados, List<Integer> atual,
                         List<List<Integer>> saida, int limite) {
        if (atual.size() == grupo.size()) {
            saida.add(List.copyOf(atual));
            if (saida.size() > limite) throw new IllegalArgumentException("Colunas ambíguas excedem o limite de comparação; revisão manual necessária.");
            return;
        }
        var repetidos = new HashSet<String>();
        for (int i = 0; i < grupo.size(); i++) {
            if (usados[i] || !repetidos.add(vetores.get(grupo.get(i)))) continue;
            usados[i] = true;
            atual.add(grupo.get(i));
            permutar(grupo, vetores, usados, atual, saida, limite);
            atual.removeLast();
            usados[i] = false;
        }
    }

    private String celula(Object valor, int escala) {
        if (valor == null) return json(List.of("nulo"));
        if (valor instanceof Number n) {
            try {
                if (escala > 1000) throw new IllegalArgumentException("Escala numérica excede o limite suportado.");
                var decimal = new BigDecimal(n.toString()).setScale(escala < 0 ? 2 : escala, RoundingMode.HALF_UP);
                return json(List.of("numero", decimal.stripTrailingZeros().toPlainString()));
            } catch (NumberFormatException e) { throw new IllegalArgumentException("Número não finito não pode fundamentar consenso."); }
        }
        if (valor instanceof OffsetDateTime data) return json(List.of("instante", data.toInstant().toString()));
        if (valor instanceof Instant data) return json(List.of("instante", data.toString()));
        if (valor instanceof LocalDate data) return json(List.of("data", data.toString()));
        if (valor instanceof LocalDateTime data) return json(List.of("datahora", data.toString()));
        if (valor instanceof Boolean b) return json(List.of("booleano", b.toString()));
        if (valor instanceof String s) return json(List.of("texto", s));
        throw new IllegalArgumentException("Tipo de célula não suportado para consenso.");
    }

    private String json(Object valor) {
        try { return mapper.writeValueAsString(valor); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Falha na representação canônica.", e); }
    }
}
