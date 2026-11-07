# Continuidade do desenvolvimento — 07/11/2026

## Decisões preservadas

- Estruturar o backend primeiro; integrar Claude e demais modelos ao final.
- O meio de acesso aos modelos ainda não foi decidido; não há integração via terminal.
- PostgreSQL é a fonte consultada; H2 mantém o histórico local da plataforma.
- Eduardo autorizou desenvolver e fazer commits por etapa, com push quando houver conexão.

## Repositório e entregas

Pasta: `C:\Users\eduar\PlataformaTestes`. Branch: `main`.
Remoto: https://github.com/edukrause/PlataformaTestes
A sessão começou sem alterações pendentes.

- `99ae3c2`: catálogo PostgreSQL, grafo de FKs, seleção lexical e amostragem autorizada.
- `5ab84fa`: apurações manuais persistidas, consenso, referência nos cenários, métricas e interface compatível.
- Este resumo está salvo em um commit adicional de documentação.
- **O push falhou por falta de conexão ao GitHub na porta 443. As entregas desta retomada estão apenas locais.**
- A sessão anterior conseguiu subir até `088df0e`.

## Estado anterior preservado

Java 21, Spring Boot 3.5, JDBC, H2 e Flyway. Geração de cenários, leitura Jira, histórico,
revisão e histórico de decisões, conversas e registro manual dos testes.
IA desativada por padrão (`PLATAFORMA_IA_MODO=desativada`); adaptador Claude preservado.
SELECT validado por AST, EXPLAIN e execução PostgreSQL somente leitura com timeout e limites.
Normalização, SHA-256 e consenso com um voto final por provedor.

## Implementado nesta retomada

- `GET /api/banco/catalogo`: tabelas, colunas, tipos, nulabilidade e relacionamentos visíveis.
- Colunas via INFORMATION_SCHEMA; FKs via pg_catalog para funcionar com conta que só possui SELECT.
- Pares de FKs compostas preservados; colunas sem acesso excluídas.
- `POST /api/banco/subesquema`: termos do requisito sem acentos/caixa e expansão limitada por FKs.
- `POST /api/banco/amostras`: somente colunas de `ERP_AMOSTRA_COLUNAS`, vazio por padrão.
- Configurações de schemas, profundidade, tabelas e amostras em `backend/.env.example`.
- `POST /api/execucoes/{id}/apuracoes`: recebe de uma a três consultas finais de provedores distintos,
  verifica, executa, normaliza e salva consenso e candidatos atomicamente no H2.
- Migração V3: origem manual, resultados, descartes, hashes e duração.
- O provedor é declarado pelo analista; a origem não é autenticada. Modelo `INFORMADO_MANUALMENTE`,
  origem `MANUAL`, tokens e custos zero. O endpoint não chama modelos.
- Referência no resultado esperado por marcador `«A<id>»`; sem acordo, aviso para conferência manual.
- Histórico, detalhe e métricas usam as apurações salvas. Consulta isolada não conta como apuração.
- Cenário deve pertencer à execução. Apuração bloqueada após revisão, inclusive concorrente.
- Interface identifica origem manual e aceita booleanos e descartes por limite.

## Validação desta sessão

- Código e testes compilados com Java 21, por JavaCompiler com `-source 21 -target 21`.
- Maven padrão com `--release 21` falhou ao fechar recursos por AccessDeniedException.
  Foi usado um driver temporário em `backend/target/CompileCheck.java`, sem mudar o pom.
  Classes principais também foram empacotadas em JAR temporário para resolver o classpath restrito.
- Maven Surefire (`-Dtest=*Test surefire:test`): **78 testes, zero falhas/erros, 8 ignorados**.
  Portanto, **70 testes passaram**; os 8 PostgreSQL reais foram ignorados por falta de banco descartável.
- O teste novo de catálogo com conta SELECT, FKs compostas, permissões e amostras foi escrito e
  compilado, mas NÃO executado. A inicialização do PostgreSQL temporário falhou por permissões.
- Nenhum banco pessoal foi usado. O workflow existente executa PostgreSQL 16/18 após o push.
- Testes de API com gateways substitutos confirmaram persistência, maioria, descarte de escrita/vazio,
  referência, métricas e bloqueio após revisão. Migração V3 aplicada em H2 em memória.
- Frontend: `npm.cmd run lint` e `npm.cmd run build` passaram. `git diff --check` passou.
- Não afirmar que `mvn verify` completo ou a CI passaram nesta retomada.

## Limites e próximos passos

1. Enviar os commits quando a rede permitir e validar a CI PostgreSQL 16/18.
2. B26: corrigir valores na revisão, preservar histórico e calcular a métrica de alterações (ainda zero).
3. B20/B21/B24: Confluence, documentação funcional e restrições de domínio.
4. B28/B29 e B01: lote, exportação de métricas e empacotamento único.
5. Ao final, escolher acesso aos modelos e implementar geração SQL e retentativas com o catálogo.

Não há geração automática de SQL. A geração de cenários retorna 503 com IA desativada;
os testes usam substitutos dos gateways. Apuração manual exige execução concluída e ainda não revisada.
O marcador fica no resultado esperado; o Gherkin original não é reescrito automaticamente.
Cada consulta e coleta do catálogo usa transação PostgreSQL própria, sem snapshot compartilhado.
Dados ou DDL alterados durante a coleta podem gerar divergência. Não há cache.
Consenso não valida a regra de negócio nem garante cobertura de todos os valores do cenário.
A interface publicada continua sendo protótipo; no modo HTTP usa backend local. Novas apurações entram pela API.
As entregas acadêmicas E1–E5 ainda preservam o planejamento original com MySQL.

Consultar `docs/backlog.md`, `backend/README.md` e `backend/docs/postgresql.md`.
Java: `C:\Users\eduar\.jdks\openjdk-21.0.2`.
Maven: `C:\Users\eduar\.m2\wrapper\dists\apache-maven-3.9.14-bin\1cb7fhup6b5n3bed6kckbrnspv\apache-maven-3.9.14\bin\mvn.cmd`.
PostgreSQL: `C:\Program Files\PostgreSQL\18\bin`.
