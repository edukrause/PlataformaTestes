# Estado e evidências

## Implementação observada

Referência de código: `317f3682f2a14ee9e7cc6e535e28c5c5c674c96e`. Java 21, Spring Boot 3.5, React/TypeScript, PostgreSQL somente leitura e H2 local. Consultar os arquivos atuais antes de escrever no passado como algo executado.

- Jira e Confluence: clientes implementados; testes HTTP simulados; sem configuração funcional encontrada no diagnóstico de 15/11.
- Gemini e Llama/Groq: geração e auditoria implementadas; sem chamadas reais no diagnóstico.
- Claude: integração/homologação pendente. Não alegar comparação empírica entre três famílias.
- SQL: parser, EXPLAIN sem ANALYZE, execução com limites e transação somente leitura. Permissões do banco continuam necessárias.
- Consenso: cada família tem um voto final; duas representações iguais dão MAIORIA, três dão UNANIME; sem acordo ou candidatos suficientes, não há referência.
- Normalização: comparação da representação canônica completa, não só do hash. Preserva multiplicidade e relações entre células; distingue nulo, texto e número. Limites de 120 permutações, 64 colunas e 100.000 células no código examinado.
- Cada candidato usa conexão/snapshot próprio. A comparação exige controlar alterações na massa.
- Resultados completos das consultas ficam locais; envio de amostras é desativado por padrão e depende de lista de colunas permitidas.
- Entrada manual tem origem MANUAL e não comprova qual modelo produziu a consulta. Seu custo registrado como zero não representa preço de geração por IA.
- Revisão humana e correções preservam o resultado apurado original. Publicação no Jira é opcional e exige ação explícita; este trabalho não publicou comentários.

## Evidência já disponível

Os XMLs de `backend/target/surefire-reports` foram somados na inspeção: 96 testes, zero falhas, zero erros, oito ignorados; 88 executados. São relatórios preexistentes, não uma nova execução da suíte neste trabalho. Os ignorados pertenciam a `PostgresLeituraTest`.

O histórico em `docs/CONTINUIDADE.md` relata compilação, testes, lint/build e smoke test local anteriores. Não afirma que `mvn clean verify` completo passou naquele ambiente. Não confundir build local com CI remota.

Diagnóstico realizado em 15/11/2026, com JAR local e H2 temporário em memória:

| Operação | Resultado observado |
|---|---|
| GET /api/saude | HTTP 200, status UP |
| GET /api/configuracao | IA/Jira/Confluence/PostgreSQL não configurados; provedores habilitados: lista vazia |
| POST /api/execucoes, tarefa P01 | HTTP 503, geração por IA desativada |
| POST /api/execucoes, tarefa P02 | HTTP 503, geração por IA desativada |
| POST /api/execucoes, tarefa P03 | HTTP 503, geração por IA desativada |

A instância temporária foi encerrada. Nenhuma geração, consulta ao ERP ou revisão de especialista ocorreu. As latências HTTP do diagnóstico não são tempos de elaboração dos casos.

## Pré-seleção do piloto

P01: tarefa de relatório de estoque; P02 e P03: tarefas de pedidos de venda. A busca exigiu projeto estudado, status Finalizada e resolução entre 01/01/2025 e 30/09/2026. Há requisitos com mais de 50 palavras e casos históricos preenchidos. A escolha foi intencional, não aleatória. Conferência de documentação revisada, duplicatas e autoria histórica permanece necessária. O campo atual de analista não prova sozinho a autoria de todos os casos anteriores.

Identificação e conteúdo das tarefas ficam nos arquivos privados indicados no README. As fontes usadas para geração foram relidas com `fields=["*all"]`; os casos históricos foram excluídos dessa segunda leitura, mas já tinham sido vistos na preparação. Isso impede considerar a geração na conversa como avaliação cega.

## O que não existe ainda

Artigo consolidado; resultados reais de Gemini/Llama no piloto; consultas de referência executadas e conferidas; acurácia/falso acordo; medições com analistas; baseline de tempo; avaliações independentes; confirmação empírica das hipóteses; homologação real dos serviços externos.

As contagens de acervo de E5 (2.913 no período, 694 disponíveis após I1–I3) são registros do levantamento anterior. Não foram recontadas nesta preparação. As quantidades planejadas de 36 elegíveis, seis de calibração e 30 de avaliação não devem ser apresentadas como seleção já concluída.
