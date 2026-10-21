import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, type Demanda, type Execucao, type ExecucaoTeste, type RevisaoRequest } from '../api'
import { ApuracaoCard, ModelosApuracao } from '../components/ApuracaoCard'
import { CaminhoDocumentacao, Prazo, StatusDemandaMenu } from '../components/demanda'
import { BotaoCopiarJira, CasosTeste } from '../components/CasoTeste'
import type { Valores } from '../components/GherkinView'
import { PontosAtencao } from '../components/PontosAtencao'
import { PainelRevisao } from '../components/PainelRevisao'
import { ProgressoExecucao } from '../components/ProgressoExecucao'
import { SeloArea, SeloStatus } from '../components/selos'
import { Card, CardCabecalho, Carregando, Erro, Painel } from '../components/ui'
import { data, dataHora, horas, segundos, usd, valorNoGherkin } from '../util/formato'

export function ExecucaoDetalhe() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const local = useLocation()
  // Volta para onde o usuário estava (lista ou conversa); aberta por link direto, cai na lista.
  const voltar = () => (local.key !== 'default' ? navegar(-1) : navegar('/execucoes'))
  const [exec, setExec] = useState<Execucao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [demanda, setDemanda] = useState<Demanda | null>(null)
  const chaveJira = exec?.tarefa.chaveJira

  useEffect(() => {
    if (!chaveJira) return
    let ativo = true
    api.obterDemanda(chaveJira).then((d) => ativo && setDemanda(d)).catch(() => ativo && setDemanda(null))
    return () => {
      ativo = false
    }
  }, [chaveJira])

  useEffect(() => {
    let ativo = true
    api
      .obterExecucao(id)
      .then((e) => ativo && (setExec(e), setErro(null)))
      .catch((e: unknown) => ativo && setErro(e instanceof Error ? e.message : String(e)))
    return () => {
      ativo = false
    }
  }, [id, versao])

  // Enquanto a execução roda, consulta de novo a cada segundo.
  useEffect(() => {
    if (exec?.status !== 'EM_ANDAMENTO') return
    const t = setTimeout(() => setVersao((v) => v + 1), 1000)
    return () => clearTimeout(t)
  }, [exec])

  if (erro) return <Erro mensagem={erro} onTentar={() => setVersao((v) => v + 1)} />
  if (!exec || exec.id !== id) return <Carregando />

  async function registrarExecucaoTeste(cenarioId: number, execucao: ExecucaoTeste | null) {
    await api.registrarExecucaoTeste(id, cenarioId, execucao)
    setVersao((v) => v + 1)
  }

  async function registrar(req: RevisaoRequest) {
    await api.registrarRevisao(id, req)
    setVersao((v) => v + 1)
  }

  const { tarefa } = exec
  const valores: Valores = Object.fromEntries(
    exec.apuracoes.map((a) => [a.id, a.resultadoReferencia ? valorNoGherkin(a.resultadoReferencia) : null]),
  )
  const titulosCenario = Object.fromEntries(exec.cenarios.map((c) => [c.id, c.titulo]))
  const concluida = exec.status === 'CONCLUIDA'

  return (
    <>
      {/* cabeçalho fixo no topo ao rolar; as margens negativas estendem o fundo até as bordas do main */}
      <header className="sticky top-0 z-30 -mx-4 -mt-8 mb-6 border-b border-borda bg-fundo/95 px-4 pt-4 pb-4 backdrop-blur sm:-mx-8 sm:px-8">
        <button
          type="button"
          onClick={voltar}
          className="mb-2 -ml-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-bold text-link hover:bg-neutro-2"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Voltar
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-baseline gap-3 text-2xl font-bold text-enfase">
              <span className="shrink-0 font-mono text-base font-normal text-texto-sec">{tarefa.chaveJira}</span>
              <span className="min-w-0">{tarefa.titulo}</span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SeloArea area={tarefa.area} />
              <SeloStatus status={exec.status} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {demanda?.chaveJira === tarefa.chaveJira && <StatusDemandaMenu demanda={demanda} onAlterada={setDemanda} />}
            {concluida && (
              <a href="#conferencia" className="rounded bg-marca px-4 py-2.5 text-sm leading-none font-bold text-sobre-marca hover:bg-marca-hover">
                {exec.revisao ? 'Ver conferência' : 'Conferir'}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">

          {!concluida && (
            <Painel>
              <ProgressoExecucao etapa={exec.etapa} />
            </Painel>
          )}

          {exec.cenarios.length > 0 && (
            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg font-bold text-enfase">
                  Casos de teste <span className="font-normal text-texto-sec">{exec.cenarios.length}</span>
                </h2>
                {concluida && <BotaoCopiarJira cenarios={exec.cenarios} valores={valores} />}
              </div>
              <CasosTeste cenarios={exec.cenarios} valores={valores} onExecucao={concluida ? registrarExecucaoTeste : undefined} />
            </section>
          )}

          <PontosAtencao pontos={exec.pontosAtencao} />

          <Painel>
            <Card>
              <CardCabecalho titulo="Requisito" sub={`Coletado do Jira em ${dataHora(tarefa.coletadaEm)}`} />
              <p className="px-5 py-4 text-sm leading-relaxed text-texto">{tarefa.requisito}</p>
            </Card>
          </Painel>

          {concluida && exec.exigeApuracao && (
            <section>
              <h2 className="mb-1 text-lg font-bold text-enfase">
                Apurações <span className="font-normal text-texto-sec">{exec.apuracoes.length}</span>
              </h2>
              <p className="mb-3 text-sm text-texto-sec">
                Valor de referência e os registros da base que o formam, para conferir com a tela do sistema.
              </p>
              <Painel className="space-y-4">
                {exec.apuracoes.map((a) => (
                  <ApuracaoCard key={a.id} apuracao={a} cenarioTitulo={a.cenarioId ? titulosCenario[a.cenarioId] : undefined} />
                ))}
              </Painel>
            </section>
          )}

          {concluida && !exec.exigeApuracao && (
            <Painel>
              <Card className="px-5 py-4 text-sm text-texto">
                O classificador concluiu que este requisito não envolve relatório ou consulta. Não houve apuração de valores no banco.
              </Card>
            </Painel>
          )}

          {concluida && (
            <div id="conferencia" className="scroll-mt-44">
              <Painel>
                <PainelRevisao execucao={exec} onRegistrar={registrar} />
              </Painel>
            </div>
          )}

          {concluida && exec.apuracoes.length > 0 && (
            <section className="border-t border-borda pt-6">
              <h2 className="mb-1 text-lg font-bold text-enfase">Modelos de IA</h2>
              <p className="mb-3 text-sm text-texto-sec">
                O que cada modelo retornou em cada apuração. Modelos com a mesma cor de hash chegaram ao mesmo resultado.
              </p>
              <Painel className="space-y-4">
                {exec.apuracoes.map((a) => (
                  <ModelosApuracao key={a.id} apuracao={a} />
                ))}
              </Painel>
            </section>
          )}
        </div>

        <aside className="xl:sticky xl:top-44 xl:h-fit">
          <Painel className="space-y-3">
          {demanda?.chaveJira === tarefa.chaveJira && (
            <Card className="p-5">
              <h2 className="mb-3 font-bold text-enfase">Demanda</h2>
              <dl className="space-y-2 text-sm">
                <Linha rotulo="Criada em" valor={data(demanda.criadaEm)} />
                <div className="flex justify-between gap-3">
                  <dt className="text-texto-sec">Prazo</dt>
                  <dd className="text-right font-medium text-enfase tabular-nums"><Prazo demanda={demanda} /></dd>
                </div>
                <Linha rotulo="Estimativa" valor={demanda.estimativaH != null ? horas(demanda.estimativaH) : '—'} />
              </dl>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="mb-3 font-bold text-enfase">Esta execução</h2>
            <dl className="space-y-2 text-sm">
              <Linha rotulo="Início" valor={dataHora(exec.iniciadaEm)} />
              <Linha rotulo="Tempo total" valor={concluida ? segundos(exec.tempoTotalMs) : '—'} />
              <Linha rotulo="Custo total" valor={concluida ? usd(exec.custoTotalUsd) : '—'} />
              <Linha rotulo="Versão do prompt" valor={exec.versaoPrompt} />
              <Linha rotulo="Casos de teste" valor={concluida ? String(exec.cenarios.length) : '—'} />
              <Linha rotulo="Apurações" valor={concluida ? String(exec.apuracoes.length) : '—'} />
            </dl>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="mb-2 font-bold text-enfase">Documentação da rotina</h2>
            {tarefa.documentacaoRef ? (
              <>
                <p><CaminhoDocumentacao referencia={tarefa.documentacaoRef} /></p>
                <p className="mt-2 text-xs text-texto-sec">Página do NID lida junto com o requisito para gerar os cenários.</p>
              </>
            ) : (
              <p className="text-texto">
                <span className="font-medium text-aviso">Não usada.</span> Os cenários saíram só do requisito do Jira e
                podem deixar de fora regras que estão na documentação. Vale gerar de novo pelo assistente.
              </p>
            )}
          </Card>
          </Painel>
        </aside>
      </div>
    </>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-texto-sec">{rotulo}</dt>
      <dd className="text-right font-medium text-enfase tabular-nums">{valor}</dd>
    </div>
  )
}
