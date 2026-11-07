# PostgreSQL de homologação

PostgreSQL substitui o MySQL como fonte de dados consultada. H2 continua guardando o histórico da plataforma.
O módulo é independente do Jira e dos modelos: já pode validar e executar consultas informadas manualmente.
`apuracao` e `candidato_sql` registram consultas, resultados e a decisão de consenso.
Uma consulta isolada em `/api/banco/consultas` não é contabilizada como apuração.

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

## Comparação de resultados e consenso

`NormalizadorResultados` e `MotorConsenso` são componentes internos, testáveis sem IA.
A execução isolada de `/api/banco/consultas` não dispara nem persiste uma apuração por consenso.

A normalização ignora aliases e ordem de colunas; ignora ordem de linhas somente quando a apuração não exige
ordenamento. Nulos, textos, números, booleanos e datas recebem marcadores distintos. Linhas repetidas são
preservadas. Números usam a escala informada pelo PostgreSQL; se a expressão não fornecer precisão,
usa-se escala de duas casas e arredondamento HALF_UP. Instantes com fuso são comparados em UTC.

A relação entre os valores das colunas é preservada: as células de uma linha não são ordenadas isoladamente.
Colunas com a mesma distribuição de valores exigem permutações globais para produzir uma forma canônica.
O cálculo admite até 120 alternativas e, se houver ambiguidade maior, descarta o candidato para conferência
manual, em vez de emitir um hash aproximado. A tabela admite até 64 colunas e 100000 células nesta etapa.

Cada família de modelo tem um único voto final. Retentativas do mesmo provedor não são votos adicionais.
Três resultados iguais produzem UNANIME; dois produzem MAIORIA; dois ou mais válidos sem acordo produzem
DIVERGENTE; menos de dois válidos produzem FALHA. Erros, vazios, truncamentos e resultados não normalizáveis
não votam. A forma canônica completa fundamenta o acordo e o SHA-256 permite rastreá-la.
Consenso fornece uma referência apurada; a validação da regra de negócio permanece com o analista.

## Catálogo, relacionamentos e amostras

- `GET /api/banco/catalogo`: tabelas, colunas, tipos, nulabilidade e pares de chaves estrangeiras.
- `POST /api/banco/subesquema`, com `{"requisito":"Consultar saldo do estoque"}`: seleciona tabelas
  por termos do nome da tabela e das colunas, ignorando acentos e caixa, e expande pelos relacionamentos.
  Sem correspondência, retorna seleção vazia; não escolhe tabelas arbitrariamente.
- `POST /api/banco/amostras`, com `{"schema":"public","tabela":"produto","coluna":"status"}`:
  lê valores distintos não nulos somente das colunas explicitamente autorizadas.

`ERP_CATALOGO_SCHEMAS` limita os schemas visíveis no catálogo (padrão `public`). As permissões SELECT
da conta continuam obrigatórias. `ERP_AMOSTRA_COLUNAS` começa vazio e recebe nomes completos separados
por vírgula, por exemplo `public.produto.status,public.movimento.tipo`. A amostragem não é disparada
automaticamente e não é enviada a modelos. Não inclua dados pessoais nessa lista.
`ERP_AMOSTRA_MAX_VALORES` limita cada amostra (padrão 5, máximo 20). Nomes são conferidos no catálogo
e escapados como identificadores SQL, inclusive quando contêm aspas.

O catálogo usa INFORMATION_SCHEMA para as colunas e `pg_catalog.pg_constraint` para as FKs, porque
INFORMATION_SCHEMA pode omitir constraints de tabelas às quais a conta só tem SELECT. Pares de chaves
compostas preservam suas posições. Relacionamentos para colunas não visíveis são excluídos.
Cada leitura reutiliza os limites e a transação somente leitura do gateway PostgreSQL. Se o catálogo
exceder os limites, a operação falha integralmente; não seleciona um subesquema incompleto.
`ERP_CATALOGO_MAX_TABELAS` (12) e `ERP_CATALOGO_PROFUNDIDADE` (1) limitam a seleção.
O catálogo e as FKs são lidos em transações separadas; mantenha o esquema estável durante a coleta.
O filtro de schemas regula o catálogo, enquanto os GRANTs regulam o acesso das consultas ao banco.

## Apuração persistida sem integrar IA

Uma execução concluída e ainda não revisada pode receber consultas finais informadas pelo analista:

```http
POST /api/execucoes/1/apuracoes
Content-Type: application/json

{
  "cenarioId": 1,
  "pergunta": "Saldo do estoque",
  "preservarOrdem": false,
  "candidatos": [
    {"provedor": "CLAUDE", "consulta": "SELECT sum(saldo) AS saldo FROM public.estoque"},
    {"provedor": "GEMINI", "consulta": "SELECT sum(saldo) AS total FROM public.estoque"},
    {"provedor": "LLAMA", "consulta": "SELECT sum(saldo) AS quantidade FROM public.estoque"}
  ]
}
```

`cenarioId` pode ser omitido; quando informado, deve pertencer à execução. A resposta contém o ID
da apuração; `GET /api/execucoes/{id}` retorna referência, consultas, resultados, hashes e descartes.
São aceitos de um a três provedores distintos. Cada consulta passa pelo verificador e pelo PostgreSQL;
SQL recusado, vazio e erro não votam. Falhas de configuração interrompem a operação sem salvar resultados
parciais. O registro H2 é atômico, e uma revisão concorrente impede salvar novas apurações.

Este endpoint **não chama modelos**: `origem=MANUAL` e `modelo=INFORMADO_MANUALMENTE` deixam isso explícito.
O nome do provedor é declarado pelo analista, sem autenticação de sua origem; os tokens e custos são zero.
Os testes do fluxo usam substitutos dos gateways, sem depender de Jira ou IA reais.
Cada candidato e a coleta do catálogo usam transações PostgreSQL próprias: não há snapshot compartilhado
entre os provedores. Dados alterados durante a apuração podem gerar divergência.

Quando há acordo e cenário associado, o resultado esperado recebe um marcador `«A<id>»`, que a interface
já apresenta com o valor da referência. Sem acordo, recebe um aviso para conferência manual. O Gherkin
original é preservado. Histórico e métricas refletem as apurações salvas, separadas dos custos de geração
de cenários. Corrigir valores na revisão e gerar SQL automaticamente continuam pendentes.
