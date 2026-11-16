# Artigo do TCC

| Arquivo | Conteúdo |
|---|---|
| `artigo.md` | Fonte editável do texto (convenções no topo de `gerar_docx.py`) |
| `artigo.docx` | Versão editável, gerada sobre o template institucional |
| `artigo.pdf` | Versão para leitura, convertida pelo LibreOffice |
| `figuras/` | Figuras em SVG (fonte) e PNG; `gerar_figuras.py` recria as três |
| `demonstracao/` | Base sintética, script e resultados da demonstração da Seção 4.3 |
| `evidencias/` | Resumo da suíte de testes executada em 16/11/2026 |
| `PENDENCIAS.md` | O que falta e de quem depende |

## Regerar

```bash
cd tcc/artigo
python figuras/gerar_figuras.py        # opcional; exige Chromium (variável CHROME)
python gerar_docx.py                   # exige python-docx
soffice --headless --convert-to pdf artigo.docx
```

A demonstração exige a plataforma em execução com `ERP_DIALETO=MYSQL` apontando para a base criada por
`demonstracao/base-sintetica.sql`; veja o cabeçalho de `demonstracao/demonstracao.py`.
