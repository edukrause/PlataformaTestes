# PostgreSQL de homologação

PostgreSQL substitui o MySQL como fonte de dados consultada. H2 continua guardando o histórico da plataforma.
O módulo é independente do Jira e dos modelos: já pode validar e executar consultas informadas manualmente.
As tabelas de domínio `apuracao` e `candidato_sql` continuam reservadas para a próxima integração.
Uma consulta manual não é contabilizada como apuração nem produz um valor validado pelo analista.

## Configurar

Exporte as variáveis de `backend/.env.example`. O Spring não carrega `.env` automaticamente.
Ative `ERP_POSTGRES_HABILITADO=true` e informe URL JDBC, usuário e senha.
A conexão PostgreSQL não substitui o datasource H2 nem recebe as migrações Flyway da plataforma.

O DBA deve preparar uma conta dedicada, com acesso apenas às tabelas permitidas. Exemplo a adaptar ao banco:

```sql
CREATE ROLE plataforma_leitura LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT CONNECT ON DATABASE seu_banco TO plataforma_leitura;
GRANT USAGE ON SCHEMA public TO plataforma_leitura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO plataforma_leitura;
ALTER ROLE plataforma_leitura SET default_transaction_read_only = on;
```

Defina a senha com `\password plataforma_leitura` no psql. A aplicação recusa contas superusuárias.
Novas tabelas exigem novos GRANTs ou default privileges definidos pelo proprietário.

## Consultar

```http
POST /api/banco/consultas
Content-Type: application/json

{"consulta":"SELECT sum(preco) AS total FROM public.produto"}
```

Use nomes qualificados (`public.produto`): o `search_path` da sessão contém apenas `pg_catalog`, para que
funções de outro schema não substituam funções internas durante a avaliação de SQL gerado.
O endpoint responde com `verificacao`, `colunas`, `linhas`, `mensagemErro` e `latenciaMs`.
Valores NULL permanecem nulos, números decimais preservam precisão e timestamptz usa UTC.

Fluxo: parser JSQLParser → um SELECT → regras de leitura e funções permitidas → transação READ ONLY
em REPEATABLE READ → EXPLAIN sem ANALYZE → execução limitada → rollback e fechamento da conexão.
O SQL executado é a representação do AST validado.

- Instruções múltiplas, escrita em CTE, SELECT INTO, bloqueios e funções fora da lista são rejeitados antes da conexão.
- A lista conservadora cobre agregações, datas, texto e funções analíticas usuais; sintaxes não suportadas são recusadas.
- Permissões restritas no banco continuam obrigatórias; o parser não é um sandbox de funções PostgreSQL arbitrárias.
- Resultado vazio é `VAZIO`; falhas de plano e execução são distinguidas, sem expor SQL, credenciais ou mensagens internas.
- Se linhas ou caracteres excederem o limite, o resultado inteiro é descartado como `LIMITE_EXCEDIDO`.
  Um resultado truncado não pode fundamentar consenso.
- O endpoint fica indisponível com HTTP 503 enquanto a integração estiver desativada.

## Testes com PostgreSQL real

O workflow usa instâncias descartáveis PostgreSQL 16 e 18. Para rodar localmente, aponte
`PLATAFORMA_TEST_PG_URL`, `PLATAFORMA_TEST_PG_ADMIN` e `PLATAFORMA_TEST_PG_SENHA` para um banco dedicado aos testes
e execute `mvn verify`. Não use o banco de homologação: o teste cria um schema e um papel com nomes aleatórios,
carrega fixtures sintéticas e remove apenas esses objetos ao terminar.

Sem `PLATAFORMA_TEST_PG_URL`, somente os testes que precisam de PostgreSQL são ignorados; os demais continuam rodando.
Os testes reais verificam tipos e nulos, limites, falhas de EXPLAIN, cancelamento por tempo e bloqueio de escrita.

Referências: [transações somente leitura](https://www.postgresql.org/docs/18/sql-set-transaction.html),
[JSQLParser](https://github.com/JSQLParser/JSqlParser/releases/tag/jsqlparser-5.3).
