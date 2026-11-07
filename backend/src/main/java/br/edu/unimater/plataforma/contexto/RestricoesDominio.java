package br.edu.unimater.plataforma.contexto;

import br.edu.unimater.plataforma.api.ErroApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RestricoesDominio {
    private final String regras;
    public RestricoesDominio(@Value("${plataforma.dominio.regras:}") String regras) { this.regras = regras; }
    public String contexto(boolean obrigatorio) {
        if (obrigatorio && regras.isBlank()) throw ErroApi.configuracao("Configure DOMINIO_REGRAS com empresa, filial, cancelados e exclusão lógica aplicáveis à apuração.");
        return regras.isBlank() ? "Restrições de empresa/filial/cancelados/exclusão lógica não informadas; não invente filtros. Sinalize ambiguidades."
                : "Restrições obrigatórias do domínio:\n" + regras;
    }
}
