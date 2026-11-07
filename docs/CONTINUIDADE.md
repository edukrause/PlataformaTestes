# Continuidade do desenvolvimento — 07/11/2026

## Pedido atual

Eduardo pediu para concluir a plataforma deixando apenas a integração com Claude pendente.
O foco continua sendo desenvolvimento, não reescrita do texto acadêmico.
Está autorizado desenvolver, fazer commits por etapa e enviar ao GitHub quando a sessão permitir conexão.

## Repositório e commits

- Pasta: `C:\Users\eduar\PlataformaTestes`; branch main.
- Remoto: https://github.com/edukrause/PlataformaTestes
- A etapa começou sem alterações pendentes.
- `59d2a8b`: fluxo completo de geração/apuração/revisão, Jira/Confluence, Gemini/Groq, lote e CSV.
- `6831f67`: interface de operação e aplicativo em JAR único, build e CI.
- Este resumo, guias e verificação de migração estão em um commit adicional.
- Os commits anteriores `99ae3c2`, `5ab84fa` e `4d29db8` também são locais.
- **O push falhou novamente por falta de conexão ao GitHub na porta 443. Nada desta retomada foi enviado.**
- Último envio confirmado em sessão anterior: `088df0e`. Não confundir implementação local com CI aprovada.

## Funcionalidades entregues

- Java 21, Spring Boot 3.5, H2 para histórico e PostgreSQL somente leitura.
- IA desativada por padrão, com entrada manual pela tela e API; não cria chamadas ou custos fictícios.
- Clientes Gemini e Llama/Groq com preços configuráveis, tokens, latência, pseudonimização e tratamento de truncamento.
- Cenários por modelo selecionado, contrato JSON e parser Gherkin, uma regeneração quando inválidos.
- Leitura Jira via API 2/3, ADF/texto e mapeamento configurável de situações.
- Leitura Confluence via API 2 ou REST 1, página por tarefa/área, HTML convertido, snapshot com versão/hash/texto.
- Documentação no contexto; regressão admitida apenas quando documentação foi efetivamente fornecida.
- Regras de empresa, filial, cancelados e exclusão lógica no contexto; DOMINIO_REGRAS obrigatório na geração SQL.
- Catálogo PostgreSQL com colunas via INFORMATION_SCHEMA e FKs via pg_catalog, preservando pares compostos e permissões.
- Seleção lexical de subesquema com expansão limitada por relacionamentos.
- Amostragem por lista permitida, cache TTL configurável e invalidação explícita.
- Amostras só são incluídas nos modelos com ERP_AMOSTRA_ENVIAR_MODELOS=true; falso por padrão.
- Geração SQL paralela Gemini/Llama, uma retentativa e auditoria de todas as chamadas/custos.
- SELECT verificado por AST, EXPLAIN e execução com timeout/limites, READ ONLY/REPEATABLE READ.
- Normalização, consenso e persistência atômica de apuração/candidatos. Um voto final por família.
- Candidatos finais agregam custos/tokens das tentativas; origem MANUAL ou MODELOS explícita.
- Composição de marcador de referência nos passos e resultado esperado, sem inventar números.
- Correções do analista separadas do resultado original, histórico e métricas reais de alterações.
- Revisão impedida durante apuração; publicação pendente impede trocar a revisão.
- Lote de até 20 chaves distintas, histórico e falhas individuais.
- CSV de métricas, execuções e candidatos, com escape e proteção contra fórmulas.
- Métricas filtráveis por origem para separar operação manual e geração por modelos.
- Escrita opcional no Jira: transição configurada e publicação explícita de cenários aceitos.
- Publicação idempotente por execução/revisão; resposta incerta não é reenviada automaticamente.
- Recuperação de execuções, lotes e publicações interrompidos.
- Interface completa para entrada manual, geração pelo Jira, apuração, conferência/histórico, lote, CSV e publicação.
- JAR único com React e Spring Boot, rotas da SPA e scripts de build Windows/POSIX.

## O que permanece pendente

