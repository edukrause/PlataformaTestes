import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, type Etapa, type Execucao, type Mensagem } from '../api'
import { dataHora, ROTULO_ETAPA, usd, valorNoGherkin } from '../util/formato'
import { CasoTeste } from './CasoTeste'
import type { Valores } from './GherkinView'
import { Markdown } from './Markdown'
import { SeloArea, SeloDesfecho } from './selos'
import { Selo } from './ui'

// Ícone de brilho do Filt IA (Figma: IA - Mensagem).
const BRILHO =
  'M 15.003 10.625 C 15.005 10.88 14.927 11.129 14.782 11.338 C 14.636 11.547 14.429 11.706 14.189 11.792 L 10.159 13.281 L 8.675 17.314 C 8.587 17.553 8.428 17.759 8.219 17.905 C 8.011 18.05 7.762 18.128 7.508 18.128 C 7.253 18.128 7.005 18.05 6.796 17.905 C 6.588 17.759 6.429 17.553 6.341 17.314 L 4.847 13.281 L 0.814 11.797 C 0.575 11.709 0.369 11.55 0.224 11.341 C 0.078 11.133 0 10.884 0 10.63 C 0 10.375 0.078 10.127 0.224 9.918 C 0.369 9.709 0.575 9.55 0.814 9.462 L 4.847 7.969 L 6.331 3.936 C 6.419 3.697 6.578 3.491 6.787 3.345 C 6.996 3.2 7.244 3.122 7.498 3.122 C 7.753 3.122 8.001 3.2 8.21 3.345 C 8.419 3.491 8.578 3.697 8.666 3.936 L 10.159 7.969 L 14.192 9.453 C 14.432 9.54 14.639 9.7 14.784 9.91 C 14.929 10.12 15.006 10.37 15.003 10.625 Z M 10.628 3.125 L 11.878 3.125 L 11.878 4.375 C 11.878 4.541 11.944 4.7 12.061 4.817 C 12.178 4.934 12.337 5 12.503 5 C 12.669 5 12.828 4.934 12.945 4.817 C 13.062 4.7 13.128 4.541 13.128 4.375 L 13.128 3.125 L 14.378 3.125 C 14.544 3.125 14.703 3.059 14.82 2.942 C 14.937 2.825 15.003 2.666 15.003 2.5 C 15.003 2.334 14.937 2.175 14.82 2.058 C 14.703 1.941 14.544 1.875 14.378 1.875 L 13.128 1.875 L 13.128 0.625 C 13.128 0.459 13.062 0.3 12.945 0.183 C 12.828 0.066 12.669 0 12.503 0 C 12.337 0 12.178 0.066 12.061 0.183 C 11.944 0.3 11.878 0.459 11.878 0.625 L 11.878 1.875 L 10.628 1.875 C 10.462 1.875 10.303 1.941 10.186 2.058 C 10.069 2.175 10.003 2.334 10.003 2.5 C 10.003 2.666 10.069 2.825 10.186 2.942 C 10.303 3.059 10.462 3.125 10.628 3.125 Z M 17.503 5.625 L 16.878 5.625 L 16.878 5 C 16.878 4.834 16.812 4.675 16.695 4.558 C 16.578 4.441 16.419 4.375 16.253 4.375 C 16.087 4.375 15.928 4.441 15.811 4.558 C 15.694 4.675 15.628 4.834 15.628 5 L 15.628 5.625 L 15.003 5.625 C 14.837 5.625 14.678 5.691 14.561 5.808 C 14.444 5.925 14.378 6.084 14.378 6.25 C 14.378 6.416 14.444 6.575 14.561 6.692 C 14.678 6.809 14.837 6.875 15.003 6.875 L 15.628 6.875 L 15.628 7.5 C 15.628 7.666 15.694 7.825 15.811 7.942 C 15.928 8.059 16.087 8.125 16.253 8.125 C 16.419 8.125 16.578 8.059 16.695 7.942 C 16.812 7.825 16.878 7.666 16.878 7.5 L 16.878 6.875 L 17.503 6.875 C 17.669 6.875 17.828 6.809 17.945 6.692 C 18.062 6.575 18.128 6.416 18.128 6.25 C 18.128 6.084 18.062 5.925 17.945 5.808 C 17.828 5.691 17.669 5.625 17.503 5.625 Z'

export function IconeIA({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 18.128 18.128" className={className} aria-hidden>
      <path d={BRILHO} fill="currentColor" />
    </svg>
  )
}

function AvatarIA() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutro-2 text-(--brand-400)">
      <IconeIA />
    </span>
  )
}

const horario = (iso: string) => `Enviado em ${dataHora(iso)}`

