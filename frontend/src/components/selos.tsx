import type { Area, Decisao, Desfecho, StatusExecucao } from '../api'
import { DESCRICAO_DESFECHO, ROTULO_AREA, ROTULO_DECISAO, ROTULO_DESFECHO } from '../util/formato'
import { PONTO_DESFECHO } from '../util/cores'
import { Selo } from './ui'

const COR_DESFECHO: Record<Desfecho, string> = {
  UNANIME: 'bg-sucesso-fundo text-sucesso',
  MAIORIA: 'bg-info-fundo text-info',
  DIVERGENTE: 'bg-aviso-fundo text-aviso',
  FALHA: 'bg-erro-fundo text-erro',
}

export function SeloDesfecho({ desfecho }: { desfecho: Desfecho }) {
  return (
    <span title={DESCRICAO_DESFECHO[desfecho]}>
      <Selo cor={COR_DESFECHO[desfecho]}>
        <span className={`size-1.5 rounded-full ${PONTO_DESFECHO[desfecho]}`} />
        {ROTULO_DESFECHO[desfecho]}
      </Selo>
    </span>
  )
}

const COR_DECISAO: Record<Decisao, string> = {
  ACEITO: 'bg-sucesso-fundo text-sucesso',
  ACEITO_ALTERACAO: 'bg-info-fundo text-info',
  REJEITADO: 'bg-erro-fundo text-erro',
}

export function SeloDecisao({ decisao }: { decisao: Decisao | null }) {
  if (!decisao) return <Selo cor="bg-neutro-2 text-texto">A conferir</Selo>
  return <Selo cor={COR_DECISAO[decisao]}>{ROTULO_DECISAO[decisao]}</Selo>
}

export function SeloArea({ area }: { area: Area }) {
  return (
    <Selo cor={area === 'ESTOQUE' ? 'bg-indigo-fundo text-indigo-texto' : 'bg-rosa-fundo text-rosa'}>
      {ROTULO_AREA[area]}
    </Selo>
  )
}

export function SeloStatus({ status }: { status: StatusExecucao }) {
  if (status === 'EM_ANDAMENTO')
    return (
      <Selo cor="bg-indigo-fundo text-indigo-texto">
        <span className="size-1.5 animate-pulse rounded-full bg-indigo-texto" />
        Em andamento
      </Selo>
    )
  if (status === 'ERRO') return <Selo cor="bg-erro-fundo text-erro">Erro</Selo>
  return null
}
