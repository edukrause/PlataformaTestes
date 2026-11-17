TITULO|PLATAFORMA PARA GERAÇÃO DE CENÁRIOS DE TESTE EM SISTEMAS ERP ASSISTIDA POR MODELOS DE LINGUAGEM, COM VALORES ESPERADOS APURADOS EM BANCO DE DADOS
AUTOR|Eduardo Krause|Centro Universitário Mater Dei – UNIMATER|eduardokrause678@gmail.com
AUTOR|Prof. Me. João Victor Costa Mazzochin (orientador)|Centro Universitário Mater Dei – UNIMATER|joaomazzochin@gmail.com

RESUMO|Testar relatórios de sistemas de gestão empresarial exige conhecer, antes da execução, o valor que o sistema deve exibir para os dados existentes, hoje obtido manualmente pelo analista de qualidade. Este trabalho tem como objetivo desenvolver uma plataforma que gere cenários de teste em Gherkin a partir do requisito da tarefa e da documentação funcional da rotina e que apure os valores esperados por consulta ao banco de dados, com decisão por consenso entre modelos de linguagem de famílias distintas. Adotou-se a Design Science Research. O artefato, construído em Java e React, lê requisito e documentação no Jira e no Confluence, obtém consultas SQL independentes de modelos de famílias distintas (Gemini e Llama implementados; Claude pendente de homologação), executa-as em transação somente leitura sobre PostgreSQL, normaliza os resultados e só propõe um valor de referência quando ao menos dois coincidem, cabendo ao analista validá-lo. A verificação técnica reuniu 96 testes automatizados, todos aprovados, inclusive sobre um banco PostgreSQL real e descartável, cobrindo o verificador de consultas, a normalização dos resultados, os quatro desfechos do motor de consenso e o fluxo completo de geração, apuração e revisão. A avaliação empírica com tarefas reais e analistas, definida em protocolo prévio, ainda não foi executada. Conclui-se que a apuração por consenso é tecnicamente viável e auditável, mas que o consenso indica confiança, e não correção, o que mantém indispensáveis a conferência humana e a medição do falso acordo.
PALAVRAS|Desenvolvimento Guiado por Comportamento; Oráculo de Teste; Text-to-SQL; Consenso entre Modelos; Garantia de Qualidade.

# 1 Introdução

A atividade de teste é determinante para a confiabilidade dos sistemas entregues e permanece, em grande medida, dependente de trabalho manual (WANG et al., 2024). Entre as abordagens de especificação, o desenvolvimento guiado por comportamento (*behavior-driven development*, BDD) descreve o comportamento esperado em linguagem próxima à do negócio, comumente na notação Gherkin (SOLIS; WANG, 2011; WYNNE; HELLESOY, 2012).

Modelos de linguagem de grande porte passaram a ser aplicados à geração de casos de teste a partir de requisitos em linguagem natural, com resultados promissores, mas com variabilidade relevante entre as saídas (KARPURAPU et al., 2024; FERNANDES et al., 2025) e com o risco de produzir conteúdo plausível, porém incorreto (SALLOU; DURIEUX; PANICHELLA, 2024). Riscos semelhantes afetam a tradução de perguntas em linguagem natural para consultas SQL: em bases com esquema e volume próximos aos corporativos, o desempenho dos modelos permanece muito inferior ao obtido em esquemas reduzidos (LI et al., 2023; LEI et al., 2025).

Essas limitações pesam em sistemas de gestão empresarial (*enterprise resource planning*, ERP). Para testar um relatório, o analista precisa conhecer de antemão a massa de dados e o valor que o sistema deve apresentar, o que exige acesso ao banco e domínio do modelo relacional. Além disso, o requisito descreve a alteração solicitada, mas não os comportamentos que a rotina já deveria manter, o que dificulta a completude dos cenários. Na equipe estudada, modelos de linguagem já são usados por meio de ferramentas de propósito geral, nas quais o contexto da rotina é transportado manualmente a cada interação e o valor esperado é apresentado como plausível, sem verificação nos dados.

O problema que orienta a pesquisa é determinar de que forma os valores esperados de um teste podem ser obtidos a partir dos dados efetivamente armazenados, de modo rastreável e reprodutível, e com que grau de confiança esse valor representa a regra de negócio. A formulação distingue, desde já, dois atributos. O valor é **apurado** quando provém da execução de uma consulta sobre os dados; é **validado** quando essa consulta representa corretamente a regra que o relatório implementa. A execução garante o primeiro atributo, mas não o segundo, e essa distância é tratada como objeto de medição, e não como pressuposto.

A relevância prática decorre do custo de um valor esperado incorreto, que compromete o teste nas duas direções: aponta defeito onde não existe ou aceita um comportamento defeituoso. A relevância científica está em articular duas linhas que a literatura trata separadamente, a geração de cenários e a tradução para SQL, submetendo a saída dos modelos aos dados armazenados, em vez de aceitá-la como plausível.

O objetivo geral é desenvolver uma plataforma que gere cenários de teste a partir de requisitos e da documentação das rotinas e que apure os valores esperados por consulta ao banco de dados, com decisão por consenso entre modelos. Os objetivos específicos são: (OE1) caracterizar o processo atual de elaboração de casos de teste da equipe; (OE2) implementar a geração de cenários Gherkin a partir do requisito e da documentação funcional; (OE3) implementar a apuração de valores por múltiplos modelos, com execução no banco e decisão por consenso; e (OE4) avaliar a qualidade dos cenários e a acurácia dos valores frente a um conjunto de referência, medindo também a concordância entre os modelos e o custo.

O plano de validação fixou, antes de qualquer coleta, quatro hipóteses operacionais: (H1) a plataforma reduz em ao menos 30% a mediana do tempo de elaboração do caso de teste em relação ao procedimento atual; (H2) ao menos 60% dos conjuntos de cenários são aceitos pelos analistas, com ou sem alteração menor; (H3) o valor consensuado acerta ao menos 80% das apurações com referência e supera o melhor modelo isolado; e (H4) a taxa de falso acordo não ultrapassa 10%. Esta versão do artigo relata a construção do artefato, e a verificação técnica; as quatro hipóteses dependem da avaliação empírica, ainda não executada, e permanecem abertas.

O artigo está organizado da seguinte forma: a Seção 2 apresenta os conceitos, as tecnologias e os trabalhos relacionados; a Seção 3 descreve o método, o contexto, a arquitetura e a estratégia de validação; a Seção 4 apresenta os resultados obtidos; a Seção 5 os discute, com as limitações e ameaças à validade; e a Seção 6 traz as considerações finais.

