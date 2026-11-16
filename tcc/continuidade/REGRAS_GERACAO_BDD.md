# Instruções de geração BDD fornecidas pelo autor

Síntese operacional do roteiro extenso enviado duas vezes na conversa de 15/11/2026. Não é transcrição literal. Aplicar estas regras ao gerar os casos; elas não autorizam publicar no Jira nem marcar testes como executados.

## Entrada, leitura e fontes

Receber chave/link de tarefa ou conteúdo colado. Ler a tarefa completa com `getJiraIssue`, `fields: ["*all"]`, `responseContentFormat: "markdown"`. Não trocar por fetch via ARI, que pode truncar campos. Se o serviço devolver HTML para preservar conteúdo, processá-lo sem perder painéis. Para resultados grandes, salvar localmente em área privada e extrair os campos.

| Campo | Ler |
|---|---|
| description | Rotinas, história, requisitos e critérios |
| customfield_10051 e customfield_10068 | Solução técnica e resumo |
| customfield_10059 | Detalhamento por arquivo e pendências |
| customfield_10049 | Checklist e TODOS os planos de teste |
| customfield_10060 | Todas as reprovações |
| customfield_10082 | Revisão de código |
| comment | Comentários; paginar se necessário |
| customfield_10050 | IGNORAR na geração; consultar apenas no modo reprovação |

Identificar os IDs reais na resposta; o conector pode mapear para rótulos humanos. Ler sub-bullets, planos 2/3 etc. Campo ausente não equivale a campo que não foi lido. Conteúdo colado sem chave dispensa a coleta externa.

Confluence: usar somente descendentes da raiz Filterp `2756182023`. Ler referências da tarefa; confirmar pertencimento à árvore. Busca por título deve usar `ancestor = 2756182023 AND title ~ "..." AND type = page`. Nunca buscar somente por espaço DPU ou usar outro produto. Usar leitura de página em Markdown e descendentes conforme necessário; os nomes atuais de ferramentas podem diferir. Se a página não existir na árvore autorizada, usar os nomes da tarefa ou descrição funcional, sem inventar nomes. Documentação fornece nomes e contexto, não amplia o escopo oficial sozinha.

## Escopo

Hierarquia: critérios de aceite > requisitos > todos os planos de teste > solução técnica > reprovações > revisão de código > documentação Filterp > inferência.

Internamente enumerar os critérios C1, C2 etc. e cada verificação de planos, checklist, entidades filhas, telas, cálculos, estados e correções adicionais. O escopo não está restrito à descrição. Reflexo explicitamente citado entra no oficial; reflexo inferido precisa satisfazer as regras de risco. Arquivos/métodos/tabelas identificam o escopo internamente, mas nunca aparecem nos casos.

Cada critério de aceite tem caso oficial dedicado; critérios distintos não se juntam. Critérios redigidos como passos preparatórios e critérios redundantes exigem revisão cuidadosa: não criar casos sem verificação observável apenas para aumentar quantidade. Cada reprovação deve ter verificação específica. Não copiar os casos antigos nem sua estrutura.

## Consolidação

Um caso corresponde a uma regra, sua massa e seu fluxo. Variações da mesma regra podem compartilhar caso: com/sem, marcado/desmarcado, entrada/saída, mínimo/máximo e valores de enum. Regras diferentes se separam, mesmo na mesma tela. Separar também critérios diferentes, fluxos diferentes, massas incompatíveis, dependência que impeça conferir outra regra, reprovações distintas e blocos oficial/risco.

Até quatro situações e sete linhas de resultado por caso; caso típico com quatro a oito linhas. Cada situação tem linha de resultado explícita. Não substituir as conferências por “em todas as situações conforme a regra”. Consolidar não pode eliminar nenhuma verificação. Título com “e” ligando comportamentos diferentes indica provável separação necessária.

Valores que mudaram: uma linha por valor. Regressão com comportamento idêntico: valores podem compartilhar linha. Retornos visuais diferentes: linhas separadas. Cálculos: conservar números literais do plano e apresentar cálculo; resultado deve sair da massa do próprio caso. Não copiar valor esperado de outra massa. Valores ilustrativos propostos não são valores apurados no ERP.

## Bloco de risco

