// Tipos trocados entre a interface e a camada de orquestração.
// Seguem as entidades do DER (docs/diagramas/der.mmd), em camelCase, como o Spring serializa por padrão.

export type Area = 'ESTOQUE' | 'VENDAS'

export type Provedor = 'CLAUDE' | 'GEMINI' | 'LLAMA'

export type Desfecho = 'UNANIME' | 'MAIORIA' | 'DIVERGENTE' | 'FALHA'

export type Decisao = 'ACEITO' | 'ACEITO_ALTERACAO' | 'REJEITADO'

export type StatusExecucao = 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ERRO'

/** Etapas do fluxo principal (docs/diagramas/fluxo.mmd). */
export type Etapa = 'COLETA' | 'CENARIOS' | 'APURACAO' | 'COMPOSICAO'

export type TipoCenario = 'ALTERACAO' | 'REGRESSAO'

/** Resultado da verificação em camadas de um candidato. */
export type Verificacao = 'VALIDO' | 'REJEITADO_SINTAXE' | 'ERRO_EXPLAIN' | 'ERRO_EXECUCAO' | 'VAZIO'

export type Celula = string | number | null

/** Conjunto de resultado já normalizado. */
export interface Tabela {
  colunas: string[]
  linhas: Celula[][]
}

export interface Tarefa {
  id: number
  chaveJira: string
  titulo: string
  area: Area
  requisito: string
  documentacaoRef: string | null
  coletadaEm: string
}

export interface Cenario {
  id: number
  tipo: TipoCenario
  titulo: string
  /** Texto Gherkin; marcadores «A<id>» indicam onde entra o valor de uma apuração. */
  gherkin: string
  sintaxeValida: boolean
}

export interface CandidatoSql {
  id: number
  provedor: Provedor
  modelo: string
  tentativa: number
  consulta: string
  verificacao: Verificacao
  mensagemErro: string | null
  hashResultado: string | null
  resultado: Tabela | null
  tokensEntrada: number
  tokensSaida: number
  custoUsd: number
  latenciaMs: number
}

export interface Apuracao {
  id: number
  cenarioId: number | null
  pergunta: string
  subesquema: string[]
  desfecho: Desfecho
  resultadoReferencia: Tabela | null
  candidatos: CandidatoSql[]
}

export interface Revisao {
  id: number
  analista: string
  decisao: Decisao
  valoresAlterados: number
  tempoRevisaoS: number
  comentario: string
  registradaEm: string
}

export interface Execucao {
  id: number
  tarefa: Tarefa
  versaoPrompt: string
  status: StatusExecucao
  etapa: Etapa
  /** Falso quando o classificador conclui que o requisito não exige apuração. */
  exigeApuracao: boolean
  tempoTotalMs: number
  custoTotalUsd: number
  iniciadaEm: string
  cenarios: Cenario[]
  apuracoes: Apuracao[]
  revisao: Revisao | null
}

/** Linha da listagem de execuções. */
export interface ExecucaoResumo {
  id: number
  chaveJira: string
  titulo: string
  area: Area
  status: StatusExecucao
  iniciadaEm: string
  tempoTotalMs: number
  custoTotalUsd: number
  qtdCenarios: number
  desfechos: Desfecho[]
  decisao: Decisao | null
  /** Falso quando os cenários foram gerados sem a documentação da rotina. */
  usouDocumentacao: boolean
}

export interface NovaExecucaoRequest {
  chaveJira: string
  usarDocumentacao: boolean
}

export interface RevisaoRequest {
  analista: string
  decisao: Decisao
  /** Valores corrigidos pelo analista, por id de apuração. */
  valoresCorrigidos: Record<number, string>
  tempoRevisaoS: number
  comentario: string
}

export interface Metricas {
  totalExecucoes: number
  totalApuracoes: number
  desfechos: Record<Desfecho, number>
  decisoes: Record<Decisao, number>
  /** Proporção dos valores apurados corrigidos na conferência (M12). */
  valoresAlteradosPct: number
  custoMedioApuracaoUsd: number
  tempoMedioApuracaoS: number
  porProvedor: { provedor: Provedor; candidatos: number; validos: number; custoUsd: number; latenciaMediaMs: number }[]
}

export type Papel = 'USUARIO' | 'ASSISTENTE'

export interface Mensagem {
  id: number
  papel: Papel
  /** Texto em Markdown simples: parágrafos, listas com "- ", **negrito**, `código` e blocos ```gherkin / ```sql. */
  texto: string
  enviadaEm: string
  /** Execução gerada ou citada pela mensagem; a interface mostra o cartão dela junto da resposta. */
  execucaoId: number | null
}

/** Conversa com o assistente: gera os cenários de uma tarefa e segue respondendo sobre ela. */
export interface Conversa {
  id: number
  titulo: string
  criadaEm: string
  mensagens: Mensagem[]
}

export interface ConversaResumo {
  id: number
  titulo: string
  /** Chave da primeira tarefa gerada na conversa; nula enquanto nenhuma foi gerada. */
  chaveJira: string | null
  atualizadaEm: string
}

export interface MensagemRequest {
  /** Nulo inicia uma conversa nova. */
  conversaId: number | null
  texto: string
  usarDocumentacao: boolean
}