- **Integração e homologação do Claude**, conforme pedido. Adaptador legado preservado, sem nova integração ou teste real.
- Credenciais, URLs, IDs de modelo, preços e regras reais do ambiente precisam ser configurados pelo responsável.
- As conexões reais Jira, Confluence, Gemini e Groq não foram homologadas nesta sessão; os testes usam HTTP simulado.
- Os 8 testes PostgreSQL reais ficaram ignorados, sem banco descartável disponível.
- A CI PostgreSQL 16/18 e o upload do executável só poderão ser conferidos após o push.
- Incorporação de alterações de código (B33) continua evolução futura fora do MVP.
- Entregas acadêmicas/diagramas E1–E5 ainda representam o planejamento original com MySQL/três provedores.

Com duas famílias automáticas, acordo dos dois é MAIORIA. UNANIME continua exigindo três votos.
Não afirmar que a plataforma foi homologada em produção ou que a conexão do usuário já está configurada.

## Verificação efetivamente realizada

- Código principal e testes compilados com Java 21 por JavaCompiler (-source 21 -target 21).
- Suíte Maven Surefire: **96 testes, zero falhas/erros, 8 ignorados = 88 executados com sucesso**.
- Depois, o teste de migração foi ampliado e executado isoladamente: preserva revisão existente de V2 até V7,
  incluindo decisão e mapas de correção vazios, sem alterar a revisão anterior.
- Testes cobrem contratos HTTP Jira/Confluence/Gemini/Groq, privacidade, tokens/custo, retentativas, SQL rejeitado,
  consenso, correções/histórico, lote, publicação idempotente/incerta, concorrência e CSV.
- Frontend: npm.cmd run lint sem avisos e npm.cmd run build passaram em modo HTTP.
- Recursos, jar:jar e spring-boot:repackage concluídos pelo Maven.
- JAR iniciado em porta 18081 com H2 em memória, IA desativada, PostgreSQL e escrita Jira desativados.
- HTTP real local: saúde UP; /nova devolveu HTML 200; execução manual criada com origem MANUAL;
  cenário persistido, conferência aceita e CSV 200.
- O servidor temporário foi encerrado. Nenhum banco pessoal foi alterado e nenhum comentário real foi enviado.
- O JAR foi reempacotado com o último build da interface após esse teste de inicialização.
- git diff --check passou.

## Limitação do ambiente de compilação

O Maven padrão com --release 21 falha nesta sessão restrita ao fechar recursos do compilador (AccessDeniedException).
Para validar sem alterar o pom, foram usados backend/target/CompileCheck.java e um JAR temporário com as classes
principais no classpath. Recursos foram copiados pelo Maven, os testes rodaram pelo Surefire e o JAR final
foi montado pelos plugins Maven. Esses auxiliares e o cache em target são ignorados pelo Git.
Não afirmar que mvn clean verify completo passou localmente; os scripts/CI fazem esse fluxo fora da restrição.

A tentativa anterior de initdb também falhou por permissões/token restrito. Não usar banco pessoal para contornar isso.

## Executar e configurar

- JAR: `backend/target/plataforma-testes-0.1.0-SNAPSHOT.jar`.
- Iniciar de backend: `java -jar target/plataforma-testes-0.1.0-SNAPSHOT.jar`.
- Interface: http://127.0.0.1:8080 → Execuções → Nova execução → Entrada manual.
- Configuração: copiar backend/.env.example para backend/.env, sem substituir um arquivo já configurado.
- PLATAFORMA_IA_MODO=externa e provedor GEMINI ou LLAMA para gerar com credenciais.
- Para consenso SQL, habilitar os dois, configurar o PostgreSQL e DOMINIO_REGRAS.
- Escrita Jira fica desativada por padrão e só é feita por ação explícita na tela/API.
- Scripts de build: scripts/build.ps1 e scripts/build.sh. Há alternativa sem scripts no guia do backend.

Java: `C:\Users\eduar\.jdks\openjdk-21.0.2`.
Maven: `C:\Users\eduar\.m2\wrapper\dists\apache-maven-3.9.14-bin\1cb7fhup6b5n3bed6kckbrnspv\apache-maven-3.9.14\bin\mvn.cmd`.
PostgreSQL: `C:\Program Files\PostgreSQL\18\bin`.

Consultar backend/README.md, backend/docs/postgresql.md e docs/backlog.md.
