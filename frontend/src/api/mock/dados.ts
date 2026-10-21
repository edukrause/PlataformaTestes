// Dados de exemplo do protótipo. As tarefas, tabelas e valores são fictícios.

import type { CandidatoSql, Execucao, Provedor, Tabela, Verificacao } from '../tipos'

const MODELOS: Record<Provedor, string> = {
  CLAUDE: 'claude-sonnet-5',
  GEMINI: 'gemini-2.5-pro',
  LLAMA: 'llama-3.3-70b-versatile',
}

const PRECO_MTOK: Record<Provedor, [number, number]> = {
  CLAUDE: [3, 15],
  GEMINI: [1.25, 10],
  LLAMA: [0.59, 0.79],
}

let seqCandidato = 1

// Pseudoaleatório com semente fixa, para os exemplos não mudarem a cada carga.
let semente = 20261030
function aleatorio(): number {
  semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0
  return semente / 2 ** 32
}

function candidato(
  provedor: Provedor,
  consulta: string,
  verificacao: Verificacao,
  resultado: Tabela | null,
  extra: Partial<CandidatoSql> = {},
): CandidatoSql {
  const tokensEntrada = extra.tokensEntrada ?? 4200 + Math.round(aleatorio() * 900)
  const tokensSaida = extra.tokensSaida ?? 160 + Math.round(aleatorio() * 120)
  const [pe, ps] = PRECO_MTOK[provedor]
  return {
    id: seqCandidato++,
    provedor,
    modelo: MODELOS[provedor],
    tentativa: 1,
    consulta: consulta.trim(),
    verificacao,
    mensagemErro: null,
    hashResultado: resultado ? hashDe(resultado) : null,
    resultado,
    tokensEntrada,
    tokensSaida,
    custoUsd: +((tokensEntrada * pe + tokensSaida * ps) / 1_000_000).toFixed(5),
    latenciaMs: provedor === 'LLAMA' ? 900 + Math.round(aleatorio() * 600) : 2800 + Math.round(aleatorio() * 2500),
    ...extra,
  }
}

/** Hash curto só para exibição; no back-end é SHA-256 do conjunto normalizado. */
function hashDe(t: Tabela): string {
  const s = JSON.stringify(t.linhas)
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0')
}

const um = (coluna: string, valor: string | number): Tabela => ({ colunas: [coluna], linhas: [[valor]] })

// ───────────────────────── Execução 1 · estoque, unânime + maioria ─────────────────────────

const SALDO = um('saldo', 1250)
const VALOR_DEP = um('valor_total', 48312.75)

