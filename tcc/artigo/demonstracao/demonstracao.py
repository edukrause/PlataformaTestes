"""Demonstração técnica com base sintética (MySQL).

Requer a plataforma em execução (BASE_URL) com ERP_DIALETO=MYSQL apontando para demo_erp (base-sintetica.sql).
As consultas candidatas foram escritas pelo autor e enviadas pela apuração manual (origem MANUAL): não há chamada
a modelos de linguagem. Os rótulos CLAUDE/GEMINI/LLAMA apenas ocupam as três posições de voto do consenso.
A consulta de referência de cada pergunta foi escrita antes das execuções.
"""
import json, os, time, urllib.request, urllib.error
from decimal import Decimal

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:18084")
F = "p.empresa = 1 AND p.emissao BETWEEN '2026-10-01' AND '2026-10-31'"
VALIDOS = F + " AND p.situacao = 'N' AND p.excluido = 0"
JUNCAO = "FROM demo_erp.pedido p JOIN demo_erp.pedido_item i ON i.pedido_id = p.id"
VALOR = "SUM(i.quantidade * i.valor_unitario)"

PERGUNTAS = [
    {"id": "Q1", "pergunta": "Valor total vendido pela empresa 1 em outubro de 2026, sem pedidos cancelados ou excluídos",
     "intencao": "um candidato omite a exclusão lógica",
     "referencia": f"SELECT {VALOR} {JUNCAO} WHERE {VALIDOS}",
     "candidatos": {
         "CLAUDE": f"SELECT {VALOR} AS total {JUNCAO} WHERE {VALIDOS}",
         "GEMINI": "SELECT SUM(quantidade * valor_unitario) AS valor FROM demo_erp.pedido_item WHERE pedido_id IN "
                   "(SELECT id FROM demo_erp.pedido WHERE empresa = 1 AND situacao = 'N' AND excluido = 0 "
                   "AND emissao >= '2026-10-01' AND emissao < '2026-11-01')",
         "LLAMA": f"SELECT {VALOR} {JUNCAO} WHERE {F} AND p.situacao = 'N'"}},
    {"id": "Q2", "pergunta": "Quantidade de pedidos válidos por filial da empresa 1 em outubro de 2026",
     "intencao": "três formulações diferentes da mesma regra",
     "referencia": f"SELECT p.filial, COUNT(*) FROM demo_erp.pedido p WHERE {VALIDOS} GROUP BY p.filial",
     "candidatos": {
         "CLAUDE": f"SELECT p.filial, COUNT(*) AS pedidos FROM demo_erp.pedido p WHERE {VALIDOS} GROUP BY p.filial ORDER BY p.filial",
         "GEMINI": f"SELECT COUNT(p.id) AS qtd, p.filial AS filial FROM demo_erp.pedido p WHERE {VALIDOS} "
                   "GROUP BY p.filial ORDER BY qtd DESC, filial DESC",
         "LLAMA": "SELECT filial, COUNT(DISTINCT id) FROM demo_erp.pedido WHERE empresa = 1 AND situacao <> 'C' AND excluido = 0 "
                  "AND YEAR(emissao) = 2026 AND MONTH(emissao) = 10 GROUP BY filial"}},
    {"id": "Q3", "pergunta": "Quantidade vendida do produto 10 pela empresa 1 em outubro de 2026, sem pedidos cancelados ou excluídos",
     "intencao": "dois candidatos omitem o filtro de cancelados",
     "referencia": f"SELECT SUM(i.quantidade) {JUNCAO} WHERE {VALIDOS} AND i.produto_id = 10",
     "candidatos": {
         "CLAUDE": f"SELECT SUM(i.quantidade) {JUNCAO} WHERE {F} AND p.excluido = 0 AND i.produto_id = 10",
         "GEMINI": "SELECT SUM(quantidade) AS qtd FROM demo_erp.pedido_item WHERE produto_id = 10 AND pedido_id IN "
                   "(SELECT id FROM demo_erp.pedido WHERE empresa = 1 AND excluido = 0 AND emissao BETWEEN '2026-10-01' AND '2026-10-31')",
         "LLAMA": f"SELECT SUM(i.quantidade) AS quantidade {JUNCAO} WHERE {VALIDOS} AND i.produto_id = 10"}},
    {"id": "Q4", "pergunta": "Valor médio por pedido válido da empresa 1 em outubro de 2026",
     "intencao": "três interpretações diferentes de média",
     "referencia": f"SELECT {VALOR} / COUNT(DISTINCT p.id) {JUNCAO} WHERE {VALIDOS}",
     "candidatos": {
         "CLAUDE": f"SELECT AVG(i.quantidade * i.valor_unitario) {JUNCAO} WHERE {VALIDOS}",
         "GEMINI": f"SELECT {VALOR} / COUNT(DISTINCT p.id) AS media {JUNCAO} WHERE {VALIDOS}",
         "LLAMA": f"SELECT AVG(i.valor_unitario) {JUNCAO} WHERE {VALIDOS}"}},
    {"id": "Q5", "pergunta": "Valor total vendido pela filial 2 da empresa 1 em outubro de 2026",
     "intencao": "um candidato tenta escrita e outro filtra o ano errado (resultado vazio)",
     "referencia": f"SELECT {VALOR} {JUNCAO} WHERE {VALIDOS} AND p.filial = 2",
     "candidatos": {
         "CLAUDE": "DELETE FROM demo_erp.pedido WHERE situacao = 'C'",
         "GEMINI": f"SELECT {VALOR} {JUNCAO} WHERE p.empresa = 1 AND p.filial = 2 AND p.situacao = 'N' AND p.excluido = 0 "
                   "AND p.emissao BETWEEN '2025-10-01' AND '2025-10-31' GROUP BY p.filial",
         "LLAMA": f"SELECT {VALOR} {JUNCAO} WHERE {VALIDOS} AND p.filial = 2"}},
]


