// Implementação simulada da API, mantida no localStorage do navegador.
// Uma nova execução percorre as etapas do fluxo em alguns segundos e reaproveita o conteúdo de um exemplo.

import type { PlataformaApi } from '../contrato'
import type {
  Conversa,
  Decisao,
  Desfecho,
  Etapa,
  Execucao,
  ExecucaoResumo,
  Mensagem,
  Metricas,
  Papel,
  Provedor,
  Revisao,
} from '../tipos'
import * as ia from './assistente'
import { EXECUCOES_EXEMPLO } from './dados'

const CHAVE = 'plataforma-testes:mock:v2'

/** Instante (ms desde o início) em que cada etapa termina. */
const ROTEIRO: [Etapa, number][] = [
  ['COLETA', 2000],
  ['CENARIOS', 5000],
  ['APURACAO', 10000],
  ['COMPOSICAO', 11500],
]

interface Estado {
  execucoes: Execucao[]
  conversas: Conversa[]
}

function clonar<T>(v: T): T {
  return structuredClone(v)
}

function carregar(): Estado {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) {
      const salvo = JSON.parse(bruto) as Estado
      // estado gravado antes de existir o assistente
      return { ...salvo, conversas: salvo.conversas ?? conversasExemplo(salvo.execucoes) }
    }
  } catch {
    // sem localStorage (janela anônima, por exemplo): segue com os exemplos em memória
  }
  return exemplos()
}

function exemplos(): Estado {
  const execucoes = clonar(EXECUCOES_EXEMPLO)
  return { execucoes, conversas: conversasExemplo(execucoes) }
}

/** Uma conversa de exemplo sobre a DEMO-101, para o protótipo não abrir vazio. */
function conversasExemplo(execucoes: Execucao[]): Conversa[] {
  const e = execucoes.find((x) => x.tarefa.chaveJira === 'DEMO-101')
  if (!e) return []
  const em = (min: number) => new Date(new Date(e.iniciadaEm).getTime() + min * 60000).toISOString()
  const msg = (id: number, papel: Papel, texto: string, min: number, execucaoId: number | null = null): Mensagem => ({
    id,
    papel,
    texto,
    enviadaEm: em(min),
    execucaoId,
  })
  return [
    {
      id: 1,
      titulo: `${e.tarefa.chaveJira} · ${e.tarefa.titulo}`,
      criadaEm: em(0),
      mensagens: [
        msg(1, 'USUARIO', 'Gere os cenários da DEMO-101', 0),
        msg(2, 'ASSISTENTE', ia.textoInicioGeracao('DEMO-101', true), 0, e.id),
        msg(3, 'USUARIO', 'Por que a apuração A2 ficou só com maioria?', 2),
        msg(4, 'ASSISTENTE', ia.textoDivergencia(e), 2),
      ],
    },
  ]
}

