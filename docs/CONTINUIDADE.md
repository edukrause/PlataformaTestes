# Continuidade do desenvolvimento — 16/11/2026

## O que mudou nesta etapa

- **Claude integrado** como terceira família (API de mensagens da Anthropic), no mesmo cliente de Gemini e Groq:
  tokens, custo, truncamento, pseudonimização e auditoria. Com as três famílias habilitadas, a apuração chega a UNANIME.
  O adaptador legado (`plataforma.ia.modo=api`) foi removido; use `PLATAFORMA_IA_MODO=externa` e `CLAUDE_HABILITADO=true`.
- **Leitura MySQL** do banco do ERP (`ERP_DIALETO=MYSQL`), além de PostgreSQL: catálogo por INFORMATION_SCHEMA,
  funções aceitas por dialeto, transação READ ONLY, EXPLAIN, limites e recusa de contas com privilégio de escrita.
  Guia em [backend/docs/mysql.md](../backend/docs/mysql.md).
- **Temperatura** dos modelos (`MODELOS_TEMPERATURA`, padrão 0) enviada aos três provedores e gravada em cada chamada (migração V8).
- **Artigo preliminar** em [tcc/artigo](../tcc/artigo): DOCX, PDF, fonte, figuras, demonstração e pendências.

## Verificação realizada em 16/11/2026

- `mvn -B -ntp clean verify` com Java 21.0.13 e Maven 3.9.9: **121 testes, 0 falhas, 0 erros, 0 ignorados**,
  incluindo os testes reais de PostgreSQL 16.4 e MySQL 8.4.3 em instâncias locais descartáveis.
  Resumo em `tcc/artigo/evidencias/testes-2026-11-16.json`.
- Frontend: lint e build em modo HTTP.
- JAR iniciado com Claude habilitado (chave fictícia, sem chamada real) e com MySQL: saúde, configuração,
  catálogo, subesquema, consulta e recusa de escrita pela API REST.
- Demonstração em base MySQL sintética (5 perguntas): MAIORIA correta, UNANIME, MAIORIA com falso acordo,
  DIVERGENTE e FALHA, como construído. Nenhuma chamada a modelos.

## O que continua pendente

- Nenhuma conexão real com Claude, Gemini, Groq, Jira ou Confluence foi homologada; faltam credenciais.
- Avaliação empírica (M1–M13) e hipóteses H1–H4: ver `tcc/artigo/PENDENCIAS.md`.
- A CI agora sobe MySQL 8.4 além de PostgreSQL 16/18; confirmar a execução após o próximo push.
- B33 (alterações de código) segue como evolução futura.

## Commits desta etapa (locais)

`a721cbf` Claude · `ac63d73` MySQL · `25c03d8` temperatura · commit do artigo.
O push foi negado nesta máquina porque o `gh` está autenticado em outra conta (sem permissão no repositório `edukrause`).
Enviar a partir de uma sessão autenticada como o dono do repositório.

## Executar

- Build: `scripts/build.ps1` ou `sh scripts/build.sh` (Java 21, Maven, Node 22).
- `cd backend && java -jar target/plataforma-testes-0.1.0-SNAPSHOT.jar` e abrir http://127.0.0.1:8080.
- Configuração em `backend/.env` a partir de `backend/.env.example`, sem sobrescrever credenciais existentes.