# 2 Fundamentação Teórica e Trabalhos Relacionados

Esta seção apresenta os conceitos necessários à compreensão do método, as tecnologias empregadas e os trabalhos que tratam de problemas próximos, encerrando com a comparação que delimita a contribuição pretendida.

## 2.1 Conceitos Fundamentais

No BDD, o comportamento esperado do sistema é descrito por exemplos concretos, compartilhados entre analistas, desenvolvedores e testadores (SOLIS; WANG, 2011). Na notação Gherkin, cada cenário organiza-se em passos de contexto (Dado), ação (Quando) e resultado esperado (Então) (WYNNE; HELLESOY, 2012; CUCUMBER, 2026). No processo de teste descrito pela ISO/IEC/IEEE 29119-2 (INTERNATIONAL ORGANIZATION FOR STANDARDIZATION, 2021), os casos de teste derivam de uma base de teste; neste trabalho, essa base é composta pelo requisito da tarefa e pela documentação funcional da rotina. Um cenário sintaticamente válido, porém, não garante cobertura nem correção do comportamento descrito.

Um caso de teste só tem valor se houver um oráculo, isto é, um mecanismo que decide se o comportamento observado está correto. Barr et al. (2015) denominam problema do oráculo a dificuldade de obter esse mecanismo e distinguem oráculos especificados, derivados e implícitos, além do recurso ao julgamento humano. Em relatórios de sistemas de gestão, o oráculo é o valor que o relatório deve exibir para a massa existente. A proposta o substitui por um oráculo derivado, obtido pela execução de consultas, sem dispensar o julgamento humano, que permanece como decisão final.

Modelos de linguagem passaram a ser aplicados a diversas atividades da engenharia de software, inclusive ao teste (WANG et al., 2024). A limitação central para o problema tratado é a alucinação, a produção de conteúdo fluente e plausível, mas infiel aos fatos ou à fonte (HUANG et al., 2025). Em engenharia de software, ela se soma à não determinação das saídas e à substituição frequente das versões dos modelos, que comprometem a reprodutibilidade (SALLOU; DURIEUX; PANICHELLA, 2024). Na solução, a geração é ancorada em conteúdo recuperado no momento da consulta: o requisito, a documentação e o catálogo do banco.

A apuração dos valores esperados apoia-se na tradução de perguntas em linguagem natural para SQL (*text-to-SQL*). O desempenho dos modelos nessa tarefa cai quando esquema e dados se aproximam dos corporativos: no BIRD, com 95 bancos e 33,4 GB de dados, o ChatGPT atingiu 40,08% de acurácia por execução, contra 92,96% de especialistas humanos (LI et al., 2023); no Spider 2.0, com 632 problemas derivados de fluxos de trabalho empresariais, o melhor agente avaliado resolveu 21,3% das tarefas (LEI et al., 2025). Esses números descrevem os conjuntos e os modelos avaliados naqueles estudos e não constituem expectativa para o ERP aqui estudado.

A acurácia por execução considera correta a consulta cujo resultado coincide com o da consulta de referência. Zhong, Yu e Klein (2020) mostram que esse critério evita os falsos negativos da comparação textual, de 2,5% em média e 8,1% no pior caso, mas que, executado sobre uma única base, admite falsos positivos, quando consultas distintas coincidem por acaso nos dados disponíveis. Neste trabalho, a comparação de resultados é o critério para decidir se dois modelos concordam, e o falso positivo corresponde ao **falso acordo**: modelos que concordam em uma consulta que não representa a regra de negócio. A taxa de falso acordo mede, portanto, a distância entre valor apurado e valor validado.

Por fim, a decisão por concordância apoia-se em resultados que mostram ganho ao substituir uma única saída pela mais frequente entre várias. Wang et al. (2023) amostram diversos raciocínios de um mesmo modelo e adotam a resposta majoritária (autoconsistência), com ganho de 17,9 pontos percentuais no conjunto GSM8K. Du et al. (2024) fazem instâncias debaterem suas respostas até convergirem; seus experimentos principais usam um mesmo modelo, e apenas um experimento reduzido combina famílias distintas. Como amostras de um mesmo modelo tendem a compartilhar erros, a hipótese de que famílias distintas reduzem essa correlação é pouco explorada. A diversidade de origem, contudo, não garante independência estatística dos erros: modelos diferentes podem falhar da mesma forma diante da mesma omissão no contexto.

## 2.2 Tecnologias Envolvidas

O projeto prevê modelos de três famílias distintas: Gemini, do Google; um modelo de pesos abertos da família Llama, servido pela infraestrutura de inferência da Groq; e Claude, da Anthropic. Na versão atual, Gemini e Llama estão implementados, e a integração com Claude permanece pendente de homologação. A diversidade de origem é condição para que o consenso tenha algum valor informativo, e o número três permite desempate. As versões exatas são configuradas por variável de ambiente e gravadas em cada chamada, em atenção ao risco de reprodutibilidade apontado por Sallou, Durieux e Panichella (2024).

O planejamento original previa MySQL, o sistema gerenciador do banco do ERP estudado; a implementação atual lê PostgreSQL, e o adaptador para MySQL fica como próximo passo. O esquema é obtido pelas visões do INFORMATION_SCHEMA e as chaves estrangeiras pelo catálogo do servidor; o plano de execução é obtido por EXPLAIN antes de cada execução, e a leitura ocorre em transação somente leitura no nível REPEATABLE READ. Esse nível garante uma fotografia consistente dentro de uma conexão, mas não entre conexões distintas, ponto relevante para a comparação dos candidatos.

A orquestração é implementada em Java 21 com Spring Boot, que oferece acesso a bancos relacionais por JDBC e execução concorrente das chamadas aos modelos; a interface é desenvolvida em React com TypeScript. Os cenários são validados pelo analisador Gherkin do projeto Cucumber, o mesmo usado pelas ferramentas de BDD (CUCUMBER, 2026). Requisitos e documentação são lidos das interfaces de programação do Jira e do Confluence. As duas camadas são empacotadas em um único executável, operado localmente, porque as credenciais dos modelos e do banco não podem residir no navegador e o banco corporativo não deve ser exposto à rede externa.

## 2.3 Trabalhos Relacionados

O Quadro 1 compara os trabalhos mais próximos segundo os critérios que distinguem a proposta: as fontes de entrada, o artefato produzido, a apuração de valores esperados sobre dados reais, o uso de mais de um modelo e o contexto de avaliação.

