import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, type Area, type ExecucaoResumo } from '../api'
import { MultiSelecao } from '../components/MultiSelecao'
import { CaminhoDocumentacao, Prazo, StatusDemandaMenu } from '../components/demanda'
import { SeloArea, SeloStatus } from '../components/selos'
import { Card, Carregando, Erro, Selo, TituloPagina, Vazio } from '../components/ui'
import { ATENCOES, atencoes } from '../util/atencao'
import { data, horas, ROTULO_AREA } from '../util/formato'
import { useCarregar } from '../util/useCarregar'

export function ListaExecucoes() {
  const { dados, erro, carregando, recarregar } = useCarregar(() => api.listarExecucoes())
  const [areas, setAreas] = useState<Area[]>([])
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (dados ?? []).filter(
      (e) =>
        (areas.length === 0 || areas.includes(e.area)) &&
        (!termo || e.chaveJira.toLowerCase().includes(termo) || e.titulo.toLowerCase().includes(termo)),
    )
  }, [dados, areas, busca])

  // Módulos que já aparecem nas execuções, com a quantidade de demandas de cada um.
  const opcoesArea = useMemo(() => {
    const chaves = new Map<Area, Set<string>>()
    for (const e of dados ?? []) chaves.set(e.area, (chaves.get(e.area) ?? new Set()).add(e.chaveJira))
    return [...chaves.entries()]
      .map(([valor, cs]) => ({ valor, rotulo: ROTULO_AREA[valor] ?? valor, qtd: cs.size }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
  }, [dados])

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
      <TituloPagina titulo="Execuções" sub="Demandas processadas e a situação de cada uma no Jira. Clique para ver os cenários." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por chave ou título"
          className="h-10 w-full rounded border border-borda bg-superficie px-3 text-sm focus:outline-none focus:border-selecionado focus:ring-1 focus:ring-selecionado sm:w-72"
        />
        <MultiSelecao rotulo="Módulo" todos="Todos" opcoes={opcoesArea} selecionados={areas} onMudar={setAreas} />
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

/** Uma tarefa do Jira; o cartão leva aos cenários da execução mais recente. */
function BlocoTarefa({ execucoes }: { execucoes: ExecucaoResumo[] }) {
  const ultima = execucoes[0]
  const [demanda, setDemanda] = useState(ultima.demanda)
  // O que falta conferir vale para qualquer execução; o resto só importa na mais recente,
  // porque uma tentativa antiga rejeitada já foi superada pela nova.
  const pendencias = ATENCOES.filter(
    (a) =>
      a.tipo !== 'SEM_DOCUMENTACAO' &&
      (a.tipo === 'A_CONFERIR' || a.tipo === 'SEM_REFERENCIA'
        ? execucoes.some((e) => atencoes(e).includes(a.tipo))
        : atencoes(ultima).includes(a.tipo)),
  )
  return (
    <Card className="relative px-5 py-4 transition-colors hover:border-selecionado">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-baseline gap-2.5">
            <span className="shrink-0 font-mono text-sm text-texto-sec">{ultima.chaveJira}</span>
            {/* o after: estica o link pelo cartão todo; o menu de status fica por cima */}
            <Link to={`/execucoes/${ultima.id}`} className="min-w-0 font-bold text-enfase after:absolute after:inset-0 after:rounded-lg hover:text-link">
              {ultima.titulo}
            </Link>
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <SeloArea area={ultima.area} />
            <SeloStatus status={ultima.status} />
            {pendencias.map((a) => (
              <span key={a.tipo} title={a.ajuda}>
                <Selo cor={a.tipo === 'SEM_REFERENCIA' || a.tipo === 'ERRO' ? 'bg-erro-fundo text-erro' : 'bg-aviso-fundo text-aviso'}>
                  {a.rotulo}
                </Selo>
              </span>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <StatusDemandaMenu demanda={demanda} onAlterada={setDemanda} />
        </div>
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <Info rotulo="Criada em">{data(demanda.criadaEm)}</Info>
        <Info rotulo="Prazo"><Prazo demanda={demanda} /></Info>
        <Info rotulo="Estimativa">{demanda.estimativaH != null ? horas(demanda.estimativaH) : <span className="text-texto-sec">não informada</span>}</Info>
        <Info rotulo="Documentação"><CaminhoDocumentacao referencia={ultima.documentacaoRef} /></Info>
      </dl>
    </Card>
  )
}

function Info({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-texto-sec">{rotulo}</dt>
      <dd className="mt-0.5 text-texto">{children}</dd>
    </div>
  )
}
