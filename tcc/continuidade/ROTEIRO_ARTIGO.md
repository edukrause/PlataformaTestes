# Roteiro de redação e revisão

## Formato institucional

Os documentos em `modelos/` são a referência: 6.000–8.000 palavras, 15–20 páginas, Arial 12 e espaçamento 1,5; resumo de 180–250 palavras, parágrafo único, terceira pessoa, sem citações, fonte 10 e espaçamento simples; 3–5 palavras-chave com iniciais maiúsculas, separadas por ponto e vírgula. Referências em ABNT, mínimo de dez, ideal de 15–25. O template contém título, autor, orientador, filiação e e-mails. Conferir contatos na E5, sem adivinhar.

O DOCX original usa papel Carta (21,59 × 27,94 cm) e margens de 2,54 cm na cópia examinada. Não alegar A4 ou margens ABNT sem conferir a regra da instituição. Manter o modelo e registrar qualquer incompatibilidade entre palavras e páginas. A versão de evento é outra entrega, com duas colunas e 6–10 páginas, não uma substituição automática da institucional.

## 1 Introdução

Usar a proposta e seus ajustes. Apresentar o esforço de preparar cenários de teste e obter valores esperados para relatórios do ERP; formular o problema sem presumir eficácia da solução; justificar a combinação de requisitos, documentação e banco. Definir objetivo geral, objetivos específicos e hipóteses testáveis. Encerrar com a organização do artigo. Distinguir apuração de validação desde a primeira menção.

## 2 Fundamentação teórica e trabalhos relacionados

Consolidar E3: BDD/Gherkin, problema do oráculo, limitações dos modelos, text-to-SQL, comparação por execução e consenso. Usar a bibliografia corrigida da E3, não recuperar automaticamente versões bibliográficas antigas da E2. Incluir quadro comparativo por entrada, saída, uso de dados reais, combinação de modelos e avaliação. Não afirmar ineditismo absoluto a partir de uma revisão restrita.

Atualizar MySQL para a implementação PostgreSQL e distinguir arquitetura planejada de operação comprovada. A diversidade de famílias não demonstra independência estatística dos erros. Gherkin sintaticamente válido não prova cobertura nem correção do comportamento. Evitar apresentar percentuais de benchmarks como desempenho atual universal ou como expectativa garantida para este ERP.

Fontes primárias consultadas nesta preparação, úteis para reconferência:
- Ferreira et al.: https://arxiv.org/abs/2504.07244 (publicação AST, DOI 10.1109/AST66626.2025.00007).
- Karpurapu et al.: https://arxiv.org/abs/2403.14965.
- Fonseca, Lima e Faria: https://arxiv.org/abs/2510.18861.
- Paduraru et al.: https://www.scitepress.org/Link.aspx?doi=10.5220%2F0013374400003890.
- Zhong, Yu e Klein: https://aclanthology.org/2020.emnlp-main.29/.
- Lei et al., Spider 2.0: https://arxiv.org/abs/2411.07763.
- Gherkin: https://cucumber.io/docs/gherkin/reference/.
- Isolamento PostgreSQL: https://www.postgresql.org/docs/18/transaction-iso.html.

Isso não substitui a conferência de todas as referências finais, de suas citações e dos metadados de publicação. Para metodologia, partir de Hevner et al. (2004) e Peffers et al. (2007), já presentes na E5. Não citar referências não usadas só para atingir quantidade.

## 3 Metodologia

Consolidar E4/E5 e descrever a pesquisa aplicada orientada a Design Science Research. Desenhar a arquitetura real: interface, orquestração, fontes Jira/Confluence, gateway de modelos, geração de cenários, apuração/normalização/consenso, revisão e persistência local. Incluir figura de arquitetura e fluxo; revisar os diagramas antigos que mostram MySQL e três provedores plenamente ativos.

Explicar escopo e contexto sem identificar o ERP/empresa além do autorizado. A documentação antiga cita aproximadamente 125 tabelas; confirmar se esse número corresponde à base realmente usada. Não atribuir a migração para PostgreSQL a uma razão empresarial não documentada.

