# Artigo do TCC

| Arquivo | Conteúdo |
|---|---|
| `artigo.md` | Fonte editável do texto (convenções no topo de `gerar_docx.py`) |
| `artigo.docx` | Versão editável, gerada sobre o template institucional |
| `artigo.pdf` | Versão para leitura, convertida pelo LibreOffice |
| `figuras/` | Figuras em SVG (fonte) e PNG; `gerar_figuras.py` recria os três diagramas e `gerar_graficos.py` o gráfico de testes |
| `evidencias/` | Resumo da suíte de testes executada em 17/11/2026 |
| `PENDENCIAS.md` | O que falta e de quem depende |

## Regerar

```bash
cd tcc/artigo
python figuras/gerar_figuras.py        # opcional; exige Chromium (variável CHROME)
python gerar_docx.py                   # exige python-docx
soffice --headless --convert-to pdf artigo.docx
```

