package br.edu.unimater.plataforma.banco;

import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("plataforma.catalogo")
public record CatalogoProperties(@NotEmpty List<@NotBlank String> schemas,
        @Size(max=100) List<String> colunasPermitidas, @Min(1) @Max(20) int maxAmostras,
        @Min(1) @Max(100) int maxTabelas, @Min(0) @Max(3) int profundidade) {
    public CatalogoProperties {
        schemas = schemas == null ? List.of("public") : List.copyOf(schemas);
        colunasPermitidas = colunasPermitidas == null ? List.of() : List.copyOf(colunasPermitidas);
    }
}
