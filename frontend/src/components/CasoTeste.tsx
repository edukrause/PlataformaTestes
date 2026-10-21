import { Fragment, useState } from 'react'
import type { Cenario, ExecucaoTeste, ResultadoTeste } from '../api'
import { dataHora } from '../util/formato'
import type { Valores } from './GherkinView'
import { Painel, Selo } from './ui'

const PALAVRA = /^\s*(Dado que|Dada|Dado|Quando|Então|E|Mas)(\s|$)/

/** Todos os casos completos, um embaixo do outro, numa área com rolagem interna. */
export function CasosTeste({
  cenarios,
  valores,
  onExecucao,
}: {
  cenarios: Cenario[]
  valores: Valores
  onExecucao?: (cenarioId: number, execucao: ExecucaoTeste | null) => void
}) {
  return (
    <Painel className="max-h-[36rem] space-y-4 overflow-y-auto">
      {cenarios.map((c, i) => (
        <CasoTeste
          key={c.id}
          numero={i + 1}
          cenario={c}
          valores={valores}
          onExecucao={onExecucao && ((e) => onExecucao(c.id, e))}
        />
      ))}
    </Painel>
  )
}

/** Caso de teste no padrão da NMTZ: "Cenário N – título", passos com a palavra-chave em negrito e o resultado esperado. */
export function CasoTeste({
  numero,
  cenario,
  valores,
  onExecucao,
}: {
  numero: number
  cenario: Cenario
  valores: Valores
  /** Sem ela, o caso só é exibido (como na conversa do assistente). */
  onExecucao?: (execucao: ExecucaoTeste | null) => void
}) {
  // marcação otimista: o checkbox responde na hora e a tela recarrega depois
  const [pendente, setPendente] = useState<{ valor: ExecucaoTeste | null }>()
  const [base, setBase] = useState(cenario.execucaoTeste)
  if (base !== cenario.execucaoTeste) {
    // chegou a versão recarregada: ela passa a valer no lugar da marcação otimista
    setBase(cenario.execucaoTeste)
    setPendente(undefined)
  }
  const execucao = pendente ? pendente.valor : (cenario.execucaoTeste ?? null)

  function marcar(executado: boolean) {
    const nova: ExecucaoTeste | null = executado
      ? {
          resultado: 'PASSOU',
          passos: linhas(cenario.gherkin).map(() => 'PASSOU'),
          observacao: '',
          executadoPor: 'Analista 1',
          executadoEm: new Date().toISOString(),
        }
      : null
    setPendente({ valor: nova })
    onExecucao?.(nova)
  }

  return (
    <article className="rounded-lg border border-borda bg-superficie">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutro-3 px-5 py-3">
        <h3 className="min-w-0 flex-1 font-bold text-enfase">
          Cenário {numero} – {cenario.titulo}
        </h3>
        <Selo cor={cenario.tipo === 'ALTERACAO' ? 'bg-indigo-fundo text-indigo-texto' : 'bg-neutro-2 text-texto'}>
          {cenario.tipo === 'ALTERACAO' ? 'Alteração' : 'Regressão'}
        </Selo>
        {!cenario.sintaxeValida && <Selo cor="bg-erro-fundo text-erro">Gherkin inválido</Selo>}
        {execucao && <Selo cor={RESULTADO[execucao.resultado].selo}>{RESULTADO[execucao.resultado].rotulo}</Selo>}
        {onExecucao && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs font-bold text-texto select-none hover:bg-neutro-2">
            <input
              type="checkbox"
              checked={!!execucao}
              onChange={(e) => marcar(e.target.checked)}
              className="size-4 cursor-pointer accent-(--primary)"
            />
            Executado
          </label>
        )}
      </header>

      <ul className="space-y-1.5 px-5 py-4 text-sm leading-relaxed text-texto">
        {linhas(cenario.gherkin).map((l, i) => (
          <Passo key={i} linha={l} valores={valores} />
        ))}
      </ul>

      <div className="mx-5 mb-5 rounded-lg bg-fundo px-4 py-3 text-sm">
        <p className="mb-1 font-bold text-enfase">Resultado esperado</p>
        <p className="leading-relaxed text-texto">
          <Trecho texto={cenario.resultadoEsperado} valores={valores} />
        </p>
      </div>

      {execucao && (
        <div className={`mx-5 mb-5 rounded-lg border px-4 py-3 text-sm ${RESULTADO[execucao.resultado].caixa}`}>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold text-enfase">Execução</span>
            <span className={`font-bold ${RESULTADO[execucao.resultado].texto}`}>
              {RESULTADO[execucao.resultado].rotulo}
            </span>
            <span className="text-xs text-texto-sec">
              por {execucao.executadoPor} em {dataHora(execucao.executadoEm)}
            </span>
          </p>
          {execucao.observacao && <p className="mt-1 leading-relaxed text-texto">{execucao.observacao}</p>}
        </div>
      )}
    </article>
  )
}

