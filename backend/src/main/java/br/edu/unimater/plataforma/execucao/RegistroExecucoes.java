package br.edu.unimater.plataforma.execucao;

import br.edu.unimater.plataforma.api.Contratos.*;
import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.cenario.GeradorCenarios;
import br.edu.unimater.plataforma.apuracao.*;
import br.edu.unimater.plataforma.banco.CatalogoService;
import br.edu.unimater.plataforma.banco.ConsultaBancoGateway;
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
                        cenarios(id), apuracoes(id), pontos(rs.getString("pontos_atencao_json")), revisao(id), rs.getString("mensagem_erro"), !apuracoes(id).isEmpty()), id);
        if (execucoes.isEmpty()) throw ErroApi.naoEncontrado();
        return execucoes.getFirst();
    }
    public List<Execucao> listar() {
        return db.queryForList("SELECT id FROM execucao ORDER BY id DESC", Long.class).stream().map(this::obter).toList();
    }
    public Demanda demandaSalva(long id) {
        return ler(db.queryForObject("SELECT t.demanda_json FROM tarefa t JOIN execucao e ON e.tarefa_id=t.id WHERE e.id=?", String.class, id), Demanda.class);
    }

    @Transactional
    public long salvarApuracao(long execucaoId, ApuracaoService.Pedido pedido, CatalogoService.Catalogo esquema,
            List<ApuracaoService.Avaliado> candidatos, MotorConsenso.Decisao decisao, long tempoMs) {
        bloquear(execucaoId);
        var execucao = obter(execucaoId);
        if (!execucao.status().equals("CONCLUIDA") || execucao.revisao() != null)
            throw ErroApi.entrada("Não é possível alterar apurações de uma execução em andamento ou já revisada.");
        if (pedido.cenarioId() != null && execucao.cenarios().stream().noneMatch(c -> c.id() == pedido.cenarioId()))
            throw ErroApi.entrada("O cenário não pertence à execução.");
        long id = inserir("""
                INSERT INTO apuracao(execucao_id,cenario_id,pergunta,subesquema,desfecho,resultado_referencia,preservar_ordem,tempo_total_ms,origem)
                VALUES(?,?,?,?,?,?,?,?,'MANUAL')
                """, execucaoId, pedido.cenarioId(), pedido.pergunta(), json(esquema), decisao.desfecho().name(),
                decisao.resultadoReferencia() == null ? null : json(decisao.resultadoReferencia()), pedido.preservarOrdem(), tempoMs);
        for (var c : candidatos) inserir("""
                INSERT INTO candidato_sql(apuracao_id,provedor,modelo,tentativa,consulta,verificacao,hash_resultado,
                tokens_entrada,tokens_saida,custo_usd,latencia_ms,resultado_json,mensagem_erro)
                VALUES(?,?,'INFORMADO_MANUALMENTE',1,?,?,?,0,0,0,?,?,?)
                """, id, c.provedor().name(), c.consulta(), c.resultado().verificacao().name(), decisao.hashes().get(c.provedor()),
                c.resultado().latenciaMs(), json(c.resultado()), decisao.descartes().get(c.provedor()));
        // Marcadores explícitos associam o valor ao passo correto, sem inventar substituições de texto.
        // A interface já resolve «A<id>» usando a tabela de referência.
        if (pedido.cenarioId() != null) {
            String resultado = decisao.resultadoReferencia() == null
                    ? "\nApuração A" + id + ": " + decisao.desfecho() + "; conferir manualmente."
                    : "\nValor de referência apurado: «A" + id + "».";
            db.update("UPDATE cenario SET resultado_esperado=resultado_esperado || ? WHERE id=? AND execucao_id=?", resultado, pedido.cenarioId(), execucaoId);
        }
        db.update("UPDATE execucao SET exige_apuracao=TRUE WHERE id=?", execucaoId);
        var avisos = new ArrayList<>(execucao.pontosAtencao());
        avisos.removeIf(p -> p.tipo().equals("MASSA") && p.texto().startsWith("Apuração SQL pendente:"));
        if (avisos.stream().noneMatch(p -> p.tipo().equals("MASSA") && p.texto().startsWith("Consultas informadas manualmente")))
            avisos.add(new PontoAtencao("MASSA", "Consultas informadas manualmente; a origem nos provedores não foi autenticada. Consenso exige conferência da regra de negócio e não garante cobertura de todos os valores do cenário."));
        db.update("UPDATE execucao SET pontos_atencao_json=? WHERE id=?", json(avisos), execucaoId);
        return id;
    }

    private List<com.fasterxml.jackson.databind.JsonNode> apuracoes(long execucaoId) {
        return db.query("SELECT * FROM apuracao WHERE execucao_id=? ORDER BY id", (r, n) -> {
            var node = mapper.createObjectNode();
            long id = r.getLong("id");
            node.put("id", id);
            if (r.getObject("cenario_id") == null) node.putNull("cenarioId"); else node.put("cenarioId", r.getLong("cenario_id"));
            node.put("pergunta", r.getString("pergunta")); node.put("desfecho", r.getString("desfecho"));
            node.put("origem", r.getString("origem")); node.put("tempoTotalMs", r.getLong("tempo_total_ms"));
            node.put("preservarOrdem", r.getBoolean("preservar_ordem"));
            var esquema = ler(r.getString("subesquema"), CatalogoService.Catalogo.class);
            node.set("subesquema", mapper.valueToTree(esquema.tabelas().stream().map(CatalogoService.Tabela::chave).toList()));
            node.set("catalogo", mapper.valueToTree(esquema));
            node.set("resultadoReferencia", tabela(ler(r.getString("resultado_referencia"), ConsultaBancoGateway.Resultado.class)));
            node.set("candidatos", mapper.valueToTree(db.query("SELECT * FROM candidato_sql WHERE apuracao_id=? ORDER BY id", (c, i) -> {
                var candidato = mapper.createObjectNode();
                candidato.put("id", c.getLong("id")); candidato.put("provedor", c.getString("provedor"));
                candidato.put("modelo", c.getString("modelo")); candidato.put("tentativa", c.getInt("tentativa"));
                candidato.put("consulta", c.getString("consulta")); candidato.put("verificacao", c.getString("verificacao"));
                candidato.put("hashResultado", c.getString("hash_resultado")); candidato.put("mensagemErro", c.getString("mensagem_erro"));
                candidato.put("tokensEntrada", c.getInt("tokens_entrada")); candidato.put("tokensSaida", c.getInt("tokens_saida"));
                candidato.put("custoUsd", c.getBigDecimal("custo_usd")); candidato.put("latenciaMs", c.getLong("latencia_ms"));
                candidato.set("resultado", tabela(ler(c.getString("resultado_json"), ConsultaBancoGateway.Resultado.class)));
                return candidato;
            }, id)));
            return (com.fasterxml.jackson.databind.JsonNode) node;
        }, execucaoId);
    }

    private com.fasterxml.jackson.databind.JsonNode tabela(ConsultaBancoGateway.Resultado resultado) {
        if (resultado == null || resultado.verificacao() != ConsultaBancoGateway.Verificacao.VALIDO) return mapper.nullNode();
        var node = mapper.createObjectNode();
        node.set("colunas", mapper.valueToTree(resultado.colunas().stream().map(ConsultaBancoGateway.Coluna::nome).toList()));
        node.set("linhas", mapper.valueToTree(resultado.linhas()));
        return node;
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
        db.update("""
                INSERT INTO historico_revisao(execucao_id,analista,decisao,valores_alterados,tempo_revisao_s,comentario,registrada_em)
                SELECT execucao_id,analista,decisao,valores_alterados,tempo_revisao_s,comentario,registrada_em
                FROM revisao WHERE execucao_id=?
                """, id);
        return revisao(id);
    }
    public List<Revisao> historicoRevisoes(long id) {
        if (db.queryForList("SELECT id FROM execucao WHERE id=?", Long.class, id).isEmpty()) throw ErroApi.naoEncontrado();
        return db.query("SELECT * FROM historico_revisao WHERE execucao_id=? ORDER BY id", (r, n) ->
                new Revisao(r.getLong("id"), r.getString("analista"), r.getString("decisao"),
                        r.getInt("valores_alterados"), r.getLong("tempo_revisao_s"), r.getString("comentario"),
                        Instant.parse(r.getString("registrada_em"))), id);
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