const exec1: Execucao = {
  id: 1,
  tarefa: {
    id: 1,
    chaveJira: 'DEMO-101',
    titulo: 'Posição de estoque: permitir filtrar por depósito',
    area: 'ESTOQUE',
    requisito:
      'No relatório de Posição de Estoque, incluir o filtro "Depósito". Quando informado, o relatório deve exibir apenas o saldo e o valor de estoque do depósito selecionado. Sem filtro, mantém o comportamento atual (todos os depósitos da filial).',
    documentacaoRef: 'NID / Estoque / Relatórios / Posição de Estoque',
    coletadaEm: '2026-10-13T14:02:11',
  },
  versaoPrompt: 'v0.3',
  status: 'CONCLUIDA',
  etapa: 'COMPOSICAO',
  exigeApuracao: true,
  tempoTotalMs: 41870,
  custoTotalUsd: 0.0712,
  iniciadaEm: '2026-10-13T14:02:10',
  cenarios: [
    {
      id: 1,
      tipo: 'ALTERACAO',
      titulo: 'Saldo de um produto filtrado por depósito',
      sintaxeValida: true,
      gherkin: `Funcionalidade: Posição de Estoque filtrada por depósito

  Cenário: Saldo de um produto em um depósito específico
    Dado que estou na empresa 1, filial 1
    E acesso o relatório "Posição de Estoque"
    Quando informo o depósito "02 - Expedição"
    E informo o produto "PRD-0457"
    E gero o relatório
    Então o saldo exibido do produto deve ser «A1» unidades`,
    },
    {
      id: 2,
      tipo: 'ALTERACAO',
      titulo: 'Valor total do depósito',
      sintaxeValida: true,
      gherkin: `  Cenário: Valor total de estoque do depósito
    Dado que estou na empresa 1, filial 1
    E acesso o relatório "Posição de Estoque"
    Quando informo o depósito "02 - Expedição"
    E gero o relatório sem filtro de produto
    Então o valor total de estoque exibido deve ser «A2»`,
    },
    {
      id: 3,
      tipo: 'REGRESSAO',
      titulo: 'Sem filtro mantém todos os depósitos',
      sintaxeValida: true,
      gherkin: `  Cenário: Relatório sem filtro de depósito mantém o comportamento atual
    Dado que estou na empresa 1, filial 1
    E acesso o relatório "Posição de Estoque"
    Quando gero o relatório sem informar o depósito
    Então devem ser listados os saldos de todos os depósitos da filial
    E o total geral deve ser a soma dos totais por depósito`,
    },
  ],
  apuracoes: [
    {
      id: 1,
      cenarioId: 1,
      pergunta: 'Saldo do produto PRD-0457 no depósito 02, empresa 1, filial 1',
      subesquema: ['produto', 'deposito', 'saldo_estoque'],
      desfecho: 'UNANIME',
      resultadoReferencia: SALDO,
      candidatos: [
        candidato('CLAUDE', `
SELECT s.quantidade AS saldo
FROM saldo_estoque s
JOIN produto p ON p.id = s.produto_id
JOIN deposito d ON d.id = s.deposito_id
WHERE p.codigo = 'PRD-0457'
  AND d.codigo = '02'
  AND s.empresa_id = 1 AND s.filial_id = 1`, 'VALIDO', SALDO),
        candidato('GEMINI', `
SELECT SUM(se.quantidade) AS saldo_produto
FROM saldo_estoque se
INNER JOIN produto pr ON pr.id = se.produto_id
WHERE pr.codigo = 'PRD-0457'
  AND se.deposito_id = (SELECT id FROM deposito WHERE codigo = '02' AND filial_id = 1)
  AND se.empresa_id = 1`, 'VALIDO', SALDO),
        candidato('LLAMA', `
SELECT quantidade FROM saldo_estoque
WHERE produto_id = (SELECT id FROM produto WHERE codigo = 'PRD-0457')
  AND deposito_id = (SELECT id FROM deposito WHERE codigo = '02')
  AND empresa_id = 1 AND filial_id = 1`, 'VALIDO', SALDO),
      ],
    },
    {
      id: 2,
      cenarioId: 2,
      pergunta: 'Valor total de estoque do depósito 02 (quantidade × custo médio), empresa 1, filial 1',
      subesquema: ['produto', 'deposito', 'saldo_estoque', 'custo_medio'],
      desfecho: 'MAIORIA',
      resultadoReferencia: VALOR_DEP,
      candidatos: [
        candidato('CLAUDE', `
SELECT ROUND(SUM(s.quantidade * c.valor), 2) AS valor_total
FROM saldo_estoque s
JOIN deposito d ON d.id = s.deposito_id
JOIN custo_medio c ON c.produto_id = s.produto_id
  AND c.empresa_id = s.empresa_id AND c.filial_id = s.filial_id
JOIN produto p ON p.id = s.produto_id
WHERE d.codigo = '02'
  AND s.empresa_id = 1 AND s.filial_id = 1
  AND p.excluido = 0`, 'VALIDO', VALOR_DEP),
        candidato('GEMINI', `
SELECT ROUND(SUM(se.quantidade * cm.valor), 2) AS total
FROM saldo_estoque se
JOIN custo_medio cm ON cm.produto_id = se.produto_id AND cm.filial_id = se.filial_id
JOIN produto p ON p.id = se.produto_id AND p.excluido = 0
WHERE se.deposito_id = (SELECT id FROM deposito WHERE codigo = '02' AND filial_id = 1)
  AND se.empresa_id = 1`, 'VALIDO', VALOR_DEP),
        candidato('LLAMA', `
SELECT SUM(s.quantidade * c.valor) AS valor
FROM saldo_estoque s, custo_medio c, deposito d
WHERE s.produto_id = c.produto_id
  AND s.deposito_id = d.id AND d.codigo = '02'
  AND s.empresa_id = 1 AND s.filial_id = 1`, 'VALIDO', um('valor', 49870.15)),
      ],
    },
  ],
  revisao: {
    id: 1,
    analista: 'Analista 1',
    decisao: 'ACEITO',
    valoresAlterados: 0,
    tempoRevisaoS: 312,
    comentario: 'Valores conferidos no relatório da homologação.',
    registradaEm: '2026-10-13T14:09:40',
  },
}

// ───────────────────────── Execução 2 · vendas, tabela + divergente ─────────────────────────

const FAT_VEND: Tabela = {
  colunas: ['vendedor', 'total_faturado'],
  linhas: [
    ['Ana Souza', 38210.4],
    ['Bruno Lima', 27455.9],
    ['Carla Mendes', 19980.35],
  ],
}