function Passo({ linha, valores }: { linha: string; valores: Valores }) {
  const m = linha.match(PALAVRA)
  const resto = m ? linha.slice(m[0].length) : linha.trim()
  // marcador sozinho na linha com valor em tabela: mostra a tabela apurada
  const sozinho = linha.match(/^\s*«A(\d+)»\s*$/)
  const tabela = sozinho ? valores[Number(sozinho[1])] : null
  const conteudo = tabela?.includes('\n') ? (
    <div className="py-1"><TabelaValor texto={tabela} /></div>
  ) : (
    <span>
      {m && <strong className="font-bold text-enfase">{m[1]} </strong>}
      <Trecho texto={resto} valores={valores} />
    </span>
  )
  return <li>{conteudo}</li>
}

const RESULTADO: Record<ResultadoTeste, { rotulo: string; selo: string; texto: string; caixa: string }> = {
  PASSOU: { rotulo: 'Passou', selo: 'bg-sucesso-fundo text-sucesso', texto: 'text-sucesso', caixa: 'border-sucesso-status/40 bg-sucesso-fundo' },
  FALHOU: { rotulo: 'Falhou', selo: 'bg-erro-fundo text-erro', texto: 'text-erro', caixa: 'border-erro-status/40 bg-erro-fundo' },
  BLOQUEADO: { rotulo: 'Bloqueado', selo: 'bg-aviso-fundo text-aviso', texto: 'text-aviso', caixa: 'border-aviso-status/40 bg-aviso-fundo' },
}