QUADRO|Quadro 1 – Comparação entre os trabalhos relacionados e a proposta
| Trabalho | Entrada | Saída | Valor esperado apurado em dados | Vários modelos | Contexto e validação |
|---|---|---|---|---|---|
| Karpurapu et al. (2024) | *User stories* públicas | Cenários Gherkin | Não | Compara quatro, sem combinar | Acadêmico; validade sintática |
| Fernandes et al. (2025) | Descrições de casos de teste | Cenários Gherkin | Não | Compara sete, sem combinar | Sistema em produção; similaridade com especialista |
| Paduraru, Zavelca e Stefanescu (2025) | Descrição e passos implementados | Passos vinculados ao código | Não | Um modelo, com agentes | Industrial (jogos); estudo com profissionais |
| Ferreira et al. (2025) | *User story* do Jira e HTML | Gherkin e roteiros Cypress | Não | Um modelo | Industrial (web); utilidade percebida |
| Fonseca, Lima e Faria (2025) | Tarefa do Jira e alterações de código | Gherkin, *Page Objects* e roteiros | Não | Um por etapa, sem votação | Industrial (móvel); sintaxe, execução e percepção |
| Garg e Sharma (2023) | Solicitação do usuário | Casos e cenários de teste | Não | Um modelo | ERP; sem avaliação empírica |
| Mendoza et al. (2024) | Cenários BDD | Dados de teste sintéticos | Não; gera massa nova | Compara quatro ferramentas | Cinco cenários; qualitativa |
| Este trabalho | Requisito, documentação e esquema do banco | Cenários Gherkin com valores e consultas | Sim, em homologação | Três famílias previstas, com consenso | ERP em uso; avaliação planejada, não executada |
FONTE|Fonte: elaborado pelo autor (2026).

Karpurapu et al. (2024) e Fernandes et al. (2025) medem a capacidade de modelos de converter textos em Gherkin, verificando sintaxe ou similaridade com cenários de especialistas. Ambos tratam os modelos como alternativas a escolher, e não como fontes a combinar, e nenhum verifica se o resultado esperado do cenário está correto.

Os três trabalhos seguintes levam a geração ao ambiente industrial. Paduraru, Zavelca e Stefanescu (2025) vinculam passos Gherkin a implementações existentes, com humano no ciclo; Ferreira et al. (2025) partem de *user stories* do Jira e chegam a roteiros Cypress; e Fonseca, Lima e Faria (2025), o trabalho mais próximo, geram cenários, *Page Objects* e roteiros executáveis a partir de tarefas do Jira e das alterações de código, com 93,3% dos cenários sintaticamente corretos. A integração com a ferramenta de gestão e a geração a partir do requisito, portanto, já estão cobertas pela literatura. Nos trabalhos examinados, a verificação incide sobre a sintaxe e a execução do roteiro, e não sobre o resultado de negócio.

Os dois últimos tocam o domínio e os dados. Garg e Sharma (2023) aplicam IA generativa à modelagem de testes de ERP, sem avaliação empírica. Mendoza et al. (2024) geram dados de teste a partir de cenários BDD, caminho inverso ao proposto: produzem massa sintética, enquanto este trabalho parte da massa existente e apura o valor que o sistema deve apresentar sobre ela.

Na revisão realizada, que não esgota a literatura, não foi encontrado trabalho que confronte a saída dos modelos com os dados armazenados para apurar o valor esperado de cenários de teste. Diferentemente dos trabalhos apresentados, este trabalho submete o resultado esperado dos cenários aos dados armazenados, articulando a geração de cenários e a tradução para SQL, e prevê medir inclusive quando o consenso engana.

# 3 Metodologia

## 3.1 Tipo de Pesquisa e Método

Trata-se de pesquisa aplicada, de natureza exploratória e abordagem quali-quantitativa, conduzida segundo a Design Science Research, adequada a trabalhos cujo resultado é a construção e a avaliação de um artefato (HEVNER et al., 2004). Seguem-se as etapas de Peffers et al. (2007): identificação do problema, definição dos objetivos, projeto e desenvolvimento, demonstração, avaliação e comunicação. Esta versão cobre as quatro primeiras etapas e a avaliação técnica; a avaliação com usuários, descrita na Seção 3.6, ainda não foi executada. Entre os enfoques admitidos pelo curso, adota-se o de aplicação prática real, em empresa, com avaliação experimental por métricas definidas previamente.

## 3.2 Contexto do Sistema Estudado

O sistema estudado é um ERP web, acessado pelo navegador, com banco de dados MySQL; a proposta estimou o modelo de dados em cerca de 125 tabelas, número que deve ser reconferido na base usada na avaliação. Os analistas executam os testes no ambiente de homologação antes de cada entrega semanal. Por confidencialidade, o sistema e a empresa não são identificados.

A Figura 1 mostra onde a plataforma se conecta. Ela não se integra à aplicação do ERP nem às suas regras de negócio: lê o banco de homologação com uma conta somente de consulta, o requisito no Jira e a documentação no Confluence, e envia aos provedores de modelos apenas conteúdo filtrado. Esse acoplamento restrito ao catálogo e aos dados torna a plataforma independente da tecnologia em que o ERP foi construído.

FIG|figuras/figura-contexto.png|Figura 1 – Contexto da plataforma em relação ao ERP e aos serviços que consulta (tracejado: publicação opcional no Jira)|Fonte: elaborado pelo autor (2026).

## 3.3 Arquitetura da Solução

A plataforma é um monólito modular empacotado em um único executável, operado na rede interna (Figura 2). A escolha descarta deliberadamente uma arquitetura distribuída: trata-se de um projeto individual, e a única exigência que pediria separação física, manter credenciais e banco fora do navegador, é atendida pela execução local.

FIG|figuras/figura-arquitetura.png|Figura 2 – Arquitetura da plataforma|Fonte: elaborado pelo autor (2026).

A interface é o ponto de contato do analista: recebe a chave da tarefa, apresenta os cenários com os valores apurados e as consultas que os originaram e registra a decisão de conferência. O coletor de contexto obtém o requisito no Jira e, quando solicitado, a documentação da rotina no Confluence, guardando referência, versão, texto e *hash* da página, pois a documentação muda com o tempo. O Módulo 1 redige os cenários em um contrato JSON e os submete ao analisador Gherkin, com uma regeneração quando inválidos. O Módulo 2 é acionado quando um cenário pede valor apurado. Os dois módulos acessam os modelos exclusivamente pelo gateway, que oferece uma interface única com um adaptador por provedor, aplica o filtro de saída e registra tokens, custo, latência e modelo de cada chamada. O compositor reúne cenário, referência ao valor e consulta, e o registro grava tudo em uma base H2 local, separada da base do ERP, que alimenta a auditoria e as métricas.

