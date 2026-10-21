import type {
  Conversa,
  ConversaResumo,
  Execucao,
  ExecucaoResumo,
  MensagemRequest,
  Metricas,
  NovaExecucaoRequest,
  Revisao,
  RevisaoRequest,
} from './tipos'

/**
 * Operações que a interface usa. Há duas implementações:
 * - mock: dados simulados no navegador, para o protótipo;
 * - http: chamadas REST para o Spring Boot (/api/...).
 * As telas só conhecem esta interface.
 */
export interface PlataformaApi {
  listarExecucoes(): Promise<ExecucaoResumo[]>
  obterExecucao(id: number): Promise<Execucao>
  iniciarExecucao(req: NovaExecucaoRequest): Promise<{ id: number }>
  registrarRevisao(execucaoId: number, req: RevisaoRequest): Promise<Revisao>
  obterMetricas(): Promise<Metricas>
  listarConversas(): Promise<ConversaResumo[]>
  obterConversa(id: number): Promise<Conversa>
  /** Grava a mensagem do usuário e devolve a conversa já com a resposta do assistente. */
  enviarMensagem(req: MensagemRequest): Promise<Conversa>
}
