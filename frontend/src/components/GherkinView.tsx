import { Fragment } from 'react'

const PALAVRAS = /^(\s*)(Funcionalidade:|Contexto:|Cenário:|Esquema do Cenário:|Exemplos:|Dado|Dada|Quando|Então|E|Mas)(\s|$)/

/** Valor que substitui um marcador «A<id>»: texto já formatado, ou null quando não há valor de referência. */
export type Valores = Record<number, string | null>

export function GherkinView({ texto, valores }: { texto: string; valores: Valores }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-(--gray-950) p-4 font-mono text-[13px] leading-6 text-(--gray-100)">
      {texto.split('\n').map((linha, i) => {
        // valor em várias linhas (tabela Gherkin) ocupa linhas próprias, com o recuo do marcador
        const tabela = linha.match(/^(\s*)«A(\d+)»\s*$/)
        const valor = tabela ? valores[Number(tabela[2])] : null
        if (tabela && valor?.includes('\n')) {
          return valor.split('\n').map((l, j) => (
            <div key={`${i}-${j}`}>
              {tabela[1]}
              <a
                href={`#apuracao-${tabela[2]}`}
                title="Valores apurados. Clique para ver as consultas."
                className="text-(--mint-400) hover:underline"
              >
                {l}
              </a>
            </div>
          ))
        }
        return (
          <div key={i}>
            <Linha linha={linha} valores={valores} />
          </div>
        )
      })}
    </pre>
  )
}

function Linha({ linha, valores }: { linha: string; valores: Valores }) {
  const m = linha.match(PALAVRAS)
  const resto = m ? linha.slice(m[0].length - m[3].length) : linha
  return (
    <>
      {m && (
        <>
          {m[1]}
          <span className={m[2].endsWith(':') ? 'font-semibold text-(--brand-100)' : 'text-(--pink-400)'}>{m[2]}</span>
        </>
      )}
      <Trecho texto={resto} valores={valores} />
      {linha === '' && ' '}
    </>
  )
}

function Trecho({ texto, valores }: { texto: string; valores: Valores }) {
  // separa strings entre aspas e marcadores de valor
  const partes = texto.split(/(«A\d+»|"[^"]*")/g)
  return (
    <>
      {partes.map((p, i) => {
        const marcador = p.match(/^«A(\d+)»$/)
        if (marcador) {
          const id = Number(marcador[1])
          const v = valores[id]
          return v != null ? (
            <a
              key={i}
              href={`#apuracao-${id}`}
              title={`Valor apurado (apuração ${id}). Clique para ver as consultas.`}
              className="rounded bg-(--mint-400)/15 px-1 text-(--mint-400) underline decoration-(--mint-400)/40 underline-offset-2 hover:bg-(--mint-400)/25"
            >
              {v}
            </a>
          ) : (
            <a
              key={i}
              href={`#apuracao-${id}`}
              title="Sem valor de referência: apure pelas consultas."
              className="rounded bg-(--yellow-400)/15 px-1 text-(--yellow-300) underline decoration-(--yellow-400)/40 underline-offset-2"
            >
              ⚠ valor a apurar (A{id})
            </a>
          )
        }
        if (p.startsWith('"')) return <span key={i} className="text-(--yellow-200)">{p}</span>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}
