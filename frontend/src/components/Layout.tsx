import { Link, NavLink, Outlet, useMatch } from 'react-router-dom'
import { api, modoApi } from '../api'
import { redefinirDadosExemplo } from '../api/mock/mockApi'
import { useCarregar } from '../util/useCarregar'

const LINKS = [
  { para: '/execucoes', rotulo: 'Execuções' },
  { para: '/metricas', rotulo: 'Métricas' },
]

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

  function redefinir() {
    if (confirm('Apagar as execuções e conversas criadas e voltar aos dados de exemplo?')) {
      redefinirDadosExemplo()
      location.assign('/')
    }
  }

  return (
    <div className="min-h-screen bg-fundo text-texto md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-borda bg-superficie md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r md:border-b-0">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2 font-bold text-enfase">
            <span className="size-2.5 rounded-sm bg-(--primary)" aria-hidden />
            Plataforma de Testes
          </div>
          <div className="text-xs text-texto-sec">Cenários e valores apurados para o ERP</div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          <Link
            to="/"
            className={`${ITEM} justify-center bg-marca font-bold text-sobre-marca hover:bg-marca-hover md:mb-2`}
          >
            + Nova conversa
          </Link>
          {LINKS.map((l) => (
            <NavLink key={l.para} to={l.para} className={classeItem}>
              {l.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="hidden min-h-0 flex-1 flex-col md:flex">
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
          <div className="hidden p-4 md:block">
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