O desenvolvimento ocorreu em três incrementos, registrados no histórico do repositório: modelagem, backlog e protótipo da interface, em outubro de 2026; orquestração, leitura do banco com verificação das consultas, normalização e consenso, em 6 de novembro; e catálogo, amostragem autorizada, fluxo completo de geração, apuração e revisão e empacotamento em executável único, em 7 de novembro.

## 3.4 Fluxo de Apuração e Decisão por Consenso

A Figura 3 mostra o caminho de uma tarefa. Para cada pergunta de apuração, o catálogo do banco é reduzido a um subesquema, selecionado pela coincidência entre os termos da pergunta e os nomes de tabelas e colunas e expandido pelas chaves estrangeiras. Cada família habilitada recebe o mesmo contexto, com as restrições de domínio obrigatórias (empresa, filial, cancelados e exclusão lógica), e gera de forma independente uma única instrução SELECT.

FIG|figuras/figura-fluxo.png|Figura 3 – Fluxo principal de uma tarefa|Fonte: elaborado pelo autor (2026).

Cada candidato atravessa três camadas: análise da árvore sintática, que admite um único SELECT sem escrita, bloqueios ou funções fora de uma lista permitida por dialeto; obtenção do plano por EXPLAIN; e execução com limites de tempo, linhas e caracteres. Um candidato inválido ou com resultado vazio recebe uma nova tentativa, na qual o modelo é informado apenas da categoria da falha, sem mensagens internas do banco. Os resultados válidos são normalizados: nomes e ordem das colunas são desconsiderados, a ordem das linhas só conta quando a pergunta a exige, números são arredondados à escala da coluna ou a duas casas, e nulos, textos, números e datas recebem marcadores distintos, com instantes convertidos para UTC. Duplicatas são preservadas. Dois candidatos concordam quando suas representações canônicas completas coincidem; o *hash* SHA-256 serve apenas à rastreabilidade. Ambiguidade excessiva na correspondência de colunas (mais de 120 permutações, 64 colunas ou 100 mil células) descarta o candidato em vez de produzir comparação aproximada. Cada família tem um único voto, e a decisão segue o Quadro 2.

QUADRO|Quadro 2 – Desfechos da decisão por consenso
| Desfecho | Condição | Saída entregue ao analista |
|---|---|---|
| Unânime | Três candidatos válidos com o mesmo resultado | Valor de referência, confiança alta |
| Maioria | Dois resultados coincidentes; o terceiro diverge ou foi descartado | Valor de referência, confiança moderada, com a consulta divergente |
| Divergente | Dois ou mais válidos, sem coincidência | Nenhum valor; as consultas são exibidas para apuração pelo analista |
| Falha | Menos de dois candidatos válidos | Nenhum valor; os descartes são registrados |
FONTE|Fonte: elaborado pelo autor (2026).

Em todos os desfechos a conferência humana é obrigatória. O consenso não aprova o valor: indica o grau de confiança associado a ele, e a consulta anexada permite verificar sua origem sem reconstruí-la. As correções do analista ficam separadas do resultado apurado original, com histórico de decisões.

## 3.5 Minimização dos Dados Enviados aos Provedores

Parte do conteúdo da empresa precisa sair dela para que os modelos funcionem. O Quadro 3 inventaria o que é enviado em cada etapa e a medida aplicada. O princípio é enviar o mínimo necessário e nunca enviar resultados de consultas, que são normalizados e comparados dentro da plataforma.

QUADRO|Quadro 3 – Inventário do conteúdo enviado aos provedores de modelos
| Etapa | O que é enviado | Risco | Medida aplicada |
|---|---|---|---|
| Geração de cenários | Requisito e, se solicitada, documentação da rotina | Dados pessoais citados como exemplo; informação interna | Pseudonimização de CPF, CNPJ, e-mail, telefone e termos configurados |
| Geração de SQL | Subesquema pertinente e regras de domínio | Metadados confidenciais | Envio apenas do subesquema selecionado |
| Amostras de valores | Valores distintos de colunas autorizadas | Dados reais da base | Desativado por padrão; só colunas de uma lista de permitidas |
| Nova tentativa | Consulta anterior e categoria da falha | Valores citados em mensagens do banco | Mensagens internas não são reenviadas |
| Normalização e consenso | Nada | — | Resultados nunca saem da plataforma |
FONTE|Fonte: elaborado pelo autor (2026).

A pseudonimização substitui cada ocorrência por um marcador consistente, como [CPF_1], e a correspondência permanece apenas na base local. Trata-se de pseudonimização, e não de anonimização irreversível: os padrões reconhecem formatos, e nomes de pessoas só são substituídos quando constam da lista de termos configurada. Cada envio é gravado com o conteúdo efetivamente transmitido, o que permite auditar o que saiu da empresa, em atenção à Lei Geral de Proteção de Dados (BRASIL, 2018). Os termos de uso dos três provedores, consultados em 12/10/2026, previam modalidades em que o conteúdo enviado não é usado para treinamento ou não é retido. Esses termos descrevem a modalidade prevista e precisam ser reconferidos, junto com a configuração efetiva das contas, antes da coleta.

## 3.6 Estratégia de Validação

A validação combina duas frentes. A primeira, já executada, é técnica: testes automatizados de cada componente, inclusive sobre um banco PostgreSQL real e descartável, nos quais consultas candidatas fixadas nos próprios testes percorrem o mesmo caminho de verificação, normalização e consenso dos candidatos gerados por modelos. A segunda é a avaliação empírica definida no plano de validação, registrada em 13/10/2026, antes de qualquer coleta, e resumida a seguir.

O Conjunto 1 reúne tarefas históricas do projeto estudado no Jira, com cinco critérios de inclusão: tipo melhoria, *bug* ou tarefa, finalizada entre 01/01/2025 e 30/09/2026 (I1); rotina de estoque ou de vendas, não ambas (I2); casos de teste preenchidos pelo analista (I3); requisito com ao menos 50 palavras (I4); e documentação funcional revisada (I5). São excluídas tarefas sem comportamento funcional verificável, duplicadas ou com caso de referência elaborado pelo autor. Os critérios I4 e I5 são aplicados em ordem aleatória, definida pela semente 20261030, até 18 tarefas elegíveis por área, três para calibração e 15 para avaliação, o que totaliza seis tarefas de calibração e 30 de avaliação. O Conjunto 2 reúne perguntas de negócio de todos os relatórios e consultas das duas áreas, cada uma com uma consulta de referência escrita pelo autor antes das execuções e conferida por um analista no próprio relatório do sistema.

