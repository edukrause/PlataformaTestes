# Backend — estrutura e integrações

Java 21, Spring Boot 3.5, Maven, JDBC, Flyway e H2 em arquivo.
A integração com Claude fica para a etapa final. Por padrão, `PLATAFORMA_IA_MODO=desativada`:
o processo inicia sem credenciais de IA e permite consultar histórico, métricas e revisar execuções existentes.
Pedidos de geração retornam HTTP 503 antes de consultar o Jira ou gravar uma execução.
O frontend existente continua compatível com a API; seu modo `mock` permanece separado do backend.

## Organização

- `api`: contratos HTTP, validação de entrada e respostas de erro.
- `contexto`: porta de leitura de requisitos (`RequisitoGateway`).
- `jira`: adaptador HTTP dessa porta.
- `execucao`: geração, consulta e persistência transacional das execuções.
- `conversa`: mensagens e encaminhamento de pedidos de geração.
- `cenario`: contrato e validação sintática dos cenários.
- `ia`: porta `ModeloGateway`, implementação desativada e adaptador da API guardado como opção.
- `metrica`: indicadores da avaliação, separados das chamadas de geração.

Os casos de uso dependem das portas, permitindo testar o fluxo com implementações substitutas sem consumir APIs.
Um futuro adaptador de terminal pode implementar `ModeloGateway` sem alterar persistência ou interface.

## Executar

Use JDK 21 e Maven 3.6.3 ou superior. Configure as variáveis no terminal que iniciará o backend
ou no ambiente de execução da IDE. Veja os nomes em [.env.example](.env.example).
O arquivo `.env` não é carregado automaticamente pelo Spring.

Exemplo PowerShell, preenchendo as credenciais somente no seu terminal:

Para desenvolver a estrutura, basta `mvn spring-boot:run` com Java 21. As configurações abaixo
só são necessárias quando as respectivas integrações forem usadas. Para retomar o adaptador da API,
defina explicitamente `PLATAFORMA_IA_MODO=api` e configure o modelo e as credenciais.

```powershell
$env:JAVA_HOME = 'CAMINHO_DO_SEU_JDK_21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:JIRA_BASE_URL = 'https://sua-empresa.atlassian.net'
$env:JIRA_EMAIL = 'seu-email@empresa.com'
$env:JIRA_API_TOKEN = 'seu-token'
$env:ANTHROPIC_API_KEY = 'sua-chave'
$env:ANTHROPIC_MODEL = 'ID_DO_MODELO_ESCOLHIDO'
$env:ANTHROPIC_INPUT_PRICE = 'PRECO_POR_MILHAO'
$env:ANTHROPIC_OUTPUT_PRICE = 'PRECO_POR_MILHAO'
cd backend
mvn spring-boot:run
```

Selecione um modelo disponível na sua conta e configure os preços de entrada e saída da mesma versão.
Sem preços a chamada é recusada, para não registrar custo zero como se fosse uma medição real.
O servidor fica em `http://127.0.0.1:8080`, restrito ao computador local. A base fica em `backend/data/`
quando o processo é iniciado de `backend`. O console web do H2 não está habilitado.
A aplicação inicia sem chaves; a configuração é exigida ao usar a integração.

Em outro terminal:

```powershell
cd frontend
# Crie frontend/.env.local com a linha VITE_API=http
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite e envie `Gere os cenários de PROJ-123`, com uma chave real do seu Jira.
O proxy do Vite encaminha `/api` ao backend. A hospedagem no GitHub Pages continua sendo apenas o protótipo;
ela não hospeda processos Java. A geração é síncrona e pode levar até dois minutos, além da coleta no Jira.
Não repita o envio enquanto estiver aguardando.

Para Jira Data Center, o adaptador também admite `JIRA_API_VERSION=2` e `JIRA_AUTH_MODE=bearer`.
Confirme a autenticação suportada pelo servidor. Jira Cloud usa versão 3, e-mail e API token;
tokens com escopos podem exigir a URL de gateway da Atlassian com o cloud ID.
O campo de área é opcional (`JIRA_AREA_FIELD=customfield_12345`); sem evidência, a interface mostra
“Área a confirmar”. O mapeamento de situação deve ser conferido contra o workflow real do projeto.

## API

| Método | Caminho | Operação |
|---|---|---|
| GET | `/api/saude` | Disponibilidade do processo |
| GET / POST | `/api/execucoes` | Histórico / geração pelo requisito |
| GET | `/api/execucoes/{id}` | Cenários, custo, pendências e erro |
| POST | `/api/execucoes/{id}/revisao` | Conferência corrente do analista |
| PUT | `/api/execucoes/{id}/cenarios/{cenarioId}/execucao` | Resultado manual do teste; `null` desfaz |
| GET | `/api/demandas/{chave}` | Metadados atuais da tarefa no Jira |
| GET | `/api/metricas` | Contagens da avaliação; apurações ficam zeradas enquanto não existem |
| GET | `/api/conversas` | Histórico de conversas |
| GET | `/api/conversas/{id}` | Mensagens de uma conversa |
| POST | `/api/conversas/mensagens` | Pedir geração informando a chave |

O contrato segue `frontend/src/api/tipos.ts`. O detalhe acrescenta `mensagemErro` e
`apuracaoDisponivel=false`. Não confunda conclusão da geração com execução dos testes ou apuração de valores.
Metadados na listagem são o retrato coletado; o endpoint de demanda faz uma nova leitura do Jira.
A conversa reconhece chaves e orienta o usuário; ainda não é um chat livre com o modelo.

## Persistência e auditoria

Flyway cria as seis tabelas do domínio e três tabelas de suporte: `chamada_modelo`, `conversa` e `mensagem`.
Cada coleta gera um retrato da tarefa, preservando requisitos anteriores. Chamadas de cenários registram
modelo devolvido pelo provedor, prompt efetivamente enviado, resposta, correspondências de pseudonimização,
tokens, custo calculado e latência. Isso fica separado dos candidatos SQL para não contaminar suas métricas.
Resposta inválida mantém a chamada e o custo, e deixa a execução com erro. Gerações interrompidas por
encerramento são marcadas com erro na próxima inicialização.

O gateway inicial usa a Messages API por HTTP, atrás de `ModeloGateway`. É uma simplificação de implementação
em relação ao Spring AI proposto na E4; migrar o adaptador para Spring AI não precisa alterar o fluxo.
Prompts estão versionados em `src/main/resources/prompts`.

O filtro substitui padrões de CPF, CNPJ, e-mail e telefone e os nomes/termos configurados em `SENSITIVE_TERMS`.
Ele **não reconhece todos os nomes próprios ou informações confidenciais automaticamente**. Revise os requisitos
e configure os termos antes de usar dados empresariais. A base local contém requisito original e correspondências;
mantenha-a sob o controle de acesso da empresa. Nenhum resultado de banco é enviado ao provedor.

## Limites desta entrega

Confluence, SQL/MySQL, múltiplos modelos, consenso e exportação de métricas ainda não foram implementados.
`usarDocumentacao` é recebido por compatibilidade com o frontend, mas esta versão sempre registra a ausência
de documentação e gera apenas cenários de alteração. Alterar situação ou publicar cenários no Jira não está
habilitado; a tentativa de alteração de situação retorna 501.
A revisão guarda a decisão corrente; histórico de alterações de uma revisão fica para uma migração posterior.
Build único com frontend e backend ainda está pendente (B01 parcial). Não considere B01–B11 concluídos.

## Verificação

```powershell
cd backend
mvn test
mvn package
java -jar target/plataforma-testes-0.1.0-SNAPSHOT.jar
```

Os testes usam H2 em memória e substituem Jira e Claude por doubles, sem consumo de API:
geração, histórico, revisão, conversa, erros, custo de resposta inválida, validação de entrada,
Gherkin e pseudonimização. Um teste com credenciais reais ainda é necessário no seu ambiente.

Referências: [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html),
[Jira Cloud](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/),
[autenticação Jira](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/),
[Claude Messages](https://platform.claude.com/docs/en/api/messages/create).
