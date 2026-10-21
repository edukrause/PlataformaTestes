import type { ExecucaoResumo } from '../api'

/** Situações de uma execução que pedem ação do analista. */
export type Atencao = 'A_CONFERIR' | 'SEM_REFERENCIA' | 'SEM_DOCUMENTACAO' | 'REJEITADA' | 'ERRO'

export const ATENCOES: { tipo: Atencao; rotulo: string; ajuda: string }[] = [
  { tipo: 'A_CONFERIR', rotulo: 'A conferir', ajuda: 'Concluída sem conferência. Os valores ainda não são validados.' },
  { tipo: 'SEM_REFERENCIA', rotulo: 'Sem valor de referência', ajuda: 'Apuração divergente ou com falha ainda não conferida: o valor precisa ser apurado à mão.' },
  { tipo: 'SEM_DOCUMENTACAO', rotulo: 'Sem documentação', ajuda: 'Cenários gerados só com o requisito do Jira, sem a documentação da rotina.' },
  { tipo: 'REJEITADA', rotulo: 'Rejeitada', ajuda: 'O analista rejeitou os cenários. Vale revisar o prompt ou o requisito.' },
  { tipo: 'ERRO', rotulo: 'Com erro', ajuda: 'A execução parou com erro.' },
]

export function atencoes(e: ExecucaoResumo): Atencao[] {
  const r: Atencao[] = []
  if (e.status === 'ERRO') r.push('ERRO')
  if (e.status !== 'CONCLUIDA') return r
  if (!e.decisao) r.push('A_CONFERIR')
  if (!e.decisao && e.desfechos.some((d) => d === 'DIVERGENTE' || d === 'FALHA')) r.push('SEM_REFERENCIA')
  if (!e.documentacaoRef) r.push('SEM_DOCUMENTACAO')
  if (e.decisao === 'REJEITADO') r.push('REJEITADA')
  return r
}

/** Texto curto do motivo, para aparecer na linha da tabela. */
export function motivo(e: ExecucaoResumo, a: Atencao): string {
  switch (a) {
    case 'A_CONFERIR':
      return `aguardando conferência há ${idade(e.iniciadaEm)}`
    case 'SEM_REFERENCIA': {
      const n = e.desfechos.filter((d) => d === 'DIVERGENTE' || d === 'FALHA').length
      return n === 1 ? '1 apuração sem valor de referência' : `${n} apurações sem valor de referência`
    }
    case 'SEM_DOCUMENTACAO':
      return 'gerada sem documentação'
    case 'REJEITADA':
      return 'rejeitada na conferência'
    case 'ERRO':
      return 'execução com erro'
  }
}

export function idade(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? '1 dia' : `${d} dias`
}
