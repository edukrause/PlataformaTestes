# Interface web

Interface da plataforma, com modo HTTP para operação local e modo de demonstração. Feita em React com
TypeScript e Vite, com Tailwind para o estilo.

## Executar

```bash
cd frontend
npm install
npm run dev
```

Abre em http://localhost:5173. Por padrão tudo roda com **dados simulados** no navegador, sem chamar Jira,
modelos ou banco. As execuções criadas ficam no `localStorage`; o link "Restaurar exemplos", na barra lateral,
volta aos dados iniciais.

Para usar o back-end, crie um `.env.local` com `VITE_API=http`. As chamadas para `/api` vão para
`http://localhost:8080` pelo proxy do Vite (ver `vite.config.ts`).

## Telas

| Rota | Tela |
|---|---|
| `/` | Assistente: conversa em que se pede a geração dos cenários de uma tarefa (ex.: "Gere os cenários da NMTZ-2048") e se escolhe se usa a documentação da rotina |
| `/conversas/:id` | Retoma uma conversa anterior com o assistente |
| `/execucoes` | Histórico com busca, filtro por área, desfechos e situação da conferência |
| `/nova` | Criar cenários manualmente sem IA ou gerar a partir do Jira (modo HTTP) |
| `/execucoes/:id` | Requisito, andamento das etapas, cenários Gherkin com os valores apurados, apurações com a consulta de cada modelo e a conferência |
| `/metricas` | M4, M8, M12 e M13 com as metas do plano de validação, distribuição dos desfechos e das decisões, números por provedor |

## Organização

```
src/
  api/
    tipos.ts        tipos espelhando o DER (TAREFA, EXECUCAO, CENARIO, APURACAO, CANDIDATO_SQL, REVISAO)
    contrato.ts     interface PlataformaApi, a única coisa que as telas conhecem
    httpApi.ts      implementação REST (fetch em /api)
    mock/           implementação simulada e dados de exemplo
    index.ts        escolhe mock ou http pelo VITE_API
  components/       peças reaproveitáveis (Gherkin, SQL, cards de apuração, conferência, selos)
  pages/            uma tela por arquivo
  util/             formatação e hook de carregamento
```

O Spring Boot implementa os endpoints abaixo com os mesmos nomes de campo de
`api/tipos.ts`:

| Método | Caminho | Retorno |
|---|---|---|
| GET | `/api/execucoes` | `ExecucaoResumo[]` |
| GET | `/api/execucoes/{id}` | `Execucao` |
| POST | `/api/execucoes` | `{ id }`, recebendo `NovaExecucaoRequest` |
| POST | `/api/execucoes/{id}/revisao` | `Revisao`, recebendo `RevisaoRequest` |
| GET | `/api/metricas` | `Metricas` |
| GET | `/api/demandas/{chave}` | `Demanda` (situação, datas e estimativa vindas do Jira) |
| PUT | `/api/demandas/{chave}/status` | `Demanda`, recebendo `{ status }`; faz a transição no Jira |

Nos cenários, o marcador `«A<id>»` dentro do texto Gherkin indica onde entra o valor da apuração de mesmo id.
A tela troca o marcador pelo valor corrigido pelo analista, quando houver, ou pela referência do consenso.
Sem referência, apresenta um aviso de valor a apurar. A evidência original permanece disponível.

No modo HTTP, as telas também permitem adicionar consultas manuais ou gerar SQL com Gemini/Llama,
atualizar a conferência, consultar seu histórico e exportar CSV. A lista inclui processamento em lote
de até 20 tarefas. Escrita de situação e publicação dos cenários aprovados no Jira dependem da configuração
do servidor e de uma ação explícita do usuário. Claude permanece pendente.

## GitHub Pages

A cada push na `main` que mexa em `frontend/`, o workflow `.github/workflows/pages.yml` gera o build com
`GITHUB_PAGES=true` (base `/PlataformaTestes/`) e publica em https://edukrause.github.io/PlataformaTestes/,
sempre com os dados simulados. O `404.html` é uma cópia do `index.html`, para as rotas funcionarem ao recarregar
a página.

## Build

`npm run build` gera `dist/`. Para o aplicativo local, construa com `VITE_API=http` antes do Maven:
o build inclui `dist/` nos recursos estáticos do Spring Boot. Os scripts na raiz fazem esse processo e
geram um JAR único. Veja [backend/README.md](../backend/README.md).
