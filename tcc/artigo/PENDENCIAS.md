# Pendências do artigo — 17/11/2026

O artigo em `artigo.docx`/`artigo.pdf` é a **versão preliminar**: relata construção e verificação técnica
(suíte de 96 testes da plataforma original). Nenhum resultado experimental foi inventado; as métricas M1–M13 não foram coletadas.

## Dependem de acesso ou de pessoas (bloqueiam Resultados e Discussão finais)

1. **Credenciais dos provedores** (Claude, Gemini e Groq): chave, ID do modelo fixado, preços na data e
   modalidade da conta (retenção/treinamento) reconferida. Configurar em `backend/.env` com `PLATAFORMA_IA_MODO=externa`.
2. **Banco**: a plataforma lê só PostgreSQL; o ERP usa MySQL, então o adaptador MySQL é passo do TCC II, com conta
   somente SELECT na homologação.
3. **Jira e Confluence** configurados no cliente Java (o conector da conversa não serve à aplicação).
4. **Seleção formal**: aplicar I4/I5 e E1–E3 com a semente 20261030 e registrar o funil completo.
   As três tarefas do piloto de 15/11 continuam como piloto intencional, não como amostra.
5. **Consultas de referência** do Conjunto 2, escritas antes das execuções e conferidas por analista.
6. **Quatro analistas** (calibração com Fleiss, avaliação de 30 tarefas, 60 sessões de tempo ou a
   alternativa de 12 tarefas), com termo de consentimento.
7. **Decisão do título** com o orientador: o artigo adota "apurados", como proposto na E3 e escolhido pelo autor.

## Editoriais

- Extensão: corpo com cerca de 6.000 palavras; PDF com 25 páginas (com referências e apêndice). Decidir com o orientador se as 15–20 páginas incluem referências.
- O DOCX foi gerado por `gerar_docx.py` sobre o template institucional e o PDF pelo LibreOffice 7+;
  abrir uma vez no Microsoft Word para conferir quebras antes da entrega.
- Quando houver dados: reescrever as Seções 4.3 e 5, o resumo (resultados) e as Considerações Finais, mantendo
  denominadores, cobertura do consenso e abstenções; atualizar o Quadro 6.

## Escopo do orientador (github.com/JoviMazzochin/orientacao-tccs)

Conferido em 16/11/2026. Os templates são os mesmos de `tcc/continuidade/modelos`; a estrutura do artigo
(resumo, Seções 1 a 6, quadro comparativo com "Este trabalho", enfoque, etapas, validação) atende ao escopo.
Ficam em aberto, fora do texto do artigo:

- **E8**: resultados = o sistema funcionando: suíte de 100 testes, sem falhas (Figura 4), em `evidencias/testes-2026-11-17.json`.
- **E9**: falta o vídeo da demonstração e o ensaio, que são do autor.
- Referências: 25, todas citadas.

## Fora do Git

Dados internos (tarefas, requisitos, resultados do ERP, avaliações identificadas) ficam em pasta privada.
