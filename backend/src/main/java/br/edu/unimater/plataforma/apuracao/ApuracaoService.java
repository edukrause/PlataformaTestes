package br.edu.unimater.plataforma.apuracao;

import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.banco.*;
import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import br.edu.unimater.plataforma.execucao.RegistroExecucoes;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class ApuracaoService {
    public record Consulta(@NotNull MotorConsenso.Provedor provedor,
            @NotBlank @Size(max = 20000) String consulta) {}
    public record Pedido(@Positive Long cenarioId, @NotBlank @Size(max = 10000) String pergunta,
            boolean preservarOrdem, @NotNull @Size(min = 1, max = 3) List<@NotNull @Valid Consulta> candidatos) {}
    public record Avaliado(MotorConsenso.Provedor provedor, String consulta, Resultado resultado,
            String modelo, int tentativa, int tokensEntrada, int tokensSaida, java.math.BigDecimal custoUsd,
            long latenciaTotalMs, boolean manual) {
        public Avaliado(MotorConsenso.Provedor provedor, String consulta, Resultado resultado) {
            this(provedor, consulta, resultado, "INFORMADO_MANUALMENTE", 1, 0, 0, java.math.BigDecimal.ZERO, resultado.latenciaMs(), true);
        }
    }
    private final ConsultaBancoService consultas;
    private final CatalogoService catalogo;
    private final MotorConsenso consenso;
    private final RegistroExecucoes registro;

    public ApuracaoService(ConsultaBancoService consultas, CatalogoService catalogo, MotorConsenso consenso, RegistroExecucoes registro) {
        this.consultas = consultas; this.catalogo = catalogo; this.consenso = consenso; this.registro = registro;
    }

    public long apurar(long execucaoId, Pedido pedido) {
        var execucao = registro.obter(execucaoId);
        if (!execucao.status().equals("CONCLUIDA")) throw ErroApi.entrada("A geração ainda não foi concluída.");
        if (execucao.revisao() != null) throw ErroApi.entrada("A execução já foi revisada. Gere uma nova execução para apurar outros valores.");
        if (pedido.cenarioId() != null && execucao.cenarios().stream().noneMatch(c -> c.id() == pedido.cenarioId()))
            throw ErroApi.entrada("O cenário não pertence à execução.");
        if (pedido.candidatos().stream().map(Consulta::provedor).distinct().count() != pedido.candidatos().size())
            throw ErroApi.entrada("Informe apenas uma consulta final por provedor.");
        long inicio = System.nanoTime();
        registro.iniciarApuracao(execucaoId,false);
        try {
        var esquema = catalogo.selecionar(pedido.pergunta());
        var avaliados = new ArrayList<Avaliado>();
        for (var candidato : pedido.candidatos()) {
            Resultado resultado;
            try { resultado = consultas.consultar(candidato.consulta()); }
            catch (ErroApi e) {
                // Erros de configuração indisponibilizam toda a operação; SQL recusado só descarta o candidato.
                if (e.status() != org.springframework.http.HttpStatus.BAD_REQUEST) throw e;
                resultado = new Resultado(Verificacao.REJEITADO_SINTAXE, List.of(), List.of(), "Consulta recusada pelas regras de leitura.", 0);
            }
            avaliados.add(new Avaliado(candidato.provedor(), candidato.consulta(), resultado));
        }
        var decisao = consenso.decidir(avaliados.stream().map(a -> new MotorConsenso.Candidato(a.provedor(), a.resultado())).toList(), pedido.preservarOrdem());
        return registro.salvarApuracao(execucaoId, pedido, esquema, avaliados, decisao, (System.nanoTime() - inicio) / 1_000_000);
        } finally { registro.finalizarApuracao(execucaoId,(System.nanoTime()-inicio)/1_000_000); }
    }
}
