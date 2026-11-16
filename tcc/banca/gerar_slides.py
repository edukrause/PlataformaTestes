# Gera slides.pptx (15 slides, 16:9) para a banca de validação do TCC I.
# Uso: python gerar_slides.py   (exige python-pptx; usa as figuras de ../artigo/figuras)
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

AQUI = Path(__file__).parent
FIG = AQUI.parent / "artigo" / "figuras"
AZUL = RGBColor(0x12, 0x35, 0x5B)
CINZA = RGBColor(0x44, 0x44, 0x44)
DESTAQUE = RGBColor(0xB0, 0x3A, 0x2E)

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
TOTAL = 15


def texto(slide, x, y, w, h, linhas, tamanho=24, cor=CINZA, negrito=False, alinhamento=PP_ALIGN.LEFT, espaco=10):
    caixa = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = caixa.text_frame
    tf.word_wrap = True
    for i, linha in enumerate(linhas if isinstance(linhas, list) else [linhas]):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        r = p.add_run()
        r.text = linha
        r.font.name, r.font.size, r.font.bold = "Arial", Pt(tamanho), negrito
        r.font.color.rgb = cor
        p.alignment = alinhamento
        p.space_after = Pt(espaco)
    return caixa


def novo(titulo, secao=""):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    barra = s.shapes.add_shape(1, 0, 0, prs.slide_width, Inches(0.18))
    barra.fill.solid()
    barra.fill.fore_color.rgb = AZUL
    barra.line.fill.background()
    texto(s, 0.6, 0.4, 12.1, 1.1, titulo, 32, AZUL, True)
    n = len(prs.slides)
    texto(s, 0.6, 6.95, 9, 0.4, secao, 12, CINZA)
    texto(s, 11.2, 6.95, 1.6, 0.4, f"{n} / {TOTAL}", 12, CINZA, alinhamento=PP_ALIGN.RIGHT)
    return s


def topicos(slide, itens, x=0.8, y=1.8, w=11.7, tamanho=26):
    texto(slide, x, y, w, 4.8, ["•  " + i for i in itens], tamanho, espaco=18)


def figura(slide, nome, y=1.6, altura=5.1, x=None):
    img = slide.shapes.add_picture(str(FIG / nome), 0, Inches(y), height=Inches(altura))
    if img.width > Inches(12.3):
        proporcao = Inches(12.3) / img.width
        img.width, img.height = Inches(12.3), int(img.height * proporcao)
    img.left = int((prs.slide_width - img.width) / 2) if x is None else Inches(x)
    return img


def tabela(slide, linhas, larguras, y=1.7, tamanho=16, destaque=None):
    alt = 0.5 * len(linhas)
    t = slide.shapes.add_table(len(linhas), len(linhas[0]), Inches(0.6), Inches(y), Inches(sum(larguras)), Inches(alt)).table
    for j, l in enumerate(larguras):
        t.columns[j].width = Inches(l)
    for i, linha in enumerate(linhas):
        for j, valor in enumerate(linha):
            c = t.cell(i, j)
            c.text = valor
            for p in c.text_frame.paragraphs:
                for r in p.runs:
                    r.font.name, r.font.size = "Arial", Pt(tamanho)
                    r.font.bold = i == 0 or i == destaque
                    r.font.color.rgb = RGBColor(255, 255, 255) if i == 0 else (DESTAQUE if i == destaque else CINZA)
            c.fill.solid()
            c.fill.fore_color.rgb = AZUL if i == 0 else RGBColor(0xF4, 0xF4, 0xF4)


# 1 Título
s = prs.slides.add_slide(prs.slide_layouts[6])
faixa = s.shapes.add_shape(1, 0, 0, prs.slide_width, Inches(0.5))
faixa.fill.solid()
faixa.fill.fore_color.rgb = AZUL
faixa.line.fill.background()
texto(s, 0.9, 1.5, 11.5, 2.6, "Plataforma para geração de cenários de teste em sistemas ERP assistida por modelos de linguagem, "
      "com valores esperados apurados em banco de dados", 34, AZUL, True)
