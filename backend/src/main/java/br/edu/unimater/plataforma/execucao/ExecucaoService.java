package br.edu.unimater.plataforma.execucao;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.cenario.GeradorCenarios;
import br.edu.unimater.plataforma.ia.ModeloGateway;
import br.edu.unimater.plataforma.contexto.RequisitoGateway;
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
    public ExecucaoService(RequisitoGateway requisitos, ModeloGateway modelo, GeradorCenarios gerador, RegistroExecucoes registro, JdbcTemplate db) {
        this.requisitos = requisitos; this.modelo = modelo; this.gerador = gerador; this.registro = registro; this.db = db;
    }
    @EventListener(ApplicationReadyEvent.class)
    public void recuperarInterrompidas() {
        db.update("UPDATE execucao SET status='ERRO',mensagem_erro='Geração interrompida pelo encerramento da aplicação. Gere novamente.' WHERE status='EM_ANDAMENTO'");
    }
    public long iniciar(NovaExecucaoRequest req) {
        // Confluence ainda não é chamado; o resultado sempre informa que usou apenas o requisito.
        long inicio = System.nanoTime();
        modelo.validarDisponibilidade();
        var requisito = requisitos.obter(req.chaveJira());
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
}