const exec2: Execucao = {
  id: 2,
  tarefa: {
    id: 2,
    chaveJira: 'DEMO-114',
    titulo: 'Faturamento por vendedor: desconsiderar notas canceladas',
    area: 'VENDAS',
    requisito:
      'O relatório de Faturamento por Vendedor está somando notas fiscais canceladas. Ajustar para considerar apenas notas autorizadas no período informado. Devoluções continuam sendo abatidas do total do vendedor.',
    documentacaoRef: 'NID / Vendas / Relatórios / Faturamento por Vendedor',
    coletadaEm: '2026-10-14T09:31:52',
  },
  versaoPrompt: 'v0.3',
  status: 'CONCLUIDA',
  etapa: 'COMPOSICAO',
  exigeApuracao: true,
  tempoTotalMs: 53410,
  custoTotalUsd: 0.0894,
  iniciadaEm: '2026-10-14T09:31:50',
  cenarios: [
    {
      id: 4,
      tipo: 'ALTERACAO',
      titulo: 'Notas canceladas fora do total',
      sintaxeValida: true,
      gherkin: `Funcionalidade: Faturamento por Vendedor sem notas canceladas

  Cenário: Total por vendedor considera apenas notas autorizadas
    Dado que estou na empresa 1, filial 1
    E acesso o relatório "Faturamento por Vendedor"
    Quando informo o período de 01/09/2026 a 30/09/2026
    E gero o relatório
    Então os totais por vendedor devem ser:
      «A3»`,
    },
    {
      id: 5,
      tipo: 'ALTERACAO',
      titulo: 'Devolução abatida do vendedor',
      sintaxeValida: true,
      gherkin: `  Cenário: Devolução continua sendo abatida
    Dado que estou na empresa 1, filial 1
    E acesso o relatório "Faturamento por Vendedor"
    Quando informo o período de 01/09/2026 a 30/09/2026
    E filtro o vendedor "Bruno Lima"
    Então o total líquido exibido deve ser «A4»`,
    },
    {
      id: 6,
      tipo: 'REGRESSAO',
      titulo: 'Filtro por período continua funcionando',
      sintaxeValida: true,
      gherkin: `  Cenário: Notas fora do período não entram no relatório
    Dado que existe nota autorizada emitida em 31/08/2026
    Quando gero o relatório de 01/09/2026 a 30/09/2026
    Então essa nota não deve compor nenhum total`,
    },
  ],
  apuracoes: [
    {
      id: 3,
      cenarioId: 4,
      pergunta: 'Total faturado por vendedor em 09/2026, só notas autorizadas, abatendo devoluções',
      subesquema: ['nota_fiscal', 'nota_fiscal_item', 'vendedor', 'devolucao'],
      desfecho: 'UNANIME',
      resultadoReferencia: FAT_VEND,
      candidatos: [
        candidato('CLAUDE', `
SELECT v.nome AS vendedor,
       ROUND(SUM(nf.valor_total) - COALESCE(SUM(dv.valor), 0), 2) AS total_faturado
FROM nota_fiscal nf
JOIN vendedor v ON v.id = nf.vendedor_id
LEFT JOIN devolucao dv ON dv.nota_fiscal_id = nf.id
WHERE nf.situacao = 'AUTORIZADA'
  AND nf.emissao BETWEEN '2026-09-01' AND '2026-09-30'
  AND nf.empresa_id = 1 AND nf.filial_id = 1
GROUP BY v.nome
ORDER BY v.nome`, 'VALIDO', FAT_VEND),
        candidato('GEMINI', `
SELECT v.nome, SUM(nf.valor_total - IFNULL(d.valor, 0)) AS total
FROM nota_fiscal nf
INNER JOIN vendedor v ON nf.vendedor_id = v.id
LEFT JOIN devolucao d ON d.nota_fiscal_id = nf.id
WHERE nf.situacao = 'AUTORIZADA'
  AND DATE(nf.emissao) >= '2026-09-01' AND DATE(nf.emissao) <= '2026-09-30'
  AND nf.empresa_id = 1 AND nf.filial_id = 1
GROUP BY v.nome`, 'VALIDO', FAT_VEND),
        candidato('LLAMA', `
SELECT v.nome, SUM(nf.valor_total) AS total
FROM nota_fiscal nf JOIN vendedor v ON v.id = nf.vendedor_id
WHERE nf.situacao <> 'CANCELADA'
  AND nf.emissao BETWEEN '2026-09-01' AND '2026-09-30'
  AND nf.empresa_id = 1
GROUP BY v.nome`, 'VALIDO', FAT_VEND, { tentativa: 2 }),
      ],
    },
    {
      id: 4,
      cenarioId: 5,
      pergunta: 'Total líquido do vendedor Bruno Lima em 09/2026',
      subesquema: ['nota_fiscal', 'vendedor', 'devolucao', 'devolucao_item'],
      desfecho: 'DIVERGENTE',
      resultadoReferencia: null,
      candidatos: [
        candidato('CLAUDE', `
SELECT ROUND(SUM(nf.valor_total) - COALESCE((
         SELECT SUM(di.valor) FROM devolucao_item di
         JOIN devolucao d ON d.id = di.devolucao_id
         WHERE d.vendedor_id = v.id
           AND d.data BETWEEN '2026-09-01' AND '2026-09-30'), 0), 2) AS total_liquido
FROM nota_fiscal nf JOIN vendedor v ON v.id = nf.vendedor_id
WHERE v.nome = 'Bruno Lima' AND nf.situacao = 'AUTORIZADA'
  AND nf.emissao BETWEEN '2026-09-01' AND '2026-09-30'
  AND nf.empresa_id = 1 AND nf.filial_id = 1`, 'VALIDO', um('total_liquido', 27455.9)),
        candidato('GEMINI', `
SELECT SUM(nf.valor_total) - SUM(IFNULL(d.valor, 0)) AS liquido
FROM nota_fiscal nf
JOIN vendedor v ON v.id = nf.vendedor_id
LEFT JOIN devolucao d ON d.nota_fiscal_id = nf.id
WHERE v.nome = 'Bruno Lima' AND nf.situacao = 'AUTORIZADA'
  AND nf.emissao BETWEEN '2026-09-01' AND '2026-09-30'`, 'VALIDO', um('liquido', 26995.3)),
        candidato('LLAMA', `
SELECT SUM(valor_total) FROM nota_fiscal
WHERE vendedor_id = (SELECT id FROM vendedor WHERE nome = 'Bruno Lima')
  AND situacao = 'AUTORIZADA'`, 'VALIDO', um('SUM(valor_total)', 31120.4)),
      ],
    },
  ],
  revisao: null,
}

