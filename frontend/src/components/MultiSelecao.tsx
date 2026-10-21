import { useEffect, useRef, useState } from 'react'

export interface Opcao<T extends string> {
  valor: T
  rotulo: string
  /** Quantidade de itens com essa opção, mostrada ao lado do rótulo. */
  qtd?: number
}

/** Lista suspensa com caixas de seleção. Nada marcado equivale a todos. */
export function MultiSelecao<T extends string>({
  rotulo,
  todos,
  opcoes,
  selecionados,
  onMudar,
}: {
  rotulo: string
  /** Texto do botão quando nada está marcado, por exemplo "Todos os módulos". */
  todos: string
  opcoes: Opcao<T>[]
  selecionados: T[]
  onMudar: (v: T[]) => void
}) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

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

  const alternar = (v: T) =>
    onMudar(selecionados.includes(v) ? selecionados.filter((s) => s !== v) : [...selecionados, v])

  const marcadas = opcoes.filter((o) => selecionados.includes(o.valor))
  const resumo =
    marcadas.length === 0 || marcadas.length === opcoes.length
      ? todos
      : marcadas.length <= 2
        ? marcadas.map((o) => o.rotulo).join(', ')
        : `${marcadas.length} selecionados`

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={`flex h-10 items-center gap-2 rounded border bg-superficie px-3 text-sm hover:border-selecionado ${aberto ? 'border-selecionado ring-1 ring-selecionado' : 'border-borda'}`}
      >
        <span className="text-texto-sec">{rotulo}:</span>
        <span className="font-medium text-enfase">{resumo}</span>
        <svg viewBox="0 0 12 12" className={`size-3 text-texto-sec transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {aberto && (
        <div className="absolute left-0 z-20 mt-1 w-64 rounded-lg border border-borda bg-superficie py-1 text-sm shadow-lg">
          <ul role="listbox" aria-multiselectable>
            {opcoes.map((o) => (
              <li key={o.valor}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-neutro-2">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(o.valor)}
                    onChange={() => alternar(o.valor)}
                    className="size-4 accent-(--primary)"
                  />
                  <span className="flex-1 text-texto">{o.rotulo}</span>
                  {o.qtd != null && <span className="text-xs text-texto-sec tabular-nums">{o.qtd}</span>}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex justify-between border-t border-neutro-3 px-3 pt-2 pb-1 text-xs">
            <button type="button" onClick={() => onMudar(opcoes.map((o) => o.valor))} className="font-bold text-link hover:underline">
              Marcar todos
            </button>
            <button type="button" onClick={() => onMudar([])} className="font-bold text-link hover:underline disabled:opacity-40" disabled={!selecionados.length}>
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
