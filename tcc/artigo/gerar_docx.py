"""Gera artigo.docx a partir de artigo.md, usando o template institucional como base (página, margens e estilos).

Uso: python gerar_docx.py   (executar dentro de tcc/artigo)
Convenções da fonte: TITULO|, AUTOR|nome|instituição|e-mail, RESUMO|, PALAVRAS|, '# ' seção, '## ' subseção,
FIG|arquivo|legenda|fonte, QUADRO|legenda + tabela em pipes + FONTE|texto, REF|referência. *itálico*, **negrito**.
"""
import re
from pathlib import Path
import docx
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

AQUI = Path(__file__).parent
TEMPLATE = AQUI.parent / "continuidade" / "modelos" / "Template Artigo TCC Sistemas de Informação.docx"
FONTE = "Arial"

doc = docx.Document(str(TEMPLATE))
corpo = doc.element.body
for el in list(corpo):
    if el.tag != qn("w:sectPr"):
        corpo.remove(el)

doc.core_properties.title = "Plataforma para geração de cenários de teste em sistemas ERP assistida por modelos de linguagem, com valores esperados apurados em banco de dados"
doc.core_properties.author = "Eduardo Krause"
doc.core_properties.language = "pt-BR"


def estilo_base(nome, tamanho, negrito=False, italico=False):
    st = doc.styles[nome]
    st.font.name = FONTE
    st.font.size = Pt(tamanho)
    st.font.bold = negrito
    st.font.italic = italico
    st.font.color.rgb = RGBColor(0, 0, 0)
    rpr = st.element.get_or_add_rPr()
    fontes = rpr.find(qn("w:rFonts"))
    if fontes is None:
        fontes = OxmlElement("w:rFonts")
        rpr.append(fontes)
    for atributo in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fontes.set(qn(atributo), FONTE)
    for atributo in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
        if fontes.get(qn(atributo)) is not None:
            del fontes.attrib[qn(atributo)]
    return st


normal = estilo_base("Normal", 12)
normal.paragraph_format.space_after = Pt(0)
normal.paragraph_format.space_before = Pt(0)
for nome, negrito in (("Heading 1", True), ("Heading 2", False)):
    st = estilo_base(nome, 12, negrito)
    pf = st.paragraph_format
    pf.space_before = Pt(18 if nome == "Heading 1" else 12)
    pf.space_after = Pt(6)
    pf.line_spacing = 1.5
    pf.keep_with_next = True
    pf.alignment = WD_ALIGN_PARAGRAPH.LEFT
legenda = estilo_base("Caption", 10)
legenda.paragraph_format.space_before = Pt(12)
legenda.paragraph_format.space_after = Pt(4)
legenda.paragraph_format.keep_with_next = True
legenda.paragraph_format.line_spacing = 1.0


def runs(paragrafo, texto, tamanho=None, negrito=False):
    """Converte **negrito** e *itálico* em runs."""
    for parte in re.split(r"(\*\*[^*]+\*\*|\*[^*]+\*)", texto):
        if not parte:
            continue
        if parte.startswith("**"):
            r = paragrafo.add_run(parte[2:-2]); r.bold = True
        elif parte.startswith("*"):
            r = paragrafo.add_run(parte[1:-1]); r.italic = True
            r.bold = negrito or None
        else:
            r = paragrafo.add_run(parte)
            if negrito:
                r.bold = True
        r.font.name = FONTE
        if tamanho:
            r.font.size = Pt(tamanho)
    return paragrafo


def paragrafo(texto, recuo=True):
    p = doc.add_paragraph(style="Normal")
    pf = p.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.line_spacing = 1.5
    pf.first_line_indent = Cm(1.25) if recuo else None
    pf.widow_control = True
    return runs(p, texto)


