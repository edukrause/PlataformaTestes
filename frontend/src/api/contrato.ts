import type {
  Conversa,
  ConversaResumo,
  Demanda,
  Execucao,
  ExecucaoResumo,
  ExecucaoTeste,
  MensagemRequest,
  Metricas,
  NovaExecucaoRequest,
  Revisao,
  RevisaoRequest,
  StatusDemanda,
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
  /** Marca o caso de teste como executado (ou desfaz, com null). */
  registrarExecucaoTeste(execucaoId: number, cenarioId: number, execucao: ExecucaoTeste | null): Promise<void>
  obterMetricas(): Promise<Metricas>
  obterDemanda(chaveJira: string): Promise<Demanda>
  /** Muda a situação da demanda (no back-end, faz a transição no Jira). */
  alterarStatusDemanda(chaveJira: string, status: StatusDemanda): Promise<Demanda>
  listarConversas(): Promise<ConversaResumo[]>
  obterConversa(id: number): Promise<Conversa>
  /** Grava a mensagem do usuário e devolve a conversa já com a resposta do assistente. */
  enviarMensagem(req: MensagemRequest): Promise<Conversa>
}
