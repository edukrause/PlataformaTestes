# Interface web

Protótipo da interface da plataforma (item B11 do backlog, já pensando em B26 e B27). Feito em React com
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

Para ligar no Spring Boot, o back-end precisa expor os endpoints abaixo com os mesmos nomes de campo de
`api/tipos.ts`:

| Método | Caminho | Retorno |
|---|---|---|
| GET | `/api/execucoes` | `ExecucaoResumo[]` |
| GET | `/api/execucoes/{id}` | `Execucao` |
| POST | `/api/execucoes` | `{ id }`, recebendo `NovaExecucaoRequest` |
| POST | `/api/execucoes/{id}/revisao` | `Revisao`, recebendo `RevisaoRequest` |
| GET | `/api/metricas` | `Metricas` |

Nos cenários, o marcador `«A<id>»` dentro do texto Gherkin indica onde entra o valor da apuração de mesmo id.
A tela troca o marcador pelo valor de referência ou, quando não há consenso, por um aviso de "valor a apurar".

## Build

`npm run build` gera `dist/`. No item B01 esse resultado passa a ser copiado para os recursos estáticos do
Spring Boot, para sair tudo em um executável só.
