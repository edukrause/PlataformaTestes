package br.edu.unimater.plataforma.banco;

import java.util.Set;

/**
 * Diferenças entre os SGBDs consultados: catálogo, identificadores e funções aceitas no SELECT.
 * Selecionado por ERP_DIALETO; o gateway de leitura correspondente é o único ativo.
 */
public enum Dialeto {
    POSTGRESQL("PostgreSQL", Set.of("DATE_TRUNC", "DATE_PART", "TO_CHAR", "TO_DATE", "GENERATE_SERIES")) {
        @Override public String sqlColunas(String schemas) {
            return """
                    SELECT table_schema, table_name, column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema IN (%s)
                      AND has_column_privilege(quote_ident(table_schema) || '.' || quote_ident(table_name), column_name, 'SELECT')
                    ORDER BY table_schema, table_name, ordinal_position
                    """.formatted(schemas);
        }
        // pg_constraint permite ler FKs com a conta SELECT (information_schema.table_constraints
        // omite constraints de tabelas nas quais o usuário só possui SELECT).
        @Override public String sqlChavesEstrangeiras(String schemas) {
            return """
                    SELECT ns.nspname, src.relname, a.attname, nt.nspname, dst.relname, b.attname
                    FROM pg_catalog.pg_constraint c
                    JOIN pg_catalog.pg_class src ON src.oid = c.conrelid
                    JOIN pg_catalog.pg_namespace ns ON ns.oid = src.relnamespace
                    JOIN pg_catalog.pg_class dst ON dst.oid = c.confrelid
                    JOIN pg_catalog.pg_namespace nt ON nt.oid = dst.relnamespace
                    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
                    JOIN pg_catalog.pg_attribute b ON b.attrelid = c.confrelid
                      AND b.attnum = c.confkey[array_position(c.conkey, a.attnum)]
                    WHERE c.contype = 'f' AND ns.nspname IN (%s) AND nt.nspname IN (%s)
                    ORDER BY ns.nspname, src.relname, c.conname, a.attnum
                    """.formatted(schemas, schemas);
        }
        @Override public String identificador(String nome) { return "\"" + nome.replace("\"", "\"\"") + "\""; }
    },
    MYSQL("MySQL", Set.of("IFNULL", "IF", "DATE", "YEAR", "MONTH", "DAY", "DAYOFMONTH", "QUARTER", "WEEK",
            "DATE_FORMAT", "STR_TO_DATE", "DATEDIFF", "DATE_ADD", "DATE_SUB", "LAST_DAY", "GROUP_CONCAT", "CONVERT")) {
        // No MySQL, INFORMATION_SCHEMA só lista colunas sobre as quais a conta tem algum privilégio.
        @Override public String sqlColunas(String schemas) {
            return """
                    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA IN (%s)
                    ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
                    """.formatted(schemas);
        }
        @Override public String sqlChavesEstrangeiras(String schemas) {
            return """
                    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_SCHEMA IN (%s) AND REFERENCED_TABLE_SCHEMA IN (%s)
                    ORDER BY TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION
                    """.formatted(schemas, schemas);
        }
        @Override public String identificador(String nome) { return "`" + nome.replace("`", "``") + "`"; }
    };

    private final String nome;
    private final Set<String> funcoes;
    Dialeto(String nome, Set<String> funcoes) { this.nome = nome; this.funcoes = funcoes; }
    public String nome() { return nome; }
    /** Funções específicas do SGBD, somadas às funções comuns do verificador. */
    public Set<String> funcoes() { return funcoes; }
    public abstract String sqlColunas(String schemasLiteral);
    public abstract String sqlChavesEstrangeiras(String schemasLiteral);
    public abstract String identificador(String nome);
}