Gerar no máximo quatro casos e somente se houver: âncora concreta na solução/detalhamento/checklist/revisão; ausência de cobertura nos planos; efeito observável; massa executável; resultado conhecido; falha relevante. Priorizar pontos de atenção do dev e fluxo além de salvar/reabrir. Exemplos: descarte silencioso, soma pai/filhos, outro consumidor do código alterado, cancelamento/reversão e efeitos posteriores.

Não inventar o resultado de uma regra pendente. Não incluir cenários genéricos, cosméticos ou módulos comprovadamente não afetados. O risco termina no primeiro resultado observável que o confirma/descarta. Não duplicar caso oficial. Uma situação oposta inferida, sem plano, permanece no bloco de risco; não absorvê-la no oficial. Sem risco qualificado, omitir todo o bloco e a separação.

## Escrita e saída

Casos em português, breves, com nomes reais. Dado contém só preparação relevante; Quando começa na ação da regra, sem narrar navegação que o testador já conhece. Uma linha por ação/conferência, sem encadear momentos. Não usar “corretamente”, “adequadamente” ou “normalmente”. Não expor implementação, nomes de arquivos/tabelas/métodos, medidas de código ou outra tarefa. Não transpor listas de campos entre telas sem fonte.

Formato:

```text
**Caso de Teste 01 - Comportamento validado**
* **Dado** que ...
* **Quando** ...
* **Então** ...
* **E** ...
```

Negrito apenas no título e palavras-chave; “que” fora do negrito. Hífen simples no título. Linha em branco entre casos. Numeração com dois dígitos, contínua. Ordem oficial: critérios, planos ainda não cobertos, borda, regressão, reprovações. Depois, se houver risco, inserir literalmente:

`Casos de risco - fora do plano de teste do desenvolvedor`

A entrega de casos contém somente os casos e essa separação; sem prefácio, explicação, contagem, origem/justificativa ou conclusão. As restrições de saída dos casos não impedem que o artigo e o relatório experimental expliquem seus métodos e limitações.

## Auditoria antes de entregar

Construir de fato os mapas critério→caso e passo de plano→linha; conferir cálculos, massa configurável, escopo técnico, entidades e reprovações. Procurar duplicatas, regras diferentes agrupadas, verificações perdidas, limites excedidos e riscos sem âncora. Verificar nomes exclusivamente do produto correto. Conferir o formato, linha a linha. Não alegar cobertura empírica só porque esse checklist foi realizado.

## Modo reprovação

Ativar quando o usuário relata comportamento errado encontrado durante um teste, não quando pede ajuste nos casos. Uma chave isolada segue geração normal. Cada problema vira um bloco, na ordem, ou a pergunta de escopo prevista abaixo.

Ler a tarefa e os casos existentes, incluindo 10050 neste modo. Caso existente só pode ser reutilizado integralmente, com número, título e texto inalterados, se a situação reproduz o problema e faz falhar uma linha de resultado. Na dúvida, não cobre.

Sem caso adequado, validar o escopo SOMENTE na descrição (rotinas, história, requisitos e critérios), sem inferir correção a partir do que o dev implementou. Se pertence, criar caso com próximo número e resultado correto sustentado pela descrição. Se a descrição não aborda o assunto ou se contradiz, perguntar antes de inventar a regra:
- `Problema "...": a descrição da tarefa não trata disso. Crio a reprovação mesmo assim?`
- `Problema "...": a descrição diverge neste ponto - <seção A> diz "...", <seção B> diz "...". Qual vale?`

Cabeçalho da reprovação: `NN - DD/MM/AAAA`, data real em America/Sao_Paulo, número seguinte ao maior já registrado no Jira/conversa. A seguir, caso integral e linha em branco antes de `**EXPLICAÇÃO:**`. Corrigir ortografia e coesão do relato do usuário, preservando pessoa verbal, valores e lógica; não acrescentar causa, solução ou hipótese.

Saída só com blocos; as perguntas de escopo são exceção e ficam após os blocos possíveis. Auditoria: nenhuma omissão, numeração/data certas, caso reutilizado imutável, bug falha no resultado do caso, escopo julgado pela descrição, resultado esperado correto e explicação sem informações inventadas.
