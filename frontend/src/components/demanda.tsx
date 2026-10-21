import { useEffect, useRef, useState } from 'react'
import { api, type Demanda, type StatusDemanda } from '../api'
import { data, diasAte, ROTULO_STATUS_DEMANDA } from '../util/formato'

const ORDEM: StatusDemanda[] = ['A_FAZER', 'EM_DESENVOLVIMENTO', 'AGUARDANDO_TESTE', 'EM_TESTE', 'REPROVADA', 'FINALIZADA']

const COR_STATUS: Record<StatusDemanda, { selo: string; ponto: string }> = {
  A_FAZER: { selo: 'bg-neutro-2 text-texto', ponto: 'bg-neutro-4' },
  EM_DESENVOLVIMENTO: { selo: 'bg-info-fundo text-info', ponto: 'bg-info-status' },
  AGUARDANDO_TESTE: { selo: 'bg-aviso-fundo text-aviso', ponto: 'bg-aviso-status' },
  EM_TESTE: { selo: 'bg-indigo-fundo text-indigo-texto', ponto: 'bg-indigo-texto' },
  REPROVADA: { selo: 'bg-erro-fundo text-erro', ponto: 'bg-erro-status' },
  FINALIZADA: { selo: 'bg-sucesso-fundo text-sucesso', ponto: 'bg-sucesso-status' },
}

/** Situação da demanda; ao clicar, abre a lista para mudar. */
export function StatusDemandaMenu({ demanda, onAlterada }: { demanda: Demanda; onAlterada: (d: Demanda) => void }) {
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const raiz = useRef<HTMLDivElement>(null)

  // fecha ao clicar fora ou com Esc
  useEffect(() => {
    if (!aberto) return
    const fora = (ev: MouseEvent) => raiz.current && !raiz.current.contains(ev.target as Node) && setAberto(false)
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  async function escolher(status: StatusDemanda) {
    setAberto(false)
    if (status === demanda.status) return
    setSalvando(true)
    setErro(null)
    try {
      onAlterada(await api.alterarStatusDemanda(demanda.chaveJira, status))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  const cor = COR_STATUS[demanda.status]
  return (
    <div ref={raiz} className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        disabled={salvando}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        title="Mudar a situação da demanda"
        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs leading-none font-bold whitespace-nowrap hover:brightness-95 disabled:opacity-60 ${cor.selo}`}
      >
        <span className={`size-1.5 rounded-full ${cor.ponto} ${salvando ? 'animate-pulse' : ''}`} />
        {ROTULO_STATUS_DEMANDA[demanda.status]}
        <svg viewBox="0 0 12 12" className={`size-3 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {aberto && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-borda bg-superficie py-1 text-sm shadow-lg"
        >
          {ORDEM.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={s === demanda.status}
                onClick={() => escolher(s)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-neutro-2 ${s === demanda.status ? 'font-bold text-enfase' : 'text-texto'}`}
              >
                <span className={`size-2 shrink-0 rounded-full ${COR_STATUS[s].ponto}`} />
                <span className="flex-1">{ROTULO_STATUS_DEMANDA[s]}</span>
                {s === demanda.status && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && <p className="absolute right-0 mt-1 text-xs whitespace-nowrap text-erro">{erro}</p>}
    </div>
  )
}

/** Prazo com o quanto falta; o destaque some quando a demanda já foi finalizada. */
export function Prazo({ demanda }: { demanda: Demanda }) {
  if (!demanda.prazo) return <span className="text-texto-sec">sem prazo</span>
  const dias = diasAte(demanda.prazo)
  const finalizada = demanda.status === 'FINALIZADA'
  const [texto, cor] = finalizada
    ? ['', '']
    : dias < 0
      ? [dias === -1 ? 'atrasada há 1 dia' : `atrasada há ${-dias} dias`, 'text-erro']
      : dias === 0
        ? ['vence hoje', 'text-aviso']
        : [dias === 1 ? 'amanhã' : `em ${dias} dias`, dias <= 2 ? 'text-aviso' : 'text-texto-sec']
  return (
    <span>
      {data(demanda.prazo)}
      {texto && <span className={`ml-1.5 text-xs font-bold ${cor}`}>{texto}</span>}
    </span>
  )
}

/** Caminho da página no NID, com o nome da página em destaque. */
export function CaminhoDocumentacao({ referencia }: { referencia: string | null }) {
  if (!referencia) return <span className="text-aviso">não usada</span>
  const partes = referencia.split('/').map((p) => p.trim())
  const pagina = partes.pop()
  return (
    <span title={referencia}>
      <span className="font-medium text-enfase">{pagina}</span>
      {partes.length > 0 && <span className="ml-1.5 text-xs text-texto-sec">{partes.join(' › ')}</span>}
    </span>
  )
}
