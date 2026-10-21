import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useMatch } from 'react-router-dom'
import { api, modoApi } from '../api'
import { redefinirDadosExemplo } from '../api/mock/mockApi'
import { useCarregar } from '../util/useCarregar'

const icone = (d: string) => (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const LINKS: { para: string; rotulo: string; icone: ReactNode }[] = [
  { para: '/execucoes', rotulo: 'Execuções', icone: icone('M2.5 3.5h11M2.5 8h11M2.5 12.5h7') },
  { para: '/metricas', rotulo: 'Métricas', icone: icone('M3 13V8.5M8 13V3M13 13V6') },
]

const CHAVE_RECOLHIDA = 'plataforma-testes:menu-recolhido'

function lerRecolhida(): boolean {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDA) === '1'
  } catch {
    return false
  }
}

/** O que as páginas recebem do Layout pelo Outlet. */
export interface ContextoLayout {
  recarregarConversas: () => void
}

const ITEM = 'flex items-center gap-2 rounded px-3 py-2 text-sm whitespace-nowrap'
const classeItem = ({ isActive }: { isActive: boolean }) =>
  `${ITEM} ${
    isActive
      ? 'bg-neutro-2 font-bold text-enfase shadow-[inset_3px_0_0_var(--primary)]'
      : 'text-texto hover:bg-neutro-2 hover:text-enfase'
  }`

export function Layout() {
  // o assistente ocupa a altura toda, com a caixa de mensagem presa embaixo
  const inicio = useMatch('/')
  const conversa = useMatch('/conversas/:id')
  const chat = !!(inicio || conversa)
  const conversas = useCarregar(() => api.listarConversas())
  const [recolhida, setRecolhida] = useState(lerRecolhida)

  function alternarMenu() {
    setRecolhida((r) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, r ? '0' : '1')
      } catch {
        // sem localStorage: vale só até recarregar a página
      }
      return !r
    })
  }

  // recolhida, a barra mostra só os ícones (só em telas médias para cima; no celular ela já fica no topo)
  const so = (classe: string) => (recolhida ? `${classe} md:hidden` : classe)

  function redefinir() {
    if (confirm('Apagar as execuções e conversas criadas e voltar aos dados de exemplo?')) {
      redefinirDadosExemplo()
      location.assign(import.meta.env.BASE_URL)
    }
  }

  return (
    <div className={`min-h-screen bg-fundo text-texto md:grid ${recolhida ? 'md:grid-cols-[4rem_1fr]' : 'md:grid-cols-[15rem_1fr]'}`}>
      <aside className="border-b border-borda bg-superficie md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r md:border-b-0">
        <div className={`flex items-start gap-2 py-5 ${recolhida ? 'px-5 md:flex-col md:items-center md:px-0' : 'px-5'}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-bold text-enfase">
              <span className="size-2.5 shrink-0 rounded-sm bg-(--primary)" aria-hidden />
              <span className={so('')}>Plataforma de Testes</span>
            </div>
            <div className={so('text-xs text-texto-sec')}>Cenários e valores apurados para o ERP</div>
          </div>
          <button
            type="button"
            onClick={alternarMenu}
            title={recolhida ? 'Expandir menu' : 'Recolher menu'}
            aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
            className="hidden size-7 shrink-0 items-center justify-center rounded text-texto-sec hover:bg-neutro-2 hover:text-enfase md:flex"
          >
            <svg viewBox="0 0 16 16" className={`size-4 transition-transform ${recolhida ? 'rotate-180' : ''}`} aria-hidden>
              <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          <Link
            to="/"
            title="Nova conversa"
            className={`${ITEM} justify-center bg-marca font-bold text-sobre-marca hover:bg-marca-hover md:mb-2`}
          >
            +<span className={so('')}> Nova conversa</span>
          </Link>
          {LINKS.map((l) => (
            <NavLink
              key={l.para}
              to={l.para}
              title={l.rotulo}
              className={(a) => `${classeItem(a)} ${recolhida ? 'md:justify-center' : ''}`}
            >
              {l.icone}
              <span className={so('')}>{l.rotulo}</span>
            </NavLink>
          ))}
        </nav>

        <div className={`hidden min-h-0 flex-1 flex-col ${recolhida ? '' : 'md:flex'}`}>
          <p className="px-6 pt-5 pb-1 text-xs font-bold text-texto-sec">Histórico</p>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
            {conversas.dados?.map((c) => (
              <NavLink key={c.id} to={`/conversas/${c.id}`} title={c.titulo} className={classeItem}>
                {c.chaveJira ?? 'Nova conversa'}
              </NavLink>
            ))}
            {conversas.dados?.length === 0 && <p className="px-3 text-xs text-texto-sec">Nenhuma conversa ainda.</p>}
          </nav>
        </div>

        {modoApi === 'mock' && (
          <div className={`hidden p-4 ${recolhida ? '' : 'md:block'}`}>
            <div className="rounded bg-aviso-fundo p-3 text-xs text-aviso">
              <p className="font-bold">Dados simulados</p>
              <p className="mt-1">Nenhuma chamada ao Jira, aos modelos ou ao banco.</p>
              <button onClick={redefinir} className="mt-2 font-bold underline">
                Restaurar exemplos
              </button>
            </div>
          </div>
        )}
      </aside>
      <main className={chat ? 'min-w-0' : 'mx-auto w-full max-w-6xl min-w-0 px-4 py-8 sm:px-8'}>
        <Outlet context={{ recarregarConversas: conversas.recarregar } satisfies ContextoLayout} />
      </main>
    </div>
  )
}
