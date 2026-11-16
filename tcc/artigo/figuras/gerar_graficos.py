"""Gera os gráficos de resultados a partir dos dados versionados (sem bibliotecas externas).

- grafico-testes: testes automatizados por componente (evidencias/testes-2026-11-16.json).
- grafico-tempos: tempo por apuração na demonstração sintética, média e desvio padrão de dez rodadas
  (demonstracao/medicoes.csv, rodada de aquecimento excluída).
Uso: python gerar_graficos.py  (PNG exige o Chromium indicado em CHROME). Legíveis em preto e branco.
"""
import csv
import json
import os
import statistics
import subprocess
from pathlib import Path

AQUI = Path(__file__).parent
CHROME = os.environ.get("CHROME", str(Path.home() / "AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"))
FS = 17


def salvar(nome, w, h, corpo):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
           f'font-family="Arial" font-size="{FS}" fill="#111"><rect width="{w}" height="{h}" fill="#fff"/>{corpo}</svg>')
    (AQUI / (nome + ".svg")).write_text(svg, encoding="utf-8")
    if Path(CHROME).exists():
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=3",
                        f"--window-size={w},{h}", f"--screenshot={AQUI / (nome + '.png')}",
                        (AQUI / (nome + ".svg")).as_uri()], check=True, capture_output=True)


def br(x, casas=1):
    return f"{x:.{casas}f}".replace(".", ",")


def testes():
    suites = {s["suite"]: s["tests"] for s in json.load(open(AQUI.parent / "evidencias/testes-2026-11-16.json", encoding="utf-8"))["suites"]}
    grupos = [
        ("Verificador SQL", ["banco.VerificadorSqlTest"]),
        ("Fluxos da API, IA desativada, contexto e migração", ["FluxoApiTest", "IaDesativadaTest", "ValidacaoContextoTest", "MigracaoHistoricoTest"]),
        ("Fluxo completo (geração, apuração, revisão)", ["PlataformaCompletaTest"]),
        ("Normalização de resultados", ["apuracao.NormalizadorResultadosTest"]),
        ("Clientes HTTP (servidor simulado)", ["IntegracoesHttpTest"]),
        ("Leitura em PostgreSQL real", ["banco.PostgresLeituraTest"]),
        ("Leitura em MySQL real", ["banco.MysqlLeituraTest"]),
        ("Motor de consenso", ["apuracao.MotorConsensoTest"]),
        ("Catálogo e amostragem", ["banco.CatalogoServiceTest"]),
    ]
    dados = [(rotulo, sum(suites[s] for s in nomes)) for rotulo, nomes in grupos]
    assert sum(v for _, v in dados) == sum(suites.values()) == 121
    w, x0, x1, alt, y0 = 1000, 470, 930, 34, 30
    maximo = 50
    c = []
    for t in range(0, maximo + 1, 10):
        x = x0 + (x1 - x0) * t / maximo
        c.append(f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{y0 + len(dados) * (alt + 12)}" stroke="#bbb" stroke-width="1"/>')
        c.append(f'<text x="{x}" y="{y0 + len(dados) * (alt + 12) + 24}" text-anchor="middle">{t}</text>')
    for i, (rotulo, v) in enumerate(dados):
        y = y0 + i * (alt + 12) + 6
        larg = (x1 - x0) * v / maximo
        c.append(f'<text x="{x0 - 12}" y="{y + alt / 2 + 6}" text-anchor="end">{rotulo}</text>')
        c.append(f'<rect x="{x0}" y="{y}" width="{larg}" height="{alt}" fill="#555" stroke="#111"/>')
        c.append(f'<text x="{x0 + larg + 8}" y="{y + alt / 2 + 6}">{v}</text>')
    base = y0 + len(dados) * (alt + 12)
    c.append(f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{base}" stroke="#111" stroke-width="2"/>')
    c.append(f'<text x="{(x0 + x1) / 2}" y="{base + 54}" text-anchor="middle">Número de testes (total: 121; falhas: 0)</text>')
    salvar("grafico-testes", w, base + 72, "".join(c))


def tempos():
    linhas = [l for l in csv.DictReader(open(AQUI.parent / "demonstracao/medicoes.csv", encoding="utf-8")) if l["aquecimento"] == "0"]
    perguntas = ["Q1", "Q2", "Q3", "Q4", "Q5"]
    est = {}
    for q in perguntas:
        t = [float(l["tempo_ms"]) for l in linhas if l["pergunta"] == q]
        desfechos = {l["desfecho"] for l in linhas if l["pergunta"] == q}
        assert len(desfechos) == 1
        est[q] = (statistics.mean(t), statistics.stdev(t), len(t), {"UNANIME": "Unânime", "MAIORIA": "Maioria", "DIVERGENTE": "Divergente", "FALHA": "Falha"}[desfechos.pop()])
    w, h, x0, x1, y0, y1 = 1000, 470, 110, 960, 30, 360
    maximo = 200
    c = []
    for t in range(0, maximo + 1, 50):
        y = y1 - (y1 - y0) * t / maximo
        c.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="#bbb" stroke-width="1"/>')
        c.append(f'<text x="{x0 - 10}" y="{y + 6}" text-anchor="end">{t}</text>')
    passo = (x1 - x0) / len(perguntas)
    for i, q in enumerate(perguntas):
        m, dp, n, desfecho = est[q]
        cx = x0 + passo * (i + 0.5)
        topo = y1 - (y1 - y0) * m / maximo
        c.append(f'<rect x="{cx - 50}" y="{topo}" width="100" height="{y1 - topo}" fill="#888" stroke="#111"/>')
        a, b = y1 - (y1 - y0) * (m + dp) / maximo, y1 - (y1 - y0) * (m - dp) / maximo
        c.append(f'<line x1="{cx}" y1="{a}" x2="{cx}" y2="{b}" stroke="#111" stroke-width="2"/>')
        for yy in (a, b):
            c.append(f'<line x1="{cx - 12}" y1="{yy}" x2="{cx + 12}" y2="{yy}" stroke="#111" stroke-width="2"/>')
        c.append(f'<text x="{cx}" y="{a - 10}" text-anchor="middle">{br(m)} ± {br(dp)}</text>')
        c.append(f'<text x="{cx}" y="{y1 + 26}" text-anchor="middle">{q}</text>')
        c.append(f'<text x="{cx}" y="{y1 + 50}" text-anchor="middle">{desfecho}</text>')
    c.append(f'<line x1="{x0}" y1="{y1}" x2="{x1}" y2="{y1}" stroke="#111" stroke-width="2"/>')
    c.append(f'<line x1="{x0}" y1="{y0}" x2="{x0}" y2="{y1}" stroke="#111" stroke-width="2"/>')
    c.append(f'<text transform="translate(34,{(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">Tempo por apuração (ms)</text>')
    c.append(f'<text x="{(x0 + x1) / 2}" y="{h - 22}" text-anchor="middle">Pergunta e desfecho (média ± desvio padrão, n = 10 rodadas)</text>')
    salvar("grafico-tempos", w, h, "".join(c))
    for q in perguntas:
        print(q, br(est[q][0]), br(est[q][1]), est[q][2], est[q][3])
    todos = [float(l["tempo_ms"]) for l in linhas]
    print("geral", len(todos), br(statistics.mean(todos)), br(statistics.stdev(todos)), br(min(todos)), br(max(todos)))


if __name__ == "__main__":
    testes()
    tempos()
