# Escopo congelado e próximos passos — 16/11/2026

## Versão candidata

A tag `v1.0-rc` marca a versão levada à banca de validação do TCC I. A partir dela, código novo só para corrigir.

Entra na versão: geração de cenários em Gherkin a partir do requisito e da documentação; apuração por consulta
somente leitura em MySQL ou PostgreSQL; consenso entre três famílias de modelos; entrada manual de cenários e
consultas; conferência pelo analista; métricas e exportação em CSV; registro de versões, temperatura, custo e tempo.

## O que ficou de fora (vira trabalhos futuros)

- Alterações de código vinculadas à tarefa como fonte de contexto (item B33 do backlog).
- Execução automática dos cenários no ERP (a plataforma prepara o teste, não o executa).
- Áreas fiscal e contábil, outros ERPs e outras equipes.
- Mais de uma massa de dados para reduzir coincidências (falso acordo).
- Repetição das apurações com modelos para medir a variação entre execuções.

## Resultados desta etapa

Os resultados são técnicos: o artefato funcionando. Estão no repositório:

| Evidência | Arquivo |
|---|---|
| Suíte de 121 testes, sem falhas | `tcc/artigo/evidencias/testes-2026-11-16.json` |
| Demonstração em base sintética (5 perguntas) | `tcc/artigo/demonstracao/resultados-demonstracao.json` |
| Dez rodadas da demonstração, com tempo por apuração | `tcc/artigo/demonstracao/medicoes.csv` |
| Gráficos (testes por componente e tempo por apuração) | `tcc/artigo/figuras/grafico-*.png` |

A avaliação com tarefas reais e analistas (métricas M1 a M13, hipóteses H1 a H4) ainda não foi aplicada.

## Próximos passos no TCC II

As horas são estimativas do autor, a confirmar com o orientador.

| Passo | Depende de | Esforço estimado |
|---|---|---|
| Configurar contas de Claude, Gemini e Groq e reconferir termos de retenção e treinamento | Chaves e aprovação da empresa | 4 h |
| Criar a conta MySQL somente SELECT na homologação e preencher regras de domínio e esquemas | Equipe de infraestrutura | 4 h |
| Configurar Jira e Confluence na plataforma e rodar o teste-piloto | Passos anteriores | 6 h |
| Aplicar os critérios de seleção com a semente 20261030 e registrar o funil | Acesso ao Jira | 8 h |
| Escrever e conferir as consultas de referência do Conjunto 2 | Um analista para conferir | 16 h |
| Calibrar a rubrica com os quatro analistas (6 tarefas) | Agenda dos analistas | 6 h |
| Avaliação das 30 tarefas e sessões de tempo (60, ou 12 na alternativa prevista) | Agenda dos analistas | 30 h |
| Tratar os dados, aplicar os testes estatísticos e gerar tabelas e gráficos | Coleta concluída | 16 h |
| Reescrever Resultados, Discussão, resumo e Considerações Finais | Dados tratados | 20 h |
| Versão para evento (duas colunas, 6 a 10 páginas) e preparação da defesa | Artigo final | 16 h |
| **Total** | | **126 h** |