let estado = carregar()

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado))
  } catch {
    // ignorado: o protótipo continua funcionando em memória
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Atualiza a etapa das execuções em andamento conforme o tempo decorrido. */
function avancar(e: Execucao): Execucao {
  if (e.status !== 'EM_ANDAMENTO') return e
  const decorrido = Date.now() - new Date(e.iniciadaEm).getTime()
  const atual = ROTEIRO.find(([, fim]) => decorrido < fim)
  if (atual) {
    e.etapa = atual[0]
  } else {
    e.status = 'CONCLUIDA'
    e.etapa = 'COMPOSICAO'
    e.tempoTotalMs = ROTEIRO[ROTEIRO.length - 1][1] * 4
    salvar()
  }
  return e
}

/** O que a tela pode ver enquanto a execução ainda roda. */
function visivel(e: Execucao): Execucao {
  if (e.status !== 'EM_ANDAMENTO') return e
  const c = clonar(e)
  const ordem = ROTEIRO.map(([et]) => et)
  const pos = ordem.indexOf(c.etapa)
  if (pos < ordem.indexOf('APURACAO')) c.cenarios = []
  if (pos < ordem.indexOf('COMPOSICAO')) c.apuracoes = []
  return c
}

function resumo(e: Execucao): ExecucaoResumo {
  return {
    id: e.id,
    chaveJira: e.tarefa.chaveJira,
    titulo: e.tarefa.titulo,
    area: e.tarefa.area,
    status: e.status,
    iniciadaEm: e.iniciadaEm,
    tempoTotalMs: e.tempoTotalMs,
    custoTotalUsd: e.custoTotalUsd,
    qtdCenarios: e.cenarios.length,
    desfechos: e.status === 'CONCLUIDA' ? e.apuracoes.map((a) => a.desfecho) : [],
    decisao: e.revisao?.decisao ?? null,
    usouDocumentacao: e.tarefa.documentacaoRef != null,
  }
}

function buscar(id: number): Execucao {
  const e = estado.execucoes.find((x) => x.id === id)
  if (!e) throw new Error(`Execução ${id} não encontrada.`)
  return avancar(e)
}

function buscarConversa(id: number): Conversa {
  const c = estado.conversas.find((x) => x.id === id)
  if (!c) throw new Error(`Conversa ${id} não encontrada.`)
  return c
}

function criarExecucao(chaveJira: string, usarDocumentacao: boolean): number {
  const chave = chaveJira.trim().toUpperCase()
  if (!/^[A-Z][A-Z0-9]+-\d+$/.test(chave)) {
    throw new Error('Chave inválida. Use o formato do Jira, por exemplo NMTZ-1234.')
  }
  // Escolhe o exemplo pela paridade do número da tarefa: par = estoque, ímpar = vendas.
  const numero = Number(chave.split('-')[1])
  const modelo = clonar(EXECUCOES_EXEMPLO[numero % 2 === 0 ? 0 : 1])
  const id = Math.max(0, ...estado.execucoes.map((e) => e.id)) + 1
  const nova: Execucao = {
    ...modelo,
    id,
    status: 'EM_ANDAMENTO',
    etapa: 'COLETA',
    iniciadaEm: new Date().toISOString(),
    tempoTotalMs: 0,
    revisao: null,
    tarefa: {
      ...modelo.tarefa,
      id,
      chaveJira: chave,
      titulo: `${modelo.tarefa.titulo} (simulado)`,
      documentacaoRef: usarDocumentacao ? modelo.tarefa.documentacaoRef : null,
      coletadaEm: agoraLocal(),
    },
  }
  estado.execucoes.push(nova)
  salvar()
  return id
}

/** Monta a resposta do assistente para a última mensagem da conversa. */
function responder(conversa: Conversa, texto: string, usarDocumentacao: boolean): { texto: string; execucaoId: number | null } {
  const intencao = ia.interpretar(texto, usarDocumentacao)

  if (intencao.tipo === 'GERAR') {
    const id = criarExecucao(intencao.chave, intencao.usarDocumentacao)
    // a primeira tarefa da conversa dá nome a ela
    if (!conversa.mensagens.some((m) => m.execucaoId)) {
      conversa.titulo = `${intencao.chave} · ${estado.execucoes.find((e) => e.id === id)!.tarefa.titulo}`
    }
    return { texto: ia.textoInicioGeracao(intencao.chave, intencao.usarDocumentacao), execucaoId: id }
  }
  if (intencao.tipo === 'COMO_FUNCIONA') return { texto: ia.TEXTO_COMO_FUNCIONA, execucaoId: null }

  // as demais perguntas são sobre a tarefa mais recente da conversa
  const ultimaId = conversa.mensagens.findLast((m) => m.execucaoId)?.execucaoId
  if (!ultimaId) return { texto: ia.TEXTO_SEM_EXECUCAO, execucaoId: null }
  const e = buscar(ultimaId)

  switch (intencao.tipo) {
    case 'RESUMO':
      return { texto: ia.textoResumo(e), execucaoId: null }
    case 'DIVERGENCIA':
      return { texto: ia.textoDivergencia(e), execucaoId: null }
    case 'SQL':
      return { texto: ia.textoSql(e, intencao.apuracaoId), execucaoId: null }
    case 'CORRECAO':
      return { texto: ia.TEXTO_CORRECAO, execucaoId: e.id }
    case 'NOVO_CENARIO': {
      if (e.status !== 'CONCLUIDA') return { texto: 'Espere a execução terminar e eu incluo o cenário.', execucaoId: null }
      if (e.revisao) return { texto: ia.TEXTO_JA_CONFERIDA, execucaoId: null }
      const id = Math.max(0, ...estado.execucoes.flatMap((x) => x.cenarios.map((c) => c.id))) + 1
      const c = ia.cenarioExtra(e, id)
      e.cenarios.push(c)
      return { texto: ia.textoCenarioExtra(c), execucaoId: null }
    }
    default:
      return { texto: ia.TEXTO_OUTRO, execucaoId: null }
  }
}

function agoraLocal(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
}

export const mockApi: PlataformaApi = {
  async listarExecucoes() {
    await esperar(250)
    return estado.execucoes
      .map(avancar)
      .map(resumo)
      .sort((a, b) => b.id - a.id)
  },

  async obterExecucao(id) {
    await esperar(200)
    return clonar(visivel(buscar(id)))
  },

  async iniciarExecucao({ chaveJira, usarDocumentacao }) {
    await esperar(400)
    return { id: criarExecucao(chaveJira, usarDocumentacao) }
  },

  async listarConversas() {
    await esperar(150)
    return estado.conversas
      .map((c) => {
        const execId = c.mensagens.find((m) => m.execucaoId)?.execucaoId
        return {
          id: c.id,
          titulo: c.titulo,
          chaveJira: estado.execucoes.find((e) => e.id === execId)?.tarefa.chaveJira ?? null,
          atualizadaEm: c.mensagens.at(-1)?.enviadaEm ?? c.criadaEm,
        }
      })
      .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm))
  },

  async obterConversa(id) {
    await esperar(150)
    return clonar(buscarConversa(id))
  },

  async enviarMensagem({ conversaId, texto, usarDocumentacao }) {
    // tempo de "pensar" do modelo
    await esperar(900 + Math.random() * 600)
    const agora = new Date().toISOString()
    let conversa: Conversa
    if (conversaId == null) {
      conversa = {
        id: Math.max(0, ...estado.conversas.map((c) => c.id)) + 1,
        titulo: texto.trim().slice(0, 60),
        criadaEm: agora,
        mensagens: [],
      }
      estado.conversas.push(conversa)
    } else {
      conversa = buscarConversa(conversaId)
    }
    const proximoId = () => Math.max(0, ...estado.conversas.flatMap((c) => c.mensagens.map((m) => m.id))) + 1
    conversa.mensagens.push({ id: proximoId(), papel: 'USUARIO', texto: texto.trim(), enviadaEm: agora, execucaoId: null })
    const { texto: resposta, execucaoId } = responder(conversa, texto, usarDocumentacao)
    conversa.mensagens.push({ id: proximoId(), papel: 'ASSISTENTE', texto: resposta, enviadaEm: new Date().toISOString(), execucaoId })
    salvar()
    return clonar(conversa)
  },

  async registrarRevisao(execucaoId, req) {
    await esperar(300)
    const e = buscar(execucaoId)
    if (e.status !== 'CONCLUIDA') throw new Error('A execução ainda não terminou.')
    const revisao: Revisao = {
      id: Math.max(0, ...estado.execucoes.map((x) => x.revisao?.id ?? 0)) + 1,
      analista: req.analista,
      decisao: req.decisao,
      valoresAlterados: Object.values(req.valoresCorrigidos).filter((v) => v.trim() !== '').length,
      tempoRevisaoS: req.tempoRevisaoS,
      comentario: req.comentario,
      registradaEm: agoraLocal(),
    }
    e.revisao = revisao
    salvar()
    return clonar(revisao)
  },

  async obterMetricas() {
    await esperar(250)
    const execs = estado.execucoes.map(avancar).filter((e) => e.status === 'CONCLUIDA')
    const apuracoes = execs.flatMap((e) => e.apuracoes)
    const desfechos: Record<Desfecho, number> = { UNANIME: 0, MAIORIA: 0, DIVERGENTE: 0, FALHA: 0 }
    apuracoes.forEach((a) => desfechos[a.desfecho]++)
    const decisoes: Record<Decisao, number> = { ACEITO: 0, ACEITO_ALTERACAO: 0, REJEITADO: 0 }
    execs.forEach((e) => e.revisao && decisoes[e.revisao.decisao]++)

    const revisadas = execs.filter((e) => e.revisao)
    const valoresRevisados = revisadas.reduce(
      (s, e) => s + e.apuracoes.filter((a) => a.resultadoReferencia).length,
      0,
    )
    const alterados = revisadas.reduce((s, e) => s + (e.revisao?.valoresAlterados ?? 0), 0)

    const candidatos = apuracoes.flatMap((a) => a.candidatos)
    const provedores: Provedor[] = ['CLAUDE', 'GEMINI', 'LLAMA']
    const porProvedor = provedores.map((p) => {
      const cs = candidatos.filter((c) => c.provedor === p)
      return {
        provedor: p,
        candidatos: cs.length,
        validos: cs.filter((c) => c.verificacao === 'VALIDO').length,
        custoUsd: cs.reduce((s, c) => s + c.custoUsd, 0),
        latenciaMediaMs: cs.length ? cs.reduce((s, c) => s + c.latenciaMs, 0) / cs.length : 0,
      }
    })

    const custoApuracoes = candidatos.reduce((s, c) => s + c.custoUsd, 0)
    // As três chamadas de uma apuração rodam em paralelo: o tempo é o do candidato mais lento.
    const tempoApuracoes = apuracoes.reduce(
      (s, a) => s + Math.max(0, ...a.candidatos.map((c) => c.latenciaMs * c.tentativa)),
      0,
    )

    const m: Metricas = {
      totalExecucoes: execs.length,
      totalApuracoes: apuracoes.length,
      desfechos,
      decisoes,
      valoresAlteradosPct: valoresRevisados ? alterados / valoresRevisados : 0,
      custoMedioApuracaoUsd: apuracoes.length ? custoApuracoes / apuracoes.length : 0,
      tempoMedioApuracaoS: apuracoes.length ? tempoApuracoes / apuracoes.length / 1000 : 0,
      porProvedor,
    }
    return m
  },
}

/** Volta aos dados de exemplo (só existe no modo simulado). */
export function redefinirDadosExemplo() {
  estado = exemplos()
  salvar()
}
