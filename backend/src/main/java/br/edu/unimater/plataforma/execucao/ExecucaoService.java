package br.edu.unimater.plataforma.execucao;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.cenario.GeradorCenarios;
import br.edu.unimater.plataforma.ia.ModeloGateway;
import br.edu.unimater.plataforma.jira.JiraClient;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ExecucaoService {
    private final JiraClient jira;
    private final ModeloGateway modelo;
    private final GeradorCenarios gerador;
    private final RegistroExecucoes registro;
    private final JdbcTemplate db;
    public ExecucaoService(JiraClient jira, ModeloGateway modelo, GeradorCenarios gerador, RegistroExecucoes registro, JdbcTemplate db) {
        this.jira = jira; this.modelo = modelo; this.gerador = gerador; this.registro = registro; this.db = db;
    }
    @EventListener(ApplicationReadyEvent.class)
    public void recuperarInterrompidas() {
        db.update("UPDATE execucao SET status='ERRO',mensagem_erro='Geração interrompida pelo encerramento da aplicação. Gere novamente.' WHERE status='EM_ANDAMENTO'");
    }
    public long iniciar(NovaExecucaoRequest req) {
        // Confluence ainda não é chamado; o resultado sempre informa que usou apenas o requisito.
        long inicio = System.nanoTime();
        var requisito = jira.obter(req.chaveJira());
        long id = registro.iniciar(requisito);
        try {
            String contexto = "Título: " + requisito.titulo() + "\nÁrea informada no Jira: " + requisito.areaHint()
                    + "\nRequisito:\n" + requisito.texto();
            var resposta = modelo.gerar(gerador.prompt(), contexto);
            registro.auditar(id, resposta);
            var geracao = gerador.validar(resposta);
            registro.concluir(id, geracao, (System.nanoTime() - inicio) / 1_000_000);
        } catch (ErroApi erro) {
            registro.falhar(id, erro.getMessage(), (System.nanoTime() - inicio) / 1_000_000);
        } catch (RuntimeException erro) {
            registro.falhar(id, "Não foi possível finalizar a geração. Confira a configuração local.", (System.nanoTime() - inicio) / 1_000_000);
        }
        return id;
    }
    public Conversa enviar(MensagemRequest req) {
        if (req.conversaId() != null) registro.conversa(req.conversaId());
        long conversaId = req.conversaId() == null ? registro.criarConversa(req.texto().strip()) : req.conversaId();
        registro.mensagem(conversaId, "USUARIO", req.texto().strip(), null);
        var matcher = Pattern.compile("(?i)\\b[A-Z][A-Z0-9_]*-[1-9][0-9]*\\b").matcher(req.texto());
        String resposta;
        Long id = null;
        if (matcher.find()) {
            String chave = matcher.group().toUpperCase(Locale.ROOT);
            try {
                id = iniciar(new NovaExecucaoRequest(chave, req.usarDocumentacao()));
                var exec = registro.obter(id);
                resposta = exec.status().equals("CONCLUIDA")
                        ? "Gerei " + exec.cenarios().size() + " cenários para **" + chave
                            + "** a partir do requisito. Abra a execução para conferir. A documentação e a apuração SQL ainda estão pendentes."
                        : "Não consegui gerar os cenários de **" + chave + "**. " + exec.mensagemErro();
            } catch (ErroApi erro) {
                resposta = "Não consegui consultar **" + chave + "**. " + erro.getMessage();
            }
        } else {
            resposta = "Informe a chave de uma tarefa, como **PROJ-123**, para gerar cenários Gherkin com Claude. "
                    + "Esta primeira versão usa o requisito do Jira, salva o histórico e recebe a conferência do analista. "
                    + "Confluence, apuração SQL e perguntas livres sobre os resultados ainda não estão disponíveis.";
        }
        registro.mensagem(conversaId, "ASSISTENTE", resposta, id);
        return registro.conversa(conversaId);
    }
    public List<Map<String, Object>> listar() {
        return registro.listar().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.id()); m.put("chaveJira", e.tarefa().chaveJira()); m.put("titulo", e.tarefa().titulo());
            m.put("area", e.tarefa().area()); m.put("status", e.status()); m.put("iniciadaEm", e.iniciadaEm());
            m.put("tempoTotalMs", e.tempoTotalMs()); m.put("custoTotalUsd", e.custoTotalUsd());
            m.put("qtdCenarios", e.cenarios().size()); m.put("desfechos", List.of());
            m.put("decisao", e.revisao() == null ? null : e.revisao().decisao());
            m.put("documentacaoRef", null); m.put("qtdApuracoes", 0); m.put("qtdComReferencia", 0);
            m.put("demanda", registro.demandaSalva(e.id()));
            return m;
        }).toList();
    }
    public List<Map<String, Object>> conversas() {
        return registro.conversas().stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.id()); m.put("titulo", c.titulo());
            m.put("atualizadaEm", c.mensagens().isEmpty() ? c.criadaEm() : c.mensagens().getLast().enviadaEm());
            m.put("chaveJira", c.mensagens().stream().filter(x -> x.execucaoId() != null)
                    .findFirst().map(x -> registro.obter(x.execucaoId()).tarefa().chaveJira()).orElse(null));
            return m;
        }).toList();
    }
    public Map<String, Object> metricas() {
        var concluidas = registro.listar().stream().filter(e -> e.status().equals("CONCLUIDA")).toList();
        Map<String, Long> decisoes = new LinkedHashMap<>();
        for (String d : List.of("ACEITO", "ACEITO_ALTERACAO", "REJEITADO"))
            decisoes.put(d, concluidas.stream().filter(e -> e.revisao() != null && e.revisao().decisao().equals(d)).count());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalExecucoes", concluidas.size()); m.put("totalApuracoes", 0);
        m.put("desfechos", Map.of("UNANIME", 0, "MAIORIA", 0, "DIVERGENTE", 0, "FALHA", 0));
        m.put("decisoes", decisoes); m.put("valoresAlteradosPct", 0); m.put("custoMedioApuracaoUsd", 0);
        m.put("tempoMedioApuracaoS", 0);
        m.put("porProvedor", List.of("CLAUDE", "GEMINI", "LLAMA").stream().map(p ->
                Map.of("provedor", p, "candidatos", 0, "validos", 0, "custoUsd", 0, "latenciaMediaMs", 0)).toList());
        // Geração de cenários não é uma apuração; sua auditoria não entra nos indicadores do módulo 2.
        return m;
    }
}
