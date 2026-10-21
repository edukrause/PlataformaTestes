// Respostas simuladas do assistente. No back-end real, o histórico da conversa e a execução
// vão como contexto para o modelo; aqui as respostas são montadas a partir dos dados da execução.

import { celula, DESCRICAO_DESFECHO, ROTULO_DESFECHO, ROTULO_PROVEDOR, ROTULO_VERIFICACAO, usd, valorNoGherkin } from '../../util/formato'
import type { Apuracao, Cenario, Execucao } from '../tipos'

export const CHAVE_JIRA = /\b([A-Za-z][A-Za-z0-9]+-\d+)\b/

export type Intencao =
  | { tipo: 'GERAR'; chave: string; usarDocumentacao: boolean }
  | { tipo: 'NOVO_CENARIO' }
  | { tipo: 'DIVERGENCIA' }
  | { tipo: 'SQL'; apuracaoId: number | null }
  | { tipo: 'CORRECAO' }
  | { tipo: 'RESUMO' }
  | { tipo: 'COMO_FUNCIONA' }
  | { tipo: 'OUTRO' }

const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function interpretar(texto: string, usarDocumentacao: boolean): Intencao {
  const chave = texto.match(CHAVE_JIRA)?.[1]
  const t = sem(texto)
  const semDoc = /sem (a )?documentacao/.test(t)
  if (chave) return { tipo: 'GERAR', chave: chave.toUpperCase(), usarDocumentacao: usarDocumentacao && !semDoc }
  if (/(cenario|caso)/.test(t) && /(novo|nova|outro|mais|adicion|inclu|cri|faltou|negativ)/.test(t)) return { tipo: 'NOVO_CENARIO' }
  if (/(diverg|falh|maioria|discord|nao bateu|por que|porque)/.test(t)) return { tipo: 'DIVERGENCIA' }
  if (/(sql|consulta|query|select)/.test(t)) {
    const a = t.match(/\ba(\d+)\b/)
    return { tipo: 'SQL', apuracaoId: a ? Number(a[1]) : null }
  }
  if (/(errad|corrig|incorret|nao confere|valor certo)/.test(t)) return { tipo: 'CORRECAO' }
  if (/(como funciona|o que voce faz|ajuda)/.test(t)) return { tipo: 'COMO_FUNCIONA' }
  if (/(resum|explic|o que gerou|quais cenarios|status)/.test(t)) return { tipo: 'RESUMO' }
  return { tipo: 'OUTRO' }
}

export const TEXTO_COMO_FUNCIONA = [
  'Eu trabalho em três etapas:',
  '- **Contexto e cenários**: leio o requisito no Jira e a documentação da rotina no Confluence e escrevo os cenários em Gherkin, com a sintaxe validada.',
  '- **Apuração do valor esperado**: se o requisito envolve relatório ou consulta, Claude, Gemini e Llama escrevem cada um a sua consulta, que roda somente leitura no banco de homologação.',
  '- **Conferência**: o valor só vira referência quando pelo menos dois resultados coincidem, e a conferência do analista é sempre obrigatória.',
  '',
  'Para começar, me passe a chave de uma tarefa, por exemplo `NMTZ-1234`.',
].join('\n')

export const TEXTO_SEM_EXECUCAO =
  'Ainda não tenho uma tarefa nesta conversa. Me passe a chave do Jira (por exemplo `NMTZ-1234`) que eu gero os cenários e apuro os valores esperados.'

export function textoInicioGeracao(chave: string, usarDocumentacao: boolean): string {
  return usarDocumentacao
    ? `Certo. Vou ler a **${chave}** no Jira e a documentação da rotina no Confluence, gerar os cenários e apurar os valores no banco. Acompanhe o andamento abaixo.`
    : `Certo. Vou gerar os cenários da **${chave}** só com o requisito do Jira, **sem a documentação** da rotina. Acompanhe o andamento abaixo.`
}

export function textoResumo(e: Execucao): string {
  if (e.status !== 'CONCLUIDA') return 'A execução ainda está rodando. Assim que terminar, o cartão acima mostra os cenários e os valores apurados.'
  const linhas = [`Para a **${e.tarefa.chaveJira}** eu gerei ${e.cenarios.length} cenários:`, ...e.cenarios.map(linhaCenario)]
  if (!e.exigeApuracao) {
    linhas.push('', 'O requisito não envolve relatório nem consulta, então não houve apuração no banco.')
  } else {
    linhas.push('', `E fiz ${e.apuracoes.length} apurações no banco:`, ...e.apuracoes.map(linhaApuracao))
  }
  linhas.push('', `Custo total de ${usd(e.custoTotalUsd)}. Falta a sua conferência para os valores passarem de apurados a validados.`)
  return linhas.join('\n')
}

const linhaCenario = (c: Cenario) => `- ${c.titulo} (${c.tipo === 'ALTERACAO' ? 'alteração' : 'regressão'})`