Quatro analistas de qualidade da equipe, excluído o autor, avaliam os cenários. Cada versão completa é julgada por dois analistas, de forma independente, segundo a rubrica do Quadro 4, e cada tarefa é gerada também sem documentação, para isolar a contribuição dessa fonte.

QUADRO|Quadro 4 – Rubrica de aceitação dos cenários
| Categoria | Critério | Exemplos |
|---|---|---|
| Aceito sem alteração | O analista executaria os cenários como estão | Nenhuma mudança |
| Aceito com alteração menor | Ajustes que não mudam o que é testado: nenhum cenário incluído ou removido e nenhum resultado esperado alterado | Corrigir redação; renomear passo; trocar o produto do exemplo por outro equivalente |
| Rejeitado | Mudança no que é testado ou defeito que impede a execução | Incluir comportamento omitido; remover cenário fora do escopo; corrigir resultado esperado; passo ambíguo (SOARES et al., 2023) |
FONTE|Fonte: elaborado pelo autor (2026).

O Quadro 5 resume as métricas e os valores esperados, fixados antes da coleta. Metas não são resultados: na ausência de coleta, os campos permanecem vazios, e não iguais a zero.

QUADRO|Quadro 5 – Métricas da avaliação empírica e valores esperados
| ID | Métrica | Valor esperado |
|---|---|---|
| M1 | Incidência de tarefas que exigem apuração (amostra de 100 tarefas) | Descritiva |
| M2 | Tempo de elaboração do caso de teste, atual e com a plataforma | Redução mediana ≥ 30%, p < 0,05 |
| M3 | Validade sintática na primeira geração | ≥ 90% |
| M4 | Aceitação: sem alteração, com alteração menor, rejeitado | ≥ 60% aceitos |
| M5 | Qualidade percebida: clareza, testabilidade, concisão e valor (OLIVEIRA; MARCZAK; MORALLES, 2019) | Média ≥ 4,0 (escala 1–5) |
| M6 | Cobertura dos itens do caso de referência | ≥ 70% |
| M7 | Completude frente aos comportamentos documentados, com e sem documentação | Maior com documentação |
| M8 | Distribuição dos desfechos de consenso | Divergente + falha ≤ 25% |
| M9 | Acurácia do valor consensuado frente à referência | ≥ 80% e superior a M10 |
| M10 | Acurácia de cada modelo isolado | Linha de base de M9 |
| M11 | Falso acordo entre as apurações com consenso | ≤ 10% |
| M12 | Valores corrigidos pelo analista na conferência | ≤ 10% |
| M13 | Custo e tempo por apuração | ≤ US$ 0,10 e ≤ 60 s |
FONTE|Fonte: elaborado pelo autor (2026), a partir do plano de validação.

A comparação de tempo (M2) usa as 30 tarefas preparadas pelo procedimento atual, que já emprega modelos de propósito geral, e com a plataforma, por analistas diferentes em cada condição, com atribuição balanceada para neutralizar o aprendizado. Se as diferenças pareadas forem compatíveis com a normalidade pelo teste de Shapiro-Wilk, aplica-se o teste t pareado; caso contrário, o teste de postos sinalizados de Wilcoxon, com tamanho de efeito e intervalo de confiança de 95%. Se a disponibilidade dos analistas não permitir as 60 sessões, o plano prevê reduzir a medição a 12 tarefas sorteadas, mantido o desenho, o que será relatado como limitação. A comparação entre o consenso e o melhor modelo isolado usa o teste de McNemar, em sua forma exata quando os pares discordantes forem poucos.

Na revisão do protocolo para esta versão, foram registradas, antes da coleta, as seguintes emendas: (a) como os pares de avaliadores variam entre as tarefas, a concordância da M4 passa a ser medida pelo kappa de Fleiss, adequado a avaliadores distintos por item, e não pelo kappa de Cohen; (b) a M9 e a M11 incidem sobre o mesmo subconjunto de apurações com consenso e são complementares, de modo que serão relatadas com seus denominadores, junto da taxa de cobertura do consenso e da acurácia sobre todas as perguntas, contando abstenções como não acerto; (c) resultados vazios não votam no consenso, por decisão de projeto, e as perguntas cuja resposta correta é vazia permanecem na amostra e são relatadas à parte; (d) a temperatura dos modelos será fixada em zero; (e) a comparação de H3 é feita com cada modelo isolado, relatando todos, e não apenas com o melhor escolhido depois de observados os resultados; e (f) como cada candidato usa a própria conexão, as consultas de referência são reexecutadas ao final da janela de coleta, e casos com dados alterados são descartados e relatados.

# 4 Resultados

Os resultados desta seção são de natureza técnica: descrevem o artefato construído e sua verificação automatizada. Não incluem medidas de desempenho dos modelos com tarefas reais nem avaliações de analistas, que não foram coletadas.

## 4.1 Artefato Construído

O artefato implementa 32 dos 33 itens do backlog planejado; o item restante, a incorporação das alterações de código vinculadas à tarefa, foi classificado desde o planejamento como evolução futura. O repositório registra 27 versões entre 12/10/2026 e 16/11/2026. A camada de orquestração soma 47 arquivos Java, com 2.340 linhas não vazias, e expõe 29 operações REST; a interface soma 36 arquivos TypeScript, com 4.945 linhas não vazias; e a base local evolui por sete migrações versionadas.

Em relação ao planejamento, três decisões merecem registro. Primeiro, os adaptadores dos provedores usam diretamente o cliente HTTP de cada API, em vez da biblioteca de abstração prevista, o que permitiu tratar de forma uniforme a contagem de tokens e o truncamento da resposta. Segundo, a leitura do banco foi feita sobre PostgreSQL, ficando o MySQL do ERP estudado como próximo passo. Terceiro, além do fluxo com modelos, a plataforma aceita entrada manual de cenários e de consultas, identificada como origem MANUAL e mantida separada nas métricas, o que permite operar o fluxo sem custos de provedores.

## 4.2 Verificação Automatizada

A suíte completa foi executada em 17/11/2026 com Java 21.0.13 e Maven 3.9.9, com os testes de banco real habilitados sobre uma instância local e descartável de PostgreSQL 16.4. A Figura 4 apresenta os 96 testes por componente; nenhum falhou e nenhum foi ignorado.

FIG|figuras/grafico-testes.png|Figura 4 – Testes automatizados por componente (execução de 17/11/2026)|Fonte: elaborado pelo autor (2026), a partir dos relatórios de execução da suíte.

