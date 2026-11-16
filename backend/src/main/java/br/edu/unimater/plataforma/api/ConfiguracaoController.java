package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.banco.ConsultaBancoGateway;
import br.edu.unimater.plataforma.banco.Dialeto;
import br.edu.unimater.plataforma.ia.*;
import br.edu.unimater.plataforma.jira.JiraEscritaClient;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
public class ConfiguracaoController {
    private final ModeloGateway modelo;
    private final ModelosExternos modelos;
    private final ConsultaBancoGateway banco;
    private final Dialeto dialeto;
    private final JiraEscritaClient jira;
    private final String jiraUrl,confluenceUrl;
    public ConfiguracaoController(ModeloGateway modelo,ModelosExternos modelos,ConsultaBancoGateway banco,JiraEscritaClient jira,
            @Value("${plataforma.erp.dialeto:POSTGRESQL}") Dialeto dialeto,
            @Value("${plataforma.jira.base-url}") String jiraUrl,@Value("${plataforma.confluence.base-url:}") String confluenceUrl) {
        this.modelo=modelo;this.modelos=modelos;this.banco=banco;this.dialeto=dialeto;this.jira=jira;this.jiraUrl=jiraUrl;this.confluenceUrl=confluenceUrl;
    }
    @GetMapping("/api/configuracao") public Map<String,Object> obter() {
        boolean ia;
        try { modelo.validarDisponibilidade();ia=true; } catch(RuntimeException e) { ia=false; }
        return Map.of("iaConfigurada",ia,"provedoresHabilitados",modelos.disponiveis(),"bancoHabilitado",banco.habilitado(),"dialetoBanco",dialeto.nome(),
                "jiraConfigurado",!jiraUrl.isBlank(),"confluenceConfigurado",!confluenceUrl.isBlank(),
                "jiraEscritaHabilitada",jira.habilitado(),"entradaManual",true);
    }
}
