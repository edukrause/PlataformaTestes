package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.apuracao.ApuracaoService;
import br.edu.unimater.plataforma.apuracao.ApuracaoAutomatica;
import jakarta.validation.constraints.*;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/execucoes/{id}/apuracoes")
public class ApuracaoController {
    private final ApuracaoService service;
    private final ApuracaoAutomatica automatica;
    public ApuracaoController(ApuracaoService service, ApuracaoAutomatica automatica) { this.service = service; this.automatica = automatica; }
    public record PedidoAutomatico(@Positive Long cenarioId, @NotBlank @Size(max = 10000) String pergunta, boolean preservarOrdem) {}
    @PostMapping("/automaticas") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> automatica(@PathVariable long id, @Valid @RequestBody PedidoAutomatico pedido) {
        return Map.of("id", automatica.apurar(id, pedido.cenarioId(), pedido.pergunta(), pedido.preservarOrdem()));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> apurar(@PathVariable long id, @Valid @RequestBody ApuracaoService.Pedido pedido) {
        return Map.of("id", service.apurar(id, pedido));
    }
}
