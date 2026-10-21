import type { Etapa } from '../api'
import { ROTULO_ETAPA } from '../util/formato'
import { Card } from './ui'

const ORDEM: Etapa[] = ['COLETA', 'CENARIOS', 'APURACAO', 'COMPOSICAO']

export function ProgressoExecucao({ etapa }: { etapa: Etapa }) {
  const atual = ORDEM.indexOf(etapa)
  return (
    <Card className="p-5">
      <p className="mb-4 text-sm text-texto-sec">A execução está em andamento. Esta página se atualiza sozinha.</p>
      <ol className="grid gap-3 sm:grid-cols-4">
        {ORDEM.map((e, i) => {
          const feito = i < atual
          const rodando = i === atual
          return (
            <li key={e} className="flex items-center gap-3 sm:flex-col sm:items-start">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  feito
                    ? 'bg-sucesso-status text-superficie'
                    : rodando
                      ? 'bg-marca text-sobre-marca ring-4 ring-(--brand-100)/40'
                      : 'bg-neutro-2 text-texto-sec'
                }`}
              >
                {feito ? '✓' : i + 1}
              </span>
              <span className={`text-sm ${rodando ? 'font-medium text-enfase' : feito ? 'text-texto' : 'text-texto-sec'}`}>
                {ROTULO_ETAPA[e]}
                {rodando && '…'}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
