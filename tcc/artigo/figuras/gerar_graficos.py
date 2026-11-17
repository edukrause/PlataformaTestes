"""Gera os gráficos de resultados a partir dos dados versionados (sem bibliotecas externas).

- grafico-testes: testes automatizados por componente (evidencias/testes-2026-11-17.json).
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
    suites = {"br.edu.unimater.plataforma."[:0] + s["suite"]: s["tests"] for s in json.load(open(AQUI.parent / "evidencias/testes-2026-11-17.json", encoding="utf-8"))["suites"]}
    grupos = [
        ("Verificador SQL", ["banco.VerificadorSqlTest"]),
        ("Fluxos da API, IA desativada, contexto e migração", ["FluxoApiTest", "IaDesativadaTest", "ValidacaoContextoTest", "MigracaoHistoricoTest"]),
        ("Fluxo completo (geração, apuração, revisão)", ["PlataformaCompletaTest"]),
        ("Normalização de resultados", ["apuracao.NormalizadorResultadosTest"]),
        ("Clientes HTTP (servidor simulado)", ["IntegracoesHttpTest"]),
        ("Leitura em PostgreSQL real", ["banco.PostgresLeituraTest"]),
        ("Motor de consenso", ["apuracao.MotorConsensoTest"]),
        ("Catálogo e amostragem", ["banco.CatalogoServiceTest"]),
    ]
    dados = [(rotulo, sum(suites[s] for s in nomes)) for rotulo, nomes in grupos]
    assert sum(v for _, v in dados) == sum(suites.values()) == 100
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
    c.append(f'<text x="{(x0 + x1) / 2}" y="{base + 54}" text-anchor="middle">Número de testes (total: 100; falhas: 0)</text>')
    salvar("grafico-testes", w, base + 72, "".join(c))


if __name__ == "__main__":
    testes()
