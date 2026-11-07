package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.banco.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/banco")
public class BancoController {
    private final ConsultaBancoService consultas;
    private final CatalogoService catalogo;
    public BancoController(ConsultaBancoService consultas, CatalogoService catalogo) { this.consultas = consultas; this.catalogo = catalogo; }

    public record SubesquemaRequest(@NotBlank @Size(max = 10000) String requisito) {}
    public record AmostraRequest(@NotBlank @Size(max = 63) String schema,
            @NotBlank @Size(max = 63) String tabela, @NotBlank @Size(max = 63) String coluna) {}

    @GetMapping("/catalogo") public CatalogoService.Catalogo catalogo() { return catalogo.obter(); }
    @PostMapping("/subesquema") public CatalogoService.Catalogo selecionar(@Valid @RequestBody SubesquemaRequest req) {
        return catalogo.selecionar(req.requisito());
    }
    @PostMapping("/amostras") public ConsultaBancoGateway.Resultado amostrar(@Valid @RequestBody AmostraRequest req) {
        return catalogo.amostrar(req.schema(), req.tabela(), req.coluna());
    }

    public record ConsultaRequest(@NotBlank @Size(max = 20000) String consulta) {}

    @PostMapping("/consultas")
    public ConsultaBancoGateway.Resultado consultar(@Valid @RequestBody ConsultaRequest req) {
        return consultas.consultar(req.consulta());
    }
}