Descrever controle de saída de dados, amostragem por lista permitida, não envio dos resultados completos e acesso somente leitura. Pseudonimização não é anonimização irreversível. Configuração prevista de retenção/treinamento dos provedores não comprova configuração da conta real: revisar termos e registrar modalidade efetivamente usada antes do experimento.

Manter o protocolo prévio da E5 e declarar emendas antes da coleta. Explicar seleção, participantes, rubrica, baseline, ablação, oráculos de referência e métodos estatísticos. Código de aplicação não substitui descrição do desenho experimental.

## 4 Resultados

Separar resultados de implementação/verificação técnica dos resultados da avaliação científica. Os relatórios históricos de testes podem ser descritos com data e limites, sem convertê-los em acurácia de modelos. O diagnóstico HTTP 503 é uma limitação operacional; não é dado de desempenho de geração.

Quando houver coleta, apresentar: funil de seleção; validade sintática da primeira resposta; decisões de aceitação; cobertura e ablação; acurácia individual e consensuada; cobertura de consenso e abstenções; falsos acordos; tempo e custo com retentativas; distribuições por área. Mostrar numeradores, denominadores e casos sem referência. Não gerar gráficos com dados inventados nem converter valores ausentes em zero.

Se faltarem os resultados científicos, entregar versão preliminar identificada como tal, com conteúdo real e seção de resultados técnicos. Não chamar o artigo de pesquisa experimental concluída. Separar as pendências editoriais do texto principal, em arquivo próprio.

## 5 Discussão

Interpretar somente resultados apresentados. Comparar com a literatura sem comparar diretamente percentuais de tarefas, rubricas ou modelos diferentes. Discutir custo da revisão humana, erros correlacionados, falsa concordância por coincidência nos dados e limitações de normalização. Um único snapshot não prova equivalência semântica; M11 detecta desacordo com o oráculo usado, não todos os erros de regra possíveis.

Ameaças: autor integra a equipe; assistência prévia nos casos históricos; exposição dos gabaritos; seleção intencional no piloto; mudanças na documentação e modelos; dados alterados entre conexões; amostra pequena; estoque e vendas compartilham esquema; um ERP e uma equipe. Não extrapolar para fiscal/contábil, outros ERPs ou outras equipes sem avaliação.

## 6 Considerações finais

Retomar objetivo, entregas comprovadas e limitações. Declarar quais hipóteses foram testadas e quais permanecem abertas. Trabalhos futuros: terceira família, homologação, avaliação ampliada e áreas diferentes. Não concluir redução de esforço ou ganho de acurácia sem resultados.

## Resposta à banca

| Ajuste | Evidência esperada no artigo |
|---|---|
| Apurado × validado | Definições, título coerente, referência independente e falso acordo |
| Minimização de dados | Inventário por etapa, filtros e configuração efetivamente utilizada |
| Seleção prévia | Critérios datados, semente, funil real e exclusões |
| Alteração menor | Rubrica operacional; correção do resultado esperado não é alteração menor |
| Comparação de tempo | Pareamento, balanceamento, efeito de aprendizado, teste e tamanho de efeito |
| Generalização | Limites de áreas/esquema/equipe claramente declarados |
| Estrutura do ERP | Contexto, banco e figura de conexões atualizados |

## Revisão final obrigatória

- Correspondência entre cada citação e referência; conferir DOI e ano.
- Números rastreáveis ao arquivo de evidência e consistentes em resumo, resultados e conclusão.
- Tempos verbais coerentes: planejado, implementado, testado e validado são estados distintos.
- Todos os gráficos, tabelas e figuras citados no texto e com fonte/legenda.
- DOCX com estilos, títulos e tabelas editáveis; PDF inspecionado visualmente para cortes, páginas vazias, quebras e legibilidade.
- Verificar resumo, palavras-chave, extensão e páginas após exportar.
- Não sobrescrever E1–E5; salvar a consolidação em `tcc/artigo/`.
