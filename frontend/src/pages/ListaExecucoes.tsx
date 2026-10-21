import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Area, type ExecucaoResumo } from '../api'
import { SeloArea, SeloDecisao, SeloDesfecho, SeloStatus } from '../components/selos'
import { Card, Carregando, Erro, Selo, TituloPagina, Vazio } from '../components/ui'
import { ATENCOES, atencoes, motivo } from '../util/atencao'
import { dataHora, segundos, usd } from '../util/formato'
import { useCarregar } from '../util/useCarregar'

type FiltroArea = Area | 'TODAS'

export function ListaExecucoes() {
  const { dados, erro, carregando, recarregar } = useCarregar(() => api.listarExecucoes())
  const [area, setArea] = useState<FiltroArea>('TODAS')
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (dados ?? []).filter(
      (e) =>
        (area === 'TODAS' || e.area === area) &&
        (!termo || e.chaveJira.toLowerCase().includes(termo) || e.titulo.toLowerCase().includes(termo)),
    )
  }, [dados, area, busca])

  // Uma tarefa pode ter várias execuções (gerada de novo, com ou sem documentação).
  const tarefas = useMemo(() => {
    const grupos = new Map<string, ExecucaoResumo[]>()
    for (const e of filtradas) grupos.set(e.chaveJira, [...(grupos.get(e.chaveJira) ?? []), e])
    const lista = [...grupos.entries()].map(([chaveJira, execs]) => ({
      chaveJira,
      execucoes: execs.sort((a, b) => b.iniciadaEm.localeCompare(a.iniciadaEm)),
    }))
    return lista.sort((a, b) => b.execucoes[0].iniciadaEm.localeCompare(a.execucoes[0].iniciadaEm))
  }, [filtradas])

  return (
    <>
      <TituloPagina titulo="Execuções" sub="Histórico de tarefas processadas e situação da conferência." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por chave ou título"
          className="h-10 w-full rounded border border-borda bg-superficie px-3 text-sm focus:outline-none focus:border-selecionado focus:ring-1 focus:ring-selecionado sm:w-72"
        />
        <div className="flex h-10 items-stretch rounded border border-borda bg-superficie p-1 text-sm">
          {(['TODAS', 'ESTOQUE', 'VENDAS'] as FiltroArea[]).map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`rounded px-3 ${area === a ? 'bg-marca font-bold text-sobre-marca' : 'text-texto hover:bg-neutro-2 hover:text-enfase'}`}
            >
              {a === 'TODAS' ? 'Todas' : a === 'ESTOQUE' ? 'Estoque' : 'Vendas'}
            </button>
          ))}
        </div>
      </div>

      {erro && <Erro mensagem={erro} onTentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && filtradas.length === 0 && <Vazio>Nenhuma execução encontrada.</Vazio>}

      <div className="space-y-4">
        {tarefas.map((t) => (
          <BlocoTarefa key={t.chaveJira} execucoes={t.execucoes} />
        ))}
      </div>
    </>
  )
}

/** Uma tarefa do Jira com as suas execuções, da mais recente para a mais antiga. */
function BlocoTarefa({ execucoes }: { execucoes: ExecucaoResumo[] }) {
  const ultima = execucoes[0]
  // O que falta conferir vale para qualquer execução; o resto só importa na mais recente,
  // porque uma tentativa antiga rejeitada já foi superada pela nova.
  const pendencias = ATENCOES.filter((a) =>
    a.tipo === 'A_CONFERIR' || a.tipo === 'SEM_REFERENCIA'
      ? execucoes.some((e) => atencoes(e).includes(a.tipo))
      : atencoes(ultima).includes(a.tipo),
  )
  // execução antiga sem nada a conferir: os motivos ficam só como histórico
  const superada = (e: ExecucaoResumo) =>
    e !== ultima && !atencoes(e).some((a) => a === 'A_CONFERIR' || a === 'SEM_REFERENCIA')
  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
        <span className="font-mono text-sm text-texto-sec">{ultima.chaveJira}</span>
        <SeloArea area={ultima.area} />
        <h2 className="w-full min-w-0 truncate font-bold text-enfase sm:w-auto sm:flex-1">{ultima.titulo}</h2>
        {pendencias.map((a) => (
          <span key={a.tipo} title={a.ajuda}>
            <Selo cor={a.tipo === 'SEM_REFERENCIA' || a.tipo === 'ERRO' ? 'bg-erro-fundo text-erro' : 'bg-aviso-fundo text-aviso'}>
              {a.rotulo}
            </Selo>
          </span>
        ))}
        <span className="text-xs text-texto-sec">
          {execucoes.length === 1 ? '1 execução' : `${execucoes.length} execuções`}
        </span>
      </header>
      <div className="overflow-x-auto">
        {/* larguras fixas para as colunas ficarem alinhadas entre os blocos */}
        <table className="w-full min-w-[52rem] table-fixed text-sm">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[19%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="border-y border-borda bg-neutro-2 text-left text-xs text-texto-sec">
              <th className="px-5 py-2 font-bold">Execução</th>
              <th className="px-3 py-2 font-bold">Documentação</th>
              <th className="px-3 py-2 font-bold">Cenários</th>
              <th className="px-3 py-2 font-bold">Apurações</th>
              <th className="px-3 py-2 text-right font-bold">Tempo</th>
              <th className="px-3 py-2 text-right font-bold">Custo</th>
              <th className="px-5 py-2 font-bold">Conferência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutro-3">
            {execucoes.map((e) => (
              <tr key={e.id} className="hover:bg-fundo">
                <td className="px-5 py-3">
                  <Link to={`/execucoes/${e.id}`} className="font-medium text-enfase hover:text-link hover:underline">
                    #{e.id} · {dataHora(e.iniciadaEm)}
                  </Link>
                  {atencoes(e).length > 0 && (
                    <p className={`mt-0.5 flex items-baseline gap-1.5 text-xs ${superada(e) ? 'text-texto-sec' : 'text-aviso'}`}>
                      <span className={`size-1.5 shrink-0 rounded-full ${superada(e) ? 'bg-neutro-4' : 'bg-aviso-status'}`} />
                      <span>{atencoes(e).map((a) => motivo(e, a)).join(' · ')}</span>
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 text-xs">
                  {e.usouDocumentacao ? <span className="text-texto">Com</span> : <span className="text-aviso">Sem</span>}
                </td>
                <td className="px-3 py-3 tabular-nums">{e.status === 'CONCLUIDA' ? e.qtdCenarios : '—'}</td>
                <td className="px-3 py-3">
                  {e.status !== 'CONCLUIDA' ? (
                    <SeloStatus status={e.status} />
                  ) : e.desfechos.length ? (
                    <div className="flex flex-wrap gap-1">
                      {e.desfechos.map((d, i) => <SeloDesfecho key={i} desfecho={d} />)}
                    </div>
                  ) : (
                    <span className="text-xs text-texto-sec">não exigiu</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{e.tempoTotalMs ? segundos(e.tempoTotalMs) : '—'}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{usd(e.custoTotalUsd)}</td>
                <td className="px-5 py-3">{e.status === 'CONCLUIDA' && <SeloDecisao decisao={e.decisao} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
