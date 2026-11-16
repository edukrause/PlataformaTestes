# Execução e coleta

## 1. Preparar o ambiente

Ler `backend/.env.example`, `backend/README.md` e `backend/docs/postgresql.md`. Preservar qualquer `.env` já existente. Não publicar valores de segredos. Há um PostgreSQL escutando localmente na porta 5432 na inspeção de 15/11, mas isso **não identifica uma base do ERP nem autoriza usá-la**.

Configurações necessárias:

| Grupo | Dados a configurar |
|---|---|
| Geração | PLATAFORMA_IA_MODO=externa; provedor principal; modelos habilitados |
| Gemini | chave, ID do modelo, preços de entrada/saída e modalidade da conta |
| Groq/Llama | chave, ID do modelo, preços e modalidade/retenção |
| Jira | URL, versão de API, modo de autenticação e credencial de leitura |
| Confluence | URL, autenticação e páginas por área/tarefa |
| ERP | URL PostgreSQL de homologação, conta de leitura, schemas e limites |
| Domínio | empresa, filial, cancelamento e exclusão lógica em DOMINIO_REGRAS |
| Privacidade | termos sensíveis e eventual lista aprovada de amostragem |

Não habilitar escrita no Jira para a avaliação. Manter envio de amostras desativado até revisão específica. Acesso ao Jira pelo conector não substitui configuração do cliente Java.

Ferramentas encontradas na máquina (reconfirmar disponibilidade):
- Java: `C:\Users\eduar\.jdks\openjdk-21.0.2\bin\java.exe`.
- Maven: `C:\Users\eduar\.m2\wrapper\dists\apache-maven-3.9.14-bin\1cb7fhup6b5n3bed6kckbrnspv\apache-maven-3.9.14\bin\mvn.cmd`.
- JAR: `backend/target/plataforma-testes-0.1.0-SNAPSHOT.jar` (arquivo local; não assumir que acompanha o clone).
- Python com python-docx, pypdf, PyMuPDF e reportlab disponível.
- Word instalado em `C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE`.

Para iniciar, da pasta `backend`: `java -jar target/plataforma-testes-0.1.0-SNAPSHOT.jar`. Antes de gerar, ler GET `/api/saude` e `/api/configuracao`. A configuração declarada ainda não prova que a conta remota funciona: realizar smoke test pequeno e registrar o resultado.

## 2. Selecionar tarefas

Seguir a E5. I1: melhoria/bug/tarefa finalizada entre 01/01/2025 e 30/09/2026. I2: rotina de estoque ou vendas, sem misturar ambas na mesma tarefa. I3: casos de teste históricos preenchidos. I4: requisito com pelo menos 50 palavras. I5: documentação funcional revisada. Excluir ausência de comportamento funcional, duplicatas e casos de referência do autor.

Usar a semente registrada na E5, 20261030, para a seleção formal; registrar ordem de exame e exclusões. Não chamar a busca inicial por título de aplicação integral de I2. Os três candidatos anteriores são apenas piloto intencional, com elegibilidade incompleta.

Manter um arquivo de referência separado do contexto enviado aos modelos. Na preparação anterior, o assistente leu os casos históricos; não reutilizar sua avaliação como observação independente. Criar entradas isoladas, sem gabarito, ou selecionar novas tarefas para a rodada formal.

## 3. Congelar o experimento

Registrar commit, prompts, versão dos modelos, temperatura quando suportada, preços/data, documentação/hash, esquema e identificação do snapshot da massa. Criar consultas de referência antes das saídas dos modelos e obter conferência humana no relatório. Não inferir nomes de tabelas ou valores de status a partir de exemplos do texto acadêmico.

O código atual exclui resultados vazios do consenso. Isso é limitação do artefato; consulta com retorno vazio pode ser semanticamente correta. Não remover essas perguntas da avaliação depois de observar o resultado. Registrar a decisão metodológica previamente.

As conexões dos candidatos usam snapshots próprios. Preferir massa congelada ou janela controlada, verificando as referências antes e depois. REPEATABLE READ por conexão não resolve mudanças entre conexões.

