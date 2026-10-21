import type { PlataformaApi } from './contrato'

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`/api${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!resp.ok) {
    const texto = await resp.text()
    throw new Error(texto || `Erro ${resp.status} em ${caminho}`)
  }
  return resp.json() as Promise<T>
}

export const httpApi: PlataformaApi = {
  listarExecucoes: () => chamar('/execucoes'),
  obterExecucao: (id) => chamar(`/execucoes/${id}`),
  iniciarExecucao: (req) => chamar('/execucoes', { method: 'POST', body: JSON.stringify(req) }),
  registrarRevisao: (id, req) =>
    chamar(`/execucoes/${id}/revisao`, { method: 'POST', body: JSON.stringify(req) }),
  registrarExecucaoTeste: (id, cenarioId, execucao) =>
    chamar(`/execucoes/${id}/cenarios/${cenarioId}/execucao`, { method: 'PUT', body: JSON.stringify(execucao) }),
  obterMetricas: () => chamar('/metricas'),
  obterDemanda: (chave) => chamar(`/demandas/${chave}`),
  alterarStatusDemanda: (chave, status) =>
    chamar(`/demandas/${chave}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  listarConversas: () => chamar('/conversas'),
  obterConversa: (id) => chamar(`/conversas/${id}`),
  enviarMensagem: (req) => chamar('/conversas/mensagens', { method: 'POST', body: JSON.stringify(req) }),
}
