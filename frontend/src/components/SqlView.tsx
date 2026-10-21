import { useState } from 'react'

const PALAVRAS =
  /\b(SELECT|FROM|WHERE|AND|OR|NOT|JOIN|INNER|LEFT|RIGHT|ON|AS|GROUP|BY|ORDER|HAVING|SUM|AVG|COUNT|MIN|MAX|ROUND|COALESCE|IFNULL|NULLIF|CASE|WHEN|THEN|ELSE|END|BETWEEN|IN|IS|NULL|DATE|USING|DISTINCT|LIMIT)\b/g

export function SqlView({ sql }: { sql: string }) {
  const [copiado, setCopiado] = useState(false)

  function copiar() {
    navigator.clipboard?.writeText(sql).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    })
  }

  const partes = sql.split(/('[^']*')/g)

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg bg-fundo p-3 font-mono text-xs leading-5 text-enfase ring-1 ring-borda">
        {partes.map((p, i) =>
          p.startsWith("'") ? (
            <span key={i} className="text-sucesso">{p}</span>
          ) : (
            <span key={i}>
              {p.split(PALAVRAS).map((t, j) =>
                j % 2 === 1 ? (
                  <span key={j} className="font-semibold text-(--indigo-700)">{t}</span>
                ) : (
                  t
                ),
              )}
            </span>
          ),
        )}
      </pre>
      <button
        onClick={copiar}
        className="absolute top-2 right-2 rounded bg-superficie px-2 py-1 text-xs text-texto opacity-0 ring-1 ring-borda transition group-hover:opacity-100 focus:opacity-100"
      >
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
