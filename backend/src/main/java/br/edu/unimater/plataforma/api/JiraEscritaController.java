package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.jira.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class JiraEscritaController {
    private final JiraEscritaClient jira;
    private final PublicacaoJiraService publicacao;
    public JiraEscritaController(JiraEscritaClient jira,PublicacaoJiraService publicacao) { this.jira=jira;this.publicacao=publicacao; }
    public record StatusRequest(@NotBlank @Pattern(regexp="A_FAZER|EM_DESENVOLVIMENTO|AGUARDANDO_TESTE|EM_TESTE|REPROVADA|FINALIZADA") String status) {}
    @PutMapping("/api/demandas/{chave}/status") public Contratos.Demanda status(@PathVariable String chave,@Valid @RequestBody StatusRequest pedido) { return jira.transicionar(chave,pedido.status()); }
    @PostMapping("/api/execucoes/{id}/jira") public PublicacaoJiraService.Publicacao publicar(@PathVariable long id) { return publicacao.publicar(id); }
}