Os testes dos clientes de modelos verificam, sem chamadas reais, o formato das requisições, a pseudonimização do conteúdo enviado, o cálculo de custo, o descarte de blocos de raciocínio, a marcação de respostas truncadas e a ausência de chaves e corpos de erro nas mensagens exibidas. Os testes de banco real confirmam que a plataforma recusa contas de superusuário e que uma instrução DELETE enviada diretamente ao gateway, sem passar pelo verificador, não altera os dados. Os testes do motor de consenso cobrem os quatro desfechos: três resultados iguais (unânime), dois iguais (maioria), nenhum igual (divergente) e menos de dois resultados válidos (falha); os de normalização confirmam que diferenças de nome, ordem de colunas e ordenação de linhas não impedem a coincidência, e que nulo, zero e texto são distinguidos.

## 4.3 Situação da Avaliação Empírica

Em 15/11/2026, três tentativas de iniciar o teste-piloto com tarefas pré-selecionadas do Jira retornaram indisponibilidade de serviço (HTTP 503), porque a geração por modelos não estava configurada no ambiente de execução. Nenhuma geração, apuração sobre a base do ERP ou avaliação por analistas foi realizada até a data desta versão. Assim, as métricas M1 a M13 não foram coletadas, e nenhuma das hipóteses H1 a H4 pôde ser testada. O levantamento do acervo feito para o plano de validação, em 12/10/2026, registrou 2.913 tarefas finalizadas no período, das quais 694 atendiam aos critérios verificáveis por consulta (I1 a I3); a aplicação de I4 e I5 e o sorteio das 36 tarefas ainda não foram realizados.

# 5 Discussão

Os resultados permitem afirmar que o mecanismo proposto é tecnicamente viável e auditável: consultas de origens distintas podem ser verificadas, executadas sem risco de escrita, comparadas de forma independente da forma e reduzidas a um desfecho, com toda a trilha preservada. Não permitem afirmar nada sobre a frequência com que modelos reais acertam, concordam ou erram juntos no ERP estudado, nem sobre ganho de tempo ou aceitação dos cenários. Essas são as perguntas da avaliação empírica.

A distinção entre valor apurado e valor validado, central no retorno da banca, decorre do próprio mecanismo: se dois candidatos omitirem o mesmo filtro, por exemplo o de pedidos cancelados, formarão maioria em torno de um valor que existe nos dados e é reproduzível, portanto apurado, mas não validado. O caso ilustra o falso positivo descrito por Zhong, Yu e Klein (2020) na avaliação por execução e o risco de erros correlacionados que motiva o uso de famílias distintas. Erros correlacionados não exigem modelos parecidos: basta que todos recebam o mesmo contexto incompleto. Por isso a plataforma exige regras de domínio explícitas para gerar SQL, e por isso o consenso é apresentado como indicador de confiança, e não como aprovação. A taxa de falso acordo (M11) mede exatamente essa lacuna, mas apenas em relação ao oráculo usado: uma referência executada sobre uma única massa de dados também pode coincidir por acaso com uma consulta errada, de modo que M11 tende a subestimar os erros de regra possíveis.

Outros dois comportamentos merecem atenção. Quando não há acordo, a plataforma devolve a decisão ao analista em vez de escolher um valor; divergências, portanto, não são apenas falhas do mecanismo e podem revelar ambiguidade no requisito, como em leituras diferentes de um "valor médio". Além disso, o resultado vazio é excluído da votação, conforme projetado. A decisão evita que consultas com filtro errado concordem no vazio, mas impede o consenso quando a resposta correta é de fato vazia; daí a emenda que mantém essas perguntas na amostra e as relata à parte. Nulo, zero, vazio, erro e limite excedido recebem tratamentos distintos e não devem ser agregados como uma mesma categoria nos resultados.

Em relação aos trabalhos relacionados, a contribuição está no tipo de verificação, e não no desempenho. Fonseca, Lima e Faria (2025) relatam 93,3% de cenários sintaticamente corretos, e a plataforma valida a sintaxe com o mesmo analisador; porém, percentuais obtidos com outras tarefas, rubricas e modelos não são comparáveis diretamente aos que este trabalho vier a medir. O diferencial é submeter o resultado esperado aos dados e medir quando essa submissão engana, aspecto ausente dos trabalhos do Quadro 1.

As limitações e ameaças à validade estão resumidas no Quadro 6.

QUADRO|Quadro 6 – Limitações e ameaças à validade
| Ameaça ou limitação | Consequência | Tratamento |
|---|---|---|
| Avaliação empírica não executada | Hipóteses H1 a H4 sem teste | Resultados restritos ao plano técnico; protocolo registrado antes da coleta |
| Verificação feita com candidatos fixados nos testes | Mostra o mecanismo, não a frequência dos desfechos | Nenhuma taxa é extrapolada |
| Autor integra a equipe e construiu o artefato | Viés de avaliação | Avaliação apenas por outros analistas; casos do autor excluídos |
| Casos históricos vistos durante a preparação do piloto | Contaminação de avaliação cega | Rodada formal com tarefas novas ou geração isolada do gabarito |
| Conjunto de referência elaborado com apoio de modelos | Referência não isenta de assistência | Declarado como representativo do procedimento atual |
| Candidatos em conexões distintas | Dados alterados entre consultas geram divergência | Janela controlada e reexecução das referências |
| Mudança de versões, preços e documentação | Baixa reprodutibilidade | Versões, custos e *hash* da documentação gravados |
| Duas áreas que compartilham esquema, um ERP e uma equipe | Generalização limitada | Sem extrapolação para áreas fiscal e contábil, outros ERPs ou equipes |
FONTE|Fonte: elaborado pelo autor (2026).

A limitação de maior consequência para a generalização é o recorte. Estoque e vendas compartilham parte do modelo de dados, e as perguntas percorrem tabelas e junções semelhantes. Mesmo concluída, a avaliação permitirá afirmar como a plataforma se comporta nessas duas áreas, desse sistema e com essa equipe, e as extrapolações permanecerão hipóteses. No plano prático, o artefato já reduz um risco do procedimento atual: o valor proposto vem acompanhado da consulta que o produziu, o que permite ao analista conferir a regra em vez de reconstruir o cálculo. Esse benefício, porém, depende do tempo de conferência, que só a comparação pareada poderá estimar.

# 6 Considerações Finais

