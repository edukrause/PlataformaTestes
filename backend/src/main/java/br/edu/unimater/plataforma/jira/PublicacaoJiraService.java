package br.edu.unimater.plataforma.jira;

import br.edu.unimater.plataforma.api.*;
import br.edu.unimater.plataforma.execucao.RegistroExecucoes;
import java.time.Instant;
import java.util.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PublicacaoJiraService {
    public record Publicacao(String status,String comentarioId) {}
    private final RegistroExecucoes registro;
    private final JiraEscritaClient jira;
    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    public PublicacaoJiraService(RegistroExecucoes registro,JiraEscritaClient jira,JdbcTemplate db,PlatformTransactionManager tm) {
        this.registro=registro;this.jira=jira;this.db=db;this.tx=new TransactionTemplate(tm);
    }
    @EventListener(ApplicationReadyEvent.class)public void recuperar() { db.update("UPDATE publicacao_jira SET status='INCERTO' WHERE status='PENDENTE'"); }
    public Publicacao publicar(long id) {
        jira.validar();
        var e=registro.obter(id);
        if(!e.status().equals("CONCLUIDA")||!e.etapa().equals("COMPOSICAO")||e.revisao()==null||e.revisao().decisao().equals("REJEITADO"))
            throw ErroApi.entrada("Publique apenas execuções concluídas e aceitas pelo analista.");
        String texto=compor(e);
        if(texto.length()>30000||texto.contains("«VALOR_APURADO»")||texto.matches("(?s).*«A[0-9]+».*"))
            throw ErroApi.entrada("Resolva os valores pendentes ou reduza os cenários antes de publicar.");
        Publicacao anterior=tx.execute(s->{
            db.queryForObject("SELECT id FROM execucao WHERE id=? FOR UPDATE",Long.class,id);
            var atual=registro.obter(id);
            if(atual.revisao()==null||atual.revisao().id()!=e.revisao().id())throw ErroApi.entrada("A revisão mudou. Atualize a tela antes de publicar.");
            var existentes=db.query("SELECT * FROM publicacao_jira WHERE execucao_id=? AND revisao_id=?",(r,n)->new Publicacao(r.getString("status"),r.getString("comentario_id")),id,e.revisao().id());
            if(!existentes.isEmpty())return existentes.getFirst();
            db.update("INSERT INTO publicacao_jira(execucao_id,revisao_id,status,criada_em) VALUES(?,?,'PENDENTE',?)",id,e.revisao().id(),Instant.now().toString());
            return null;
        });
        if(anterior!=null) {
            if(anterior.status().equals("ENVIADO"))return anterior;
            throw new ErroApi(HttpStatus.CONFLICT,"Já existe uma publicação pendente ou sem confirmação. Confira o Jira antes de tentar uma nova revisão.");
        }
        try {
            String comentario=jira.comentar(e.tarefa().chaveJira(),texto);
            db.update("UPDATE publicacao_jira SET status='ENVIADO',comentario_id=? WHERE execucao_id=? AND revisao_id=?",comentario,id,e.revisao().id());
            return new Publicacao("ENVIADO",comentario);
        } catch(RuntimeException erro) {
            db.update("UPDATE publicacao_jira SET status='INCERTO' WHERE execucao_id=? AND revisao_id=?",id,e.revisao().id());
            throw erro;
        }
    }
    public static String compor(Contratos.Execucao e) {
        StringBuilder texto=new StringBuilder("Cenários revisados — execução "+e.id()+"\nAnalista: "+e.revisao().analista()+"\n");
        for(var c:e.cenarios())texto.append("\nCenário: ").append(c.titulo()).append('\n').append(c.gherkin()).append("\nResultado esperado: ").append(c.resultadoEsperado()).append('\n');
        String resultado=texto.toString();
        for(var a:e.apuracoes()) {
            String valor=a.path("valorCorrigido").asText(null);
            if(valor==null&&!a.path("resultadoReferencia").isNull()) {
                var tabela=a.path("resultadoReferencia");
                if(tabela.path("linhas").size()==1&&tabela.path("colunas").size()==1)valor=tabela.path("linhas").path(0).path(0).asText("NULL");
                else valor=tabela.toString();
            }
            if(valor!=null)resultado=resultado.replace("«A"+a.path("id").asLong()+"»",valor);
        }
        return resultado;
    }
}
