"""Medição repetida da demonstração sintética (MySQL).

Reenvia as cinco perguntas de resultados-demonstracao.json REPETICOES vezes (padrão 10), cada rodada em uma
execução nova, e grava em medicoes.csv o desfecho, a coincidência com a referência e o tempo de cada apuração
(da requisição à resposta da API, incluindo verificação, EXPLAIN, execução dos três candidatos, normalização,
consenso e gravação). Requer a plataforma como descrito em demonstracao.py. Nenhuma chamada a modelos.
A primeira rodada (aquecimento da JVM e das conexões) é gravada com aquecimento=1 e fica fora das estatísticas.
"""
import csv, json, os, time, urllib.request, urllib.error
from decimal import Decimal

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:18084")
REPETICOES = int(os.environ.get("REPETICOES", "10"))
AQUI = os.path.dirname(os.path.abspath(__file__))
PERGUNTAS = json.load(open(os.path.join(AQUI, "resultados-demonstracao.json"), encoding="utf-8"))["perguntas"]


def chamar(metodo, caminho, corpo=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(BASE + caminho, data=dados, method=metodo, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def canon(linhas):
    def v(x):
        try:
            return str(Decimal(str(x)).quantize(Decimal("0.0001")))
        except Exception:
            return str(x)
    return sorted(sorted(v(c) for c in linha) for linha in linhas)


linhas_csv = []
for rodada in range(0, REPETICOES + 1):
    geracao = {"area": "VENDAS", "exigeApuracao": True, "pontosAtencao": [], "cenarios": [
        {"tipo": "ALTERACAO", "titulo": p["id"] + " - " + p["pergunta"],
         "gherkin": "Dado que existem pedidos de outubro de 2026\nQuando consulto o relatório de vendas\nEntão vejo o valor apurado",
         "resultadoEsperado": "Valor conforme a referência apurada"} for p in PERGUNTAS]}
    st, ex = chamar("POST", "/api/execucoes/manuais", {"chaveJira": f"DEMO-{100 + rodada}", "titulo": "Medição sintética",
                    "requisito": "Relatório de vendas por período, sem pedidos cancelados nem excluídos.", "geracao": geracao})
    assert st == 201, (st, ex)
    eid = ex["id"]
    _, det = chamar("GET", f"/api/execucoes/{eid}")
    cenario = {c["titulo"][:2]: c["id"] for c in det["cenarios"]}
    tempos = {}
    for p in PERGUNTAS:
        t0 = time.perf_counter()
        st, ap = chamar("POST", f"/api/execucoes/{eid}/apuracoes", {
            "cenarioId": cenario[p["id"]], "pergunta": p["pergunta"], "preservarOrdem": False,
            "candidatos": [{"provedor": k, "consulta": v} for k, v in p["candidatos_enviados"].items()]})
        tempos[p["id"]] = (round((time.perf_counter() - t0) * 1000, 1), st, ap.get("id") if st == 201 else None)
    _, det = chamar("GET", f"/api/execucoes/{eid}")
    for p in PERGUNTAS:
        ms, st, aid = tempos[p["id"]]
        a = next((x for x in det["apuracoes"] if x["id"] == aid), None)
        ref = (a or {}).get("resultadoReferencia") or {}
        coincide = "" if not ref.get("linhas") else int(canon(ref["linhas"]) == canon(p["referencia"]["linhas"]))
        linhas_csv.append([rodada, int(rodada == 0), p["id"], st, (a or {}).get("desfecho", ""), coincide, ms])

with open(os.path.join(AQUI, "medicoes.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["rodada", "aquecimento", "pergunta", "http", "desfecho", "coincide_com_referencia", "tempo_ms"])
    w.writerows(linhas_csv)
print(len(linhas_csv), "linhas gravadas em medicoes.csv")
