import type { ReactNode } from 'react'
import { api, type Decisao, type Desfecho } from '../api'
import { Card, Carregando, Erro, Selo, TituloPagina } from '../components/ui'
import { PONTO_DESFECHO } from '../util/cores'
import { pct, ROTULO_DECISAO, ROTULO_DESFECHO, ROTULO_PROVEDOR, segundos, usd } from '../util/formato'
import { useCarregar } from '../util/useCarregar'

const COR_DECISAO: Record<Decisao, string> = {
  ACEITO: 'bg-sucesso-status',
  ACEITO_ALTERACAO: 'bg-info-status',
  REJEITADO: 'bg-erro-status',
}

const EXPLICA_DESFECHO: Record<Desfecho, string> = {
  UNANIME: 'Os 3 modelos chegaram ao mesmo valor',
  MAIORIA: '2 dos 3 modelos chegaram ao mesmo valor',
  DIVERGENTE: 'Os modelos chegaram a valores diferentes',
  FALHA: 'Menos de 2 consultas funcionaram',
}

const EXPLICA_DECISAO: Record<Decisao, string> = {
  ACEITO: 'Cenários usados como estavam',
  ACEITO_ALTERACAO: 'Usados com pequenos ajustes',
  REJEITADO: 'Cenários descartados',
}

/** Abaixo disso os percentuais ainda mudam muito a cada execução. */
const POUCAS_CONFERIDAS = 10

