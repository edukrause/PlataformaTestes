package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.execucao.*;
import br.edu.unimater.plataforma.contexto.RequisitoGateway;
import br.edu.unimater.plataforma.conversa.ConversaService;
import br.edu.unimater.plataforma.metrica.MetricasService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PlataformaController {
    private final ExecucaoService service;
    private final RegistroExecucoes registro;
    private final RequisitoGateway requisitos;
    private final ConsultaExecucoesService consultas;
    private final ConversaService conversas;
    private final MetricasService metricas;
    public PlataformaController(ExecucaoService service, RegistroExecucoes registro, RequisitoGateway requisitos,
            ConsultaExecucoesService consultas, ConversaService conversas, MetricasService metricas) {
        this.service = service; this.registro = registro; this.requisitos = requisitos;
        this.consultas = consultas; this.conversas = conversas; this.metricas = metricas;
    }
    @GetMapping("/saude") public Map<String, String> saude() { return Map.of("status", "UP"); }
    @GetMapping("/execucoes") public List<ResumoExecucao> listar() { return consultas.listar(); }
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
    @GetMapping("/demandas/{chave}") public Demanda demanda(@PathVariable String chave) { return requisitos.obter(chave).demanda(); }
    @PutMapping("/demandas/{chave}/status") public void status(@PathVariable String chave) {
        throw new ErroApi(HttpStatus.NOT_IMPLEMENTED, "O MVP apenas lê o Jira. Altere a situação na própria ferramenta.");
    }
    @GetMapping("/metricas") public Metricas metricas() { return metricas.obter(); }
    @GetMapping("/conversas") public List<ResumoConversa> conversas() { return conversas.listar(); }
    @GetMapping("/conversas/{id}") public Conversa conversa(@PathVariable long id) { return registro.conversa(id); }
    @PostMapping("/conversas/mensagens") public Conversa mensagem(@Valid @RequestBody MensagemRequest req) { return conversas.enviar(req); }
}
