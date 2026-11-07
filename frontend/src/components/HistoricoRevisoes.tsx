import { useEffect, useState } from 'react'
import { modoApi, type Revisao } from '../api'
import { chamar } from '../api/httpApi'
import { dataHora, ROTULO_DECISAO } from '../util/formato'
import { Card } from './ui'

export function HistoricoRevisoes({ execucaoId, revisaoId }: { execucaoId: number; revisaoId?: number }) {
  const [revisoes, setRevisoes] = useState<Revisao[]>([])
  const [erro, setErro] = useState('')
  useEffect(() => {
    if (modoApi !== 'http' || !revisaoId) return
    let ativo = true
    chamar<Revisao[]>(`/execucoes/${execucaoId}/revisoes`).then((r) => { if (ativo) { setRevisoes(r); setErro('') } })
      .catch((e: unknown) => { if (ativo) setErro(e instanceof Error ? e.message : String(e)) })
    return () => { ativo = false }
  }, [execucaoId, revisaoId])
  if (modoApi !== 'http' || !revisaoId) return null
  return <Card className="p-5"><details><summary className="cursor-pointer font-medium">Histórico de conferências ({revisoes.length})</summary>
    {erro && <p className="text-sm text-erro">{erro}</p>}
    <ol className="mt-3 space-y-3 text-sm">{revisoes.map((r) => <li key={r.id} className="border-t border-borda pt-2">
      <strong>{ROTULO_DECISAO[r.decisao]}</strong> · {r.analista} · {dataHora(r.registradaEm)}
      <p>{r.comentario}</p>{Object.entries(r.valoresCorrigidos ?? {}).map(([id, valor]) => <p key={id} className="whitespace-pre-wrap">A{id}: {valor}</p>)}
    </li>)}</ol>
  </details></Card>
}
