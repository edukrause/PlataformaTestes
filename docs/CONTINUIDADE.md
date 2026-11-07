# Continuidade do desenvolvimento — 07/11/2026

Resumo da conversa e do estado do projeto para retomar na próxima sessão.

## Pedido e decisões do Eduardo

- O foco é o desenvolvimento da plataforma do TCC, não a revisão do texto acadêmico.
- Estruturar o backend primeiro; deixar a integração com Claude para a etapa final.
- O meio de acesso ao Claude ainda não foi decidido. Terminal/Claude Code foi discutido, mas não implementado.
- PostgreSQL substitui MySQL como fonte de dados consultada. O histórico local permanece em H2.
- Eduardo autorizou desenvolver, fazer commits por etapa e subir ao GitHub sem pedir confirmação a cada alteração.
- Se surgir uma dúvida que realmente dependa dele, perguntar; decisões rotineiras podem seguir autonomamente.

## Repositório

- Pasta: `C:\Users\eduar\PlataformaTestes`.
- Remoto: https://github.com/edukrause/PlataformaTestes
- Branch: `main`.
- Último commit de implementação desta sessão: `5835961d3da1bd83927c60abc36edb821e00a80c`.
- Os commits foram enviados e o HEAD remoto foi conferido. Antes deste resumo, a árvore de trabalho estava limpa.
- A restrição de rede da sessão foi removida; o push HTTPS funcionou normalmente. Não é necessário trocar o remoto para SSH.

## Implementado

- Java 21, Spring Boot 3.5, JDBC, H2 e migrações Flyway.
- API de histórico, detalhe, conversa, revisão e registro manual da execução dos testes.
- Histórico das decisões de revisão, com migração V2 que preserva revisões existentes.
- Separação dos serviços de geração, consultas, conversas e métricas.
- Portas `RequisitoGateway` e `ModeloGateway`; adaptador de leitura do Jira.
- Adaptador da API Claude preservado, mas IA desativada por padrão (`PLATAFORMA_IA_MODO=desativada`).
- PostgreSQL em conexão separada do H2, ativada explicitamente pelas variáveis `ERP_POSTGRES_*`.
- Parser JSQLParser: um SELECT, bloqueio de escrita/CTEs de escrita/SELECT INTO/locks e funções fora da lista.
- Leitura PostgreSQL em transação READ ONLY/REPEATABLE READ, EXPLAIN sem ANALYZE, timeout, limites de linhas e caracteres.
- Conta superusuária recusada; resultados truncados são descartados integralmente.
- Endpoint independente da IA: `POST /api/banco/consultas`, corpo `{"consulta":"SELECT ..."}`.
- `NormalizadorResultados`: aliases, ordem de colunas/linhas, escala decimal, nulos, datas e instantes UTC.
- A normalização preserva duplicatas e a relação entre células. Ambiguidades excessivas são descartadas, sem hash aproximado.
- `MotorConsenso`: UNANIME, MAIORIA, DIVERGENTE e FALHA; apenas um voto final por provedor.
- Workflow GitHub Actions com PostgreSQL 16 e 18, além de build/lint do frontend.

## Limite importante do estado atual

A consulta manual funciona sem IA. Normalização e consenso são componentes internos testados.
Eles ainda NÃO estão ligados à geração e à persistência completa de `apuracao`/`candidato_sql`.
Não considerar o fluxo completo de apuração pronto. As métricas de apuração continuam zeradas.
O frontend publicado é um protótipo com dados simulados; o modo HTTP usa o backend local.

## Verificação realizada

- Último `mvn verify`: 70 testes, zero falhas, zero erros, zero ignorados; JAR gerado.
- Testes reais executados em PostgreSQL 18, com fixtures sintéticas numa instância temporária separada.
- A instância temporária foi encerrada. Não foi alterado o banco pessoal/de homologação do Eduardo.
- Testes cobrem escrita bloqueada, EXPLAIN, timeout, limites, tipos/nulos, normalização e consenso.
- Build e lint da interface passaram na etapa anterior; esta etapa não alterou o frontend.
- CI do primeiro commit PostgreSQL foi observado como bem-sucedido. Não foi confirmado o resultado do último push.

Java e Maven estão instalados fora do PATH habitual:

```powershell
$env:JAVA_HOME = 'C:\Users\eduar\.jdks\openjdk-21.0.2'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
cd C:\Users\eduar\PlataformaTestes\backend
& 'C:\Users\eduar\.m2\wrapper\dists\apache-maven-3.9.14-bin\1cb7fhup6b5n3bed6kckbrnspv\apache-maven-3.9.14\bin\mvn.cmd' '-Dmaven.repo.local=C:\Users\eduar\.m2\repository' -B -ntp verify
```

Sem `PLATAFORMA_TEST_PG_URL`, os testes reais PostgreSQL são ignorados. Para incluí-los, usar um banco
descartável e as variáveis de teste descritas em `backend/docs/postgresql.md`; não apontar para homologação.
O PostgreSQL 18 está instalado em `C:\Program Files\PostgreSQL\18\bin`.

## Próximos passos

1. Conferir `git status`, eventuais mudanças do Eduardo e a CI mais recente.
2. B17/B18/B25: extrair catálogo PostgreSQL, relacionamentos, amostragem permitida e seleção de subesquema.
3. B09/B10: integrar consultas verificadas, normalização e consenso ao registro/composição das apurações.
   Testar com substitutos dos modelos enquanto a integração de IA estiver adiada.
4. Completar revisão com correção de valores e métricas reais das apurações.
5. Confluence, execução em lote, exportação CSV e empacotamento único.
6. Ao final, decidir e integrar o acesso aos modelos e validar o fluxo completo com serviços reais.

Consultar `docs/backlog.md`, `backend/README.md` e `backend/docs/postgresql.md` para detalhes e pendências.
As entregas acadêmicas E1–E5 e seus diagramas preservam o planejamento original com MySQL; ainda não foram reescritas.

## Commits desta conversa

- `aeda5e7` — Salva backend inicial e conexao da interface com a API.
- `3e104d8` — Separa casos de uso do backend e adia integracao de IA.
- `8cf694e` — Preserva historico das decisoes de revisao com migracao de dados.
- `b320adf` — Adiciona verificacao automatica e atualiza plano de desenvolvimento.
- `8568997` — Implementa leitura PostgreSQL com validacao SQL e testes reais.
- `3b02b74` — Implementa normalizacao de resultados e consenso entre provedores.
- `5835961` — Completa testes PostgreSQL e atualiza backlog da apuracao.
