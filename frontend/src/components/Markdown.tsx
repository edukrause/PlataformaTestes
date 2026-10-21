import { Fragment, type ReactNode } from 'react'
import { GherkinView } from './GherkinView'
import { SqlView } from './SqlView'

/**
 * Markdown mínimo das respostas do assistente: parágrafos, listas com "- ",
 * **negrito**, `código` e blocos ```gherkin / ```sql.
 */
export function Markdown({ texto }: { texto: string }) {
  const partes = texto.split(/```(\w*)\n([\s\S]*?)(?:```|$)/g)
  const blocos: ReactNode[] = []
  for (let i = 0; i < partes.length; i += 3) {
    blocos.push(...paragrafos(partes[i], i))
    if (i + 2 < partes.length) {
      const [lang, codigo] = [partes[i + 1], partes[i + 2].replace(/\n$/, '')]
      blocos.push(
        lang === 'sql' ? (
          <SqlView key={`c${i}`} sql={codigo} />
        ) : (
          <GherkinView key={`c${i}`} texto={codigo} valores={{}} />
        ),
      )
    }
  }
  return <div className="space-y-3">{blocos}</div>
}

function paragrafos(texto: string, base: number): ReactNode[] {
  return texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, j) => {
      const linhas = p.split('\n')
      const itens = linhas.filter((l) => l.startsWith('- '))
      const chave = `${base}-${j}`
      if (itens.length === 0) return <p key={chave}>{linhas.map((l, k) => <Fragment key={k}>{k > 0 && <br />}{inline(l)}</Fragment>)}</p>
      // um parágrafo pode abrir com uma linha de texto e seguir com a lista
      const intro = linhas.filter((l) => !l.startsWith('- '))
      return (
        <div key={chave}>
          {intro.length > 0 && <p className="mb-1">{inline(intro.join(' '))}</p>}
          <ul className="list-disc space-y-1 pl-5 marker:text-texto-sec">
            {itens.map((l, k) => <li key={k}>{inline(l.slice(2))}</li>)}
          </ul>
        </div>
      )
    })
}

function inline(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((t, i) => {
    if (t.startsWith('**') && t.endsWith('**')) return <strong key={i} className="font-bold text-enfase">{t.slice(2, -2)}</strong>
    if (t.startsWith('`') && t.endsWith('`'))
      return <code key={i} className="rounded bg-neutro-3 px-1 py-0.5 font-mono text-[0.85em] text-enfase">{t.slice(1, -1)}</code>
    return <Fragment key={i}>{t}</Fragment>
  })
}
