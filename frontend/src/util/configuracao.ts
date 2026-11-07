import { chamar } from '../api/httpApi'

export interface Configuracao {
  iaConfigurada: boolean
  postgresHabilitado: boolean
  jiraConfigurado: boolean
  confluenceConfigurado: boolean
  jiraEscritaHabilitada: boolean
}
let configuracao: Promise<Configuracao> | undefined
export function obterConfiguracao() {
  return configuracao ??= chamar<Configuracao>('/configuracao').catch((e: unknown) => { configuracao = undefined; throw e })
}
