package br.edu.unimater.plataforma.banco;

import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("plataforma.postgres")
public record PostgresProperties(boolean habilitado, @NotNull String url, @NotNull String usuario,
        @NotNull String senha, @Min(1) @Max(60) int timeoutSegundos,
        @Min(1) @Max(10000) int maxLinhas, @Min(1024) @Max(10000000) int maxCaracteres) {}
