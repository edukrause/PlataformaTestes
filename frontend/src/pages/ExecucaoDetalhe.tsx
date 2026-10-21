import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type Execucao, type RevisaoRequest } from '../api'
import { ApuracaoCard } from '../components/ApuracaoCard'
import { GherkinView, type Valores } from '../components/GherkinView'
import { PainelRevisao } from '../components/PainelRevisao'
import { ProgressoExecucao } from '../components/ProgressoExecucao'
import { SeloArea, SeloStatus } from '../components/selos'
import { Card, CardCabecalho, Carregando, Erro, Selo } from '../components/ui'
import { dataHora, segundos, usd, valorNoGherkin } from '../util/formato'

export function ExecucaoDetalhe() {
  const id = Number(useParams().id)
  const [exec, setExec] = useState<Execucao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

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
      <nav className="mb-3 text-sm text-texto-sec">
        <Link to="/execucoes" className="hover:text-enfase">Execuções</Link> <span className="mx-1">/</span>
        <span className="font-mono">{tarefa.chaveJira}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-texto-sec">{tarefa.chaveJira}</span>
            <SeloArea area={tarefa.area} />
            <SeloStatus status={exec.status} />
          </div>
          <h1 className="text-2xl font-bold text-enfase">{tarefa.titulo}</h1>
        </div>
        {concluida && (
          <a href="#conferencia" className="rounded bg-marca px-4 py-2.5 text-sm leading-none font-bold text-sobre-marca hover:bg-marca-hover">
            {exec.revisao ? 'Ver conferência' : 'Conferir'}
          </a>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardCabecalho titulo="Requisito" sub={`Coletado do Jira em ${dataHora(tarefa.coletadaEm)}`} />
            <p className="px-5 py-4 text-sm leading-relaxed text-texto">{tarefa.requisito}</p>
          </Card>

          {!concluida && <ProgressoExecucao etapa={exec.etapa} />}

          {exec.cenarios.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-enfase">
                Cenários <span className="font-normal text-texto-sec">{exec.cenarios.length}</span>
              </h2>
              <div className="space-y-4">
                {exec.cenarios.map((c) => (
                  <Card key={c.id} className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                      <h3 className="font-medium text-enfase">{c.titulo}</h3>
                      <div className="flex gap-2">
                        <Selo cor={c.tipo === 'ALTERACAO' ? 'bg-indigo-fundo text-indigo-texto' : 'bg-neutro-2 text-texto'}>
                          {c.tipo === 'ALTERACAO' ? 'Alteração' : 'Regressão'}
                        </Selo>
                        <Selo cor={c.sintaxeValida ? 'bg-sucesso-fundo text-sucesso' : 'bg-erro-fundo text-erro'}>
                          {c.sintaxeValida ? 'Gherkin válido' : 'Gherkin inválido'}
                        </Selo>
                      </div>
                    </div>
                    <div className="px-5 pb-5">
                      <GherkinView texto={c.gherkin} valores={valores} />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {concluida && exec.exigeApuracao && (
            <section>
              <h2 className="mb-1 text-lg font-bold text-enfase">
                Apurações <span className="font-normal text-texto-sec">{exec.apuracoes.length}</span>
              </h2>
              <p className="mb-3 text-sm text-texto-sec">
                Cada modelo gerou a sua consulta de forma independente. Candidatos com a mesma cor de hash retornaram o mesmo resultado normalizado.
              </p>
              <div className="space-y-4">
                {exec.apuracoes.map((a) => (
                  <ApuracaoCard key={a.id} apuracao={a} cenarioTitulo={a.cenarioId ? titulosCenario[a.cenarioId] : undefined} />
                ))}
              </div>
            </section>
          )}

          {concluida && !exec.exigeApuracao && (
            <Card className="px-5 py-4 text-sm text-texto">
              O classificador concluiu que este requisito não envolve relatório ou consulta. Não houve apuração de valores no banco.
            </Card>
          )}

          {concluida && (
            <div id="conferencia" className="scroll-mt-6">
              <PainelRevisao execucao={exec} onRegistrar={registrar} />
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
          <Card className="p-5">
            <h2 className="mb-3 font-bold text-enfase">Resumo</h2>
            <dl className="space-y-2 text-sm">
              <Linha rotulo="Início" valor={dataHora(exec.iniciadaEm)} />
              <Linha rotulo="Tempo total" valor={concluida ? segundos(exec.tempoTotalMs) : '—'} />
              <Linha rotulo="Custo total" valor={concluida ? usd(exec.custoTotalUsd) : '—'} />
              <Linha rotulo="Versão do prompt" valor={exec.versaoPrompt} />
              <Linha rotulo="Cenários" valor={concluida ? String(exec.cenarios.length) : '—'} />
              <Linha rotulo="Apurações" valor={concluida ? String(exec.apuracoes.length) : '—'} />
            </dl>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="mb-2 font-bold text-enfase">Documentação</h2>
            {tarefa.documentacaoRef ? (
              <p className="text-texto">{tarefa.documentacaoRef}</p>
            ) : (
              <p className="text-aviso">Gerado sem documentação da rotina.</p>
            )}
          </Card>
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
