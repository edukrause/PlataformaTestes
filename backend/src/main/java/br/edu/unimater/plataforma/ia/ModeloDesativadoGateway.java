package br.edu.unimater.plataforma.ia;

import br.edu.unimater.plataforma.api.ErroApi;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Mantém histórico e revisão disponíveis enquanto a integração de IA fica para depois. */
@Component
@ConditionalOnProperty(name = "plataforma.ia.modo", havingValue = "desativada", matchIfMissing = true)
public class ModeloDesativadoGateway implements ModeloGateway {
    @Override
    public void validarDisponibilidade() {
        throw ErroApi.configuracao("A geração por IA está desativada. O histórico e a revisão continuam disponíveis.");
    }

    @Override
    public Resposta gerar(String sistema, String contexto) {
        validarDisponibilidade();
        throw new IllegalStateException("Geração desativada.");
    }
}
