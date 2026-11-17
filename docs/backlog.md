# Backlog priorizado

As horas e marcos abaixo são as estimativas originais, não uma previsão de esforço restante.
Implementado significa código e testes existentes; validação com contas reais depende das credenciais e do ambiente.

O fluxo do MVP está implementado com Gemini e Llama/Groq. **A integração com Claude permanece pendente**,
conforme pedido do Eduardo. O terceiro provedor de B13 e a unanimidade automática dependem dessa integração.
Sem IA, a entrada manual permite criar cenários, apurar consultas, revisar e exportar resultados.

PostgreSQL é a fonte consultada, H2 é o histórico local. Nesta sessão, 88 testes passaram, 8 PostgreSQL reais
foram ignorados; os clientes externos foram exercitados com HTTP simulado. O JAR único foi gerado e iniciou
localmente com H2 em memória: interface, criação manual, conferência e CSV foram verificados.
Consulte docs/CONTINUIDADE.md para validação e commits. Não considerar as integrações já homologadas em produção.

| ID | Item | h | Prioridade | Marco | FV | Status |
|---|---|---:|---|---|:-:|---|
| B01 | Esqueleto Spring Boot + React no mesmo build, gerando um único executável | 4 | MVP | E6 | ● | implementado; React e backend no mesmo JAR, scripts de build e CI |
| B02 | Configuração de credenciais por variáveis de ambiente e perfil local | 1 | MVP | E6 | ● | implementado; variáveis, .env opcional e configuração sem segredos na API |
| B03 | Base local H2 com migração das seis tabelas da plataforma | 3 | MVP | E6 | ● | implementado; Flyway V1–V7 e auditoria preservada |
| B04 | Cliente do Jira: obter o requisito pela chave da tarefa | 3 | MVP | E6 | ● | implementado e testado por HTTP simulado; validar credenciais/workflow reais |
| B05 | Gateway de modelos com adaptador do Claude e registro de tokens, custo e latência | 4 | MVP | E6 | ● | Claude pendente; gateway e auditoria disponíveis para Gemini/Llama |
| B06 | Conexão PostgreSQL somente leitura com limite de tempo e de linhas | 2 | MVP | E6 | ● | implementado; testes reais existentes, nova execução PostgreSQL pendente |
| B07 | Verificador, camada 1: análise sintática que admite apenas SELECT | 3 | MVP | E6 | ● | implementado; AST, CTEs e funções permitidas |
| B08 | Geração de cenário Gherkin a partir do requisito (um modelo) | 4 | MVP | E6 | ● | implementado com Gemini/Llama; Claude permanece pendente |
| B09 | Geração de SQL por um modelo, com o esquema da área informado integralmente | 4 | MVP | E6 | ● | implementado; catálogo, domínio, SQL gerado e apuração persistida |
| B10 | Compositor: cenário com valor preenchido e consulta anexada | 2 | MVP | E6 | ● | implementado; marcador de referência nos passos/resultado e SQL no detalhe |
| B11 | Tela: informar a tarefa e visualizar o resultado | 4 | MVP | E6 | ● | implementado; Jira, entrada manual, apuração e revisão pela interface |
| B12 | Adaptadores do Gemini e do Llama (Groq) no gateway | 4 | MVP | E7 |  | implementado; Gemini API e Llama/Groq, tokens/custos e erros |
| B13 | Geração paralela pelos três modelos e nova tentativa com a mensagem de erro | 6 | MVP | E7 |  | implementado com duas famílias e uma retentativa; terceiro provedor depende de Claude |
| B14 | Verificador, camadas 2 e 3: EXPLAIN e execução; descarte de erro e de vazio | 4 | MVP | E7 |  | implementado e integrado à apuração |
| B15 | Normalizador: ordenação, arredondamento, nulos e datas | 6 | MVP | E7 |  | implementado, testado e integrado |
| B16 | Motor de consenso e classificação do desfecho | 4 | MVP | E7 |  | implementado; um voto final por família, descartes e hashes persistidos |
| B17 | Extração do esquema pelo INFORMATION_SCHEMA e grafo de chaves estrangeiras | 6 | MVP | E7 |  | implementado; INFORMATION_SCHEMA + pg_catalog; teste real novo pendente |
| B18 | Amostrador de valores restrito à lista de colunas permitidas | 5 | MVP | E7 |  | implementado; lista permitida, limites e envio opcional aos modelos |
| B19 | Filtro de saída no gateway: pseudonimização de dados pessoais no requisito, na documentação e nas mensagens de erro | 5 | MVP | E7 |  | implementado para padrões e termos configurados em todo o contexto; não identifica todo dado confidencial |
| B20 | Cliente do Confluence: obter a página da rotina e convertê-la em texto | 6 | MVP | E8 |  | implementado; Confluence Cloud/v2 e REST anterior/v1, versão/hash/texto guardados |
| B21 | Documentação funcional no prompt, com cenários de regressão | 6 | MVP | E8 |  | implementado; documentação no contexto, regressão condicionada à coleta |
| B22 | Validação com o analisador Gherkin e uma regeneração em caso de erro | 4 | MVP | E8 |  | implementado; contrato/Gherkin e uma regeneração auditada |
| B23 | Classificador: o requisito exige apuração de valores? | 4 | MVP | E8 |  | implementado no contrato e fluxo: exigeApuracao e pergunta por cenário |
| B24 | Restrições de domínio obrigatórias no prompt (empresa, filial, cancelados, exclusão lógica) | 4 | MVP | E8 |  | implementado; DOMINIO_REGRAS obrigatório na geração SQL e presente no contexto |
| B25 | Seleção do subesquema por similaridade de termos e expansão pelos relacionamentos | 8 | MVP | TCC II |  | implementado; seleção lexical e expansão limitada por FKs |
| B26 | Tela de revisão: aceitar, aceitar com alteração ou rejeitar, com registro de tempo | 6 | MVP | TCC II |  | implementado; decisão, correções, tempo, histórico e métrica de alterações |
| B27 | Exibição do desfecho e da consulta de cada modelo | 4 | MVP | TCC II |  | implementado; consultas, resultados, desfecho, origem e descartes na tela |
| B28 | Execução em lote sobre o conjunto de referência | 6 | MVP | TCC II |  | implementado; até 20 tarefas distintas, resultados individuais e recuperação de interrupções |
| B29 | Exportação das métricas em CSV | 3 | MVP | TCC II |  | implementado; métricas, execuções e candidatos em CSV protegido contra fórmulas |
| B30 | Registro dos cenários aprovados de volta na tarefa do Jira | 6 | Desejável | — |  | implementado; publicação explícita após revisão, idempotente por execução/revisão |
| B31 | Cache do esquema e das amostras entre execuções | 4 | Desejável | — |  | implementado; TTL configurável, amostras limitadas e invalidação explícita |
| B32 | Painel de custos por provedor | 4 | Desejável | — |  | implementado; métricas por provedor e filtro manual/modelos |
| B33 | Incorporação das alterações de código vinculadas à tarefa | 8 | Desejável | Futuro |  | fora do MVP; evolução futura, sem integração de alterações de código |

Fatia vertical original: 34 h · MVP original: 125 h · Desejáveis originais: 22 h.

## O que depende do ambiente

1. Configurar URLs, credenciais, modelos/preços e regras reais do domínio em backend/.env ou variáveis.
2. Executar os testes PostgreSQL em banco descartável; verificar a CI 16/18 após o push.
3. Validar leitura Jira/Confluence e gerações com Gemini/Llama nas contas reais.
4. Conferir os IDs de situações/transições e testar a publicação opcional no projeto escolhido.
5. Integrar Claude ao final e executar a avaliação com três famílias.
6. B33 continua uma evolução futura fora do MVP, não uma pendência desta entrega.