export function Metricas() {
  const { dados: m, erro, recarregar } = useCarregar(() => api.obterMetricas())

  if (erro) return <Erro mensagem={erro} onTentar={recarregar} />
  if (!m) return <Carregando />

  const conferidas = Object.values(m.decisoes).reduce((s, v) => s + v, 0)
  const aceitasN = m.decisoes.ACEITO + m.decisoes.ACEITO_ALTERACAO
  const aceitas = conferidas ? aceitasN / conferidas : 0
  const semRefN = m.desfechos.DIVERGENTE + m.desfechos.FALHA
  const semRef = m.totalApuracoes ? semRefN / m.totalApuracoes : 0
  const custoOk = m.custoMedioApuracaoUsd <= 0.1
  const tempoOk = m.tempoMedioApuracaoS <= 60

  const metas = [aceitas >= 0.6, semRef <= 0.25, m.valoresAlteradosPct <= 0.1, custoOk && tempoOk]
  const atingidas = metas.filter(Boolean).length

  return (
    <>
      <TituloPagina
        titulo="Métricas"
        sub="Como a plataforma está se saindo. As metas são as do plano de validação do TCC."
      />

      <Card className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 p-5">
        <div>
          <span className="text-3xl font-bold text-enfase tabular-nums">{atingidas} de {metas.length}</span>
          <span className="ml-2 text-texto">metas atingidas</span>
        </div>
        <p className="text-sm text-texto-sec">
          Calculado sobre {m.totalExecucoes} execuções, {conferidas} conferidas pelo analista e {m.totalApuracoes} valores
          apurados no banco.
          {conferidas < POUCAS_CONFERIDAS && ' Com tão poucas conferências, os percentuais ainda mudam bastante a cada tarefa.'}
        </p>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Indicador
          codigo="M4"
          pergunta="Os cenários gerados estão sendo aproveitados?"
          ok={metas[0]}
          valor={pct(aceitas)}
          frase={`${aceitasN} de ${conferidas} tarefas conferidas foram aceitas pelo analista, com ou sem ajuste.`}
          meta="Meta: pelo menos 60%"
        >
          <BarraMeta valor={aceitas} meta={0.6} max={1} ok={metas[0]} />
        </Indicador>

        <Indicador
          codigo="M8"
          pergunta="Os modelos estão concordando no valor esperado?"
          ok={metas[1]}
          valor={pct(semRef)}
          frase={`${semRefN} de ${m.totalApuracoes} apurações ficaram sem valor de referência e precisaram ser apuradas à mão.`}
          meta="Meta: no máximo 25%"
        >
          <BarraMeta valor={semRef} meta={0.25} max={1} ok={metas[1]} />
        </Indicador>

        <Indicador
          codigo="M12"
          pergunta="Os valores apurados estão certos?"
          ok={metas[2]}
          valor={pct(m.valoresAlteradosPct)}
          frase="Parte dos valores que o analista precisou corrigir na conferência. Quanto menor, melhor."
          meta="Meta: no máximo 10%"
        >
          <BarraMeta valor={m.valoresAlteradosPct} meta={0.1} max={1} ok={metas[2]} />
        </Indicador>

        <Indicador
          codigo="M13"
          pergunta="Apurar um valor sai barato e rápido?"
          ok={metas[3]}
          valor={`${usd(m.custoMedioApuracaoUsd)} · ${m.tempoMedioApuracaoS.toFixed(1).replace('.', ',')} s`}
          frase="Custo e tempo médios de cada valor apurado, somando as consultas dos três modelos."
          meta="Meta: até US$ 0,10 e até 60 s"
        >
          <div className="space-y-2">
            <BarraMeta rotulo="Custo" valor={m.custoMedioApuracaoUsd} meta={0.1} max={0.2} ok={custoOk} />
            <BarraMeta rotulo="Tempo" valor={m.tempoMedioApuracaoS} meta={60} max={120} ok={tempoOk} />
          </div>
        </Indicador>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold text-enfase">Os modelos concordaram?</h2>
          <p className="mt-0.5 text-sm text-texto-sec">Resultado das {m.totalApuracoes} apurações de valor no banco.</p>
          <Distribuicao
            itens={(Object.keys(m.desfechos) as Desfecho[]).map((d) => ({
              rotulo: ROTULO_DESFECHO[d],
              explica: EXPLICA_DESFECHO[d],
              valor: m.desfechos[d],
              cor: PONTO_DESFECHO[d],
            }))}
          />
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-enfase">O que o analista decidiu?</h2>
          <p className="mt-0.5 text-sm text-texto-sec">Decisão nas {conferidas} tarefas conferidas.</p>
          <Distribuicao
            itens={(Object.keys(m.decisoes) as Decisao[]).map((d) => ({
              rotulo: ROTULO_DECISAO[d],
              explica: EXPLICA_DECISAO[d],
              valor: m.decisoes[d],
              cor: COR_DECISAO[d],
            }))}
          />
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <div className="px-5 pt-5 pb-3">
          <h2 className="font-bold text-enfase">Como cada modelo se saiu</h2>
          <p className="mt-0.5 text-sm text-texto-sec">
            Cada modelo escreve a sua própria consulta SQL. "Funcionaram" são as que passaram nas verificações e rodaram no banco.
          </p>
        </div>
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-y border-borda bg-neutro-2 text-left text-xs text-texto-sec">
              <th className="px-5 py-2 font-bold">Modelo</th>
              <th className="px-3 py-2 text-right font-bold">Consultas geradas</th>
              <th className="w-[30%] px-3 py-2 font-bold">Funcionaram</th>
              <th className="px-3 py-2 text-right font-bold">Custo total</th>
              <th className="px-5 py-2 text-right font-bold">Tempo médio de resposta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutro-3 tabular-nums">
            {m.porProvedor.map((p) => {
              const taxa = p.candidatos ? p.validos / p.candidatos : 0
              return (
                <tr key={p.provedor}>
                  <td className="px-5 py-3 font-bold text-enfase">{ROTULO_PROVEDOR[p.provedor]}</td>
                  <td className="px-3 py-3 text-right">{p.candidatos}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3" title={`${p.validos} de ${p.candidatos} consultas funcionaram`}>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutro-2">
                        <div className="h-full rounded-full bg-(--charts-blue-2)" style={{ width: `${taxa * 100}%` }} />
                      </div>
                      <span className="w-24 text-right whitespace-nowrap">
                        {p.validos} de {p.candidatos} <span className="text-texto-sec">({pct(taxa)})</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">{usd(p.custoUsd)}</td>
                  <td className="px-5 py-3 text-right">{segundos(p.latenciaMediaMs)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </>
  )
}

function Indicador({
  codigo,
  pergunta,
  ok,
  valor,
  frase,
  meta,
  children,
}: {
  codigo: string
  pergunta: string
  ok: boolean
  valor: string
  frase: string
  meta: string
  children: ReactNode
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-bold text-enfase">{pergunta}</h2>
        <span className="font-mono text-xs text-texto-sec" title="Código do indicador no plano de validação">{codigo}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-3xl font-bold text-enfase tabular-nums">{valor}</span>
        {ok ? (
          <Selo cor="bg-sucesso-fundo text-sucesso">✓ Meta atingida</Selo>
        ) : (
          <Selo cor="bg-aviso-fundo text-aviso">! Fora da meta</Selo>
        )}
      </div>
      <p className="mt-2 text-sm text-texto">{frase}</p>
      <div className="mt-auto pt-4">
        {children}
        <p className="mt-1.5 text-xs text-texto-sec">{meta}</p>
      </div>
    </Card>
  )
}

/** Barra do valor com um traço marcando a meta. */
function BarraMeta({ valor, meta, max, ok, rotulo }: { valor: number; meta: number; max: number; ok: boolean; rotulo?: string }) {
  const larg = (v: number) => `${Math.min(100, (v / max) * 100)}%`
  return (
    <div className="flex items-center gap-3">
      {rotulo && <span className="w-12 text-xs text-texto-sec">{rotulo}</span>}
      <div className="relative h-2.5 flex-1 rounded-full bg-neutro-2">
        <div
          className={`h-full rounded-full ${ok ? 'bg-sucesso-status' : 'bg-aviso-status'}`}
          style={{ width: larg(valor), minWidth: valor > 0 ? 4 : 0 }}
        />
        <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-enfase" style={{ left: larg(meta) }} title="Meta" />
      </div>
    </div>
  )
}

/** Barra empilhada com legenda que explica cada parte (o rótulo e a contagem não dependem só da cor). */
function Distribuicao({ itens }: { itens: { rotulo: string; explica: string; valor: number; cor: string }[] }) {
  const total = itens.reduce((s, i) => s + i.valor, 0)
  if (total === 0) return <p className="mt-4 text-sm text-texto-sec">Ainda não há dados.</p>
  return (
    <>
      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-neutro-2">
        {itens
          .filter((i) => i.valor > 0)
          .map((i) => (
            <div
              key={i.rotulo}
              className={i.cor}
              style={{ width: `${(i.valor / total) * 100}%` }}
              title={`${i.rotulo}: ${i.valor} (${pct(i.valor / total)})`}
            />
          ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {itens.map((i) => (
          <li key={i.rotulo} className="flex items-start gap-2.5 text-sm">
            <span className={`mt-1 size-2.5 shrink-0 rounded-sm ${i.cor}`} />
            <div className="min-w-0 flex-1">
              <span className="font-bold text-enfase">{i.rotulo}</span>
              <span className="block text-xs text-texto-sec">{i.explica}</span>
            </div>
            <span className="text-right whitespace-nowrap tabular-nums">
              <span className="font-bold text-enfase">{i.valor}</span>{' '}
              <span className="text-texto-sec">({pct(i.valor / total)})</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