def simples(texto, tamanho=10, alinhamento=WD_ALIGN_PARAGRAPH.LEFT, antes=0, depois=0, negrito=False, estilo="Normal"):
    p = doc.add_paragraph(style=estilo)
    pf = p.paragraph_format
    pf.alignment = alinhamento
    pf.line_spacing = 1.0
    pf.space_before = Pt(antes)
    pf.space_after = Pt(depois)
    return runs(p, texto, tamanho, negrito)


def bordas_tabela(tabela):
    tbl_pr = tabela._tbl.tblPr
    bordas = OxmlElement("w:tblBorders")
    for lado in ("top", "left", "bottom", "right", "insideH", "insideV"):
        b = OxmlElement(f"w:{lado}")
        b.set(qn("w:val"), "single"); b.set(qn("w:sz"), "4"); b.set(qn("w:space"), "0"); b.set(qn("w:color"), "000000")
        bordas.append(b)
    tbl_pr.append(bordas)


def repetir_cabecalho(linha):
    tr_pr = linha._tr.get_or_add_trPr()
    el = OxmlElement("w:tblHeader"); el.set(qn("w:val"), "true"); tr_pr.append(el)


def nao_quebrar(linha):
    tr_pr = linha._tr.get_or_add_trPr()
    el = OxmlElement("w:cantSplit"); el.set(qn("w:val"), "true"); tr_pr.append(el)


def sombrear(celula, cor="E7E6E6"):
    tc_pr = celula._tc.get_or_add_tcPr()
    sh = OxmlElement("w:shd"); sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), cor)
    tc_pr.append(sh)


def tabela(linhas):
    celulas = [[c.strip() for c in l.strip().strip("|").split("|")] for l in linhas if not re.match(r"^\|\s*-", l)]
    n = len(celulas[0])
    t = doc.add_table(rows=len(celulas), cols=n)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    bordas_tabela(t)
    # Larguras proporcionais ao conteúdo, somando a largura útil da página (16 cm).
    # Mínimo: a maior palavra da coluna cabe inteira (Arial 10 ≈ 0,2 cm por caractere, negrito no cabeçalho).
    # O restante dos 16 cm é distribuído na proporção do volume médio de texto de cada coluna.
    limpar = lambda x: re.sub(r"[*]", "", x)
    minimos, pesos = [], []
    for j in range(n):
        textos = [limpar(linha[j]) for linha in celulas]
        maior = max((len(w) for x in textos for w in x.split()), default=1)
        minimos.append(maior * 0.21 + 0.45)
        pesos.append(sum(len(x) for x in textos) / len(textos))
    sobra = max(0.0, 16 - sum(minimos))
    larguras = [m + sobra * w / sum(pesos) for m, w in zip(minimos, pesos)]
    fator = 16 / sum(larguras)
    larguras = [Cm(x * fator) for x in larguras]
    for row in t.rows:
        for j, cel in enumerate(row.cells):
            cel.width = larguras[j]
    for j, col in enumerate(t._tbl.tblGrid.findall(qn("w:gridCol"))):
        col.set(qn("w:w"), str(int(larguras[j].twips)))
    layout = OxmlElement("w:tblLayout"); layout.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(layout)
    ultima_total = celulas[-1][0].lower() == "total"
    for i, linha in enumerate(celulas):
        row = t.rows[i]
        nao_quebrar(row)
        if i == 0:
            repetir_cabecalho(row)
        for j, texto in enumerate(linha):
            cel = row.cells[j]
            cel.paragraphs[0].text = ""
            p = cel.paragraphs[0]
            p.paragraph_format.line_spacing = 1.0
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            numerica = re.fullmatch(r"[\d.,]+", texto) is not None
            p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER if (i == 0 or numerica) else WD_ALIGN_PARAGRAPH.LEFT
            runs(p, texto, 10, negrito=(i == 0 or (ultima_total and i == len(celulas) - 1)))
            # Tabelas curtas ficam inteiras; nas longas, só o cabeçalho e a última linha (junto da fonte) se prendem.
            p.paragraph_format.keep_with_next = len(celulas) <= 6 or i == 0 or i == len(celulas) - 1
            if i == 0:
                sombrear(cel)
    return t


