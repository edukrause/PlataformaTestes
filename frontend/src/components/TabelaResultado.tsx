import type { Tabela } from '../api'
import { celula } from '../util/formato'

export function TabelaResultado({ tabela, destaque = false }: { tabela: Tabela; destaque?: boolean }) {
  if (tabela.linhas.length === 1 && tabela.colunas.length === 1) {
    return (
      <div className={destaque ? 'text-2xl font-semibold text-enfase tabular-nums' : 'font-mono text-sm tabular-nums'}>
        {celula(tabela.linhas[0][0])}
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-borda text-left text-xs text-texto-sec">
            {tabela.colunas.map((c) => (
              <th key={c} className="py-1.5 pr-4 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {tabela.linhas.map((l, i) => (
            <tr key={i} className="border-b border-neutro-3 last:border-0">
              {l.map((v, j) => (
                <td key={j} className={`py-1.5 pr-4 ${typeof v === 'number' ? 'text-right' : ''}`}>{celula(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
