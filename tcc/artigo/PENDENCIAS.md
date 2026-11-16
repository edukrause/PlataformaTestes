# Pendências do artigo — 16/11/2026

O artigo em `artigo.docx`/`artigo.pdf` é a **versão preliminar**: relata construção, verificação técnica e
demonstração. Nenhum resultado experimental foi inventado; as métricas M1–M13 não foram coletadas.

## Dependem de acesso ou de pessoas (bloqueiam Resultados e Discussão finais)

1. **Credenciais dos provedores** (Claude, Gemini, Groq): chave, ID do modelo fixado, preços na data e
   modalidade da conta (retenção/treinamento) reconferida. Configurar em `backend/.env` com `PLATAFORMA_IA_MODO=externa`.
2. **Conta MySQL somente SELECT na homologação** (`ERP_DIALETO=MYSQL`). A conta de desenvolvimento com escrita
   é recusada pela plataforma de propósito. Preencher também `DOMINIO_REGRAS` e `ERP_CATALOGO_SCHEMAS`.
3. **Jira e Confluence** configurados no cliente Java (o conector da conversa não serve à aplicação).
4. **Seleção formal**: aplicar I4/I5 e E1–E3 com a semente 20261030 e registrar o funil completo.
   As três tarefas do piloto de 15/11 continuam como piloto intencional, não como amostra.
5. **Consultas de referência** do Conjunto 2, escritas antes das execuções e conferidas por analista.
6. **Quatro analistas** (calibração com Fleiss, avaliação de 30 tarefas, 60 sessões de tempo ou a
   alternativa de 12 tarefas), com termo de consentimento.
7. **Decisão do título** com o orientador: o artigo adota "apurados", como proposto na E3 e escolhido pelo autor.

## Editoriais

- Extensão: corpo com cerca de 6.500 palavras (com tabelas e legendas), dentro de 6.000–8.000. Em Arial 12 e
  espaçamento 1,5, o corpo ocupa 21 páginas e o PDF completo 28 (referências e apêndice). A faixa de 15–20 páginas
  não é compatível com 6.000 palavras nesse formato; fonte e espaçamento não foram reduzidos. Decidir com o orientador.
- O DOCX foi gerado por `gerar_docx.py` sobre o template institucional e o PDF pelo LibreOffice 7+;
  abrir uma vez no Microsoft Word para conferir quebras antes da entrega.
- Quando houver dados: reescrever as Seções 4.4 e 5, o resumo (resultados) e as Considerações Finais, mantendo
  denominadores, cobertura do consenso e abstenções; atualizar o Quadro 6.

## Fora do Git

Dados internos (tarefas, requisitos, resultados do ERP, avaliações identificadas) ficam em pasta privada.
Os arquivos de `demonstracao/` usam só a base sintética e podem ser publicados.
