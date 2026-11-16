# Roteiro da demonstração (3 a 5 minutos)

Serve para a demonstração ao vivo e para o vídeo de plano B. Usa só a base sintética
(`tcc/artigo/demonstracao/base-sintetica.sql`): nenhum dado do ERP, de clientes ou de tarefas internas aparece na tela.

## Preparar (antes de gravar)

1. Subir um MySQL 8 local e carregar `tcc/artigo/demonstracao/base-sintetica.sql` (cria a base `demo_erp` e a conta
   `demo_leitura`, que só tem SELECT).
2. Gerar o executável (`scripts/build.ps1`) e iniciar a plataforma apontando para essa base:

   ```
   PORT=18084
   PLATAFORMA_DB_URL=jdbc:h2:mem:demo
   ERP_DIALETO=MYSQL
   ERP_MYSQL_HABILITADO=true
   ERP_MYSQL_URL=jdbc:mysql://127.0.0.1:3306/demo_erp
   ERP_MYSQL_USUARIO=demo_leitura
   ERP_MYSQL_SENHA=demo-leitura
   ERP_CATALOGO_SCHEMAS=demo_erp
   ```

   `java -jar backend/target/plataforma-testes-0.1.0-SNAPSHOT.jar`
3. Rodar `python tcc/artigo/demonstracao/demonstracao.py` uma vez: cria a execução "Demonstração sintética" com as
   cinco perguntas já apuradas.
4. Abrir http://127.0.0.1:18084 no navegador, com zoom que deixe o texto legível na gravação.

## Sequência

| Tempo | O que mostrar | O que dizer |
|---|---|---|
| 0:00–0:30 | Lista de execuções; abrir "Demonstração sintética" | O problema: para testar um relatório, é preciso saber antes o valor que ele deve mostrar. |
| 0:30–1:15 | Requisito e cenários em Gherkin | A plataforma parte do requisito e devolve cenários no formato que a equipe já usa. |
| 1:15–2:15 | Apuração da Q1 (Maioria) e da Q2 (Unânime): as três consultas e os resultados | Três consultas independentes rodam no banco em modo somente leitura; só há valor proposto quando ao menos duas coincidem. |
| 2:15–3:00 | Apuração da Q3 (Maioria com valor 180) | Aqui dois candidatos erraram igual e venceram: a referência é 140. Consenso indica confiança, não correção; por isso o analista confere. |
| 3:00–3:40 | Q4 (Divergente) e Q5 (Falha) | Sem acordo, nada é proposto. Na Q5, uma tentativa de DELETE foi recusada antes de chegar ao banco. |
| 3:40–4:20 | Registrar a decisão de conferência em um cenário; abrir Métricas | A decisão do analista fica gravada, com a consulta que produziu o valor. |
| 4:20–4:40 | Encerrar na tela de métricas | O que falta: aplicar com tarefas reais e analistas, no TCC II. |

## Se algo falhar ao vivo

- Plataforma não sobe ou banco não responde: passar o vídeo.
- Pergunta sobre os modelos: nesta demonstração as consultas foram escritas pelo autor e enviadas pela entrada
  manual; nenhuma foi gerada por modelo. A integração com Claude, Gemini e Llama está implementada e testada com
  servidor simulado, e ainda não foi usada com contas reais.

## Três perguntas esperadas da banca

- **Por que essa tecnologia?** Java e Spring Boot dão acesso JDBC aos dois bancos e execução concorrente das
  chamadas; um executável único mantém credenciais e banco fora do navegador. Três famílias de modelos permitem
  desempate e reduzem a chance de erro comum.
- **Como sabe que funcionou?** 121 testes automatizados, inclusive em MySQL e PostgreSQL reais, e a demonstração
  repetida em dez rodadas com os mesmos desfechos. Isso prova o mecanismo, não a eficácia com tarefas reais.
- **Qual a limitação?** Ainda não foi aplicado com tarefas reais nem com analistas, e o consenso pode errar (falso
  acordo). O recorte é de duas áreas de um ERP e uma equipe.
