"""Gera as figuras do artigo em SVG (fonte editável) e PNG.

As telas têm cerca de 1000 px de largura e texto de 17 px, o que dá cerca de 8 pt quando a figura
ocupa 16 cm na página. Uso: python gerar_figuras.py  (PNG exige o Chromium indicado em CHROME).
"""
import os
import subprocess
from pathlib import Path

AQUI = Path(__file__).parent
CHROME = os.environ.get("CHROME", str(Path.home() / "AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"))
FS = 17


class Figura:
    def __init__(self, w, h):
        self.w, self.h, self.o = w, h, []

    def grupo(self, x1, y1, x2, y2, titulo, fill="#fafafa", centro=False):
        self.o.append(f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" rx="8" fill="{fill}" stroke="#888" stroke-dasharray="7,5"/>')
        if centro:
            self.o.append(f'<text x="{(x1+x2)/2}" y="{y1+26}" text-anchor="middle" font-weight="bold" fill="#333">{titulo}</text>')
        else:
            self.o.append(f'<text x="{x1+12}" y="{y1+24}" fill="#444" font-size="{FS-1}">{titulo}</text>')

    def _texto(self, cx, cy, linhas, titulo=None):
        todas = ([titulo] if titulo else []) + linhas
        y0 = cy - (len(todas) - 1) * (FS + 3) / 2 + FS * 0.35
        for i, l in enumerate(todas):
            peso = ' font-weight="bold"' if titulo and i == 0 else ""
            self.o.append(f'<text x="{cx}" y="{y0 + i*(FS+3)}" text-anchor="middle"{peso}>{l}</text>')

    def caixa(self, x1, y1, x2, y2, linhas, titulo=None, fill="#f2f2f2", rx=4):
        self.o.append(f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" rx="{rx}" fill="{fill}" stroke="#555" stroke-width="1.5"/>')
        self._texto((x1 + x2) / 2, (y1 + y2) / 2, linhas, titulo)

    def cilindro(self, x1, y1, x2, y2, linhas, titulo=None):
        rx, ry = (x2 - x1) / 2, 10
        self.o.append(f'<path d="M{x1},{y1+ry} A{rx},{ry} 0 0,1 {x2},{y1+ry} L{x2},{y2-ry} A{rx},{ry} 0 0,1 {x1},{y2-ry} Z" fill="#f2f2f2" stroke="#555" stroke-width="1.5"/>')
        self.o.append(f'<path d="M{x1},{y1+ry} A{rx},{ry} 0 0,0 {x2},{y1+ry}" fill="none" stroke="#555" stroke-width="1.5"/>')
        self._texto((x1 + x2) / 2, (y1 + y2) / 2 + 6, linhas, titulo)

    def decisao(self, cx, cy, w, h, linhas):
        p = f"{cx-w/2},{cy} {cx-w/2+18},{cy-h/2} {cx+w/2-18},{cy-h/2} {cx+w/2},{cy} {cx+w/2-18},{cy+h/2} {cx-w/2+18},{cy+h/2}"
        self.o.append(f'<polygon points="{p}" fill="#fff" stroke="#555" stroke-width="1.5"/>')
        self._texto(cx, cy, linhas[1:], linhas[0])

    def seta(self, pts, rot=None, rx=0, ry=0, a="middle", tracejada=False, dupla=False, ponta=True):
        d = "M" + " L".join(f"{x},{y}" for x, y in pts)
        extra = ' stroke-dasharray="6,4"' if tracejada else ""
        extra += ' marker-end="url(#m)"' if ponta else ""
        extra += ' marker-start="url(#m)"' if dupla else ""
        self.o.append(f'<path d="{d}" fill="none" stroke="#333" stroke-width="1.6"{extra}/>')
        if rot:
            for k, parte in enumerate(rot.split("\n")):
                self.o.append(f'<text x="{rx}" y="{ry + k*(FS+2)}" text-anchor="{a}" font-size="{FS-1}" paint-order="stroke" stroke="#fff" stroke-width="5">{parte}</text>')

    def salvar(self, nome):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}" '
               f'font-family="Arial" font-size="{FS}" fill="#111"><defs><marker id="m" viewBox="0 0 10 10" refX="9" refY="5" '
               'markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#333"/></marker></defs>'
               '<rect width="100%" height="100%" fill="#fff"/>' + "".join(self.o) + "</svg>")
        svg_path = AQUI / f"{nome}.svg"
        svg_path.write_text(svg, encoding="utf-8")
        if Path(CHROME).exists():
            subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=3",
                            f"--window-size={self.w},{self.h}", f"--screenshot={AQUI / (nome + '.png')}",
                            svg_path.resolve().as_uri()], check=True, capture_output=True)