texto(s, 0.9, 4.6, 11.5, 1.6, ["Eduardo Krause", "Orientador: Prof. Me. João Victor Costa Mazzochin",
                               "Análise e Desenvolvimento de Sistemas – UNIMATER · Banca de validação do TCC I · 2026"], 20, espaco=6)

# 2–3 Problema
s = novo("Para testar um relatório, é preciso saber antes o valor que ele deve mostrar", "Problema")
topicos(s, ["Hoje o analista de qualidade apura esse valor à mão, consultando o banco",
            "Exige acesso ao banco e domínio das regras de negócio",
            "Valor esperado errado engana nos dois sentidos: acusa defeito que não existe ou aceita defeito real"])

s = novo("Modelos de linguagem escrevem cenários, mas não conferem o resultado", "Problema")
topicos(s, ["Um cenário Gherkin válido não garante que o resultado esperado esteja certo",
            "As respostas variam entre modelos e entre execuções",
            "Pergunta: como obter o valor esperado a partir dos dados, de forma rastreável, e com que confiança?"])

# 4 Objetivo
s = novo("Objetivo", "Objetivo")
texto(s, 0.8, 1.6, 11.7, 1.6, "Desenvolver uma plataforma que gere cenários de teste a partir do requisito e da documentação "
      "e que apure os valores esperados por consulta ao banco, com decisão por consenso entre modelos.", 24)
figura(s, "figura-contexto.png", y=3.2, altura=3.6)

# 5–6 Trabalhos relacionados e lacuna
s = novo("Trabalhos relacionados: nenhum confere o valor esperado nos dados", "Trabalhos relacionados")
tabela(s, [["Trabalho", "Saída", "Valor apurado em dados", "Vários modelos"],
           ["Karpurapu et al. (2024)", "Cenários Gherkin", "Não", "Compara, sem combinar"],
           ["Fernandes et al. (2025)", "Cenários Gherkin", "Não", "Compara, sem combinar"],
           ["Paduraru et al. (2025)", "Passos vinculados ao código", "Não", "Um modelo"],
           ["Ferreira et al. (2025)", "Gherkin e roteiros Cypress", "Não", "Um modelo"],
           ["Fonseca, Lima e Faria (2025)", "Gherkin e roteiros", "Não", "Um por etapa"],
           ["Garg e Sharma (2023)", "Casos de teste de ERP", "Não", "Um modelo"],
           ["Mendoza et al. (2024)", "Dados sintéticos", "Não", "Compara ferramentas"],
           ["Este trabalho", "Gherkin com valores e consultas", "Sim", "Três famílias, com consenso"]],
       [3.6, 3.8, 2.5, 2.2], destaque=8)

s = novo("A lacuna", "Trabalhos relacionados")
texto(s, 1.2, 2.3, 10.9, 2.6, "Diferentemente dos trabalhos apresentados, este trabalho submete o resultado esperado dos cenários "
      "aos dados armazenados e mede quando o consenso entre modelos engana.", 32, AZUL, True)
texto(s, 1.2, 5.3, 10.9, 1, "Valor apurado (proposto pela plataforma) não é valor validado (conferido pelo analista).", 22)

# 7–9 Arquitetura e metodologia
s = novo("Arquitetura: um único executável, operado na rede interna", "Arquitetura e metodologia")
figura(s, "figura-arquitetura.png")

s = novo("Só há valor proposto quando ao menos dois modelos coincidem", "Arquitetura e metodologia")
figura(s, "figura-fluxo.png", y=1.5, altura=3.5)
tabela(s, [["Unânime", "Maioria", "Divergente", "Falha"],
           ["Os três resultados coincidem", "Dois coincidem", "Nenhum coincide: o analista decide", "Menos de dois resultados válidos"]],
       [3.0, 3.0, 3.1, 3.0], y=5.3, tamanho=15)