export function BalaoUsuario({ m }: { m: Pick<Mensagem, 'texto' | 'enviadaEm'> }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[85%] min-w-0 sm:max-w-[75%]">
        <div className="rounded-lg bg-superficie/70 p-3 text-sm leading-relaxed whitespace-pre-wrap text-texto shadow-[inset_0_0_0_1px_var(--border-default)]">
          {m.texto}
        </div>
        <p className="mt-1 text-right text-[11px] text-texto-sec">{horario(m.enviadaEm)}</p>
      </div>
      <span className="size-8 shrink-0 rounded-full bg-neutro-4" aria-hidden />
    </div>
  )
}

/** Resposta do assistente. Com `animar`, o texto aparece aos poucos, como num modelo gerando a resposta. */
export function BalaoAssistente({ m, animar = false, versao }: { m: Mensagem; animar?: boolean; versao: number }) {
  const [mostrados, setMostrados] = useState(animar ? 0 : m.texto.length)
  const [copiado, setCopiado] = useState(false)
  const completo = mostrados >= m.texto.length

  useEffect(() => {
    if (completo) return
    const t = setTimeout(() => setMostrados((n) => n + Math.max(3, Math.ceil(m.texto.length / 120))), 16)
    return () => clearTimeout(t)
  }, [mostrados, completo, m.texto.length])

  function copiar() {
    navigator.clipboard?.writeText(m.texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    })
  }

  return (
    <div className="flex gap-3">
      <AvatarIA />
      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-fundo/50 p-3 text-sm leading-relaxed text-texto">
          <Markdown texto={m.texto.slice(0, mostrados)} />
          {completo && m.execucaoId != null && (
            <div className="mt-3">
              <ExecucaoNoChat id={m.execucaoId} versao={versao} />
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-texto-sec">
          <span>{horario(m.enviadaEm)}</span>
          {completo && (
            <button onClick={copiar} className="rounded px-1.5 py-0.5 hover:bg-neutro-2 hover:text-enfase">
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function Digitando() {
  return (
    <div className="flex gap-3" aria-live="polite">
      <AvatarIA />
      <div className="flex items-center gap-1 rounded-lg bg-fundo/50 px-4 py-3">
        <span className="sr-only">O assistente está escrevendo</span>
        {[0, 150, 300].map((d) => (
          <span key={d} className="size-1.5 animate-bounce rounded-full bg-texto-sec" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )
}

const ETAPAS: Etapa[] = ['COLETA', 'CENARIOS', 'APURACAO', 'COMPOSICAO']

/** Cartão da execução dentro da resposta: andamento enquanto roda, depois os cenários e os valores apurados. */
function ExecucaoNoChat({ id, versao }: { id: number; versao: number }) {
  const [exec, setExec] = useState<Execucao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [tique, setTique] = useState(0)

  useEffect(() => {
    let ativo = true
    api
      .obterExecucao(id)
      .then((e) => ativo && setExec(e))
      .catch((e: unknown) => ativo && setErro(e instanceof Error ? e.message : String(e)))
    return () => {
      ativo = false
    }
  }, [id, versao, tique])

  // enquanto a execução roda, consulta de novo a cada segundo
  useEffect(() => {
    if (exec?.status !== 'EM_ANDAMENTO') return
    const t = setTimeout(() => setTique((v) => v + 1), 1000)
    return () => clearTimeout(t)
  }, [exec])

  if (erro) return <p className="text-erro">{erro}</p>
  if (!exec) return <div className="h-24 animate-pulse rounded-lg bg-neutro-2" />

  const { tarefa } = exec
  const concluida = exec.status === 'CONCLUIDA'
  const valores: Valores = Object.fromEntries(
    exec.apuracoes.map((a) => [a.id, a.resultadoReferencia ? valorNoGherkin(a.resultadoReferencia) : null]),
  )

  return (
    <div className="overflow-hidden rounded-lg border border-borda bg-superficie">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutro-3 px-4 py-3">
        <span className="font-mono text-xs text-texto-sec">{tarefa.chaveJira}</span>
        <SeloArea area={tarefa.area} />
        {!tarefa.documentacaoRef && <Selo cor="bg-aviso-fundo text-aviso">Sem documentação</Selo>}
        <span className="w-full truncate font-bold text-enfase">{tarefa.titulo}</span>
      </div>

      {!concluida ? (
        <ol className="space-y-2 px-4 py-3">
          {ETAPAS.map((e, i) => {
            const atual = ETAPAS.indexOf(exec.etapa)
            const estado = i < atual ? 'feito' : i === atual ? 'rodando' : 'pendente'
            return (
              <li key={e} className="flex items-center gap-2">
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    estado === 'feito'
                      ? 'bg-sucesso-status text-superficie'
                      : estado === 'rodando'
                        ? 'bg-marca text-sobre-marca'
                        : 'bg-neutro-2 text-texto-sec'
                  }`}
                >
                  {estado === 'feito' ? '✓' : i + 1}
                </span>
                <span className={estado === 'rodando' ? 'font-bold text-enfase' : estado === 'feito' ? 'text-texto' : 'text-texto-sec'}>
                  {ROTULO_ETAPA[e]}
                  {estado === 'rodando' && <span className="animate-pulse">…</span>}
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <>
          <div className="space-y-2 px-4 py-3">
            {exec.cenarios.map((c) => (
              <details key={c.id} className="group/cen">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded px-1 py-1 select-none hover:bg-fundo">
                  <span className="text-texto-sec transition group-open/cen:rotate-90">›</span>
                  <span className="min-w-0 flex-1 truncate text-enfase">{c.titulo}</span>
                  <Selo cor={c.tipo === 'ALTERACAO' ? 'bg-indigo-fundo text-indigo-texto' : 'bg-neutro-2 text-texto'}>
                    {c.tipo === 'ALTERACAO' ? 'Alteração' : 'Regressão'}
                  </Selo>
                </summary>
                <div className="mt-2">
                  <CasoTeste numero={exec.cenarios.indexOf(c) + 1} cenario={c} valores={valores} />
                </div>
              </details>
            ))}
          </div>
          {exec.apuracoes.length > 0 && (
            <ul className="space-y-1.5 border-t border-neutro-3 px-4 py-3">
              {exec.apuracoes.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-xs text-texto-sec">A{a.id}</span>
                  <span className="min-w-0 flex-1 truncate" title={a.pergunta}>{a.pergunta}</span>
                  <span className="font-mono text-enfase">
                    {a.resultadoReferencia ? valorNoGherkin(a.resultadoReferencia).split('\n')[0] : '—'}
                  </span>
                  <SeloDesfecho desfecho={a.desfecho} />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-neutro-3 bg-fundo px-4 py-3">
            <span className="mr-auto text-xs text-texto-sec">
              {exec.cenarios.length} cenários · {usd(exec.custoTotalUsd)}
              {exec.revisao ? ' · conferida' : ' · aguardando conferência'}
            </span>
            <Link to={`/execucoes/${exec.id}`} className="rounded px-3 py-2 text-xs font-bold text-link hover:bg-black/5">
              Ver detalhes
            </Link>
            {!exec.revisao && (
              <Link
                to={`/execucoes/${exec.id}#conferencia`}
                className="rounded bg-marca px-3 py-2 text-xs font-bold text-sobre-marca hover:bg-marca-hover"
              >
                Conferir
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** Caixa de mensagem no estilo do campo do Filt IA. Enter envia, Shift+Enter quebra a linha. */
export function Compositor({
  onEnviar,
  desabilitado,
  usarDoc,
  onUsarDoc,
}: {
  onEnviar: (texto: string) => void
  desabilitado: boolean
  usarDoc: boolean
  onUsarDoc: (v: boolean) => void
}) {
  const [texto, setTexto] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [texto])

  useEffect(() => {
    if (!desabilitado) ref.current?.focus()
  }, [desabilitado])

  function enviar(e?: FormEvent) {
    e?.preventDefault()
    if (!texto.trim() || desabilitado) return
    onEnviar(texto)
    setTexto('')
  }

  function teclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) enviar(e)
  }

  return (
    <form onSubmit={enviar}>
      <div className="rounded-lg bg-fundo p-2 shadow-[inset_0_0_0_1px_var(--border-default)] focus-within:shadow-[inset_0_0_0_1px_var(--border-selected)]">
        <div className="flex items-end gap-2">
          <span className="mb-2.5 ml-2 text-texto-sec">
            <IconeIA />
          </span>
          <textarea
            ref={ref}
            rows={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={teclar}
            placeholder="Converse com a plataforma… ex.: gere os cenários da NMTZ-1234"
            className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm text-enfase placeholder:text-texto-sec focus:outline-none"
          />
          <button
            type="submit"
            disabled={!texto.trim() || desabilitado}
            title="Enviar"
            className="flex size-10 shrink-0 items-center justify-center rounded bg-marca text-sobre-marca hover:bg-marca-hover disabled:opacity-30"
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-texto-sec">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={usarDoc} onChange={(e) => onUsarDoc(e.target.checked)} className="accent-(--primary)" />
          Usar a documentação da rotina (Confluence)
        </label>
        <span>Os valores só valem depois da conferência do analista.</span>
      </div>
    </form>
  )
}