O trabalho teve como objetivo desenvolver uma plataforma que gerasse cenários de teste a partir do requisito e da documentação das rotinas e apurasse os valores esperados por consulta ao banco de dados, com decisão por consenso entre modelos. Os objetivos OE2 e OE3 foram atendidos no plano da implementação: o artefato integra Jira e Confluence, gera e valida cenários Gherkin, obtém consultas de modelos Gemini e Llama, executa-as em modo somente leitura sobre PostgreSQL, decide por consenso e registra a conferência do analista, com minimização dos dados enviados aos provedores e trilha completa de auditoria.

A verificação técnica, com 96 testes aprovados, mostrou que o mecanismo funciona como especificado, inclusive nos quatro desfechos de consenso e na recusa de escrita no banco. Esse resultado não é prova de eficácia, mas reforça a escolha de tratar o consenso como indicador de confiança e de medir o falso acordo como métrica principal.

Os objetivos OE1 e OE4 e as hipóteses H1 a H4 permanecem abertos. A conclusão da avaliação depende de três condições: a homologação da integração com Claude, o adaptador para o MySQL do ERP, a configuração das contas dos provedores e da conta de consulta à homologação, com reconferência dos termos de uso; a aplicação dos critérios de seleção e a elaboração das consultas de referência; e a participação dos quatro analistas nas sessões de avaliação e de tempo.

Como contribuição, o trabalho entrega um artefato que articula geração de cenários e tradução para SQL sob um oráculo derivado dos dados, um protocolo de avaliação registrado antes da coleta e uma formulação operacional da diferença entre valor apurado e valor validado. Como trabalhos futuros, além da execução do protocolo, indicam-se a repetição das apurações para medir a variação dos modelos, a avaliação em áreas com regras de natureza diferente, como a fiscal e a contábil, a incorporação das alterações de código vinculadas à tarefa e o uso de mais de uma massa de dados na comparação, para reduzir falsos acordos por coincidência.

# Referências