/** Coloca os valores apurados no texto e destaca textos entre aspas e o caminho do menu (ERP » ...). */
function Trecho({ texto, valores }: { texto: string; valores: Valores }) {
  const partes = texto.split(/(«A\d+»|"[^"]*"|ERP(?: » [^,.]+?)+(?=$|,|\.| e | com | para ))/g)
  return (
    <>
      {partes.map((p, i) => {
        const marcador = p.match(/^«A(\d+)»$/)
        if (marcador) {
          const id = Number(marcador[1])
          const v = valores[id]
          // valor apurado entra como texto normal do passo; sem consenso, não mostra nada
          return v != null ? (
            <strong key={i} className="font-bold text-enfase">{v.includes('\n') ? 'tabela abaixo' : v}</strong>
          ) : (
            null
          )
        }
        if (p.startsWith('ERP »')) return <em key={i} className="text-enfase">{p}</em>
        if (p.startsWith('"')) return <span key={i} className="font-medium text-enfase">{p}</span>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

/** Valor em tabela (formato Gherkin "| a | b |") mostrado como tabela de verdade. */
function TabelaValor({ texto }: { texto: string }) {
  const [cab, ...linhasTab] = texto.split('\n').map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
  return (
    <table className="overflow-hidden rounded border border-borda text-sm">
      <thead className="bg-neutro-2 text-left text-xs text-texto-sec">
        <tr>{cab.map((c, i) => <th key={i} className="px-3 py-1.5 font-bold">{c}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-neutro-3">
        {linhasTab.map((l, i) => (
          <tr key={i}>{l.map((c, j) => <td key={j} className="px-3 py-1.5 tabular-nums text-enfase">{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

const linhas = (gherkin: string) => gherkin.split('\n').filter((l) => l.trim() !== '')

// ───────────── cópia para o campo "Casos de teste" do Jira ─────────────

const valorTexto = (v: string | null | undefined) => (v == null ? '' : v)
const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const trocarMarcadores = (s: string, valores: Valores, html: boolean) =>
  s.replace(/«A(\d+)»/g, (_, id) => {
    const v = valorTexto(valores[Number(id)])
    return html ? `<strong>${escapar(v)}</strong>` : v
  })

/** Texto em Markdown, igual ao que se digita no Jira. */
function casosParaMarkdown(cenarios: Cenario[], valores: Valores): string {
  return cenarios
    .map((c, n) => {
      const passos = linhas(c.gherkin).map((l) => {
        const m = l.match(PALAVRA)
        const resto = trocarMarcadores(m ? l.slice(m[0].length) : l.trim(), valores, false)
        return m ? `**${m[1]}** ${resto}  ` : resto
      })
      return [
        `**Cenário ${n + 1} – ${c.titulo}**`,
        '',
        ...passos,
        '',
        '**Resultado Esperado:**  ',
        trocarMarcadores(c.resultadoEsperado, valores, false),
      ].join('\n')
    })
    .join('\n\n')
}

/** Mesmo conteúdo em HTML, para o editor do Jira colar já formatado. */
function casosParaHtml(cenarios: Cenario[], valores: Valores): string {
  return cenarios
    .map((c, n) => {
      const passos = linhas(c.gherkin).map((l) => {
        const sozinho = l.match(/^\s*«A(\d+)»\s*$/)
        const v = sozinho ? valores[Number(sozinho[1])] : null
        if (v?.includes('\n')) {
          const [cab, ...ls] = v.split('\n').map((x) => x.split('|').slice(1, -1).map((y) => escapar(y.trim())))
          return `<table><tr>${cab.map((x) => `<th>${x}</th>`).join('')}</tr>${ls
            .map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join('')}</tr>`)
            .join('')}</table>`
        }
        const m = l.match(PALAVRA)
        const resto = trocarMarcadores(escapar(m ? l.slice(m[0].length) : l.trim()), valores, true)
        return m ? `<strong>${m[1]}</strong> ${resto}<br>` : `${resto}<br>`
      })
      return [
        `<p><strong>Cenário ${n + 1} – ${escapar(c.titulo)}</strong></p>`,
        `<p>${passos.join('')}</p>`,
        `<p><strong>Resultado Esperado:</strong><br>${trocarMarcadores(escapar(c.resultadoEsperado), valores, true)}</p>`,
      ].join('')
    })
    .join('')
}

/** Copia os casos de teste formatados (HTML e texto) para colar no campo do Jira. */
export function BotaoCopiarJira({ cenarios, valores }: { cenarios: Cenario[]; valores: Valores }) {
  const [estado, setEstado] = useState<'pronto' | 'copiado' | 'erro'>('pronto')

  async function copiar() {
    const texto = casosParaMarkdown(cenarios, valores)
    try {
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([casosParaHtml(cenarios, valores)], { type: 'text/html' }),
            'text/plain': new Blob([texto], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(texto)
      }
      setEstado('copiado')
    } catch {
      setEstado('erro')
    }
    setTimeout(() => setEstado('pronto'), 2500)
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copia os casos no formato do campo Casos de teste do Jira"
      className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-bold text-link ring-1 ring-current ring-inset hover:bg-black/5"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {estado === 'copiado' ? 'Copiado!' : estado === 'erro' ? 'Não foi possível copiar' : 'Copiar para o Jira'}
    </button>
  )
}