function linhaApuracao(a: Apuracao): string {
  const valor = a.resultadoReferencia ? `\`${valorNoGherkin(a.resultadoReferencia).split('\n')[0]}\`` : 'sem valor de referência'
  return `- **A${a.id}** ${a.pergunta}: ${valor} (${ROTULO_DESFECHO[a.desfecho].toLowerCase()})`
}

export function textoDivergencia(e: Execucao): string {
  if (!e.exigeApuracao || e.apuracoes.length === 0) return 'Esta tarefa não teve apuração no banco, então não houve divergência entre os modelos.'
  const problemas = e.apuracoes.filter((a) => a.desfecho !== 'UNANIME')
  if (problemas.length === 0) return 'Nenhuma divergência: nas apurações desta tarefa os três modelos chegaram ao mesmo resultado.'
  const blocos = problemas.map((a) => {
    const cands = a.candidatos.map((c) => {
      const res = c.resultado ? `retornou \`${valorNoGherkin(c.resultado).split('\n')[0]}\`` : ROTULO_VERIFICACAO[c.verificacao].toLowerCase()
      return `- ${ROTULO_PROVEDOR[c.provedor]}: ${res}${c.mensagemErro ? ` (${c.mensagemErro})` : ''}`
    })
    return [`**A${a.id}, ${ROTULO_DESFECHO[a.desfecho].toLowerCase()}.** ${DESCRICAO_DESFECHO[a.desfecho]}`, ...cands].join('\n')
  })
  return [...blocos, `Se quiser, peça "mostre o SQL da A${problemas[0].id}" para comparar as consultas.`].join('\n\n')
}

export function textoSql(e: Execucao, apuracaoId: number | null): string {
  if (e.apuracoes.length === 0) return 'Esta tarefa não teve apuração, então não há consulta SQL para mostrar.'
  const a = e.apuracoes.find((x) => x.id === apuracaoId) ?? e.apuracoes[0]
  const ref = a.candidatos.find((c) => c.verificacao === 'VALIDO') ?? a.candidatos[0]
  const valor = a.resultadoReferencia ? celula(a.resultadoReferencia.linhas[0][0]) : null
  return [
    `Esta é a consulta do ${ROTULO_PROVEDOR[ref.provedor]} para a **A${a.id}** (${a.pergunta}):`,
    '```sql\n' + ref.consulta.trim() + '\n```',
    valor ? `Ela retornou \`${valor}\`, o valor que entrou no cenário.` : 'Esta apuração ficou sem valor de referência.',
    'As consultas dos outros modelos estão nos detalhes da execução.',
  ].join('\n\n')
}

export const TEXTO_CORRECAO =
  'Entendi. A correção de valor fica registrada na **conferência**: abra os detalhes da execução, informe o valor certo em "Valores corrigidos" e registre a decisão como "Aceito com alteração". Assim a correção entra na métrica M12.'

export const TEXTO_OUTRO =
  'Neste protótipo eu entendo alguns pedidos sobre a tarefa da conversa: **resumir** o que foi gerado, **criar mais um cenário**, explicar uma **divergência** entre os modelos ou mostrar o **SQL** de uma apuração. Também posso gerar os cenários de outra tarefa, é só mandar a chave do Jira.'

/** Cenário extra simulado; no back-end real ele sairia do modelo com o histórico como contexto. */
export function cenarioExtra(e: Execucao, id: number): Cenario {
  const estoque = e.tarefa.area === 'ESTOQUE'
  const titulo = estoque ? 'Depósito sem movimentação no período' : 'Cliente sem pedidos no período'
  const gherkin = estoque
    ? [
        `Cenário: ${titulo}`,
        '  Dado que estou na empresa 1, filial 1',
        '  E acesso o relatório da rotina',
        '  Quando informo um depósito que não teve movimentação no período',
        '  Então o relatório deve exibir a mensagem "Nenhum registro encontrado"',
        '  E nenhum saldo deve ser listado',
      ]
    : [
        `Cenário: ${titulo}`,
        '  Dado que estou na empresa 1, filial 1',
        '  E existe um cliente ativo sem pedidos no período',
        '  Quando consulto a rotina filtrando por esse cliente',
        '  Então o sistema deve exibir a mensagem "Nenhum registro encontrado"',
        '  E o total deve ser 0,00',
      ]
  return { id, tipo: 'ALTERACAO', titulo, gherkin: gherkin.join('\n'), sintaxeValida: true }
}

export function textoCenarioExtra(c: Cenario): string {
  return [
    'Incluí um cenário negativo que não estava coberto:',
    '```gherkin\n' + c.gherkin + '\n```',
    'Ele já aparece na execução e passa pela sua conferência junto com os outros.',
  ].join('\n\n')
}

export const TEXTO_JA_CONFERIDA =
  'Esta execução já foi conferida, então não altero mais os cenários dela. Para incluir cenários novos, gere a tarefa de novo mandando a chave do Jira.'