// ───────────────────────── Execução 3 · sem apuração ─────────────────────────

const exec3: Execucao = {
  id: 3,
  tarefa: {
    id: 3,
    chaveJira: 'DEMO-120',
    titulo: 'Pedido de venda: bloquear emissão para cliente inativo',
    area: 'VENDAS',
    requisito:
      'Ao salvar um pedido de venda para cliente com situação "Inativo", o sistema deve impedir a gravação e exibir a mensagem "Cliente inativo. Reative o cadastro para emitir pedidos."',
    documentacaoRef: 'NID / Vendas / Pedido de Venda',
    coletadaEm: '2026-10-14T15:10:03',
  },
  versaoPrompt: 'v0.3',
  status: 'CONCLUIDA',
  etapa: 'COMPOSICAO',
  exigeApuracao: false,
  tempoTotalMs: 9820,
  custoTotalUsd: 0.0081,
  iniciadaEm: '2026-10-14T15:10:01',
  cenarios: [
    {
      id: 7,
      tipo: 'ALTERACAO',
      titulo: 'Bloqueio para cliente inativo',
      sintaxeValida: true,
      gherkin: `Funcionalidade: Bloqueio de pedido para cliente inativo

  Cenário: Pedido para cliente inativo não é gravado
    Dado que o cliente "C-0099" está com situação "Inativo"
    E estou incluindo um pedido de venda para esse cliente
    Quando salvo o pedido
    Então o pedido não deve ser gravado
    E deve ser exibida a mensagem "Cliente inativo. Reative o cadastro para emitir pedidos."`,
    },
    {
      id: 8,
      tipo: 'REGRESSAO',
      titulo: 'Cliente ativo segue normal',
      sintaxeValida: true,
      gherkin: `  Cenário: Pedido para cliente ativo continua sendo gravado
    Dado que o cliente "C-0012" está com situação "Ativo"
    Quando incluo e salvo um pedido de venda para esse cliente
    Então o pedido deve ser gravado com situação "Em digitação"`,
    },
  ],
  apuracoes: [],
  revisao: {
    id: 2,
    analista: 'Analista 1',
    decisao: 'ACEITO_ALTERACAO',
    valoresAlterados: 0,
    tempoRevisaoS: 145,
    comentario: 'Ajustei o código do cliente de exemplo.',
    registradaEm: '2026-10-14T15:14:12',
  },
}

// ───────────────────────── Execução 4 · falha ─────────────────────────

