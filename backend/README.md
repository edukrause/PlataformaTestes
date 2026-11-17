# Backend e aplicação local

Java 21, Spring Boot 3.5, JDBC, Flyway e H2. PostgreSQL é a fonte consultada em modo somente leitura.
A aplicação funciona sem IA pela entrada manual e pode gerar cenários e SQL com Claude, Gemini e
Llama/Groq quando as respectivas credenciais forem configuradas.

## Executar o aplicativo

O executável inclui a interface React. Após construir:

```powershell
cd backend
java -jar target/plataforma-testes-0.1.0-SNAPSHOT.jar
```

Abra http://127.0.0.1:8080. A aplicação fica restrita ao computador local. O H2 é salvo em
`backend/data` quando iniciada dessa pasta. Credenciais e dados locais não são versionados.
O modo de demonstração no GitHub Pages continua separado, com dados simulados.

Para construir tudo na raiz, use `scripts/build.ps1` no Windows ou `sh scripts/build.sh` em Linux/macOS.
São necessários Java 21, Maven e Node 22. Os scripts executam instalação, lint, build da interface
em modo HTTP e `mvn clean verify`, incluindo os arquivos estáticos no JAR.

Alternativa no Windows, sem executar um script PowerShell:

```powershell
cd frontend
npm.cmd ci
$env:VITE_API = 'http'
npm.cmd run lint
npm.cmd run build
cd ../backend
mvn.cmd clean verify
java -jar target/plataforma-testes-0.1.0-SNAPSHOT.jar
```

No desenvolvimento, também é possível usar Vite com `VITE_API=http` e o backend em processos separados.

## Configurar integrações

Copie [.env.example](.env.example) para `backend/.env`, sem substituir um arquivo já configurado.
Inicie a aplicação de `backend`: ela importa esse arquivo como properties; variáveis exportadas no
terminal têm precedência. Não preencha segredos em arquivos versionados.

- **Sem IA:** mantenha `PLATAFORMA_IA_MODO=desativada` e use Execuções → Nova execução → Entrada manual.
- **Geração:** defina `PLATAFORMA_IA_MODO=externa`, escolha `PLATAFORMA_IA_PROVEDOR=CLAUDE`, `GEMINI` ou `LLAMA`,
  habilite o provedor e informe chave, ID de modelo e preços por milhão de tokens.
- **Consenso automático:** habilite ao menos dois provedores. Com Claude, Gemini e Llama/Groq participam três
  famílias: três resultados equivalentes produzem UNANIME e dois, MAIORIA. Com só dois habilitados, o máximo é MAIORIA.
- **Jira:** URL HTTPS, autenticação e API 2/3. `JIRA_STATUS_MAPA` associa IDs de situações ao vocabulário da plataforma.
- **Confluence:** URL base incluindo `/wiki` no Cloud, autenticação, API 2 (Cloud) ou 1 (REST anterior) e
  `CONFLUENCE_PAGINAS` no formato `ESTOQUE:12345,PROJ-123:67890`. O mapeamento por tarefa prevalece sobre a área.
  Solicitar documentação sem configuração válida produz uma pendência/erro explícito.
- **PostgreSQL:** conta dedicada com SELECT e sem superusuário. Veja [PostgreSQL](docs/postgresql.md).
- **Domínio:** preencha `DOMINIO_REGRAS` com as regras reais de empresa, filial, cancelados e exclusão lógica.
  O gerador SQL recusa iniciar sem essas regras. O texto orienta o prompt; o analista verifica sua aplicação.
- **Escrita no Jira:** `JIRA_ESCRITA_HABILITADA=true` habilita ações explícitas na interface.
  `JIRA_TRANSICOES` associa situações a IDs de transições reais, por exemplo `EM_TESTE:31`.
  Publicação de cenários exige revisão aceita. Não há publicação automática.

Nenhuma chamada aos provedores é feita na inicialização. Preços não são presumidos: configure o preço
da versão escolhida, incluindo zero somente quando essa for a condição real da sua conta.
O Claude usa a API de mensagens da Anthropic (`/v1/messages`); como ela não tem modo JSON nativo,
o contrato é reforçado na instrução de sistema e validado pelo mesmo parser dos demais provedores.

## Fluxo

1. Coletar a tarefa do Jira ou registrar requisito e cenários manuais.
2. Se solicitado, ler a documentação do Confluence e guardar referência, versão, texto e hash.
3. Gerar cenários com o modelo escolhido. Validar JSON e Gherkin; refazer uma vez quando inválidos.
   Regressão só é admitida quando documentação funcional foi efetivamente fornecida.
4. Para cada pergunta de apuração do cenário, selecionar o subesquema e gerar SQL em paralelo com os provedores habilitados.
   Uma nova tentativa recebe a consulta anterior e o tipo de erro, sem mensagens internas do banco.
5. Verificar SELECT, EXPLAIN, execução, limites, normalização e consenso. Guardar todas as chamadas e
   seus custos; cada família fornece apenas um candidato final ao consenso.
