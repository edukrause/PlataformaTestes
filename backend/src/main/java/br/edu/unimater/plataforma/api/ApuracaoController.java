package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.apuracao.ApuracaoService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/execucoes/{id}/apuracoes")
public class ApuracaoController {
    private final ApuracaoService service;
    public ApuracaoController(ApuracaoService service) { this.service = service; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> apurar(@PathVariable long id, @Valid @RequestBody ApuracaoService.Pedido pedido) {
        return Map.of("id", service.apurar(id, pedido));
    }
}
