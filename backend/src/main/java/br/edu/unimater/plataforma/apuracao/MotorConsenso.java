package br.edu.unimater.plataforma.apuracao;

import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class MotorConsenso {
    public enum Provedor { CLAUDE, GEMINI, LLAMA }
    public enum Desfecho { UNANIME, MAIORIA, DIVERGENTE, FALHA }
    public record Candidato(Provedor provedor, Resultado resultado) {}
    public record Decisao(Desfecho desfecho, Resultado resultadoReferencia,
                          Map<Provedor, String> hashes, Map<Provedor, String> descartes) {}
    private final NormalizadorResultados normalizador;

    public MotorConsenso(NormalizadorResultados normalizador) { this.normalizador = normalizador; }

    public Decisao decidir(List<Candidato> candidatos, boolean preservarOrdem) {
        if (candidatos == null || candidatos.size() > 3) throw new IllegalArgumentException("Informe até três provedores distintos.");
        var vistos = EnumSet.noneOf(Provedor.class);
        var hashes = new EnumMap<Provedor, String>(Provedor.class);
        var descartes = new EnumMap<Provedor, String>(Provedor.class);
        var grupos = new LinkedHashMap<String, List<Candidato>>();
        for (var candidato : candidatos) {
            if (candidato == null || candidato.provedor() == null || candidato.resultado() == null || !vistos.add(candidato.provedor()))
                throw new IllegalArgumentException("Cada provedor pode contribuir com apenas um resultado final.");
            if (candidato.resultado().verificacao() != Verificacao.VALIDO) {
                descartes.put(candidato.provedor(), candidato.resultado().verificacao().name());
                continue;
            }
            try {
                var normalizado = normalizador.normalizar(candidato.resultado(), preservarOrdem);
                hashes.put(candidato.provedor(), normalizado.hash());
                // A representação completa também é comparada; o hash serve à rastreabilidade.
                grupos.computeIfAbsent(normalizado.representacao(), k -> new ArrayList<>()).add(candidato);
            } catch (IllegalArgumentException e) { descartes.put(candidato.provedor(), e.getMessage()); }
        }
        var vencedor = grupos.values().stream().filter(g -> g.size() >= 2).findFirst();
        if (vencedor.isPresent()) {
            var grupo = vencedor.get();
            return new Decisao(grupo.size() == 3 ? Desfecho.UNANIME : Desfecho.MAIORIA,
                    grupo.getFirst().resultado(), Map.copyOf(hashes), Map.copyOf(descartes));
        }
        return new Decisao(hashes.size() >= 2 ? Desfecho.DIVERGENTE : Desfecho.FALHA,
                null, Map.copyOf(hashes), Map.copyOf(descartes));
    }
}
