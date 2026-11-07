package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.execucao.*;
import br.edu.unimater.plataforma.jira.JiraClient;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PlataformaController {
    private final ExecucaoService service;
    private final RegistroExecucoes registro;
    private final JiraClient jira;
    public PlataformaController(ExecucaoService service, RegistroExecucoes registro, JiraClient jira) {
        this.service = service; this.registro = registro; this.jira = jira;
    }
    @GetMapping("/saude") public Map<String, String> saude() { return Map.of("status", "UP"); }
    @GetMapping("/execucoes") public Object listar() { return service.listar(); }
    @GetMapping("/execucoes/{id}") public Execucao obter(@PathVariable long id) { return registro.obter(id); }
    @PostMapping("/execucoes") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> iniciar(@Valid @RequestBody NovaExecucaoRequest req) { return Map.of("id", service.iniciar(req)); }
    @PostMapping("/execucoes/{id}/revisao")
    public Revisao revisar(@PathVariable long id, @Valid @RequestBody RevisaoRequest req) { return registro.revisar(id, req); }
    @PutMapping("/execucoes/{id}/cenarios/{cenarioId}/execucao")
    public Map<String, Boolean> teste(@PathVariable long id, @PathVariable long cenarioId,
                                      @Valid @RequestBody(required = false) ExecucaoTeste req) {
        registro.registrarTeste(id, cenarioId, req); return Map.of("salvo", true);
    }
    @GetMapping("/demandas/{chave}") public Demanda demanda(@PathVariable String chave) { return jira.obter(chave).demanda(); }
    @PutMapping("/demandas/{chave}/status") public void status(@PathVariable String chave) {
        throw new ErroApi(HttpStatus.NOT_IMPLEMENTED, "O MVP apenas lê o Jira. Altere a situação na própria ferramenta.");
    }
    @GetMapping("/metricas") public Object metricas() { return service.metricas(); }
    @GetMapping("/conversas") public Object conversas() { return service.conversas(); }
    @GetMapping("/conversas/{id}") public Conversa conversa(@PathVariable long id) { return registro.conversa(id); }
    @PostMapping("/conversas/mensagens") public Conversa mensagem(@Valid @RequestBody MensagemRequest req) { return service.enviar(req); }
}
