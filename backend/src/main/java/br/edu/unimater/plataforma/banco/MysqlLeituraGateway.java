package br.edu.unimater.plataforma.banco;

import br.edu.unimater.plataforma.api.ErroApi;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Leitura do banco MySQL do ERP com as mesmas garantias da leitura PostgreSQL: transação somente leitura,
 * EXPLAIN antes da execução, limites de tempo, linhas e caracteres e recusa de contas com privilégio de escrita.
 */
@Component
@ConditionalOnProperty(name = "plataforma.erp.dialeto", havingValue = "MYSQL")
@EnableConfigurationProperties(MysqlProperties.class)
public class MysqlLeituraGateway implements ConsultaBancoGateway {
    /** Privilégios que permitiriam alterar dados ou estrutura; a conta da plataforma não pode ter nenhum. */
    static final List<String> PRIVILEGIOS_DE_ESCRITA = List.of("INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER",
            "INDEX", "REFERENCES", "CREATE VIEW", "CREATE ROUTINE", "ALTER ROUTINE", "EXECUTE", "TRIGGER", "EVENT",
            "LOCK TABLES", "CREATE TEMPORARY TABLES", "FILE", "SUPER", "GRANT OPTION", "CREATE USER", "RELOAD", "SHUTDOWN");
    private static final int TEMPO_ESGOTADO = 3024, CONSULTA_INTERROMPIDA = 1317;
    private final MysqlProperties config;

    public MysqlLeituraGateway(MysqlProperties config) { this.config = config; }

    @Override public boolean habilitado() { return config.habilitado(); }

    @Override public Resultado consultar(String sql) {
        validarConfiguracao();
        long inicio = System.nanoTime();
        Verificacao etapa = Verificacao.ERRO_EXPLAIN;
        var props = new Properties();
        props.setProperty("user", config.usuario());
        props.setProperty("password", config.senha());
        props.setProperty("connectTimeout", String.valueOf(config.timeoutSegundos() * 1000));
        props.setProperty("socketTimeout", String.valueOf((config.timeoutSegundos() + 5) * 1000));
        // Sem múltiplas instruções e sem leitura de arquivos do cliente.
        props.setProperty("allowMultiQueries", "false");
        props.setProperty("allowLoadLocalInfile", "false");
        props.setProperty("allowUrlInLocalInfile", "false");
        props.setProperty("readOnlyPropagatesToServer", "true");
        props.setProperty("connectionTimeZone", "UTC");
        props.setProperty("forceConnectionTimeZoneToSession", "true");
        props.setProperty("connectionAttributes", "program_name:plataforma-testes-leitura");
        try (var conn = DriverManager.getConnection(config.url(), props)) {
            preparar(conn);
            try {
                try (var explain = conn.prepareStatement("EXPLAIN FORMAT=JSON " + sql)) {
                    explain.setQueryTimeout(config.timeoutSegundos());
                    try (var plano = explain.executeQuery()) { while (plano.next()) { /* plano, sem executar */ } }
                }
                etapa = Verificacao.ERRO_EXECUCAO;
                try (var stmt = conn.prepareStatement(sql)) {
                    stmt.setQueryTimeout(config.timeoutSegundos());
                    stmt.setMaxRows(config.maxLinhas() + 1);
                    try (var rs = stmt.executeQuery()) { return ler(rs, inicio); }
                }
            } finally {
                // Mesmo uma leitura bem-sucedida termina sem commit.
                conn.rollback();
            }
        } catch (SQLException e) {
            boolean tempo = e instanceof SQLTimeoutException || e.getErrorCode() == TEMPO_ESGOTADO
                    || e.getErrorCode() == CONSULTA_INTERROMPIDA;
            String mensagem = tempo ? "A consulta excedeu o limite de tempo."
                    : "Não foi possível " + (etapa == Verificacao.ERRO_EXPLAIN ? "validar o plano no MySQL." : "executar a consulta no MySQL.");
            return new Resultado(etapa, List.of(), List.of(), mensagem, decorrido(inicio));
        }
    }

    private void preparar(Connection conn) throws SQLException {
        try (var stmt = conn.createStatement()) {
            stmt.execute("SET SESSION max_execution_time = " + config.timeoutSegundos() * 1000);
            stmt.execute("SET SESSION lock_wait_timeout = " + Math.min(config.timeoutSegundos(), 2));
            stmt.execute("SET SESSION innodb_lock_wait_timeout = " + Math.min(config.timeoutSegundos(), 2));
            stmt.execute("SET SESSION time_zone = '+00:00'");
            verificarPrivilegios(stmt);
        }
        conn.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
        conn.setReadOnly(true);
        conn.setAutoCommit(false);
        try (var stmt = conn.createStatement()) { stmt.execute("START TRANSACTION READ ONLY"); }
    }