def figura(arquivo, titulo, fonte):
    simples(titulo, 10, WD_ALIGN_PARAGRAPH.CENTER, antes=12, depois=4, estilo="Caption")
    p = doc.add_paragraph(style="Normal")
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(AQUI / arquivo), width=Cm(16))
    simples(fonte, 10, WD_ALIGN_PARAGRAPH.CENTER, antes=4, depois=12)


def numero_pagina():
    rodape = doc.sections[0].footer
    p = rodape.paragraphs[0] if rodape.paragraphs else rodape.add_paragraph()
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run()
    for tipo, texto in (("begin", None), (None, "PAGE"), ("end", None)):
        if tipo:
            el = OxmlElement("w:fldChar"); el.set(qn("w:fldCharType"), tipo)
        else:
            el = OxmlElement("w:instrText"); el.set(qn("xml:space"), "preserve"); el.text = texto
        r._r.append(el)
    r.font.name = FONTE; r.font.size = Pt(10)


linhas = (AQUI / "artigo.md").read_text(encoding="utf-8").splitlines()
i = 0
buffer_tabela, legenda_pendente = [], None
while i < len(linhas):
    linha = linhas[i].rstrip()
    if linha.startswith("TITULO|"):
        simples(linha.split("|", 1)[1], 14, WD_ALIGN_PARAGRAPH.CENTER, depois=18, negrito=True)
    elif linha.startswith("AUTOR|"):
        _, nome, inst, email = linha.split("|")
        simples(nome, 10.5, WD_ALIGN_PARAGRAPH.CENTER, negrito=True)
        simples(inst, 10.5, WD_ALIGN_PARAGRAPH.CENTER)
        simples(email, 10.5, WD_ALIGN_PARAGRAPH.CENTER, depois=12)
    elif linha.startswith("RESUMO|"):
        simples("Resumo", 12, WD_ALIGN_PARAGRAPH.LEFT, antes=12, depois=6, negrito=True)
        simples(linha.split("|", 1)[1], 10, WD_ALIGN_PARAGRAPH.JUSTIFY, depois=6)
    elif linha.startswith("PALAVRAS|"):
        p = simples("", 10, WD_ALIGN_PARAGRAPH.JUSTIFY, depois=12)
        r = p.add_run("Palavras-chave: "); r.bold = True; r.font.size = Pt(10); r.font.name = FONTE
        r = p.add_run(linha.split("|", 1)[1]); r.font.size = Pt(10); r.font.name = FONTE
    elif linha.startswith("## "):
        doc.add_paragraph(linha[3:], style="Heading 2")
    elif linha.startswith("# "):
        titulo = linha[2:]
        if titulo.startswith("Apêndice"):
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        doc.add_paragraph(titulo, style="Heading 1")
        if titulo == "Referências":
            pass
    elif linha.startswith("FIG|"):
        _, arquivo, titulo, fonte = linha.split("|")
        figura(arquivo, titulo, fonte)
    elif linha.startswith("QUADRO|"):
        simples(linha.split("|", 1)[1], 10, WD_ALIGN_PARAGRAPH.CENTER, antes=12, depois=4, estilo="Caption")
        j = i + 1
        while j < len(linhas) and linhas[j].startswith("|"):
            buffer_tabela.append(linhas[j]); j += 1
        tabela(buffer_tabela); buffer_tabela = []
        i = j - 1
    elif linha.startswith("FONTE|"):
        simples(linha.split("|", 1)[1], 10, WD_ALIGN_PARAGRAPH.CENTER, antes=4, depois=12)
    elif linha.startswith("REF|"):
        simples(linha.split("|", 1)[1], 12, WD_ALIGN_PARAGRAPH.LEFT, depois=12)
    elif linha.strip():
        paragrafo(linha)
    i += 1

numero_pagina()
doc.save(str(AQUI / "artigo.docx"))
print("artigo.docx gerado")
