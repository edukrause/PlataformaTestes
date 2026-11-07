package br.edu.unimater.plataforma.ia;

import java.math.BigDecimal;
import java.util.Map;

public interface ModeloGateway {
    record Resposta(String texto, String modelo, int tokensEntrada, int tokensSaida, long latenciaMs,
                    BigDecimal custoUsd, String promptEnviado, Map<String, String> correspondencias) {}
    Resposta gerar(String sistema, String contexto);
}
