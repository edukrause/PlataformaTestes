package br.edu.unimater.plataforma.conversa;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.execucao.ExecucaoService;
import br.edu.unimater.plataforma.execucao.RegistroExecucoes;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class ConversaService {
    private final ExecucaoService execucoes;
    private final RegistroExecucoes registro;

    public ConversaService(ExecucaoService execucoes, RegistroExecucoes registro) {
        this.execucoes = execucoes;
        this.registro = registro;
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
                id = execucoes.iniciar(new NovaExecucaoRequest(chave, req.usarDocumentacao()));
                var exec = registro.obter(id);
                resposta = exec.status().equals("CONCLUIDA")
                        ? "Gerei " + exec.cenarios().size() + " cenários para **" + chave
                            + "** a partir do requisito. Abra a execução para conferir. A documentação e a apuração SQL ainda estão pendentes."
                        : "Não consegui gerar os cenários de **" + chave + "**. " + exec.mensagemErro();
            } catch (ErroApi erro) {
                resposta = "Não consegui processar **" + chave + "**. " + erro.getMessage();
            }
        } else {
            resposta = "Informe a chave de uma tarefa, como **PROJ-123**, para gerar cenários Gherkin quando a integração de IA estiver disponível. "
                    + "Esta primeira versão usa o requisito do Jira, salva o histórico e recebe a conferência do analista. "
                    + "Confluence, apuração SQL e perguntas livres sobre os resultados ainda não estão disponíveis.";
        }
        registro.mensagem(conversaId, "ASSISTENTE", resposta, id);
        return registro.conversa(conversaId);
    }
    public List<ResumoConversa> listar() {
        return registro.conversas().stream().map(c -> new ResumoConversa(c.id(), c.titulo(),
                c.mensagens().isEmpty() ? c.criadaEm() : c.mensagens().getLast().enviadaEm(),
                c.mensagens().stream().filter(x -> x.execucaoId() != null)
                        .findFirst().map(x -> registro.obter(x.execucaoId()).tarefa().chaveJira()).orElse(null)))
                .toList();
    }
}