REF|BARR, E. T.; HARMAN, M.; McMINN, P.; SHAHBAZ, M.; YOO, S. The Oracle Problem in Software Testing: A Survey. **IEEE Transactions on Software Engineering**, v. 41, n. 5, p. 507-525, 2015. DOI: 10.1109/TSE.2014.2372785.
REF|BRASIL. **Lei nº 13.709, de 14 de agosto de 2018**. Lei Geral de Proteção de Dados Pessoais (LGPD). Brasília, DF: Presidência da República, 2018.
REF|CUCUMBER. **Gherkin Reference**. 2026. Disponível em: https://cucumber.io/docs/gherkin/reference/. Acesso em: 9 set. 2026.
REF|DU, Y.; LI, S.; TORRALBA, A.; TENENBAUM, J. B.; MORDATCH, I. Improving Factuality and Reasoning in Language Models through Multiagent Debate. In: INTERNATIONAL CONFERENCE ON MACHINE LEARNING (ICML), 41., 2024, Viena. **Proceedings** [...]. PMLR, 2024. v. 235, p. 11733-11763.
REF|FERNANDES, H.; PERKUSICH, M.; ALBUQUERQUE, D.; SILVA, I.; SANTOS, D. F. S.; GORGÔNIO, K.; PERKUSICH, A. A Comparative Study of LLMs for Gherkin Generation. In: SIMPÓSIO BRASILEIRO DE ENGENHARIA DE SOFTWARE (SBES), 39., 2025, Recife. **Anais** [...]. Porto Alegre: Sociedade Brasileira de Computação, 2025. p. 171-181. DOI: 10.5753/sbes.2025.9888.
REF|FERREIRA, M.; VIEGAS, L.; FARIA, J. P.; LIMA, B. Acceptance Test Generation with Large Language Models: An Industrial Case Study. In: IEEE/ACM INTERNATIONAL CONFERENCE ON AUTOMATION OF SOFTWARE TEST (AST), 2025. **Proceedings** [...]. IEEE, 2025. p. 1-11. DOI: 10.1109/AST66626.2025.00007.
REF|FONSECA, P. L.; LIMA, B.; FARIA, J. P. Streamlining Acceptance Test Generation for Mobile Applications Through Large Language Models: An Industrial Case Study. In: IEEE/ACM INTERNATIONAL CONFERENCE ON AUTOMATED SOFTWARE ENGINEERING (ASE), 40., 2025. **Proceedings** [...]. IEEE, 2025. p. 3311-3321. DOI: 10.1109/ASE63991.2025.00273.
REF|GARG, A.; SHARMA, D. Generative AI for Software Test Modelling with a focus on ERP Software. In: INTERNATIONAL CONFERENCE ON ADVANCES IN COMPUTATION, COMMUNICATION AND INFORMATION TECHNOLOGY (ICAICCIT), 2023. **Proceedings** [...]. IEEE, 2023. p. 187-193. DOI: 10.1109/ICAICCIT60255.2023.10466102.
REF|HEVNER, A. R.; MARCH, S. T.; PARK, J.; RAM, S. Design Science in Information Systems Research. **MIS Quarterly**, v. 28, n. 1, p. 75-105, 2004. DOI: 10.2307/25148625.
REF|HUANG, L.; YU, W.; MA, W.; ZHONG, W.; FENG, Z.; WANG, H.; CHEN, Q.; PENG, W.; FENG, X.; QIN, B.; LIU, T. A Survey on Hallucination in Large Language Models: Principles, Taxonomy, Challenges, and Open Questions. **ACM Transactions on Information Systems**, v. 43, n. 2, art. 42, p. 1-55, 2025. DOI: 10.1145/3703155.
REF|INTERNATIONAL ORGANIZATION FOR STANDARDIZATION. **ISO/IEC/IEEE 29119-2:2021**: Software and systems engineering — Software testing — Part 2: Test processes. 2. ed. Genebra: ISO, 2021.
REF|KARPURAPU, S.; MYNENI, S.; NETTUR, U.; GAJJA, L. S.; BURKE, D.; STIEHM, T.; PAYNE, J. Comprehensive Evaluation and Insights Into the Use of Large Language Models in the Automation of Behavior-Driven Development Acceptance Test Formulation. **IEEE Access**, v. 12, p. 58715-58721, 2024. DOI: 10.1109/ACCESS.2024.3391815.
REF|LEI, F.; CHEN, J.; YE, Y.; CAO, R.; SHIN, D.; SU, H.; SUO, Z.; GAO, H.; HU, W.; YIN, P.; ZHONG, V.; XIONG, C.; SUN, R.; LIU, Q.; WANG, S.; YU, T. Spider 2.0: Evaluating Language Models on Real-World Enterprise Text-to-SQL Workflows. In: INTERNATIONAL CONFERENCE ON LEARNING REPRESENTATIONS (ICLR), 13., 2025, Singapura. **Proceedings** [...]. OpenReview.net, 2025.
REF|LI, J.; HUI, B.; QU, G.; YANG, J.; LI, B.; LI, B.; WANG, B.; QIN, B.; GENG, R.; HUO, N.; ZHOU, X.; MA, C.; LI, G.; CHANG, K.; HUANG, F.; CHENG, R.; LI, Y. Can LLM Already Serve as a Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs. In: ADVANCES IN NEURAL INFORMATION PROCESSING SYSTEMS (NeurIPS), 36., 2023. **Proceedings** [...]. Datasets and Benchmarks Track. Curran Associates, 2023.
REF|MENDOZA, I.; SILVA FILHO, F.; MEDEIROS, G.; PAES, A.; NEVES, V. O. Comparative Analysis of Large Language Model Tools for Automated Test Data Generation from BDD. In: SIMPÓSIO BRASILEIRO DE ENGENHARIA DE SOFTWARE (SBES), 38., 2024, Curitiba. **Anais** [...]. Porto Alegre: Sociedade Brasileira de Computação, 2024. p. 280-290. DOI: 10.5753/sbes.2024.3423.
REF|OLIVEIRA, G.; MARCZAK, S.; MORALLES, C. How to Evaluate BDD Scenarios' Quality? In: SIMPÓSIO BRASILEIRO DE ENGENHARIA DE SOFTWARE (SBES), 33., 2019, Salvador. **Anais** [...]. New York: ACM, 2019. p. 481-490. DOI: 10.1145/3350768.3351301.
REF|PADURARU, C.; ZAVELCA, M.; STEFANESCU, A. Agentic AI for Behavior-Driven Development Testing Using Large Language Models. In: INTERNATIONAL CONFERENCE ON AGENTS AND ARTIFICIAL INTELLIGENCE (ICAART), 17., 2025. **Proceedings** [...]. SciTePress, 2025. p. 805-815. DOI: 10.5220/0013374400003890.
REF|PEFFERS, K.; TUUNANEN, T.; ROTHENBERGER, M. A.; CHATTERJEE, S. A Design Science Research Methodology for Information Systems Research. **Journal of Management Information Systems**, v. 24, n. 3, p. 45-77, 2007. DOI: 10.2753/MIS0742-1222240302.
REF|SALLOU, J.; DURIEUX, T.; PANICHELLA, A. Breaking the Silence: the Threats of Using LLMs in Software Engineering. In: INTERNATIONAL CONFERENCE ON SOFTWARE ENGINEERING: NEW IDEAS AND EMERGING RESULTS (ICSE-NIER), 46., 2024, Lisboa. **Proceedings** [...]. New York: ACM, 2024. p. 102-106. DOI: 10.1145/3639476.3639764.
REF|SOARES, E.; ARANDA, M.; OLIVEIRA, N.; RIBEIRO, M.; GHEYI, R.; SOUZA, E.; MACHADO, I.; SANTOS, A.; FONSECA, B.; BONIFÁCIO, R. Manual Tests Do Smell! Cataloging and Identifying Natural Language Test Smells. In: ACM/IEEE INTERNATIONAL SYMPOSIUM ON EMPIRICAL SOFTWARE ENGINEERING AND MEASUREMENT (ESEM), 2023. **Proceedings** [...]. IEEE, 2023. p. 1-11. DOI: 10.1109/ESEM56168.2023.10304800.
REF|SOLIS, C.; WANG, X. A Study of the Characteristics of Behaviour Driven Development. In: EUROMICRO CONFERENCE ON SOFTWARE ENGINEERING AND ADVANCED APPLICATIONS (SEAA), 37., 2011. **Proceedings** [...]. IEEE, 2011. p. 383-387. DOI: 10.1109/SEAA.2011.76.
REF|WANG, J.; HUANG, Y.; CHEN, C.; LIU, Z.; WANG, S.; WANG, Q. Software Testing With Large Language Models: Survey, Landscape, and Vision. **IEEE Transactions on Software Engineering**, v. 50, n. 4, p. 911-936, 2024. DOI: 10.1109/TSE.2024.3368208.
REF|WANG, X.; WEI, J.; SCHUURMANS, D.; LE, Q. V.; CHI, E. H.; NARANG, S.; CHOWDHERY, A.; ZHOU, D. Self-Consistency Improves Chain of Thought Reasoning in Language Models. In: INTERNATIONAL CONFERENCE ON LEARNING REPRESENTATIONS (ICLR), 11., 2023, Kigali. **Proceedings** [...]. OpenReview.net, 2023.
REF|WYNNE, M.; HELLESOY, A. **The Cucumber Book**: Behaviour-Driven Development for Testers and Developers. Raleigh: Pragmatic Bookshelf, 2012.
REF|ZHONG, R.; YU, T.; KLEIN, D. Semantic Evaluation for Text-to-SQL with Distilled Test Suites. In: CONFERENCE ON EMPIRICAL METHODS IN NATURAL LANGUAGE PROCESSING (EMNLP), 2020. **Proceedings** [...]. Association for Computational Linguistics, 2020. p. 396-411. DOI: 10.18653/v1/2020.emnlp-main.29.

# Apêndice A – Ajustes Solicitados na Avaliação da Proposta

QUADRO|Quadro A.1 – Ajustes solicitados pela banca e onde foram atendidos
| Ajuste solicitado | Apontado por | Onde foi atendido |
|---|---|---|
| Conceito de verificação dos valores esperados | Rafael Rodrigues Barbosa | Seções 1 e 2.1 (apurado × validado); título com "apurados"; M9 e M11; Seção 5 |
| Segurança e minimização dos dados enviados aos provedores | Rafael Rodrigues Barbosa; Anderson Luiz Fernandes | Seção 3.5 e Quadro 3; filtro de saída e auditoria do conteúdo enviado |
| Critérios de inclusão definidos antes da coleta | Anderson Luiz Fernandes | Seção 3.6 (I1 a I5, E1 a E3, semente) e funil registrado na Seção 4.4 |
| Definição de "aceito com alteração menor" | Anderson Luiz Fernandes | Quadro 4 e calibração pelo kappa de Fleiss |
| Significância da diferença de tempo | Anderson Luiz Fernandes | Seção 3.6: desenho pareado, testes e tamanho de efeito |
| Limite de generalização | Anderson Luiz Fernandes | Seção 5 e Quadro 6 |
| Estrutura do ERP base | Douglas Bianchezzi | Seção 3.2 e Figura 1 |
FONTE|Fonte: elaborado pelo autor (2026), a partir do retorno da avaliação de 15/09/2026.
