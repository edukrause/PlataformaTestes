package br.edu.unimater.plataforma.metrica;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.execucao.RegistroExecucoes;
import java.math.BigDecimal;
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
        // O módulo 2 ainda não executa consultas. Não misturar geração com apuração.
        var provedores = List.of("CLAUDE", "GEMINI", "LLAMA").stream()
                .map(p -> new MetricaProvedor(p, 0, 0, BigDecimal.ZERO, 0)).toList();
        return new Metricas(concluidas.size(), 0,
                Map.of("UNANIME", 0L, "MAIORIA", 0L, "DIVERGENTE", 0L, "FALHA", 0L),
                decisoes, 0, BigDecimal.ZERO, 0, provedores);
    }
}
