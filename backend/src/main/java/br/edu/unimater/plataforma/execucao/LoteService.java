package br.edu.unimater.plataforma.execucao;

import br.edu.unimater.plataforma.api.Contratos.NovaExecucaoRequest;
import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.ia.ModeloGateway;
import jakarta.validation.constraints.*;
import java.sql.Statement;
import java.time.Instant;
import java.util.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;

@Service
public class LoteService {
    public record Pedido(@NotBlank @Size(max=160) String nome, @NotNull @Size(min=1,max=20)
            List<@NotBlank @Pattern(regexp="[A-Za-z][A-Za-z0-9_]*-[1-9][0-9]*") String> chaves, boolean usarDocumentacao) {}
    public record Item(long id,String chaveJira,Long execucaoId,String status,String mensagem) {}
    public record Lote(long id,String nome,String criadoEm,String status,List<Item> itens) {}
    private final ExecucaoService execucoes;
    private final RegistroExecucoes registro;
    private final JdbcTemplate db;
    private final ModeloGateway modelo;
    public LoteService(ExecucaoService execucoes,RegistroExecucoes registro,JdbcTemplate db,ModeloGateway modelo) {
        this.execucoes=execucoes;this.registro=registro;this.db=db;this.modelo=modelo;
    }
    @EventListener(ApplicationReadyEvent.class)
    public void recuperar() {
        db.update("UPDATE lote_item SET status='ERRO',mensagem='Lote interrompido pelo encerramento da aplicação.' WHERE status='PENDENTE'");
        db.update("UPDATE lote SET status='INTERROMPIDO' WHERE status='EM_ANDAMENTO'");
    }
    public Lote iniciar(Pedido pedido) {
        modelo.validarDisponibilidade();
        var chaves=pedido.chaves().stream().map(s->s.toUpperCase(Locale.ROOT)).toList();
        if(new HashSet<>(chaves).size()!=chaves.size()) throw ErroApi.entrada("Informe chaves distintas no conjunto de referência.");
        var key=new GeneratedKeyHolder();
        db.update(c->{var stmt=c.prepareStatement("INSERT INTO lote(nome,criado_em,status) VALUES(?,?,'EM_ANDAMENTO')",Statement.RETURN_GENERATED_KEYS);
            stmt.setString(1,pedido.nome());stmt.setString(2,Instant.now().toString());return stmt;},key);
        long id=Objects.requireNonNull(key.getKey()).longValue();
        for(String chave:chaves) db.update("INSERT INTO lote_item(lote_id,chave_jira,status) VALUES(?,?,'PENDENTE')",id,chave);
        for(String chave:chaves) {
            try {
                long execucao=execucoes.iniciar(new NovaExecucaoRequest(chave,pedido.usarDocumentacao()));
                var e=registro.obter(execucao);
                db.update("UPDATE lote_item SET execucao_id=?,status=?,mensagem=? WHERE lote_id=? AND chave_jira=?",execucao,e.status(),e.mensagemErro(),id,chave);
            } catch(Exception e) {
                String erro=e instanceof ErroApi ? e.getMessage() : "Não foi possível processar esta tarefa.";
                db.update("UPDATE lote_item SET status='ERRO',mensagem=? WHERE lote_id=? AND chave_jira=?",erro,id,chave);
            }
        }
        long erros=db.queryForObject("SELECT COUNT(*) FROM lote_item WHERE lote_id=? AND status='ERRO'",Long.class,id);
        db.update("UPDATE lote SET status=? WHERE id=?",erros>0?"CONCLUIDO_COM_ERROS":"CONCLUIDO",id);
        return obter(id);
    }
    public Lote obter(long id) {
        var resultado=db.query("SELECT * FROM lote WHERE id=?",(r,n)->new Lote(r.getLong("id"),r.getString("nome"),r.getString("criado_em"),r.getString("status"),
                db.query("SELECT * FROM lote_item WHERE lote_id=? ORDER BY id",(i,k)->new Item(i.getLong("id"),i.getString("chave_jira"),i.getObject("execucao_id",Long.class),i.getString("status"),i.getString("mensagem")),id)),id);
        if(resultado.isEmpty()) throw ErroApi.naoEncontrado(); return resultado.getFirst();
    }
    public List<Lote> listar() { return db.queryForList("SELECT id FROM lote ORDER BY id DESC",Long.class).stream().map(this::obter).toList(); }
}
