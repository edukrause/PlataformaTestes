package br.edu.unimater.plataforma.ia;

import br.edu.unimater.plataforma.apuracao.MotorConsenso.Provedor;
import java.util.Map;
import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("plataforma.modelos")
public record ModelosProperties(Map<Provedor, Config> provedores, @Min(256) @Max(32000) int maxTokens) {
    public record Config(boolean habilitado, String chave, String modelo, String precoEntrada, String precoSaida) {}
}
