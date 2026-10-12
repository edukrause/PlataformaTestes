# Plataforma de cenários de teste para ERP

Trabalho de Conclusão de Curso — Análise e Desenvolvimento de Sistemas, UNIMATER (2026–2027).
Autor: Eduardo Krause · Orientador: Prof. Me. João Mazzochin.

## O que é

Plataforma que gera **cenários de teste em Gherkin** a partir do requisito de uma tarefa e da documentação
funcional da rotina, e que **apura os valores esperados por consulta ao banco de dados**, com decisão por
consenso entre modelos de linguagem de três famílias distintas (Claude, Gemini e Llama).

O problema que orienta o trabalho: em relatórios de sistemas de gestão, testar exige conhecer de antemão o valor
que o sistema deve exibir. A plataforma obtém esse valor de forma **verificável, e não inferida**: cada modelo gera
uma consulta de forma independente, as consultas são executadas em modo somente leitura e o valor só é adotado
como referência quando ao menos dois resultados coincidem. A conferência do analista é sempre obrigatória.

## Arquitetura

![Arquitetura](docs/diagramas/arquitetura.png)

- **Interface web** (React): informa a tarefa, revisa cenários, valores e consultas, registra a decisão.
- **Orquestração** (Java 21 / Spring Boot 3):
  - coletor de contexto (Jira e Confluence);
  - Módulo 1, geração de cenários com validação Gherkin;
  - Módulo 2, apuração de valores: classificador, seletor de subesquema, amostrador, gerador SQL (×3),
    verificador em camadas, normalizador e motor de consenso;
  - gateway de modelos com um adaptador por provedor;
  - compositor de saída e registro de execuções.
- **Base local** (H2 em arquivo) para auditoria e métricas.
- **MySQL de homologação** acessado só com usuário somente leitura, com limite de tempo e de linhas.

Os diagramas ficam em [`docs/diagramas`](docs/diagramas). Os arquivos `.mmd` são a fonte, e os `.svg` e `.png`
são gerados a partir deles.

```bash
npx @mermaid-js/mermaid-cli -i docs/diagramas/arquitetura.mmd -o docs/diagramas/arquitetura.svg -b white
```

## Planejamento

- [Backlog priorizado](docs/backlog.md), com a fatia vertical marcada.
- Fora do escopo: execução automatizada dos testes, automação de interface, geração de massa sintética e
  **qualquer escrita no banco do ERP**.

## Como executar

Ainda não há código. As instruções de execução entram aqui junto com o esqueleto (item B01 do backlog).

## Segurança

Credenciais dos modelos, do Jira, do Confluence e do banco são lidas de variáveis de ambiente e nunca são
versionadas (ver `.gitignore`). O banco do ERP não é exposto à rede externa.