    /** A transação READ ONLY ainda admite tabelas temporárias; por isso a conta precisa ter somente SELECT. */
    private void verificarPrivilegios(Statement stmt) throws SQLException {
        String lista = "'" + String.join("','", PRIVILEGIOS_DE_ESCRITA) + "'";
        String grantee = "CONCAT(CHAR(39), SUBSTRING_INDEX(CURRENT_USER(), '@', 1), CHAR(39), '@', CHAR(39), "
                + "SUBSTRING_INDEX(CURRENT_USER(), '@', -1), CHAR(39))";
        String sql = "SELECT COUNT(*) FROM ("
                + " SELECT GRANTEE, PRIVILEGE_TYPE FROM information_schema.USER_PRIVILEGES"
                + " UNION ALL SELECT GRANTEE, PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES"
                + " UNION ALL SELECT GRANTEE, PRIVILEGE_TYPE FROM information_schema.TABLE_PRIVILEGES"
                + " UNION ALL SELECT GRANTEE, PRIVILEGE_TYPE FROM information_schema.COLUMN_PRIVILEGES"
                + ") p WHERE p.GRANTEE = " + grantee + " AND p.PRIVILEGE_TYPE IN (" + lista + ")";
        try (var rs = stmt.executeQuery(sql)) {
            if (!rs.next() || rs.getInt(1) > 0)
                throw ErroApi.configuracao("Configure um usuário MySQL somente com SELECT, sem privilégios de escrita ou administração.");
        }
    }

    private Resultado ler(ResultSet rs, long inicio) throws SQLException {
        var metadata = rs.getMetaData();
        var colunas = new ArrayList<Coluna>();
        for (int c = 1; c <= metadata.getColumnCount(); c++)
            colunas.add(new Coluna(metadata.getColumnLabel(c), metadata.getColumnTypeName(c), escala(metadata, c)));
        var linhas = new ArrayList<List<Object>>();
        long caracteres = 0;
        while (rs.next()) {
            if (linhas.size() == config.maxLinhas()) return excedido(inicio);
            var linha = new ArrayList<Object>();
            for (int c = 1; c <= colunas.size(); c++) {
                Object valor = valor(rs, c, metadata.getColumnType(c));
                caracteres += valor == null ? 4 : valor.toString().length();
                if (caracteres > config.maxCaracteres()) return excedido(inicio);
                linha.add(valor);
            }
            linhas.add(linha);
        }
        return new Resultado(linhas.isEmpty() ? Verificacao.VAZIO : Verificacao.VALIDO, colunas, linhas, null, decorrido(inicio));
    }

    private Object valor(ResultSet rs, int c, int tipo) throws SQLException {
        return switch (tipo) {
            case Types.NUMERIC, Types.DECIMAL -> rs.getBigDecimal(c);
            case Types.DATE -> rs.getObject(c, LocalDate.class);
            // DATETIME e TIMESTAMP chegam sem fuso; a sessão em UTC torna TIMESTAMP comparável entre conexões.
            case Types.TIMESTAMP -> rs.getObject(c, LocalDateTime.class);
            default -> {
                Object v = rs.getObject(c);
                yield v == null || v instanceof Number || v instanceof Boolean ? v : v.toString();
            }
        };
    }

    private int escala(ResultSetMetaData metadata, int coluna) throws SQLException {
        return switch (metadata.getColumnType(coluna)) {
            case Types.NUMERIC, Types.DECIMAL -> metadata.getPrecision(coluna) == 0 ? -1 : metadata.getScale(coluna);
            case Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT -> 0;
            // FLOAT/DOUBLE não têm escala decimal fixa.
            default -> -1;
        };
    }

    private Resultado excedido(long inicio) {
        return new Resultado(Verificacao.LIMITE_EXCEDIDO, List.of(), List.of(),
                "O resultado excedeu o limite configurado e foi descartado integralmente.", decorrido(inicio));
    }
    private long decorrido(long inicio) { return (System.nanoTime() - inicio) / 1_000_000; }
    private void validarConfiguracao() {
        if (!config.habilitado()) throw ErroApi.configuracao("A consulta ao MySQL está desativada.");
        if (!config.url().startsWith("jdbc:mysql://") || config.usuario().isBlank())
            throw ErroApi.configuracao("Configure ERP_MYSQL_URL e ERP_MYSQL_USUARIO.");
    }
}
