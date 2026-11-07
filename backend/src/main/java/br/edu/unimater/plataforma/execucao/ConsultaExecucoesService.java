package br.edu.unimater.plataforma.execucao;

import br.edu.unimater.plataforma.api.Contratos.ResumoExecucao;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ConsultaExecucoesService {
    private final RegistroExecucoes registro;

    public ConsultaExecucoesService(RegistroExecucoes registro) {
        this.registro = registro;
    }

    public List<ResumoExecucao> listar() {
        return registro.listar().stream().map(e -> new ResumoExecucao(
                e.id(), e.tarefa().chaveJira(), e.tarefa().titulo(), e.tarefa().area(), e.status(), e.iniciadaEm(),
                e.tempoTotalMs(), e.custoTotalUsd(), e.cenarios().size(), List.of(),
                e.revisao() == null ? null : e.revisao().decisao(), e.tarefa().documentacaoRef(),
                0, 0, registro.demandaSalva(e.id()))).toList();
    }
}
