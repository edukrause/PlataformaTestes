package br.edu.unimater.plataforma.ia;

import br.edu.unimater.plataforma.apuracao.MotorConsenso.Provedor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "plataforma.ia.modo", havingValue = "externa")
public class ModeloExternoGateway implements ModeloGateway {
    private final ModelosExternos modelos;
    private final Provedor provedor;
    public ModeloExternoGateway(ModelosExternos modelos, @Value("${plataforma.ia.provedor:GEMINI}") Provedor provedor) {
        this.modelos = modelos; this.provedor = provedor;
    }
    @Override public void validarDisponibilidade() { modelos.validar(provedor); }
    @Override public Resposta gerar(String sistema, String contexto) { return modelos.gerar(provedor, sistema, contexto); }
}