def contexto():
    f = Figura(1000, 600)
    f.caixa(345, 10, 575, 54, ["Analista de qualidade"], fill="#fff", rx=22)
    f.grupo(10, 90, 615, 590, "Rede interna da empresa")
    f.grupo(645, 90, 990, 590, "Serviços acessados por API (HTTPS)", fill="#fff")
    f.caixa(30, 135, 265, 220, ["homologação"], titulo="ERP web")
    f.caixa(315, 135, 550, 220, ["executável local"], titulo="PlataformaTestes")
    f.cilindro(150, 420, 390, 535, ["(homologação)", "MySQL"], titulo="Banco do ERP")
    f.caixa(670, 125, 975, 205, ["tarefas e requisitos"], titulo="Jira", fill="#fff")
    f.caixa(670, 290, 975, 360, ["documentação funcional"], titulo="Confluence", fill="#fff")
    f.caixa(670, 450, 975, 520, ["Claude · Gemini · Llama"], titulo="Provedores de modelos", fill="#fff")
    f.seta([(400, 54), (150, 135)], "executa o teste", 250, 82, "end")
    f.seta([(520, 54), (432, 135)], "informa a tarefa e confere", 490, 82, "start")
    f.seta([(150, 220), (230, 420)], "leitura e escrita", 175, 330, "end", dupla=True)
    f.seta([(400, 220), (330, 420)], "somente leitura", 352, 322, "end")
    f.seta([(550, 150), (670, 150)], "lê o requisito", 610, 141)
    f.seta([(550, 190), (670, 190)], "publica", 610, 211, tracejada=True)
    f.seta([(530, 220), (530, 255), (640, 255), (640, 325), (670, 325)], "lê a" + chr(10) + "documentação", 632, 292, "end")
    f.seta([(480, 220), (480, 485), (670, 485)], "conteúdo filtrado;" + chr(10) + "resultados não saem", 575, 455)
    f.salvar("figura-contexto")


def arquitetura():
    f = Figura(1000, 960)
    f.caixa(250, 10, 460, 54, ["Analista de qualidade"], fill="#fff", rx=22)
    f.grupo(10, 80, 700, 830, "Executável único (JAR) · rede interna")
    f.grupo(720, 190, 990, 610, "Sistemas externos", fill="#fff")
    f.caixa(170, 120, 540, 185, ["tarefa, revisão e decisão"], titulo="Interface web (React)")
    f.caixa(170, 240, 540, 305, ["requisito + documentação (hash)"], titulo="Coletor de contexto")
    f.caixa(25, 365, 330, 470, ["contrato JSON e Gherkin", "uma regeneração"], titulo="Módulo 1 · Cenários")
    f.caixa(380, 365, 685, 490, ["subesquema · SQL por família", "verificação · normalização", "consenso"], titulo="Módulo 2 · Apuração")
    f.caixa(25, 575, 330, 680, ["Claude · Gemini · Llama/Groq", "filtro de saída e auditoria"], titulo="Gateway de modelos")
    f.caixa(380, 575, 685, 655, ["cenário + valor + consulta"], titulo="Compositor e registro")
    f.cilindro(420, 715, 645, 810, ["auditoria e métricas"], titulo="Base local (H2)")
    f.caixa(25, 880, 330, 950, ["Anthropic · Google · Groq"], titulo="Provedores de modelos", fill="#fff")
    f.caixa(735, 230, 975, 290, ["requisito"], titulo="Jira", fill="#fff")
    f.caixa(735, 315, 975, 375, ["documentação"], titulo="Confluence", fill="#fff")
    f.cilindro(735, 410, 975, 530, ["MySQL ou PostgreSQL", "conta só com SELECT"], titulo="Banco do ERP")
    f.seta([(355, 54), (355, 120)], dupla=True)
    f.seta([(355, 185), (355, 240)], "REST / JSON", 365, 218, "start", dupla=True)
    f.seta([(260, 305), (178, 365)])
    f.seta([(450, 305), (532, 365)])
    f.seta([(540, 255), (735, 255)], "REST", 640, 246)
    f.seta([(540, 290), (735, 345)], "REST", 600, 290)
    f.seta([(685, 440), (735, 455)])
    f.o.append(f'<text x="855" y="560" text-anchor="middle" font-size="{FS-1}">SELECT em transação</text>')
    f.o.append(f'<text x="855" y="580" text-anchor="middle" font-size="{FS-1}">somente leitura</text>')
    f.seta([(178, 470), (178, 575)], "chamadas", 188, 528, "start", tracejada=True)
    f.seta([(470, 490), (330, 615)], tracejada=True)
    f.seta([(305, 470), (420, 575)])
    f.seta([(532, 490), (532, 575)])
    f.seta([(532, 655), (532, 715)])
    f.seta([(178, 680), (178, 880)], "conteúdo filtrado;\nresultados não saem", 190, 770, "start")
    f.salvar("figura-arquitetura")