const exec4: Execucao = {
  id: 4,
  tarefa: {
    id: 4,
    chaveJira: 'DEMO-133',
    titulo: 'Giro de estoque: considerar transferências entre filiais',
    area: 'ESTOQUE',
    requisito:
      'O indicador de giro de estoque deve passar a considerar as transferências entre filiais como saída na filial de origem e entrada na filial de destino.',
    documentacaoRef: null,
    coletadaEm: '2026-10-15T08:47:20',
  },
  versaoPrompt: 'v0.3',
  status: 'CONCLUIDA',
  etapa: 'COMPOSICAO',
  exigeApuracao: true,
  tempoTotalMs: 61240,
  custoTotalUsd: 0.1046,
  iniciadaEm: '2026-10-15T08:47:18',
  cenarios: [
    {
      id: 9,
      tipo: 'ALTERACAO',
      titulo: 'Transferência entra no giro',
      sintaxeValida: true,
      gherkin: `Funcionalidade: Giro de estoque com transferências

  Cenário: Transferência conta como saída na origem
    Dado que estou na filial 1
    Quando consulto o giro do produto "PRD-0457" em 09/2026
    Então o giro exibido deve ser «A5»`,
    },
  ],
  apuracoes: [
    {
      id: 5,
      cenarioId: 9,
      pergunta: 'Giro do produto PRD-0457 na filial 1 em 09/2026, com transferências',
      subesquema: ['movimento_estoque', 'produto', 'tipo_movimento', 'saldo_estoque'],
      desfecho: 'FALHA',
      resultadoReferencia: null,
      candidatos: [
        candidato('CLAUDE', `
SELECT ROUND(SUM(CASE WHEN tm.natureza = 'S' THEN m.quantidade ELSE 0 END)
       / NULLIF(AVG(s.quantidade), 0), 2) AS giro
FROM movimento_estoque m
JOIN tipo_movimento tm ON tm.id = m.tipo_movimento_id
JOIN saldo_estoque s ON s.produto_id = m.produto_id
WHERE m.produto_id = (SELECT id FROM produto WHERE codigo = 'PRD-0457')
  AND m.filial_id = 1 AND m.data BETWEEN '2026-09-01' AND '2026-09-30'`, 'VALIDO', um('giro', 3.42), { tentativa: 2 }),
        candidato('GEMINI', `
SELECT SUM(m.qtd) / AVG(s.saldo) AS giro
FROM movimento_estoque m JOIN saldo_estoque s USING (produto_id)
WHERE m.filial = 1`, 'ERRO_EXECUCAO', null, {
          tentativa: 2,
          mensagemErro: "Unknown column 'm.qtd' in 'field list'",
        }),
        candidato('LLAMA', `
SELECT m.produto_id, SUM(m.quantidade) FROM movimento_estoque m
WHERE m.tipo = 'TRANSFERENCIA' AND m.data >= '2026-09-01'
GROUP BY m.produto_id`, 'VAZIO', null, {
          tentativa: 2,
          mensagemErro: 'A consulta não retornou linhas após a nova tentativa.',
        }),
      ],
    },
  ],
  revisao: {
    id: 3,
    analista: 'Analista 1',
    decisao: 'REJEITADO',
    valoresAlterados: 0,
    tempoRevisaoS: 420,
    comentario: 'Rotina sem documentação revisada; giro precisa ser definido com o PO.',
    registradaEm: '2026-10-15T08:58:02',
  },
}

// ───────────────────────── Execução 5 · primeira tentativa da DEMO-101, sem documentação ─────────────────────────

const exec5: Execucao = {
  ...structuredClone(exec1),
  id: 5,
  tarefa: { ...exec1.tarefa, documentacaoRef: null, coletadaEm: '2026-10-12T16:20:05' },
  versaoPrompt: 'v0.2',
  tempoTotalMs: 38210,
  custoTotalUsd: 0.0655,
  iniciadaEm: '2026-10-12T16:20:04',
  cenarios: exec1.cenarios.slice(0, 2),
  revisao: {
    id: 4,
    analista: 'Analista 1',
    decisao: 'REJEITADO',
    valoresAlterados: 0,
    tempoRevisaoS: 145,
    comentario: 'Sem a documentação, os cenários ignoraram o comportamento sem filtro.',
    registradaEm: '2026-10-12T16:31:12',
  },
}

// As duas primeiras servem de modelo para as execuções novas do modo simulado (estoque e vendas).
export const EXECUCOES_EXEMPLO: Execucao[] = [exec1, exec2, exec3, exec4, exec5]
