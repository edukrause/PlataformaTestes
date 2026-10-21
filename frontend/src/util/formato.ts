import type { Area, Celula, Decisao, Desfecho, Etapa, Provedor, StatusDemanda, Tabela, Verificacao } from '../api'

export const ROTULO_DESFECHO: Record<Desfecho, string> = {
  UNANIME: 'Unânime',
  MAIORIA: 'Maioria',
  DIVERGENTE: 'Divergente',
  FALHA: 'Falha',
}

export const DESCRICAO_DESFECHO: Record<Desfecho, string> = {
  UNANIME: 'Três candidatos válidos com o mesmo resultado. Confiança alta.',
  MAIORIA: 'Dois resultados coincidentes; o terceiro diverge ou foi descartado. Confiança moderada.',
  DIVERGENTE: 'Candidatos válidos sem resultados coincidentes. Sem valor de referência: apure pelas consultas.',
  FALHA: 'Menos de dois candidatos válidos após a nova tentativa. Sem valor de referência.',
}

export const ROTULO_DECISAO: Record<Decisao, string> = {
  ACEITO: 'Aceito',
  ACEITO_ALTERACAO: 'Aceito com alteração',
  REJEITADO: 'Rejeitado',
}

export const ROTULO_STATUS_DEMANDA: Record<StatusDemanda, string> = {
  A_FAZER: 'A fazer',
  EM_DESENVOLVIMENTO: 'Em desenvolvimento',
  AGUARDANDO_TESTE: 'Aguardando teste',
  EM_TESTE: 'Em teste',
  REPROVADA: 'Reprovada no teste',
  FINALIZADA: 'Finalizada',
}

export const ROTULO_PROVEDOR: Record<Provedor, string> = {
  CLAUDE: 'Claude',
  GEMINI: 'Gemini',
  LLAMA: 'Llama',
}

export const ROTULO_AREA: Record<Area, string> = {
  ESTOQUE: 'Estoque',
  VENDAS: 'Vendas',
}

export const ROTULO_ETAPA: Record<Etapa, string> = {
  COLETA: 'Coletando requisito e documentação',
  CENARIOS: 'Gerando e validando cenários',
  APURACAO: 'Apurando valores no banco',
  COMPOSICAO: 'Compondo a saída',
}

export const ROTULO_VERIFICACAO: Record<Verificacao, string> = {
  VALIDO: 'Válido',
  REJEITADO_SINTAXE: 'Rejeitado na análise sintática',
  ERRO_EXPLAIN: 'Erro no EXPLAIN',
  ERRO_EXECUCAO: 'Erro na execução',
  VAZIO: 'Retorno vazio',
}

const fmtInteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const fmtDecimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function celula(v: Celula): string {
  if (v === null) return '∅'
  if (typeof v === 'number') return (Number.isInteger(v) ? fmtInteiro : fmtDecimal).format(v)
  return v
}

/** Valor curto para inserir no Gherkin: célula única vira texto; tabela vira tabela Gherkin. */
export function valorNoGherkin(t: Tabela): string {
  if (t.linhas.length === 1 && t.colunas.length === 1) return celula(t.linhas[0][0])
  const larguras = t.colunas.map((c, i) => Math.max(c.length, ...t.linhas.map((l) => celula(l[i]).length)))
  const linha = (cs: string[]) => '| ' + cs.map((c, i) => c.padEnd(larguras[i])).join(' | ') + ' |'
  return [linha(t.colunas), ...t.linhas.map((l) => linha(l.map(celula)))].join('\n')
}

export const dataHora = (iso: string) => fmtDataHora.format(new Date(iso))

const fmtData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/** Data sem hora; aceita yyyy-mm-dd (lido como data local, sem deslocar o fuso). */
export const data = (iso: string) => fmtData.format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso))

/** Dias corridos de hoje até a data (negativo quando já passou). */
export function diasAte(iso: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${iso.slice(0, 10)}T00:00:00`).getTime() - hoje.getTime()) / 86400000)
}

export const horas = (h: number) => `${String(h).replace('.', ',')} h`

export const usd = (v: number) => `US$ ${v.toFixed(v < 0.01 ? 4 : 3).replace('.', ',')}`

export const segundos = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`

export const pct = (v: number) => `${Math.round(v * 100)}%`

export function duracao(s: number): string {
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return m ? `${m} min ${r.toString().padStart(2, '0')} s` : `${r} s`
}
