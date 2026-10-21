import { useEffect, useState } from 'react'
import type { Decisao, Execucao, Revisao, RevisaoRequest } from '../api'
import { duracao, ROTULO_DECISAO, valorNoGherkin } from '../util/formato'
import { SeloDecisao } from './selos'
import { Botao, Card, CardCabecalho } from './ui'

const CHAVE_ANALISTA = 'plataforma-testes:analista'

const OPCOES: { decisao: Decisao; ajuda: string }[] = [
  { decisao: 'ACEITO', ajuda: 'Os cenários e valores podem ser executados como estão.' },
  { decisao: 'ACEITO_ALTERACAO', ajuda: 'Pequenos ajustes de texto ou de valor antes de executar.' },
  { decisao: 'REJEITADO', ajuda: 'Os cenários não servem para testar a tarefa.' },
]

function lerAnalista(): string {
  try {
    return localStorage.getItem(CHAVE_ANALISTA) ?? ''
  } catch {
    return ''
  }
}

interface Props {
  execucao: Execucao
  onRegistrar: (req: RevisaoRequest) => Promise<void>
}

export function PainelRevisao({ execucao, onRegistrar }: Props) {
  if (execucao.revisao) return <RevisaoRegistrada revisao={execucao.revisao} />
  return <FormRevisao execucao={execucao} onRegistrar={onRegistrar} />
}

function RevisaoRegistrada({ revisao }: { revisao: Revisao }) {
  return (
    <Card>
      <CardCabecalho titulo="Conferência" sub={`Registrada por ${revisao.analista}`} acao={<SeloDecisao decisao={revisao.decisao} />} />
      <dl className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-texto-sec">Tempo de revisão</dt>
          <dd className="font-medium">{duracao(revisao.tempoRevisaoS)}</dd>
        </div>
        <div>
          <dt className="text-texto-sec">Valores alterados</dt>
          <dd className="font-medium">{revisao.valoresAlterados}</dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="text-texto-sec">Comentário</dt>
          <dd>{revisao.comentario || '—'}</dd>
        </div>
      </dl>
    </Card>
  )
}

function FormRevisao({ execucao, onRegistrar }: Props) {
  // O tempo de revisão (M12/M13 do plano de validação) conta a partir da abertura da tela.
  const [decorridoS, setDecorridoS] = useState(0)
  const [decisao, setDecisao] = useState<Decisao | null>(null)
  const [analista, setAnalista] = useState(lerAnalista)
  const [comentario, setComentario] = useState('')
  const [corrigidos, setCorrigidos] = useState<Record<number, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setDecorridoS((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const comValor = execucao.apuracoes.filter((a) => a.resultadoReferencia)

  async function enviar() {
    if (!decisao || !analista.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      try {
        localStorage.setItem(CHAVE_ANALISTA, analista.trim())
      } catch {
        // sem localStorage: só não lembra o nome
      }
      await onRegistrar({
        analista: analista.trim(),
        decisao,
        valoresCorrigidos: Object.fromEntries(Object.entries(corrigidos).filter(([, v]) => v.trim() !== '')),
        tempoRevisaoS: decorridoS,
        comentario: comentario.trim(),
      })
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setEnviando(false)
    }
  }

  return (
    <Card>
      <CardCabecalho
        titulo="Conferência"
        sub="Obrigatória em todos os desfechos: o valor só passa de apurado a validado depois dela."
        acao={
          <span className="rounded bg-neutro-2 px-2 py-1 font-mono text-xs text-texto tabular-nums" title="Tempo de revisão">
            ⏱ {duracao(decorridoS)}
          </span>
        }
      />
      <div className="space-y-5 px-5 py-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-texto">Decisão</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {OPCOES.map((o) => (
              <label
                key={o.decisao}
                className={`cursor-pointer rounded border p-3 text-sm ${
                  decisao === o.decisao ? 'border-selecionado bg-neutro-2 ring-1 ring-selecionado' : 'border-borda hover:border-borda'
                }`}
              >
                <input
                  type="radio"
                  name="decisao"
                  className="sr-only"
                  checked={decisao === o.decisao}
                  onChange={() => setDecisao(o.decisao)}
                />
                <span className="font-medium text-enfase">{ROTULO_DECISAO[o.decisao]}</span>
                <span className="mt-1 block text-xs text-texto-sec">{o.ajuda}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {comValor.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-texto">Valores corrigidos</legend>
            <p className="mb-2 text-xs text-texto-sec">Preencha só os valores que você precisou corrigir antes de executar o teste.</p>
            <div className="space-y-2">
              {comValor.map((a) => (
                <div key={a.id} className="grid items-center gap-2 text-sm sm:grid-cols-[3rem_1fr_12rem]">
                  <span className="font-mono text-xs text-texto-sec">A{a.id}</span>
                  <span className="truncate text-texto" title={a.pergunta}>
                    {a.pergunta}
                    <span className="ml-2 font-mono text-xs text-texto-sec">
                      ({valorNoGherkin(a.resultadoReferencia!).split('\n')[0]}
                      {a.resultadoReferencia!.linhas.length > 1 ? ' …' : ''})
                    </span>
                  </span>
                  <input
                    value={corrigidos[a.id] ?? ''}
                    onChange={(e) => setCorrigidos((c) => ({ ...c, [a.id]: e.target.value }))}
                    placeholder="valor correto"
                    className="h-9 rounded border border-borda bg-fundo px-2 text-sm focus:outline-none focus:border-selecionado focus:ring-1 focus:ring-selecionado"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-texto">Analista</span>
            <input
              value={analista}
              onChange={(e) => setAnalista(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded border border-borda bg-fundo px-3 py-2 focus:outline-none focus:border-selecionado focus:ring-1 focus:ring-selecionado"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-texto">Comentário</span>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="O que foi ajustado, ou por que foi rejeitado"
              className="w-full rounded border border-borda bg-fundo px-3 py-2 focus:outline-none focus:border-selecionado focus:ring-1 focus:ring-selecionado"
            />
          </label>
        </div>

        {erro && <p className="text-sm text-erro">{erro}</p>}

        <div className="flex justify-end">
          <Botao onClick={enviar} disabled={!decisao || !analista.trim() || enviando}>
            {enviando ? 'Registrando…' : 'Registrar conferência'}
          </Botao>
        </div>
      </div>
    </Card>
  )
}
