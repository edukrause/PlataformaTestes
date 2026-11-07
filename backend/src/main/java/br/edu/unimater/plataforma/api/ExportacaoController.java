package br.edu.unimater.plataforma.api;

import br.edu.unimater.plataforma.metrica.ExportacaoService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class ExportacaoController {
    private final ExportacaoService service;
    public ExportacaoController(ExportacaoService service) { this.service=service; }
    @GetMapping("/api/metricas.csv") public ResponseEntity<String> metricas(@RequestParam(defaultValue="TODAS") String origem) { return resposta(service.metricas(origem),"metricas.csv"); }
    @GetMapping("/api/execucoes.csv") public ResponseEntity<String> execucoes() { return resposta(service.execucoes(),"execucoes.csv"); }
    @GetMapping("/api/execucoes/{id}/apuracoes.csv") public ResponseEntity<String> apuracoes(@PathVariable long id) { return resposta(service.apuracoes(id),"apuracoes-"+id+".csv"); }
    private ResponseEntity<String> resposta(String corpo,String nome) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+nome+"\"").body(corpo);
    }
}
