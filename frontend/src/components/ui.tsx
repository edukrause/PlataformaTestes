import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-borda bg-superficie ${className}`}>{children}</section>
}

/** Moldura em volta de uma seção: borda e fundo levemente mais escuro, com os cartões dentro. */
export function Painel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-borda bg-fundo p-3 ${className}`}>{children}</div>
}

export function CardCabecalho({ titulo, sub, acao }: { titulo: ReactNode; sub?: ReactNode; acao?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutro-3 px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-bold text-enfase">{titulo}</h2>
        {sub && <p className="mt-0.5 text-sm text-texto-sec">{sub}</p>}
      </div>
      {acao}
    </header>
  )
}

export function TituloPagina({ titulo, sub, acao }: { titulo: ReactNode; sub?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-enfase">{titulo}</h1>
        {sub && <p className="mt-1 text-texto-sec">{sub}</p>}
      </div>
      {acao}
    </div>
  )
}

type Variante = 'primario' | 'secundario' | 'fantasma'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca text-sobre-marca hover:bg-marca-hover active:bg-marca-pressionado disabled:opacity-30',
  secundario: 'text-link ring-1 ring-current ring-inset hover:bg-black/5 disabled:opacity-30',
  fantasma: 'text-link hover:bg-black/5 disabled:opacity-30',
}

export function Botao({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm leading-none font-bold disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  )
}

export function Selo({ children, cor }: { children: ReactNode; cor: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs leading-none font-bold whitespace-nowrap ${cor}`}>
      {children}
    </span>
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-texto-sec">
      <span className="size-4 animate-spin rounded-full border-2 border-borda border-t-(--primary)" />
      {texto}
    </div>
  )
}

export function Erro({ mensagem, onTentar }: { mensagem: string; onTentar?: () => void }) {
  return (
    <div className="rounded-lg border border-erro-status bg-erro-fundo p-4 text-sm text-erro">
      <p className="font-medium">Não foi possível carregar.</p>
      <p className="mt-1">{mensagem}</p>
      {onTentar && (
        <Botao variante="secundario" className="mt-3" onClick={onTentar}>
          Tentar de novo
        </Botao>
      )}
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-borda bg-superficie p-8 text-center text-texto-sec">{children}</div>
}
