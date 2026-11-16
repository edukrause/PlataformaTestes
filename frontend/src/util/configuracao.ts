import { chamar } from '../api/httpApi'

export interface Configuracao {
  iaConfigurada: boolean
  bancoHabilitado: boolean
  dialetoBanco: string
  jiraConfigurado: boolean
  confluenceConfigurado: boolean
  jiraEscritaHabilitada: boolean
}
let configuracao: Promise<Configuracao> | undefined
export function obterConfiguracao() {
  return configuracao ??= chamar<Configuracao>('/configuracao').catch((e: unknown) => { configuracao = undefined; throw e })
}
