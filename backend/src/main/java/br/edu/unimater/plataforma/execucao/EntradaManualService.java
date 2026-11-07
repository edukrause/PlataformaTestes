package br.edu.unimater.plataforma.execucao;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.cenario.GeradorCenarios;
import br.edu.unimater.plataforma.contexto.RequisitoGateway.Requisito;
import br.edu.unimater.plataforma.ia.ModeloGateway.Resposta;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EntradaManualService {
    public record Pedido(@NotBlank @Pattern(regexp="[A-Za-z][A-Za-z0-9_]*-[1-9][0-9]*") String chaveJira,
            @NotBlank @Size(max=1000) String titulo, @NotBlank @Size(max=100000) String requisito,
            @NotNull GeradorCenarios.Geracao geracao) {}
    private final RegistroExecucoes registro;
    private final GeradorCenarios gerador;
    private final ObjectMapper mapper;
    private final JdbcTemplate db;
    public EntradaManualService(RegistroExecucoes registro, GeradorCenarios gerador, ObjectMapper mapper, JdbcTemplate db) {
        this.registro=registro; this.gerador=gerador; this.mapper=mapper; this.db=db;
    }
    @Transactional
    public long criar(Pedido pedido) {
        GeradorCenarios.Geracao geracao;
        try {
            geracao=gerador.validar(new Resposta(mapper.writeValueAsString(pedido.geracao()), "MANUAL", 0,0,0,
                    BigDecimal.ZERO,"",Map.of()));
        } catch (Exception e) { throw br.edu.unimater.plataforma.api.ErroApi.entrada("Informe cenários de alteração válidos em Gherkin e os campos da geração."); }
        String chave=pedido.chaveJira().toUpperCase(java.util.Locale.ROOT);
        long id=registro.iniciar(new Requisito(chave,pedido.titulo(),pedido.requisito(),geracao.area(),
                new Demanda(chave,"A_FAZER",Instant.now().toString(),null,null)));
        db.update("UPDATE tarefa SET origem='MANUAL' WHERE id=(SELECT tarefa_id FROM execucao WHERE id=?)",id);
        registro.concluir(id,geracao,0,null);
        registro.finalizarTempo(id,0);
        return id;
    }
}
