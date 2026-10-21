import type { Celula, RelatorioConferencia as Relatorio } from '../api'
import { celula } from '../util/formato'

const texto = (v: Celula) => (v === null ? '' : celula(v))

/** Registros da base que formam o valor, em grade de planilha, para conferir com a tela do ERP. */
export function RelatorioConferencia({ relatorio, nomeArquivo }: { relatorio: Relatorio; nomeArquivo: string }) {
  // coluna numérica: alinha à direita, como no Excel
  const numerica = relatorio.colunas.map((_, j) => relatorio.linhas.some((l) => typeof l[j] === 'number'))

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-texto-sec uppercase">Dados da base para conferência</p>
          <p className="text-sm font-medium text-enfase">{relatorio.titulo}</p>
        </div>
        <button
          type="button"
          onClick={() => baixarCsv(relatorio, nomeArquivo)}
          className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-bold text-link ring-1 ring-current ring-inset hover:bg-black/5"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Baixar para Excel
        </button>
      </div>

      <div className="max-h-80 overflow-auto rounded border border-borda bg-superficie">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead className="sticky top-0 z-10">
            <tr className="bg-neutro-2 text-xs text-texto-sec">
              <th className="w-10 border-r border-b border-borda px-2 py-1.5 text-center font-medium">#</th>
              {relatorio.colunas.map((c, j) => (
                <th
                  key={c}
                  className={`border-r border-b border-borda px-3 py-1.5 font-bold whitespace-nowrap text-enfase last:border-r-0 ${numerica[j] ? 'text-right' : 'text-left'}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {relatorio.linhas.map((l, i) => (
              <tr key={i} className="hover:bg-info-fundo">
                <td className="border-r border-b border-neutro-3 bg-neutro-2 px-2 py-1.5 text-center text-xs text-texto-sec">{i + 1}</td>
                {l.map((v, j) => (
                  <td
                    key={j}
                    className={`border-r border-b border-neutro-3 px-3 py-1.5 whitespace-nowrap text-texto last:border-r-0 ${numerica[j] ? 'text-right' : ''} ${typeof v === 'number' && v < 0 ? 'text-erro' : ''}`}
                  >
                    {texto(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {relatorio.total && (
            <tfoot className="sticky bottom-0">
              <tr className="bg-neutro-2 font-bold text-enfase">
                <td className="border-t border-r border-borda px-2 py-1.5" />
                {relatorio.total.map((v, j) => (
                  <td key={j} className={`border-t border-r border-borda px-3 py-1.5 whitespace-nowrap last:border-r-0 ${numerica[j] ? 'text-right' : ''}`}>
                    {texto(v)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-1.5 text-xs text-texto-sec">
        {relatorio.linhas.length === 1 ? '1 registro' : `${relatorio.linhas.length} registros`} · compare com o que a rotina exibe na
        homologação
      </p>
    </div>
  )
}

/** CSV com ";" e vírgula decimal, que o Excel em português abre direto em colunas. */
function baixarCsv(r: Relatorio, nome: string) {
  const campo = (v: Celula) => {
    if (v === null) return ''
    if (typeof v === 'number') return String(v).replace('.', ',')
    return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  }
  const linhas = [r.colunas, ...r.linhas, ...(r.total ? [r.total] : [])].map((l) => l.map(campo).join(';'))
  // o BOM faz o Excel reconhecer o UTF-8 (acentos)
  const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
