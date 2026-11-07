package br.edu.unimater.plataforma;

import java.sql.DriverManager;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import static org.assertj.core.api.Assertions.assertThat;

class MigracaoHistoricoTest {
    @Test void migracaoPreservaRevisaoExistenteSemAlterarDecisaoCorrente() throws Exception {
        try (var conn = DriverManager.getConnection("jdbc:h2:mem:migracao-historico", "sa", "")) {
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("db/migration/V1__base_local.sql"));
            try (var stmt = conn.createStatement()) {
                stmt.executeUpdate("""
                        INSERT INTO tarefa(chave_jira,titulo,area,requisito,coletada_em,demanda_json)
                        VALUES('PROJ-123','Teste','ESTOQUE','Requisito sintético','2026-11-06T12:00:00Z','{}')
                        """);
                stmt.executeUpdate("""
                        INSERT INTO execucao(tarefa_id,versao_prompt,status,etapa,iniciada_em)
                        VALUES(1,'cenarios-v1','CONCLUIDA','COMPOSICAO','2026-11-06T12:00:00Z')
                        """);
                stmt.executeUpdate("""
                        INSERT INTO revisao(execucao_id,analista,decisao,valores_alterados,tempo_revisao_s,comentario,registrada_em)
                        VALUES(1,'A1','ACEITO',0,30,'Revisão anterior','2026-11-06T12:01:00Z')
                        """);
                ScriptUtils.executeSqlScript(conn, new ClassPathResource("db/migration/V2__historico_revisoes.sql"));
                try (var rs = stmt.executeQuery("SELECT * FROM historico_revisao")) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getString("analista")).isEqualTo("A1");
                    assertThat(rs.getString("decisao")).isEqualTo("ACEITO");
                    assertThat(rs.getString("comentario")).isEqualTo("Revisão anterior");
                    assertThat(rs.getLong("tempo_revisao_s")).isEqualTo(30);
                    assertThat(rs.next()).isFalse();
                }
                try (var rs = stmt.executeQuery("SELECT COUNT(*) FROM revisao WHERE decisao='ACEITO'")) {
                    rs.next();
                    assertThat(rs.getInt(1)).isEqualTo(1);
                }
            }
        }
    }
}
