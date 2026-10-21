import type { Desfecho } from '../api'

export const PONTO_DESFECHO: Record<Desfecho, string> = {
  UNANIME: 'bg-sucesso-status',
  MAIORIA: 'bg-info-status',
  DIVERGENTE: 'bg-aviso-status',
  FALHA: 'bg-erro-status',
}
