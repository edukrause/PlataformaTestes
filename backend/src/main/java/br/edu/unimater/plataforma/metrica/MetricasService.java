package br.edu.unimater.plataforma.metrica;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.execucao.RegistroExecucoes;
import java.math.BigDecimal;
import java.math.RoundingMode;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class MetricasService {
    private final RegistroExecucoes registro;

    public MetricasService(RegistroExecucoes registro) {
        this.registro = registro;
    }

    public Metricas obter() {
        var concluidas = registro.listar().stream().filter(e -> e.status().equals("CONCLUIDA")).toList();
        Map<String, Long> decisoes = new LinkedHashMap<>();
        for (String d : List.of("ACEITO", "ACEITO_ALTERACAO", "REJEITADO")) {
            decisoes.put(d, concluidas.stream()
                    .filter(e -> e.revisao() != null && e.revisao().decisao().equals(d)).count());
        }
        var apuracoes = concluidas.stream().flatMap(e -> e.apuracoes().stream()).toList();
        Map<String, Long> desfechos = new LinkedHashMap<>();
        for (String d : List.of("UNANIME", "MAIORIA", "DIVERGENTE", "FALHA"))
            desfechos.put(d, apuracoes.stream().filter(a -> a.path("desfecho").asText().equals(d)).count());
        var candidatos = apuracoes.stream().flatMap(a -> {
            var lista = new ArrayList<JsonNode>();
            a.path("candidatos").forEach(lista::add);
            return lista.stream();
        }).toList();
        var provedores = List.of("CLAUDE", "GEMINI", "LLAMA").stream()
                .map(p -> {
                    var cs = candidatos.stream().filter(c -> c.path("provedor").asText().equals(p)).toList();
                    return new MetricaProvedor(p, cs.size(), cs.stream().filter(c -> c.path("verificacao").asText().equals("VALIDO")).count(),
                            cs.stream().map(c -> c.path("custoUsd").decimalValue()).reduce(BigDecimal.ZERO, BigDecimal::add),
                            cs.stream().mapToLong(c -> c.path("latenciaMs").asLong()).average().orElse(0));
                }).toList();
        var custo = candidatos.stream().map(c -> c.path("custoUsd").decimalValue()).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Metricas(concluidas.size(), apuracoes.size(), desfechos,
                decisoes, 0, apuracoes.isEmpty() ? BigDecimal.ZERO : custo.divide(BigDecimal.valueOf(apuracoes.size()), 10, RoundingMode.HALF_UP),
                apuracoes.stream().mapToLong(a -> a.path("tempoTotalMs").asLong()).average().orElse(0) / 1000.0, provedores);
    }
}
