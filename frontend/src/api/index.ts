import type { PlataformaApi } from './contrato'
import { httpApi } from './httpApi'
import { mockApi } from './mock/mockApi'

// VITE_API=http usa o back-end; qualquer outro valor (ou ausência) usa os dados simulados.
export const modoApi = import.meta.env.VITE_API === 'http' ? 'http' : 'mock'

export const api: PlataformaApi = modoApi === 'http' ? httpApi : mockApi

export type * from './tipos'
