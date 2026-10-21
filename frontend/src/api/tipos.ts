// Tipos trocados entre a interface e a camada de orquestração.
// Seguem as entidades do DER (docs/diagramas/der.mmd), em camelCase, como o Spring serializa por padrão.

export type Area = 'ESTOQUE' | 'VENDAS'

export type Provedor = 'CLAUDE' | 'GEMINI' | 'LLAMA'

export type Desfecho = 'UNANIME' | 'MAIORIA' | 'DIVERGENTE' | 'FALHA'

export type Decisao = 'ACEITO' | 'ACEITO_ALTERACAO' | 'REJEITADO'

/** Situação da demanda no Jira. */
export type StatusDemanda = 'A_FAZER' | 'EM_DESENVOLVIMENTO' | 'AGUARDANDO_TESTE' | 'EM_TESTE' | 'REPROVADA' | 'FINALIZADA'

/** Dados da demanda que vêm do Jira e mudam independentemente das execuções. */
export interface Demanda {
  chaveJira: string
  status: StatusDemanda
  criadaEm: string
  /** Data de entrega (yyyy-mm-dd); nula quando a demanda não tem prazo. */
  prazo: string | null
  /** Estimativa original, em horas. */
  estimativaH: number | null
}

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

export type ResultadoPasso = 'PASSOU' | 'FALHOU' | 'NAO_EXECUTADO'

export type ResultadoTeste = 'PASSOU' | 'FALHOU' | 'BLOQUEADO'

/** Execução do caso de teste pelo analista, no ambiente de homologação. */
export interface ExecucaoTeste {
  resultado: ResultadoTeste
  /** Um resultado por linha de passo do Gherkin, na mesma ordem. */
  passos: ResultadoPasso[]
  observacao: string
  executadoPor: string
  executadoEm: string
}

export interface Cenario {
  id: number
  tipo: TipoCenario
  titulo: string
  /**
   * Passos em Gherkin (Dado que / E / Quando / Então), um por linha, no padrão dos casos de teste da NMTZ:
   * sem "Funcionalidade:" nem "Cenário:", que viram o título. Marcadores «A<id>» indicam onde entra o valor de uma apuração.
   */
  gherkin: string
  /** Parágrafo "Resultado Esperado" que fecha o caso de teste; também aceita marcadores «A<id>». */
  resultadoEsperado: string
  /** Nula enquanto o caso não foi executado. */
  execucaoTeste?: ExecucaoTeste | null
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

/**
 * Mini relatório com os registros da base que formam o valor apurado, para o analista comparar
 * linha a linha com o que a tela do ERP mostra.
 */
export interface RelatorioConferencia {
  titulo: string
  colunas: string[]
  linhas: Celula[][]
  /** Linha de totais, alinhada às colunas; nula quando não faz sentido somar. */
  total: Celula[] | null
}

export interface Apuracao {
  id: number
  cenarioId: number | null
  pergunta: string
  subesquema: string[]
  desfecho: Desfecho
  resultadoReferencia: Tabela | null
  conferencia?: RelatorioConferencia | null
  candidatos: CandidatoSql[]
}

/** Tipo de ponto de atenção levantado na análise da tarefa. */
export type TipoAtencao = 'AMBIGUIDADE' | 'REGRESSAO' | 'MASSA' | 'DOCUMENTACAO'

/** Algo que o analista deve olhar antes ou durante o teste, levantado junto com os casos. */
export interface PontoAtencao {
  tipo: TipoAtencao
  texto: string
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
  pontosAtencao: PontoAtencao[]
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
  /** Página da documentação usada na geração; nula quando foi gerada só com o requisito. */
  documentacaoRef: string | null
  qtdApuracoes: number
  /** Apurações com valor de referência (unânime ou maioria). */
  qtdComReferencia: number
  demanda: Demanda
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
