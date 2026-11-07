package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.execucao.LoteService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/lotes")
public class LoteController {
    private final LoteService service;
    public LoteController(LoteService service) { this.service=service; }
    @GetMapping public List<LoteService.Lote> listar() { return service.listar(); }
    @GetMapping("/{id}") public LoteService.Lote obter(@PathVariable long id) { return service.obter(id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public LoteService.Lote iniciar(@Valid @RequestBody LoteService.Pedido pedido) { return service.iniciar(pedido); }
}
