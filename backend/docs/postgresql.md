# PostgreSQL: leitura, catálogo e apuração

PostgreSQL é a fonte de dados consultada. H2 guarda o histórico local e recebe as migrações Flyway.
O PostgreSQL do ERP nunca recebe essas migrações nem qualquer escrita da plataforma.

## Configuração

Preencha as variáveis de [../.env.example](../.env.example), copiando para `backend/.env` sem substituir
credenciais existentes. Inicie o servidor de `backend` para importar esse arquivo.

- `ERP_POSTGRES_HABILITADO=true`
- URL JDBC PostgreSQL, usuário dedicado e senha.
- Timeout de 1–60 segundos, limite de linhas de 1–10000 e limite de caracteres.
- `ERP_CATALOGO_SCHEMAS`: schemas visíveis no catálogo; padrão public.
- `ERP_CATALOGO_MAX_TABELAS` e `ERP_CATALOGO_PROFUNDIDADE`: seleção por termos e expansão por FKs.
- `ERP_AMOSTRA_COLUNAS`: nomes completos separados por vírgula, vazio por padrão.
- `ERP_AMOSTRA_MAX_VALORES`: limite de valores distintos por coluna (padrão 5, máximo 20).
- `ERP_CATALOGO_CACHE_SEGUNDOS`: cache em memória de 0–3600 segundos (padrão 60).
- `ERP_AMOSTRA_ENVIAR_MODELOS`: falso por padrão. Verdadeiro autoriza incluir amostras das colunas
  permitidas do subesquema no contexto dos modelos, passando pelo filtro de saída.

O DBA deve conceder somente o necessário à conta dedicada. Exemplo a adaptar:

```sql
CREATE ROLE plataforma_leitura LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT CONNECT ON DATABASE seu_banco TO plataforma_leitura;
GRANT USAGE ON SCHEMA public TO plataforma_leitura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO plataforma_leitura;
ALTER ROLE plataforma_leitura SET default_transaction_read_only = on;
```

Defina a senha com o comando interativo do psql. A plataforma recusa superusuários.
Novas tabelas exigem novos GRANTs. O filtro de schemas regula o catálogo; os GRANTs regulam
o acesso efetivo das consultas. Uma coluna na lista de amostras deve ser adequada para essa finalidade.

## Consulta isolada

```http
POST /api/banco/consultas
Content-Type: application/json

{"consulta":"SELECT sum(saldo) AS saldo FROM public.estoque"}
```

Use nomes qualificados. A sessão usa search_path restrito a pg_catalog.
O retorno contém verificacao, colunas, linhas, mensagemErro e latenciaMs.
A consulta isolada não conta como apuração e não vota em consenso.

Fluxo: AST JSQLParser → um SELECT permitido → transação READ ONLY/REPEATABLE READ → EXPLAIN sem ANALYZE
→ execução com limites → rollback e fechamento da conexão.
São bloqueados escrita, múltiplas instruções, SELECT INTO, locks, CTEs de escrita e funções fora da lista.
Permissões limitadas no banco continuam obrigatórias: o parser não é um sandbox de funções arbitrárias.

Resultado vazio é VAZIO. Erros de plano e execução são distintos, sem mensagens internas do banco.
Exceder linhas/caracteres descarta o resultado inteiro; truncamentos não podem fundamentar consenso.
Com a integração desativada, os endpoints de banco respondem 503.

## Catálogo e amostragem

- `GET /api/banco/catalogo`: tabelas, colunas, tipos, nulabilidade e relacionamentos acessíveis.
- `GET /api/banco/catalogo?atualizar=true`: invalida os caches de catálogo/amostras e faz nova coleta.
- `POST /api/banco/subesquema` com `{"requisito":"Saldo do estoque"}`: seleção lexical sem acentos/caixa,
  seguida de expansão pelas FKs. Sem correspondência, a seleção fica vazia.
- `POST /api/banco/amostras` com `{"schema":"public","tabela":"produto","coluna":"status"}`:
  valores distintos e não nulos, somente para colunas explicitamente permitidas.

Colunas são obtidas pelo INFORMATION_SCHEMA. FKs usam pg_catalog.pg_constraint, porque contas com
apenas SELECT podem não enxergar constraints pelo INFORMATION_SCHEMA.
Pares de chaves compostas preservam posições; relações para colunas inacessíveis são excluídas.
Se uma coleta ultrapassar os limites, a operação falha integralmente.
Catálogo e FKs usam transações separadas: mantenha o esquema estável durante a coleta.
As amostras têm cache limitado a 128 entradas, respeitando TTL e autorização.

