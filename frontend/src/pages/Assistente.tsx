import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { api, type Conversa } from '../api'
import { BalaoAssistente, BalaoUsuario, Compositor, Digitando, IconeIA } from '../components/chat'
import type { ContextoLayout } from '../components/Layout'
import { Carregando, Erro } from '../components/ui'

const SUGESTOES = [
  'Gere os cenários da NMTZ-2048',
  'Gere os cenários da NMTZ-2051 sem a documentação',
  'Como você funciona?',
]

export function Assistente() {
  const param = useParams().id
  const conversaId = param ? Number(param) : null
  const navegar = useNavigate()

  const { recarregarConversas } = useOutletContext<ContextoLayout>()
  const [conversa, setConversa] = useState<Conversa | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState<{ texto: string; enviadaEm: string } | null>(null)
  const [animarId, setAnimarId] = useState<number | null>(null)
  const [versao, setVersao] = useState(0)
  const [usarDoc, setUsarDoc] = useState(true)
  const fim = useRef<HTMLDivElement>(null)

  // Carrega a conversa da rota, a não ser que ela tenha acabado de chegar pelo envio.
  useEffect(() => {
    setErro(null)
    if (conversaId == null) {
      setConversa(null)
      return
    }
    if (conversa?.id === conversaId) return
    let ativo = true
    setConversa(null)
    api
      .obterConversa(conversaId)
      .then((c) => ativo && (setConversa(c), setAnimarId(null)))
      .catch((e: unknown) => ativo && setErro(e instanceof Error ? e.message : String(e)))
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaId])

  // Acompanha o fim da conversa enquanto a resposta aparece, até o usuário rolar para cima.
  const conteudo = useRef<HTMLDivElement>(null)
  const seguir = useRef(true)
  useEffect(() => {
    const el = conteudo.current
    if (!el) return
    const obs = new ResizeObserver(() => seguir.current && fim.current?.scrollIntoView({ block: 'end' }))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  async function enviar(texto: string) {
    setPendente({ texto, enviadaEm: new Date().toISOString() })
    setErro(null)
    seguir.current = true
    try {
      const c = await api.enviarMensagem({ conversaId: conversa?.id ?? null, texto, usarDocumentacao: usarDoc })
      setConversa(c)
      setAnimarId(c.mensagens.at(-1)?.id ?? null)
      setVersao((v) => v + 1)
      if (c.id !== conversaId) navegar(`/conversas/${c.id}`)
      recarregarConversas()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setPendente(null)
    }
  }

  const vazia = conversaId == null && !pendente

  return (
    <div className="flex md:h-screen">
      <section className="flex min-w-0 flex-1 flex-col bg-superficie">
        <div className="flex-1 md:overflow-y-auto" onWheel={(e) => e.deltaY < 0 && (seguir.current = false)}>
          <div ref={conteudo} className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
            {vazia && <BoasVindas onEscolher={enviar} />}

            {conversaId != null && !conversa && !erro && <Carregando />}

            {conversa?.mensagens.map((m) =>
              m.papel === 'USUARIO' ? (
                <BalaoUsuario key={m.id} m={m} />
              ) : (
                <BalaoAssistente key={m.id} m={m} animar={m.id === animarId} versao={versao} />
              ),
            )}

            {pendente && (
              <>
                <BalaoUsuario m={pendente} />
                <Digitando />
              </>
            )}

            {erro && <Erro mensagem={erro} />}
            <div ref={fim} />
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-neutro-3 bg-superficie">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
            <Compositor onEnviar={enviar} desabilitado={!!pendente} usarDoc={usarDoc} onUsarDoc={setUsarDoc} />
          </div>
        </div>
      </section>
    </div>
  )
}

function BoasVindas({ onEscolher }: { onEscolher: (texto: string) => void }) {
  return (
    <div className="pt-6 sm:pt-16">
      <span className="flex size-12 items-center justify-center rounded-full bg-neutro-2 text-(--brand-400)">
        <IconeIA className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-bold text-enfase">Olá! Qual tarefa vamos testar?</h1>
      <p className="mt-2 max-w-xl text-texto">
        Me passe a chave de uma tarefa do Jira. Eu leio o requisito e a documentação da rotina, escrevo os cenários em
        Gherkin e apuro os valores esperados no banco de homologação. Depois a gente conversa sobre o resultado.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {SUGESTOES.map((s) => (
          <button
            key={s}
            onClick={() => onEscolher(s)}
            className="rounded-full bg-superficie px-4 py-2 text-sm text-texto shadow-[inset_0_0_0_1px_var(--border-default)] hover:bg-neutro-2 hover:text-enfase"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
