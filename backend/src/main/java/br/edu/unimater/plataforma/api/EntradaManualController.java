package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.execucao.EntradaManualService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class EntradaManualController {
    private final EntradaManualService service;
    public EntradaManualController(EntradaManualService service) { this.service=service; }
    @PostMapping("/api/execucoes/manuais") @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Long> criar(@Valid @RequestBody EntradaManualService.Pedido pedido) { return Map.of("id",service.criar(pedido)); }
}