## Apuração manual

Uma execução concluída e ainda não revisada pode receber:

```http
POST /api/execucoes/1/apuracoes
Content-Type: application/json

{"cenarioId":1,"pergunta":"Saldo do estoque","preservarOrdem":false,"candidatos":[
  {"provedor":"GEMINI","consulta":"SELECT sum(saldo) FROM public.estoque"},
  {"provedor":"LLAMA","consulta":"SELECT sum(saldo) AS total FROM public.estoque"}
]}
```

São aceitos de um a três provedores distintos. cenarioId pode ser omitido; quando informado, deve
pertencer à execução. A origem é MANUAL; o provedor é declarado pelo analista, sem autenticação dessa
origem. Modelo INFORMADO_MANUALMENTE, tokens/custos zero. Não há chamada de IA nesse endpoint.
SQL recusado, vazio e erro não votam. Configuração inválida não salva apuração parcial.

## Apuração automática

`POST /api/execucoes/{id}/apuracoes/automaticas` recebe cenarioId opcional, pergunta e preservarOrdem.
Habilite Gemini e Llama/Groq, configure chaves/modelos/preços e informe as regras em DOMINIO_REGRAS.
O catálogo selecionado é enviado no contexto. Cada provedor gera um SELECT independente; uma consulta
inválida pode ser refeita uma vez. Não há participação de Claude nesta entrega.

Cenários gerados com perguntaApuracao também disparam esse fluxo durante a geração.
Todas as chamadas são auditadas; tentativas anteriores não ganham votos adicionais.
O candidato final agrega tokens, custo e latência das tentativas. Falha de geração fica ERRO_GERACAO.
Cenários podem permanecer concluídos com uma pendência explícita quando falta configuração para apurar.

A apuração em andamento impede revisão concorrente. O registro da decisão e dos candidatos é atômico
no H2. Detalhe e histórico devolvem consultas, resultados, hashes, descartes, origem e custos.
Quando há acordo, o marcador VALOR_APURADO vira uma referência A<id> no cenário; a interface resolve
o valor. Correções do analista ficam separadas da referência original e mantêm histórico.

## Normalização e consenso

Aliases e ordem de colunas são ignorados. A ordem das linhas só é preservada quando solicitada.
Nulos, textos, números, booleanos e datas têm marcadores distintos; duplicatas e relações entre células
são preservadas. Escala decimal informada pelo banco é respeitada; sem precisão, usa-se duas casas
com HALF_UP. Instantes com fuso são comparados em UTC.

Permutações de colunas ambíguas são limitadas a 120 alternativas, 64 colunas e 100000 células.
Ambiguidade excessiva descarta o candidato, sem hash aproximado. A representação canônica completa
fundamenta o acordo; o SHA-256 serve à rastreabilidade.

Três iguais produzem UNANIME; dois iguais, MAIORIA; dois ou mais válidos sem acordo, DIVERGENTE;
menos de dois válidos, FALHA. Sem Claude, o fluxo automático atual pode produzir MAIORIA com os dois
provedores habilitados. Consenso requer conferência da regra de negócio pelo analista.
Cada candidato usa seu próprio snapshot: dados alterados entre consultas podem gerar divergência.

## Testes reais

A CI usa instâncias descartáveis PostgreSQL 16/18. Localmente, aponte PLATAFORMA_TEST_PG_URL,
PLATAFORMA_TEST_PG_ADMIN e PLATAFORMA_TEST_PG_SENHA para um banco exclusivo de teste.
Os testes criam/removem somente fixtures com nomes aleatórios. Não aponte para homologação.

Sem a URL de teste, os testes reais são ignorados. O teste novo cobre catálogo com conta SELECT,
FKs compostas, permissões e amostragem, além de tipos, limites, EXPLAIN, timeout e bloqueio de escrita.
Consulte [continuidade](../../docs/CONTINUIDADE.md) para distinguir testes executados dos ignorados.

Referências: [PostgreSQL](https://www.postgresql.org/docs/18/sql-set-transaction.html),
[JSQLParser](https://github.com/JSQLParser/JSqlParser/releases/tag/jsqlparser-5.3).