## 4. Executar piloto e medir

1. Validar a entrada e a documentação de cada tarefa.
2. POST `/api/execucoes` com `chaveJira` e `usarDocumentacao`.
3. Consultar GET `/api/execucoes/{id}` até estado final; guardar falhas e retentativas.
4. Para apurações, conferir `/api/execucoes/{id}/apuracoes.csv` e a comparação com referência independente.
5. Exportar `/api/metricas.csv` e `/api/execucoes.csv`, distinguindo origem MANUAL e MODELOS.
6. Registrar decisões humanas somente depois de coleta real. Não preencher a revisão em nome dos analistas.
7. Usar o piloto para corrigir o protocolo e congelar uma versão antes da avaliação final; manter dados do piloto separados.

Não preencher tabelas de resultados automaticamente a partir de indicadores agregados sem verificar os denominadores. Revisar se o registro permite medir a primeira geração (M3) separadamente da regeneração. Não tratar processamento HTTP como tempo humano de elaboração.

## 5. Avaliação final da E5

- Conjunto 1: 30 tarefas, 15 por área; seis de calibração à parte. Quatro analistas, excluído o autor.
- Duas versões por tarefa: completa e sem documentação. As versões da ablação devem diferir somente na variável examinada; impedir vazamento da documentação por outras fontes.
- Dois avaliadores independentes por tarefa; conservar votos originais antes de adjudicar. Calibração conjunta com Fleiss; revisar o cálculo da concordância da avaliação, pois Cohen pressupõe o mesmo par de avaliadores. Se os pares variam, usar método compatível ou relatar por par, justificando eventual emenda.
- Tempo: 30 tarefas pareadas, 60 sessões; analistas diferentes por condição na mesma tarefa e atribuição balanceada. Alternativa de 12 tarefas existe na E5 e deve ser declarada, não ocultada.
- Conjunto 2: perguntas dos relatórios/consultas das duas áreas, com SQL de referência validado. Repetir dez perguntas três vezes para examinar variação, conforme a E5.

Rubrica: aceito sem alteração; aceito com alteração menor (redação/nome/valor de exemplo equivalente sem mudar intenção ou resultado esperado); rejeitado (omissão, escopo errado, resultado incorreto ou impossibilidade de executar). Registrar correções, não apenas decisão final.

## 6. Análise e ressalvas

- M9 = acertos entre apurações com consenso e referência. M11 = erros nesse mesmo subconjunto. Se o denominador é idêntico e todos os casos foram classificados, M9 + M11 = 100%. Não são evidências independentes.
- Reportar também proporção de perguntas que receberam consenso, falhas e divergências. Alta acurácia condicional pode esconder muitas abstenções.
- Comparar modelo individual e consenso na mesma população, mostrando também resultados por todas as perguntas. Escolher o melhor modelo na mesma amostra introduz viés de seleção; declarar ou pré-definir a comparação.
- McNemar é pareado e depende dos pares discordantes, não apenas do total de perguntas. Considerar versão exata quando necessário e declarar o tratamento das abstenções.
- Tempo: a E5 propõe t pareado ou Wilcoxon, tamanhos de efeito e IC. Examinar os pressupostos; Wilcoxon não é simplesmente um teste universal de medianas. Não escolher o teste depois para favorecer significância. Com poucos casos de piloto, privilegiar descrição e incerteza.
- Metas de M1–M13 estão em `coleta/metricas_planejadas.csv`, extraídas da E5. Metas não são resultados. Preservar valores ausentes como vazios/NA e registrar razão.

## 7. Armazenamento

Os CSVs deste pacote são modelos vazios. Copiar para uma pasta privada antes de coletar; não colocar respostas reais identificáveis no Git. Criar a tabela de correspondência P01→chave Jira somente nessa pasta privada. Publicar apenas agregados e evidências permitidas. Dados brutos internos completos não devem ser prometidos como repositório aberto no artigo.
