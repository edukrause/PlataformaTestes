import type { PontoAtencao, TipoAtencao } from '../api'
import { Painel } from './ui'

const TIPOS: Record<TipoAtencao, { rotulo: string; cor: string; icone: string }> = {
  AMBIGUIDADE: { rotulo: 'Requisito em aberto', cor: 'bg-aviso-fundo text-aviso', icone: '?' },
  REGRESSAO: { rotulo: 'Risco de regressão', cor: 'bg-erro-fundo text-erro', icone: '!' },
  MASSA: { rotulo: 'Massa de teste', cor: 'bg-info-fundo text-info', icone: '◆' },
  DOCUMENTACAO: { rotulo: 'Documentação', cor: 'bg-indigo-fundo text-indigo-texto', icone: '≡' },
}

// requisito em aberto primeiro: é o que pode mudar os próprios casos
const ORDEM: TipoAtencao[] = ['AMBIGUIDADE', 'REGRESSAO', 'DOCUMENTACAO', 'MASSA']

/** Pontos que a análise da tarefa levantou para o analista olhar antes de testar. */
export function PontosAtencao({ pontos }: { pontos: PontoAtencao[] }) {
  if (pontos.length === 0) return null
  const ordenados = [...pontos].sort((a, b) => ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo))
  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-enfase">
        Pontos de atenção <span className="font-normal text-texto-sec">{pontos.length}</span>
      </h2>
      <p className="mb-3 text-sm text-texto-sec">O que chamou atenção na tarefa ao gerar os casos. Vale resolver antes de testar.</p>
      <Painel>
      <ul className="divide-y divide-neutro-3 rounded-lg border border-borda bg-superficie">
        {ordenados.map((p, i) => {
          const t = TIPOS[p.tipo]
          return (
            <li key={i} className="flex gap-3 px-5 py-3.5 text-sm">
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${t.cor}`} aria-hidden>
                {t.icone}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-bold ${t.cor.split(' ')[1]}`}>{t.rotulo}</p>
                <p className="mt-0.5 leading-relaxed text-texto">{p.texto}</p>
              </div>
            </li>
          )
        })}
      </ul>
      </Painel>
    </section>
  )
}