s = novo("Método: Design Science Research, com validação em duas frentes", "Arquitetura e metodologia")
topicos(s, ["Técnica (feita): 121 testes automatizados, inclusive em MySQL e PostgreSQL reais, e demonstração em base sintética",
            "Com analistas (planejada): 30 tarefas reais, 4 analistas e 13 métricas fixadas antes da coleta",
            "Leitura do banco somente em modo consulta; dados pessoais não saem para os provedores"], tamanho=24)

# 10 Demonstração
s = novo("Demonstração", "Demonstração")
topicos(s, ["Abrir uma tarefa e ver os cenários em Gherkin",
            "Pedir a apuração: três consultas, três resultados, um desfecho",
            "Conferir o valor e a consulta que o produziu; registrar a decisão",
            "Tentar uma escrita no banco: a plataforma recusa"], tamanho=26)
texto(s, 0.8, 6.2, 11.7, 0.5, "Vídeo gravado como plano B.", 18)

# 11–13 Resultados
s = novo("121 testes automatizados, nenhuma falha", "Resultados")
figura(s, "grafico-testes.png")

s = novo("Demonstração: os quatro desfechos e um falso acordo", "Resultados")
tabela(s, [["Pergunta", "Resultados dos candidatos", "Desfecho", "Apurado", "Referência"],
           ["Q1 – valor vendido no mês", "88,50; 88,50; 94,50", "Maioria", "88,50", "88,50"],
           ["Q2 – pedidos por filial", "Iguais após normalização", "Unânime", "2 e 2", "2 e 2"],
           ["Q3 – quantidade do produto 10", "180; 180; 140", "Maioria", "180", "140"],
           ["Q4 – valor médio por pedido", "12,64; 22,125; 0,36", "Divergente", "—", "22,125"],
           ["Q5 – valor da filial 2", "rejeitado; vazio; 11,00", "Falha", "—", "11,00"]],
       [3.7, 3.4, 1.8, 1.5, 1.7], y=1.8, tamanho=18, destaque=3)
texto(s, 0.6, 5.3, 12.1, 1.2, "Q3: dois candidatos erraram do mesmo jeito e formaram maioria. Consenso indica confiança, não correção.",
      24, DESTAQUE, True)

s = novo("Dez rodadas: mesmos desfechos, cerca de 0,1 s por apuração", "Resultados")
figura(s, "grafico-tempos.png", y=1.5, altura=4.6)
texto(s, 0.8, 6.25, 11.7, 0.5, "50 apurações com desfechos idênticos; média de 106,8 ms (sem o tempo de geração pelos modelos).", 18)

# 14 Próximos passos
s = novo("Limitações e próximos passos (TCC II)", "Próximos passos")
topicos(s, ["Ainda não aplicado com tarefas reais nem com analistas: H1 a H4 seguem abertas",
            "Configurar contas dos três provedores e a conta de consulta da homologação",
            "Selecionar as 36 tarefas, escrever as consultas de referência e rodar o protocolo",
            "Medir o falso acordo, a aceitação e o tempo; fechar Resultados e Discussão"], tamanho=24)

# 15 Encerramento
s = novo("Contribuição", "Encerramento")
texto(s, 1.2, 2.2, 10.9, 2.6, "Uma plataforma que gera cenários de teste e apura o valor esperado nos dados do próprio ERP, "
      "mostrando a consulta que o produziu e sinalizando quando os modelos não concordam.", 30, AZUL, True)
texto(s, 1.2, 5.4, 10.9, 1, ["Obrigado.", "github.com/edukrause/PlataformaTestes"], 22, espaco=6)

assert len(prs.slides) == TOTAL
prs.save(AQUI / "slides.pptx")
print("slides.pptx gerado com", len(prs.slides), "slides")
