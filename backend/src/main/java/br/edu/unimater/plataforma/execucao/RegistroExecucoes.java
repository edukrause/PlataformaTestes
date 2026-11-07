package br.edu.unimater.plataforma.execucao;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.cenario.GeradorCenarios;
import br.edu.unimater.plataforma.ia.ModeloGateway;
import br.edu.unimater.plataforma.contexto.RequisitoGateway.Requisito;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class RegistroExecucoes {
    private final JdbcTemplate db;
    private final ObjectMapper mapper;
    public RegistroExecucoes(JdbcTemplate db, ObjectMapper mapper) { this.db = db; this.mapper = mapper; }

    @Transactional
    public long iniciar(Requisito r) {
        String agora = Instant.now().toString();
        long tarefa = inserir("INSERT INTO tarefa(chave_jira,titulo,area,requisito,coletada_em,demanda_json) VALUES(?,?,?,?,?,?)",
                r.chave(), r.titulo(), "NAO_IDENTIFICADA", r.texto(), agora, json(r.demanda()));
        return inserir("INSERT INTO execucao(tarefa_id,versao_prompt,status,etapa,iniciada_em) VALUES(?,?,'EM_ANDAMENTO','CENARIOS',?)",
                tarefa, GeradorCenarios.VERSAO, agora);
    }

    @Transactional
    public void auditar(long id, ModeloGateway.Resposta r) {
        inserir("""
                INSERT INTO chamada_modelo(execucao_id,provedor,modelo,prompt_enviado,resposta,correspondencias_json,
                tokens_entrada,tokens_saida,latencia_ms,custo_usd) VALUES(?,'CLAUDE',?,?,?,?,?,?,?,?)
                """, id, r.modelo(), r.promptEnviado(), r.texto(), json(r.correspondencias()),
                r.tokensEntrada(), r.tokensSaida(), r.latenciaMs(), r.custoUsd());
        db.update("UPDATE execucao SET custo_total_usd=custo_total_usd+? WHERE id=?", r.custoUsd(), id);
    }

    @Transactional
    public void concluir(long id, GeradorCenarios.Geracao g, long duracao) {
        List<PontoAtencao> pontos = new ArrayList<>(g.pontosAtencao().stream().map(a -> new PontoAtencao(a.tipo(), a.texto())).toList());
        pontos.add(new PontoAtencao("DOCUMENTACAO", "Geração baseada apenas no requisito. Confluence ainda não está integrado."));
        if (g.exigeApuracao()) pontos.add(new PontoAtencao("MASSA",
                "Apuração SQL pendente: nenhum valor foi consultado ou verificado no banco. Confirme os valores manualmente."));
        for (var c : g.cenarios()) inserir("""
                INSERT INTO cenario(execucao_id,tipo,titulo,gherkin,resultado_esperado,sintaxe_valida)
                VALUES(?,?,?,?,?,TRUE)
                """, id, c.tipo(), c.titulo(), c.gherkin(), c.resultadoEsperado());
        db.update("UPDATE tarefa SET area=? WHERE id=(SELECT tarefa_id FROM execucao WHERE id=?)", g.area(), id);
        db.update("""
                UPDATE execucao SET status='CONCLUIDA',etapa='COMPOSICAO',exige_apuracao=?,tempo_total_ms=?,pontos_atencao_json=?
                WHERE id=?
                """, g.exigeApuracao(), duracao, json(pontos), id);
    }
    public void falhar(long id, String mensagem, long duracao) {
        db.update("UPDATE execucao SET status='ERRO',mensagem_erro=?,tempo_total_ms=? WHERE id=?", mensagem, duracao, id);
    }

    public Execucao obter(long id) {
        var execucoes = db.query("SELECT e.*,t.id AS tid,t.chave_jira,t.titulo,t.area,t.requisito,t.documentacao_ref,t.coletada_em FROM execucao e JOIN tarefa t ON t.id=e.tarefa_id WHERE e.id=?",
                (rs, n) -> new Execucao(rs.getLong("id"),
                        new Tarefa(rs.getLong("tid"), rs.getString("chave_jira"), rs.getString("titulo"), rs.getString("area"),
                                rs.getString("requisito"), rs.getString("documentacao_ref"), Instant.parse(rs.getString("coletada_em"))),
                        rs.getString("versao_prompt"), rs.getString("status"), rs.getString("etapa"), rs.getBoolean("exige_apuracao"),
                        rs.getLong("tempo_total_ms"), rs.getBigDecimal("custo_total_usd"), Instant.parse(rs.getString("iniciada_em")),
                        cenarios(id), List.of(), pontos(rs.getString("pontos_atencao_json")), revisao(id), rs.getString("mensagem_erro"), false), id);
        if (execucoes.isEmpty()) throw ErroApi.naoEncontrado();
        return execucoes.getFirst();
    }
    public List<Execucao> listar() {
        return db.queryForList("SELECT id FROM execucao ORDER BY id DESC", Long.class).stream().map(this::obter).toList();
    }
    public Demanda demandaSalva(long id) {
        return ler(db.queryForObject("SELECT t.demanda_json FROM tarefa t JOIN execucao e ON e.tarefa_id=t.id WHERE e.id=?", String.class, id), Demanda.class);
    }
    private List<Cenario> cenarios(long id) {
        return db.query("SELECT * FROM cenario WHERE execucao_id=? ORDER BY id", (r, n) -> new Cenario(r.getLong("id"),
                r.getString("tipo"), r.getString("titulo"), r.getString("gherkin"), r.getString("resultado_esperado"),
                r.getBoolean("sintaxe_valida"), ler(r.getString("execucao_teste_json"), ExecucaoTeste.class)), id);
    }
    private Revisao revisao(long id) {
        var revisoes = db.query("SELECT * FROM revisao WHERE execucao_id=?", (r, n) -> new Revisao(r.getLong("id"),
                r.getString("analista"), r.getString("decisao"), r.getInt("valores_alterados"), r.getLong("tempo_revisao_s"),
                r.getString("comentario"), Instant.parse(r.getString("registrada_em"))), id);
        return revisoes.isEmpty() ? null : revisoes.getFirst();
    }
    @Transactional
    public Revisao revisar(long id, RevisaoRequest req) {
        bloquear(id);
        if (!obter(id).status().equals("CONCLUIDA")) throw ErroApi.entrada("A geração ainda não foi concluída.");
        if (!req.valoresCorrigidos().isEmpty()) throw ErroApi.entrada("Ainda não há apurações para registrar correções de valores.");
        // Uma revisão corrente por execução, substituída atomicamente quando o analista a atualiza.
        db.update("DELETE FROM revisao WHERE execucao_id=?", id);
        inserir("INSERT INTO revisao(execucao_id,analista,decisao,valores_alterados,tempo_revisao_s,comentario,registrada_em) VALUES(?,?,?,0,?,?,?)",
                id, req.analista(), req.decisao(), req.tempoRevisaoS(), req.comentario(), Instant.now().toString());
        return revisao(id);
    }
    @Transactional
    public void registrarTeste(long id, long cenarioId, ExecucaoTeste teste) {
        bloquear(id);
        var e = obter(id);
        if (!e.status().equals("CONCLUIDA")) throw ErroApi.entrada("A geração ainda não foi concluída.");
        var c = e.cenarios().stream().filter(x -> x.id() == cenarioId).findFirst().orElseThrow(ErroApi::naoEncontrado);
        if (teste != null && teste.passos().size() != c.gherkin().lines().filter(l -> !l.isBlank()).count())
            throw ErroApi.entrada("Informe um resultado para cada passo do cenário.");
        db.update("UPDATE cenario SET execucao_teste_json=? WHERE id=? AND execucao_id=?", teste == null ? null : json(teste), cenarioId, id);
    }
    private void bloquear(long id) {
        if (db.queryForList("SELECT id FROM execucao WHERE id=? FOR UPDATE", Long.class, id).isEmpty()) throw ErroApi.naoEncontrado();
    }
    public long criarConversa(String titulo) {
        return inserir("INSERT INTO conversa(titulo,criada_em) VALUES(?,?)", titulo.substring(0, Math.min(120, titulo.length())), Instant.now().toString());
    }
    public void mensagem(long conversa, String papel, String texto, Long execucao) {
        inserir("INSERT INTO mensagem(conversa_id,papel,texto,enviada_em,execucao_id) VALUES(?,?,?,?,?)",
                conversa, papel, texto, Instant.now().toString(), execucao);
    }
    public Conversa conversa(long id) {
        var conversas = db.query("SELECT * FROM conversa WHERE id=?", (r, n) -> new Conversa(r.getLong("id"),
                r.getString("titulo"), Instant.parse(r.getString("criada_em")),
                db.query("SELECT * FROM mensagem WHERE conversa_id=? ORDER BY id", (m, i) -> new Mensagem(m.getLong("id"),
                        m.getString("papel"), m.getString("texto"), Instant.parse(m.getString("enviada_em")),
                        m.getObject("execucao_id", Long.class)), id)), id);
        if (conversas.isEmpty()) throw ErroApi.naoEncontrado();
        return conversas.getFirst();
    }
    public List<Conversa> conversas() {
        return db.queryForList("SELECT id FROM conversa ORDER BY id DESC", Long.class).stream().map(this::conversa).toList();
    }
    private long inserir(String sql, Object... args) {
        var key = new GeneratedKeyHolder();
        db.update(conn -> {
            PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) stmt.setObject(i + 1, args[i]);
            return stmt;
        }, key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    private String json(Object obj) {
        try { return mapper.writeValueAsString(obj); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Não foi possível serializar o registro."); }
    }
    private <T> T ler(String json, Class<T> tipo) {
        if (json == null) return null;
        try { return mapper.readValue(json, tipo); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Não foi possível ler o registro."); }
    }
    private List<PontoAtencao> pontos(String json) {
        try { return mapper.readValue(json, new TypeReference<>() {}); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Não foi possível ler os pontos de atenção."); }
    }
}