def chamar(metodo, caminho, corpo=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(BASE + caminho, data=dados, method=metodo, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def canon(linhas):
    """Conferência externa simples: números com quatro casas, linhas e células ordenadas."""
    def v(x):
        try:
            return str(Decimal(str(x)).quantize(Decimal("0.0001")))
        except Exception:
            return str(x)
    return sorted(sorted(v(c) for c in linha) for linha in linhas)


cenarios = {"area": "VENDAS", "exigeApuracao": True, "pontosAtencao": [], "cenarios": [
    {"tipo": "ALTERACAO", "titulo": p["id"] + " - " + p["pergunta"],
     "gherkin": "Dado que existem pedidos de outubro de 2026\nQuando consulto o relatório de vendas\nEntão vejo o valor apurado",
     "resultadoEsperado": "Valor conforme a referência apurada"} for p in PERGUNTAS]}
st, ex = chamar("POST", "/api/execucoes/manuais", {"chaveJira": "DEMO-1", "titulo": "Demonstração sintética",
                "requisito": "Relatório de vendas por período, sem pedidos cancelados nem excluídos.", "geracao": cenarios})
assert st == 201, (st, ex)
eid = ex["id"]
st, det = chamar("GET", f"/api/execucoes/{eid}")
cenario_id = {c["titulo"][:2]: c["id"] for c in det["cenarios"]}

saida = []
for p in PERGUNTAS:
    _, ref = chamar("POST", "/api/banco/consultas", {"consulta": p["referencia"]})
    t0 = time.perf_counter()
    st, ap = chamar("POST", f"/api/execucoes/{eid}/apuracoes", {
        "cenarioId": cenario_id[p["id"]], "pergunta": p["pergunta"], "preservarOrdem": False,
        "candidatos": [{"provedor": k, "consulta": v} for k, v in p["candidatos"].items()]})
    saida.append({"id": p["id"], "pergunta": p["pergunta"], "intencao": p["intencao"], "http": st,
                  "resposta": ap if st != 201 else None, "apuracaoId": ap.get("id") if st == 201 else None,
                  "tempo_ms": round((time.perf_counter() - t0) * 1000),
                  "referencia": {"consulta": p["referencia"], "linhas": ref.get("linhas")},
                  "candidatos_enviados": p["candidatos"]})

st, det = chamar("GET", f"/api/execucoes/{eid}")
open("detalhe-execucao.json", "w", encoding="utf-8").write(json.dumps(det, ensure_ascii=False, indent=2))
for item in saida:
    if item["apuracaoId"] is None:
        continue
    a = next(x for x in det["apuracoes"] if x["id"] == item["apuracaoId"])
    item["desfecho"] = a["desfecho"]
    item["candidatos"] = [{"provedor": c.get("provedor"), "verificacao": c.get("verificacao"),
                           "linhas": (c.get("resultado") or {}).get("linhas"), "descarte": c.get("descarte")}
                          for c in a.get("candidatos", [])]
    linhas = (a.get("resultadoReferencia") or {}).get("linhas")
    item["valor_apurado"] = linhas
    item["coincide_com_referencia"] = None if linhas is None else canon(linhas) == canon(item["referencia"]["linhas"])

json.dump({"data": time.strftime("%Y-%m-%d"), "execucao": eid,
           "origem": "MANUAL: consultas escritas pelo autor sobre base sintética; nenhuma chamada a modelos",
           "perguntas": saida}, open("resultados-demonstracao.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=2, default=str)
for i in saida:
    print(i["id"], i["http"], i.get("desfecho"), i.get("valor_apurado"), "| ref", i["referencia"]["linhas"],
          "| coincide:", i.get("coincide_com_referencia"), [(c["provedor"], c["verificacao"]) for c in i.get("candidatos", [])],
          i["tempo_ms"], "ms", i["resposta"] or "")