6. Substituir o marcador `«VALOR_APURADO»` por `«A<id>»` quando houver referência. A interface resolve o valor
   sem alterar a evidência original. Sem acordo, há pendência para conferência manual.
7. Conferir, corrigir valores, registrar execução manual dos testes e, opcionalmente, publicar no Jira.

A tela permite adicionar consultas manuais ou pedir uma nova apuração automática antes da revisão.
Apuração em andamento impede revisão concorrente. Mudanças na revisão preservam versões anteriores
e as correções; a referência do consenso nunca é sobrescrita pelo valor validado pelo analista.
Lotes processam até 20 tarefas distintas em sequência, preservando falhas individuais e histórico.

## API principal

| Método | Caminho | Operação |
|---|---|---|
| GET | `/api/saude` | Saúde local |
| GET | `/api/configuracao` | Indicadores de configuração, sem segredos e sem validar contas remotas |
| GET / POST | `/api/execucoes` | Histórico / geração pelo Jira |
| POST | `/api/execucoes/manuais` | Criar execução sem Jira ou IA |
| GET | `/api/execucoes/{id}` | Cenários, apurações, custos e revisão |
| POST | `/api/execucoes/{id}/apuracoes` | Consultas finais informadas manualmente |
| POST | `/api/execucoes/{id}/apuracoes/automaticas` | Gerar SQL e apurar com os provedores habilitados |
| POST | `/api/execucoes/{id}/revisao` | Conferência e correções por ID de apuração |
| GET | `/api/execucoes/{id}/revisoes` | Histórico imutável das conferências |
| PUT | `/api/execucoes/{id}/cenarios/{cenarioId}/execucao` | Registrar teste manual ou desfazer com null |
| GET | `/api/demandas/{chave}` | Metadados atuais no Jira |
| PUT | `/api/demandas/{chave}/status` | Transição configurada no Jira |
| POST | `/api/execucoes/{id}/jira` | Publicar cenários aprovados como comentário |
| GET / POST | `/api/lotes` | Listar / processar conjunto de referência |
| GET | `/api/lotes/{id}` | Resultados individuais do lote |
| GET | `/api/metricas?origem=TODAS` | Métricas; também aceita MANUAL ou MODELOS |
| GET | `/api/metricas.csv`, `/api/execucoes.csv` | Exportações CSV |
| GET | `/api/execucoes/{id}/apuracoes.csv` | Evidências e candidatos da execução |
| GET / POST | `/api/conversas`, `/api/conversas/mensagens` | Histórico / pedido de geração |
| GET | `/api/conversas/{id}` | Mensagens e execuções associadas |

Catálogo e consultas têm os contratos descritos em [PostgreSQL](docs/postgresql.md).
CSV inclui BOM UTF-8, separador ponto e vírgula, escape de campos e proteção de células textuais
interpretáveis como fórmulas. A métrica de alterações usa referências efetivamente revisadas.
É possível separar apurações manuais das geradas para não tratar custo manual zero como custo de IA.

## Auditoria e limites

Flyway V1–V7 preserva os registros existentes e acrescenta histórico de correções, documentação,
origem manual/Jira, finalidade das chamadas, lotes e publicações.
Todas as respostas recebidas dos modelos são auditadas antes da validação, incluindo retentativas.
As métricas de candidatos agregam os custos das tentativas, separados da geração de cenários.

A publicação é idempotente por execução/revisão. Uma operação sem confirmação fica INCERTO e não é
reenviada automaticamente: confira a tarefa no Jira. Revisão não muda enquanto há publicação pendente.
Operações interrompidas pela aplicação ficam registradas para não aparentarem conclusão.

O filtro de saída cobre padrões de CPF, CNPJ, e-mail, telefone e termos configurados, no requisito,
documentação, regras e mensagens reenviadas. Ele não identifica qualquer informação confidencial
automaticamente. A base local contém os originais e o mapa de correspondências.
Resultados completos das consultas não são enviados aos modelos; amostras só saem quando explicitamente
autorizadas pela lista de colunas e por `ERP_AMOSTRA_ENVIAR_MODELOS=true`.

Cada candidato lê um snapshot próprio no PostgreSQL. Mudanças nos dados durante a apuração podem gerar
divergência. Consenso não comprova a regra de negócio e não substitui a conferência.
A execução dos testes do ERP continua manual; a plataforma não escreve no banco consultado.

## Verificação

A CI constrói a interface em modo HTTP, inclui os arquivos no JAR e executa testes com PostgreSQL
descartável 16 e 18. Testes HTTP simulados cobrem Jira, Confluence, Gemini e Groq sem usar credenciais.
Os testes do fluxo cobrem geração, retentativas, apuração, correções, auditoria, concorrência, lote,
publicação idempotente e CSV. Veja [continuidade](../docs/CONTINUIDADE.md) para o que foi realmente
executado nesta sessão e os bloqueios de ambiente. Implementado não significa validado na sua conta real.

Referências dos contratos: [Gemini](https://ai.google.dev/api/generate-content),
[Groq](https://console.groq.com/docs/api-reference),
[Jira](https://developer.atlassian.com/cloud/jira/platform/rest/v3/),
[Confluence](https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/).
