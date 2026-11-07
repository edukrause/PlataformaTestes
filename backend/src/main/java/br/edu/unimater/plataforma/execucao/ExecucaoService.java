package br.edu.unimater.plataforma.execucao;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.cenario.GeradorCenarios;
import br.edu.unimater.plataforma.ia.ModeloGateway;
import br.edu.unimater.plataforma.contexto.RequisitoGateway;
import br.edu.unimater.plataforma.contexto.DocumentacaoGateway;
import br.edu.unimater.plataforma.contexto.RestricoesDominio;
import br.edu.unimater.plataforma.apuracao.ApuracaoAutomatica;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ExecucaoService {
    private final RequisitoGateway requisitos;
    private final ModeloGateway modelo;
    private final GeradorCenarios gerador;
    private final RegistroExecucoes registro;
    private final JdbcTemplate db;
    private final DocumentacaoGateway documentacao;
    private final RestricoesDominio dominio;
    private final ApuracaoAutomatica apuracao;
    public ExecucaoService(RequisitoGateway requisitos, ModeloGateway modelo, GeradorCenarios gerador, RegistroExecucoes registro, JdbcTemplate db,
            DocumentacaoGateway documentacao, RestricoesDominio dominio, ApuracaoAutomatica apuracao) {
        this.requisitos = requisitos; this.modelo = modelo; this.gerador = gerador; this.registro = registro; this.db = db;
        this.documentacao = documentacao; this.dominio = dominio; this.apuracao = apuracao;
    }
    @EventListener(ApplicationReadyEvent.class)
    public void recuperarInterrompidas() {
        db.update("UPDATE execucao SET status='ERRO',mensagem_erro='Execução interrompida pelo encerramento da aplicação. Gere novamente.' WHERE status='EM_ANDAMENTO' OR (status='CONCLUIDA' AND etapa='APURACAO')");
    }
    public long iniciar(NovaExecucaoRequest req) {
        long inicio = System.nanoTime();
        modelo.validarDisponibilidade();
        var requisito = requisitos.obter(req.chaveJira());
        long id = registro.iniciar(requisito);
        try {
            var doc = req.usarDocumentacao() ? documentacao.obter(requisito.chave(), requisito.areaHint()) : null;
            String contexto = "Título: " + requisito.titulo() + "\nÁrea informada no Jira: " + requisito.areaHint()
                    + "\nRequisito:\n" + requisito.texto() + "\n" + dominio.contexto(false)
                    + (doc == null ? "\nDocumentação não fornecida. Não gere regressão."
                            : "\nDocumentação funcional fornecida (versão " + doc.versao() + "):\n" + doc.texto());
            GeradorCenarios.Geracao geracao = null;
            String correcao = "";
            for (int tentativa = 0; tentativa < 2; tentativa++) {
                var resposta = modelo.gerar(gerador.prompt(), contexto + correcao);
                registro.auditar(id, resposta);
                try { geracao = gerador.validar(resposta, doc != null); break; }
                catch (ErroApi e) {
                    if (tentativa == 1) throw e;
                    correcao = "\nSua resposta anterior violou o contrato JSON ou Gherkin. Gere novamente respeitando as instruções e o contexto.";
                }
            }
            registro.concluir(id, geracao, (System.nanoTime() - inicio) / 1_000_000, doc);
            var cenarios = registro.obter(id).cenarios();
            for (int i = 0; i < geracao.cenarios().size(); i++) {
                var c = geracao.cenarios().get(i);
                if (c.perguntaApuracao() == null || c.perguntaApuracao().isBlank()) continue;
                try { apuracao.apurar(id, cenarios.get(i).id(), c.perguntaApuracao(), c.preservarOrdem(), true); }
                catch (ErroApi e) { registro.avisar(id, "Apuração pendente para o cenário " + cenarios.get(i).id() + ": " + e.getMessage()); }
            }
            registro.finalizarTempo(id, (System.nanoTime() - inicio) / 1_000_000);
        } catch (ErroApi erro) {
            registro.falhar(id, erro.getMessage(), (System.nanoTime() - inicio) / 1_000_000);
        } catch (RuntimeException erro) {
            registro.falhar(id, "Não foi possível finalizar a geração. Confira a configuração local.", (System.nanoTime() - inicio) / 1_000_000);
        }
        return id;
    }
}