def fluxo():
    f = Figura(1000, 760)
    f.grupo(10, 10, 320, 750, "1 · Contexto e cenários", centro=True)
    f.grupo(345, 10, 655, 750, "2 · Apuração do valor", centro=True)
    f.grupo(680, 10, 990, 750, "3 · Saída e conferência", centro=True)
    f.caixa(30, 60, 300, 110, ["Analista informa a tarefa"], fill="#fff", rx=24)
    f.caixa(30, 150, 300, 230, ["Coleta o requisito (Jira)", "e a documentação", "(Confluence)"])
    f.caixa(30, 270, 300, 340, ["Gera cenários Gherkin;", "valida contrato e sintaxe"])
    f.decisao(165, 420, 270, 80, ["Algum cenário pede", "valor apurado?"])
    for a, b in ((110, 150), (230, 270), (340, 380)):
        f.seta([(165, a), (165, b)])
    f.caixa(365, 60, 635, 120, ["Seleciona o subesquema", "e as amostras permitidas"])
    f.caixa(365, 150, 635, 210, ["Cada família habilitada", "gera um SELECT"])
    f.caixa(365, 240, 635, 325, ["Verifica: AST, EXPLAIN e", "execução só leitura; nova", "tentativa se inválido ou vazio"])
    f.caixa(365, 355, 635, 400, ["Normaliza os resultados"])
    f.decisao(500, 470, 270, 80, ["Dois ou mais", "coincidem?"])
    f.caixa(360, 560, 495, 655, ["Unânime ou", "maioria:", "referência"])
    f.caixa(505, 560, 640, 655, ["Divergente", "ou falha: sem", "referência"])
    for a, b in ((120, 150), (210, 240), (325, 355), (400, 430)):
        f.seta([(500, a), (500, b)])
    f.seta([(445, 510), (427, 560)], "sim", 425, 540, "end")
    f.seta([(555, 510), (573, 560)], "não", 575, 540, "start")
    f.caixa(700, 60, 970, 145, ["Compõe a saída:", "cenários, valores", "e consultas anexadas"])
    f.caixa(700, 300, 970, 390, ["Analista aceita, ajusta", "ou rejeita; corrige", "valores, se preciso"])
    f.caixa(700, 450, 970, 520, ["Decisão, tempos e", "custos registrados"], fill="#fff", rx=24)
    f.seta([(835, 145), (835, 300)])
    f.seta([(835, 390), (835, 450)])
    f.seta([(300, 420), (332, 420), (332, 90), (365, 90)], "sim", 326, 260, "end")
    f.seta([(165, 460), (165, 715), (662, 715), (662, 95), (700, 95)], "não", 175, 590, "start")
    f.seta([(427, 655), (427, 690), (670, 690), (670, 125), (700, 125)])
    f.seta([(573, 655), (573, 690)], ponta=False)
    f.salvar("figura-fluxo")


if __name__ == "__main__":
    contexto()
    arquitetura()
    fluxo()
    print("figuras geradas")
