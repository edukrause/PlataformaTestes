# Backlog priorizado

Ordem = prioridade. Estimativas em horas; nenhum item passa de 8 h.
**FV** marca a fatia vertical entregue na E6.

Atualização de desenvolvimento: a integração com Claude foi adiada para a etapa final.
`Implementado` indica código existente; a validação com serviços reais continua pendente.
O backend inicia com IA desativada e seus testes substituem os provedores externos.

| ID | Item | h | Prioridade | Marco | FV | Status |
|---|---|---:|---|---|:-:|---|
| B01 | Esqueleto Spring Boot + React no mesmo build, gerando um único executável | 4 | MVP | E6 | ● | parcial; build único pendente |
| B02 | Configuração de credenciais por variáveis de ambiente e perfil local | 1 | MVP | E6 | ● | parcial; variáveis implementadas |
| B03 | Base local H2 com migração das seis tabelas da plataforma | 3 | MVP | E6 | ● | implementado, com tabelas de auditoria e conversas |
| B04 | Cliente do Jira: obter o requisito pela chave da tarefa | 3 | MVP | E6 | ● | implementado; validar no Jira real |
| B05 | Gateway de modelos com adaptador do Claude e registro de tokens, custo e latência | 4 | MVP | E6 | ● | adiado; porta e adaptador da API preservados |
| B06 | Conexão MySQL somente leitura com limite de tempo e de linhas | 2 | MVP | E6 | ● | a fazer |
| B07 | Verificador, camada 1: análise sintática que admite apenas SELECT | 3 | MVP | E6 | ● | a fazer |
| B08 | Geração de cenário Gherkin a partir do requisito (um modelo) | 4 | MVP | E6 | ● | parcial; fluxo implementado, integração de IA adiada |
| B09 | Geração de SQL por um modelo, com o esquema da área informado integralmente | 4 | MVP | E6 | ● | a fazer |
| B10 | Compositor: cenário com valor preenchido e consulta anexada | 2 | MVP | E6 | ● | a fazer |
| B11 | Tela: informar a tarefa e visualizar o resultado | 4 | MVP | E6 | ● | parcial; interface ligada à API, sem apuração |
| B12 | Adaptadores do Gemini e do Llama (Groq) no gateway | 4 | MVP | E7 |  | a fazer |
| B13 | Geração paralela pelos três modelos e nova tentativa com a mensagem de erro | 6 | MVP | E7 |  | a fazer |
| B14 | Verificador, camadas 2 e 3: EXPLAIN e execução; descarte de erro e de vazio | 4 | MVP | E7 |  | a fazer |
| B15 | Normalizador: ordenação, arredondamento, nulos e datas | 6 | MVP | E7 |  | a fazer |
| B16 | Motor de consenso e classificação do desfecho | 4 | MVP | E7 |  | a fazer |
| B17 | Extração do esquema pelo INFORMATION_SCHEMA e grafo de chaves estrangeiras | 6 | MVP | E7 |  | a fazer |
| B18 | Amostrador de valores restrito à lista de colunas permitidas | 5 | MVP | E7 |  | a fazer |
| B19 | Filtro de saída no gateway: pseudonimização de dados pessoais no requisito, na documentação e nas mensagens de erro | 5 | MVP | E7 |  | parcial; requisito coberto por padrões e termos configurados |
| B20 | Cliente do Confluence: obter a página da rotina e convertê-la em texto | 6 | MVP | E8 |  | a fazer |
| B21 | Documentação funcional no prompt, com cenários de regressão | 6 | MVP | E8 |  | a fazer |
| B22 | Validação com o analisador Gherkin e uma regeneração em caso de erro | 4 | MVP | E8 |  | parcial; parser implementado, regeneração pendente |
| B23 | Classificador: o requisito exige apuração de valores? | 4 | MVP | E8 |  | parcial; indicação no contrato do modelo, sem módulo de apuração |
| B24 | Restrições de domínio obrigatórias no prompt (empresa, filial, cancelados, exclusão lógica) | 4 | MVP | E8 |  | a fazer |
| B25 | Seleção do subesquema por similaridade de termos e expansão pelos relacionamentos | 8 | MVP | TCC II |  | a fazer |
| B26 | Tela de revisão: aceitar, aceitar com alteração ou rejeitar, com registro de tempo | 6 | MVP | TCC II |  | parcial; decisão, tempo e histórico persistidos; correção de valores pendente |
| B27 | Exibição do desfecho e da consulta de cada modelo | 4 | MVP | TCC II |  | protótipo; depende da apuração real |
| B28 | Execução em lote sobre o conjunto de referência | 6 | MVP | TCC II |  | a fazer |
| B29 | Exportação das métricas em CSV | 3 | MVP | TCC II |  | a fazer |
| B30 | Registro dos cenários aprovados de volta na tarefa do Jira | 6 | Desejável | — |  | a fazer |
| B31 | Cache do esquema e das amostras entre execuções | 4 | Desejável | — |  | a fazer |
| B32 | Painel de custos por provedor | 4 | Desejável | — |  | protótipo; apurações ainda zeradas |
| B33 | Incorporação das alterações de código vinculadas à tarefa | 8 | Desejável | Futuro |  | a fazer |

Fatia vertical: 34 h · MVP: 125 h · Desejáveis: 22 h

As horas acima são as estimativas originais, não uma estimativa do esforço restante.

Próxima sequência de implementação:

1. B06, B07, B09 e B10: estrutura da apuração, leitura MySQL e verificação de consultas.
2. B14 a B18: execução, normalização, consenso e contexto do banco, testados sem provedores reais.
3. B20, B21 e B24: documentação funcional e restrições de domínio.
4. B28 e B29: lote e exportação das métricas.
5. Retomar B05, B08 e B12/B13: escolher o meio de acesso aos modelos e validar o fluxo completo.
