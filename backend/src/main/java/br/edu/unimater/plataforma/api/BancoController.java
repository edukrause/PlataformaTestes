package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.banco.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/banco")
public class BancoController {
    private final ConsultaBancoService consultas;
    public BancoController(ConsultaBancoService consultas) { this.consultas = consultas; }

    public record ConsultaRequest(@NotBlank @Size(max = 20000) String consulta) {}

    @PostMapping("/consultas")
    public ConsultaBancoGateway.Resultado consultar(@Valid @RequestBody ConsultaRequest req) {
        return consultas.consultar(req.consulta());
    }
}
