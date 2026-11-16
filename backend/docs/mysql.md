# MySQL: leitura, catálogo e apuração

A plataforma lê o banco do ERP em PostgreSQL ou em MySQL. O dialeto é escolhido por `ERP_DIALETO`
(`POSTGRESQL`, padrão, ou `MYSQL`) e define três coisas: o gateway de leitura ativo, as consultas de
catálogo e o SQL pedido aos modelos. O restante do fluxo (verificador, normalização, consenso,
revisão e auditoria) é o mesmo descrito em [postgresql.md](postgresql.md). H2 continua sendo a base local.

## Configuração

- `ERP_DIALETO=MYSQL` e `ERP_MYSQL_HABILITADO=true`.
- `ERP_MYSQL_URL=jdbc:mysql://host:3306/banco_do_erp`, usuário dedicado e senha.
- `ERP_CATALOGO_SCHEMAS`: no MySQL, schema é o nome do banco; o padrão `public` não se aplica.
- Timeout de 1–60 segundos, limites de linhas e de caracteres, como no PostgreSQL.

Conta dedicada, somente com SELECT. Exemplo a adaptar pelo DBA:

```sql
CREATE USER 'plataforma_leitura'@'%' IDENTIFIED BY '...';
GRANT SELECT ON banco_do_erp.* TO 'plataforma_leitura'@'%';
```

A plataforma recusa contas com qualquer privilégio de escrita ou administração (INSERT, UPDATE, DELETE,
CREATE, DROP, ALTER, EXECUTE, LOCK TABLES, CREATE TEMPORARY TABLES, FILE, SUPER, entre outros),
conferidos em `information_schema` nos níveis global, de banco, de tabela e de coluna.
Privilégios recebidos por papéis (roles) do MySQL 8 não aparecem nessas visões: não conceda papéis à conta.
Uma conta de desenvolvimento com escrita, mesmo em homologação, será recusada de propósito.

## Proteções da sessão

- Driver sem múltiplas instruções e sem `LOAD DATA LOCAL`.
- `max_execution_time` e `setQueryTimeout` limitam o tempo; `lock_wait_timeout` e
  `innodb_lock_wait_timeout` limitam a espera por bloqueios a 2 segundos.
- Sessão em UTC; `START TRANSACTION READ ONLY` com REPEATABLE READ; rollback ao final.
- `EXPLAIN FORMAT=JSON` antes da execução; erro de plano e de execução continuam distintos.
- Limite de linhas aplicado no servidor (`setMaxRows`) e conferido na leitura; excedido, o resultado é descartado.

## Verificador e catálogo

O verificador aceita identificadores com crase e, além das funções comuns, IFNULL, IF, DATE, YEAR, MONTH,
DAY, QUARTER, WEEK, DATE_FORMAT, STR_TO_DATE, DATEDIFF, DATE_ADD, DATE_SUB, LAST_DAY, GROUP_CONCAT e CONVERT.
Funções exclusivas do PostgreSQL (TO_CHAR, DATE_TRUNC...) são recusadas no dialeto MySQL e vice-versa.
SLEEP, BENCHMARK, LOAD_FILE, INTO OUTFILE, FOR UPDATE e LOCK IN SHARE MODE são recusados.

Colunas vêm de `information_schema.COLUMNS`, que só lista colunas acessíveis à conta.
Chaves estrangeiras vêm de `information_schema.KEY_COLUMN_USAGE`, preservando a ordem das chaves compostas.
Tabelas MyISAM não declaram chaves estrangeiras: nesse caso a expansão por relacionamentos não ocorre.

## Testes reais

`MysqlLeituraTest` roda quando `PLATAFORMA_TEST_MYSQL_URL` aponta para um servidor descartável
(ex.: `jdbc:mysql://127.0.0.1:3306/`), com `PLATAFORMA_TEST_MYSQL_ADMIN` e `PLATAFORMA_TEST_MYSQL_SENHA`.
O teste cria um banco e dois usuários com nomes aleatórios e remove só o que criou. A CI usa MySQL 8.4.
Não aponte essas variáveis para homologação.
