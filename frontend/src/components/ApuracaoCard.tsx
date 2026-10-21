import type { Apuracao, CandidatoSql } from '../api'
import { DESCRICAO_DESFECHO, ROTULO_PROVEDOR, ROTULO_VERIFICACAO, segundos, usd } from '../util/formato'
import { SeloDesfecho } from './selos'
import { RelatorioConferencia } from './RelatorioConferencia'
import { TabelaResultado } from './TabelaResultado'
import { Card } from './ui'

/** Cores para agrupar visualmente candidatos com o mesmo hash de resultado. */
const CORES_GRUPO = ['bg-sucesso-status', 'bg-info-status', 'bg-aviso-status', 'bg-rosa-status']

export function ApuracaoCard({ apuracao, cenarioTitulo }: { apuracao: Apuracao; cenarioTitulo?: string }) {
  return (
    <Card className="overflow-hidden">
      <div id={`apuracao-${apuracao.id}`} className="scroll-mt-6" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-texto-sec">
            <span className="font-mono">A{apuracao.id}</span>
            {cenarioTitulo && <span>· cenário “{cenarioTitulo}”</span>}
          </div>
          <h3 className="mt-1 font-medium text-enfase">{apuracao.pergunta}</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {apuracao.subesquema.map((t) => (
              <span key={t} className="rounded bg-neutro-2 px-1.5 py-0.5 font-mono text-xs text-texto">{t}</span>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-fundo p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium tracking-wide text-texto-sec uppercase">Valor de referência</span>
            <SeloDesfecho desfecho={apuracao.desfecho} />
          </div>
          <div className="mt-2">
            {apuracao.resultadoReferencia ? (
              <TabelaResultado tabela={apuracao.resultadoReferencia} destaque />
            ) : (
              <p className="text-sm font-medium text-aviso">Sem valor de referência</p>
            )}
          </div>
          <p className="mt-2 text-xs text-texto-sec">{DESCRICAO_DESFECHO[apuracao.desfecho]}</p>
        </div>
      </div>

      {apuracao.conferencia && (
        <div className="border-t border-neutro-3 px-5 py-4">
          <RelatorioConferencia relatorio={apuracao.conferencia} nomeArquivo={`conferencia-A${apuracao.id}`} />
        </div>
      )}

    </Card>
  )
}

/** O que cada modelo de IA respondeu para a apuração, mostrado à parte, no fim da tela. */
export function ModelosApuracao({ apuracao }: { apuracao: Apuracao }) {
  const hashes = [...new Set(apuracao.candidatos.map((c) => c.hashResultado).filter(Boolean))] as string[]
  const hashRef = apuracao.candidatos.find(
    (c) => apuracao.resultadoReferencia && c.verificacao === 'VALIDO' &&
      apuracao.candidatos.filter((o) => o.hashResultado === c.hashResultado).length >= 2,
  )?.hashResultado

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
        <span className="font-mono text-xs text-texto-sec">A{apuracao.id}</span>
        <h3 className="min-w-0 flex-1 text-sm font-medium text-enfase">{apuracao.pergunta}</h3>
        <SeloDesfecho desfecho={apuracao.desfecho} />
      </div>
      <div className="grid gap-px border-t border-neutro-3 bg-neutro-2 md:grid-cols-3">
        {apuracao.candidatos.map((c) => (
          <Candidato
            key={c.id}
            c={c}
            corGrupo={c.hashResultado ? CORES_GRUPO[hashes.indexOf(c.hashResultado) % CORES_GRUPO.length] : null}
            concorda={!!hashRef && c.hashResultado === hashRef}
          />
        ))}
      </div>
    </Card>
  )
}

function Candidato({ c, corGrupo, concorda }: { c: CandidatoSql; corGrupo: string | null; concorda: boolean }) {
  const valido = c.verificacao === 'VALIDO'
  return (
    <div className="flex min-w-0 flex-col gap-3 bg-superficie p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-enfase">{ROTULO_PROVEDOR[c.provedor]}</div>
          <div className="font-mono text-xs text-texto-sec">{c.modelo}</div>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            valido ? (concorda ? 'bg-sucesso-fundo text-sucesso' : 'bg-neutro-2 text-texto') : 'bg-erro-fundo text-erro'
          }`}
        >
          {valido ? (concorda ? 'Concorda' : 'Diverge') : 'Descartado'}
        </span>
      </div>

      <div className="text-sm">
        {c.resultado ? (
          <TabelaResultado tabela={c.resultado} />
        ) : (
          <p className="text-erro">{ROTULO_VERIFICACAO[c.verificacao]}</p>
        )}
        {c.mensagemErro && <p className="mt-1 font-mono text-xs break-words text-erro">{c.mensagemErro}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-texto-sec">
        <dt>Hash</dt>
        <dd className="flex items-center gap-1.5 font-mono text-texto">
          {corGrupo && <span className={`size-2 rounded-full ${corGrupo}`} />}
          {c.hashResultado ?? '—'}
        </dd>
        <dt>Tentativa</dt>
        <dd className="text-texto">{c.tentativa}ª</dd>
        <dt>Tokens</dt>
        <dd className="text-texto tabular-nums">
          {c.tokensEntrada.toLocaleString('pt-BR')} / {c.tokensSaida.toLocaleString('pt-BR')}
        </dd>
        <dt>Custo · tempo</dt>
        <dd className="text-texto tabular-nums">
          {usd(c.custoUsd)} · {segundos(c.latenciaMs)}
        </dd>
      </dl>
    </div>
  )
}
