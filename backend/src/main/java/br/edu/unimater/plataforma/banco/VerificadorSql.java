package br.edu.unimater.plataforma.banco;

import br.edu.unimater.plataforma.api.ErroApi;
import java.util.*;
import java.util.regex.Pattern;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.select.*;
import net.sf.jsqlparser.util.TablesNamesFinder;
import org.springframework.stereotype.Component;

/** Subconjunto conservador de SELECT. Permissões do banco e transação READ ONLY são obrigatórias. */
@Component
public class VerificadorSql {
    private static final Set<String> PROIBIDOS = Set.of("INSERT", "UPDATE", "DELETE", "MERGE", "INTO",
            "COPY", "CALL", "DO", "EXECUTE", "CREATE", "ALTER", "DROP", "TRUNCATE", "GRANT", "REVOKE",
            "SET", "RESET", "LOCK", "FOR", "EXPLAIN", "ANALYZE", "VACUUM", "REINDEX");
    private static final Set<String> FUNCOES = Set.of("SUM", "COUNT", "AVG", "MIN", "MAX", "ROUND", "ABS",
            "CEIL", "CEILING", "FLOOR", "COALESCE", "NULLIF", "GREATEST", "LEAST", "CAST", "EXTRACT",
            "DATE_TRUNC", "DATE_PART", "TO_CHAR", "TO_DATE", "UPPER", "LOWER", "LENGTH", "CHAR_LENGTH",
            "TRIM", "LTRIM", "RTRIM", "SUBSTRING", "REPLACE", "CONCAT", "CONCAT_WS", "LEFT", "RIGHT",
            "ROW_NUMBER", "RANK", "DENSE_RANK", "LAG", "LEAD", "FIRST_VALUE", "LAST_VALUE", "GENERATE_SERIES");
    private static final Set<String> GRAMATICA = Set.of("SELECT", "FROM", "WHERE", "HAVING", "IN", "EXISTS",
            "NOT", "AS", "ON", "OVER", "PARTITION", "FILTER", "WITHIN", "WITH", "DISTINCT", "ALL",
            "UNION", "INTERSECT", "EXCEPT", "GROUP", "ORDER", "BY", "VALUES", "WHEN", "AND", "OR");
    private static final Set<String> TIPOS = Set.of("NUMERIC", "DECIMAL", "VARCHAR", "CHAR", "CHARACTER",
            "TIMESTAMP", "TIME", "INTERVAL");
    private static final Pattern TOKEN = Pattern.compile("'(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|[A-Za-z_][A-Za-z0-9_$]*|::|\\S");

    public String validar(String consulta) {
        if (consulta == null || consulta.isBlank() || consulta.length() > 20000)
            throw ErroApi.entrada("Informe uma consulta SELECT com até 20000 caracteres.");
        try {
            var statements = CCJSqlParserUtil.parseStatements(consulta, p -> p.withTimeOut(1000));
            if (statements.size() != 1 || !(statements.get(0) instanceof Select select)) rejeitar();
            // Executar a representação analisada evita diferenças entre o SQL validado e o enviado.
            String sql = statements.get(0).toString();
            new GuardaSelect().getTables(statements.get(0));
            verificarTokens(sql);
            return sql;
        } catch (JSQLParserException | UnsupportedOperationException e) {
            throw ErroApi.entrada("Consulta inválida ou fora do subconjunto SELECT suportado.");
        }
    }

    private void verificarTokens(String sql) {
        var tokens = TOKEN.matcher(sql).results().map(m -> m.group()).toList();
        for (int i = 0; i < tokens.size(); i++) {
            String raw = tokens.get(i);
            if (raw.startsWith("'")) continue;
            String token = raw.replace("\"", "").toUpperCase(Locale.ROOT);
            if (PROIBIDOS.contains(token) || raw.equals("$") || raw.equals("?") || raw.startsWith("$$")) rejeitar();
            if (i + 1 < tokens.size() && tokens.get(i + 1).equals("(") && token.matches("[A-Z_][A-Z0-9_$]*")) {
                if (!FUNCOES.contains(token) && !GRAMATICA.contains(token)
                        && !(TIPOS.contains(token) && i > 0 && Set.of("AS", "::").contains(tokens.get(i - 1).toUpperCase(Locale.ROOT))))
                    rejeitar();
                if (i > 0 && tokens.get(i - 1).equals(".")
                        && (i < 2 || !tokens.get(i - 2).equalsIgnoreCase("pg_catalog"))) rejeitar();
            }
        }
    }

    private static void rejeitar() {
        throw ErroApi.entrada("Só é permitido um SELECT, sem escrita, bloqueios ou funções fora da lista permitida.");
    }

    private static class GuardaSelect extends TablesNamesFinder<Void> {
        @Override public <S> Void visit(PlainSelect select, S context) {
            if ((select.getIntoTables() != null && !select.getIntoTables().isEmpty()) || select.getIntoTempTable() != null
                    || select.getForMode() != null || select.getForClause() != null) rejeitar();
            return super.visit(select, context);
        }
        @Override public <S> Void visit(WithItem<?> item, S context) {
            if (!(item.getParenthesedStatement() instanceof ParenthesedSelect)) rejeitar();
            return super.visit(item, context);
        }
    }
}
