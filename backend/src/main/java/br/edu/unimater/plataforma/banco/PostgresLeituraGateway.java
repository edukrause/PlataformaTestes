package br.edu.unimater.plataforma.banco;

import br.edu.unimater.plataforma.api.ErroApi;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@EnableConfigurationProperties(PostgresProperties.class)
public class PostgresLeituraGateway implements ConsultaBancoGateway {
    private final PostgresProperties config;

    public PostgresLeituraGateway(PostgresProperties config) { this.config = config; }

    @Override public Resultado consultar(String sql) {
        validarConfiguracao();
        long inicio = System.nanoTime();
        Verificacao etapa = Verificacao.ERRO_EXPLAIN;
        var props = new Properties();
        props.setProperty("user", config.usuario());
        props.setProperty("password", config.senha());
        props.setProperty("connectTimeout", String.valueOf(config.timeoutSegundos()));
        props.setProperty("socketTimeout", String.valueOf(config.timeoutSegundos() + 5));
        props.setProperty("readOnlyMode", "transaction");
        props.setProperty("ApplicationName", "plataforma-testes-leitura");
        try (var conn = DriverManager.getConnection(config.url(), props)) {
            conn.setReadOnly(true);
            conn.setAutoCommit(false);
            conn.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            try {
                preparar(conn);
                try (var explain = conn.prepareStatement("EXPLAIN (FORMAT JSON) " + sql)) {
                    explain.setQueryTimeout(config.timeoutSegundos());
                    try (var plano = explain.executeQuery()) { while (plano.next()) { /* validar plano, sem ANALYZE */ } }
                }
                etapa = Verificacao.ERRO_EXECUCAO;
                try (var stmt = conn.prepareStatement(sql)) {
                    stmt.setQueryTimeout(config.timeoutSegundos());
                    stmt.setFetchSize(Math.min(config.maxLinhas() + 1, 100));
                    stmt.setMaxRows(config.maxLinhas() + 1);
                    try (var rs = stmt.executeQuery()) { return ler(rs, inicio); }
                }
            } finally {
                // Mesmo uma leitura bem-sucedida encerra sem commit e não deixa sessão reaproveitável.
                conn.rollback();
            }
        } catch (SQLException e) {
            String mensagem = "57014".equals(e.getSQLState())
                    ? "A consulta excedeu o limite de tempo."
                    : "Não foi possível " + (etapa == Verificacao.ERRO_EXPLAIN ? "validar o plano no PostgreSQL." : "executar a consulta no PostgreSQL.");
            return new Resultado(etapa, List.of(), List.of(), mensagem, decorrido(inicio));
        }
    }

    private void preparar(Connection conn) throws SQLException {
        try (var stmt = conn.createStatement()) {
            stmt.execute("SET TRANSACTION READ ONLY");
            stmt.execute("SET LOCAL statement_timeout = " + config.timeoutSegundos() * 1000);
            stmt.execute("SET LOCAL lock_timeout = " + Math.min(config.timeoutSegundos() * 1000, 2000));
            stmt.execute("SET LOCAL search_path TO pg_catalog");
            stmt.execute("SET LOCAL TIME ZONE 'UTC'");
            stmt.execute("SET LOCAL standard_conforming_strings = on");
            try (var rs = stmt.executeQuery("SELECT rolsuper FROM pg_roles WHERE rolname = current_user")) {
                if (!rs.next() || rs.getBoolean(1))
                    throw ErroApi.configuracao("Configure um usuário PostgreSQL sem privilégio de superusuário, com acesso apenas de leitura.");
            }
        }
    }

    private Resultado ler(ResultSet rs, long inicio) throws SQLException {
        var metadata = rs.getMetaData();
        var colunas = new ArrayList<Coluna>();
        for (int c = 1; c <= metadata.getColumnCount(); c++)
            colunas.add(new Coluna(metadata.getColumnLabel(c), metadata.getColumnTypeName(c), metadata.getScale(c)));
        var linhas = new ArrayList<List<Object>>();
        long caracteres = 0;
        while (rs.next()) {
            if (linhas.size() == config.maxLinhas()) return excedido(inicio);
            var linha = new ArrayList<Object>();
            for (int c = 1; c <= colunas.size(); c++) {
                Object valor = valor(rs, c, metadata.getColumnType(c), metadata.getColumnTypeName(c));
                caracteres += valor == null ? 4 : valor.toString().length();
                if (caracteres > config.maxCaracteres()) return excedido(inicio);
                linha.add(valor);
            }
            linhas.add(linha);
        }
        return new Resultado(linhas.isEmpty() ? Verificacao.VAZIO : Verificacao.VALIDO,
                colunas, linhas, null, decorrido(inicio));
    }

    private Object valor(ResultSet rs, int c, int tipo, String nomeTipo) throws SQLException {
        // O driver PostgreSQL informa timestamptz como Types.TIMESTAMP em algumas versões.
        if (tipo == Types.TIMESTAMP && "timestamptz".equals(nomeTipo)) return rs.getObject(c, OffsetDateTime.class);
        return switch (tipo) {
            case Types.NUMERIC, Types.DECIMAL -> rs.getBigDecimal(c);
            case Types.DATE -> rs.getObject(c, LocalDate.class);
            case Types.TIMESTAMP -> rs.getObject(c, LocalDateTime.class);
            case Types.TIMESTAMP_WITH_TIMEZONE -> rs.getObject(c, OffsetDateTime.class);
            default -> {
                Object v = rs.getObject(c);
                yield v == null || v instanceof Number || v instanceof Boolean ? v : v.toString();
            }
        };
    }

    private Resultado excedido(long inicio) {
        return new Resultado(Verificacao.LIMITE_EXCEDIDO, List.of(), List.of(),
                "O resultado excedeu o limite configurado e foi descartado integralmente.", decorrido(inicio));
    }
    private long decorrido(long inicio) { return (System.nanoTime() - inicio) / 1_000_000; }
    private void validarConfiguracao() {
        if (!config.habilitado()) throw ErroApi.configuracao("A consulta ao PostgreSQL está desativada.");
        if (!config.url().startsWith("jdbc:postgresql://") || config.usuario().isBlank())
            throw ErroApi.configuracao("Configure ERP_POSTGRES_URL e ERP_POSTGRES_USUARIO.");
    }
}
