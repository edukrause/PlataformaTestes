// Dados de exemplo do protótipo. As tarefas, tabelas e valores são fictícios.

import type { CandidatoSql, Demanda, Execucao, RelatorioConferencia, Provedor, Tabela, Verificacao } from '../tipos'

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
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
E está logado na empresa 1, filial 1
Quando informa o depósito "02 - Expedição" no novo filtro "Depósito"
E informa o produto "PRD-0457"
E gera o relatório
Então o saldo exibido para o produto é de «A1» unidades
E não são listados saldos de outros depósitos`,
      resultadoEsperado:
        'O relatório exibe apenas o saldo do produto PRD-0457 no depósito 02 - Expedição, «A1» unidades, sem misturar outros depósitos da filial.',
      execucaoTeste: {
        resultado: 'FALHOU',
        passos: ['PASSOU', 'PASSOU', 'PASSOU', 'PASSOU', 'PASSOU', 'PASSOU', 'FALHOU'],
        observacao:
          'O saldo do PRD-0457 no depósito 02 bateu com o valor apurado (1.250 unidades). Porém o relatório também listou o depósito "05 - Avariados" com saldo zero, que não deveria aparecer com o filtro informado.',
        executadoPor: 'Analista 1',
        executadoEm: '2026-10-15T10:32:00',
      },
    },
    {
      id: 2,
      tipo: 'ALTERACAO',
      titulo: 'Valor total do depósito',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
E está logado na empresa 1, filial 1
Quando informa o depósito "02 - Expedição" no filtro "Depósito"
E gera o relatório sem informar produto
Então o valor total de estoque exibido no rodapé é «A2»`,
      resultadoEsperado:
        'O valor total do rodapé considera só os produtos do depósito 02 - Expedição (quantidade × custo médio), totalizando «A2».',
    },
    {
      id: 3,
      tipo: 'REGRESSAO',
      titulo: 'Sem filtro mantém todos os depósitos',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
E está logado na empresa 1, filial 1
Quando gera o relatório sem informar o filtro "Depósito"
Então são listados os saldos de todos os depósitos da filial
E o total geral é a soma dos totais de cada depósito`,
      resultadoEsperado:
        'Sem o filtro de depósito, o relatório continua com o comportamento anterior à alteração, listando todos os depósitos da filial.',
    },
    {
      id: 10,
      tipo: 'REGRESSAO',
      titulo: 'Produto sem saldo no depósito filtrado',
      sintaxeValida: true,
      gherkin: `Dado que o produto "PRD-0990" não possui saldo no depósito "02 - Expedição"
E o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição" e o produto "PRD-0990"
E gera o relatório
Então o sistema exibe a mensagem "Nenhum registro encontrado"`,
      resultadoEsperado:
        'Produto sem saldo no depósito filtrado não aparece no relatório, e o usuário é informado de que não há registros.',
    },
    {
      id: 11,
      tipo: 'ALTERACAO',
      titulo: 'Lista de depósitos mostra só os da filial logada',
      sintaxeValida: true,
      gherkin: `Dado que o usuário está logado na empresa 1, filial 1
E acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando abre a lista do filtro "Depósito"
Então são exibidos apenas os depósitos cadastrados para a filial 1
E os depósitos inativos não aparecem na lista`,
      resultadoEsperado:
        'O filtro "Depósito" oferece somente os depósitos ativos da filial em que o usuário está logado.',
    },
    {
      id: 12,
      tipo: 'ALTERACAO',
      titulo: 'Filtro de depósito combinado com grupo de produto',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição"
E informa o grupo de produto "Fertilizantes"
E gera o relatório
Então são listados apenas os produtos do grupo "Fertilizantes" com saldo no depósito 02
E os totais do rodapé consideram somente esses produtos`,
      resultadoEsperado:
        'Os filtros de depósito e de grupo funcionam juntos, e os totais refletem apenas os produtos que atendem aos dois.',
    },
    {
      id: 13,
      tipo: 'ALTERACAO',
      titulo: 'Depósito impresso no cabeçalho do relatório',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição"
E gera o relatório em PDF
Então o cabeçalho do relatório exibe "Depósito: 02 - Expedição"`,
      resultadoEsperado:
        'O PDF identifica no cabeçalho qual depósito foi filtrado, para não ser confundido com o relatório geral da filial.',
    },
    {
      id: 14,
      tipo: 'ALTERACAO',
      titulo: 'Exportação para Excel respeita o depósito',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição"
E exporta o relatório para Excel
Então a planilha contém apenas as linhas do depósito 02
E possui a coluna "Depósito" preenchida em todas as linhas`,
      resultadoEsperado:
        'A exportação traz o mesmo conteúdo da tela, limitado ao depósito escolhido.',
    },
    {
      id: 15,
      tipo: 'REGRESSAO',
      titulo: 'Filtro por data de posição continua funcionando',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa a data de posição "30/09/2026"
E não informa o depósito
E gera o relatório
Então os saldos exibidos correspondem à posição de 30/09/2026 em todos os depósitos`,
      resultadoEsperado:
        'O filtro de data de posição mantém o comportamento anterior à alteração.',
    },
    {
      id: 16,
      tipo: 'REGRESSAO',
      titulo: 'Usuário sem permissão no depósito',
      sintaxeValida: true,
      gherkin: `Dado que o usuário não possui permissão de acesso ao depósito "05 - Avariados"
E acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando abre a lista do filtro "Depósito"
Então o depósito "05 - Avariados" não é exibido
E o relatório sem filtro também não lista os saldos desse depósito`,
      resultadoEsperado:
        'As permissões de acesso por depósito continuam sendo respeitadas no relatório, com ou sem o novo filtro.',
    },
    {
      id: 17,
      tipo: 'ALTERACAO',
      titulo: 'Ordenação por código de produto no depósito filtrado',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição"
E gera o relatório
Então os produtos são listados em ordem crescente de código`,
      resultadoEsperado:
        'A ordenação padrão do relatório continua por código de produto também com o filtro de depósito.',
    },
    {
      id: 18,
      tipo: 'ALTERACAO',
      titulo: 'Produto com saldo negativo no depósito',
      sintaxeValida: true,
      gherkin: `Dado que o produto "PRD-0712" está com saldo negativo no depósito "02 - Expedição"
E o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição"
E gera o relatório
Então o produto é listado com o saldo negativo destacado em vermelho`,
      resultadoEsperado:
        'Saldos negativos do depósito aparecem no relatório e ficam destacados, como já acontece no relatório geral.',
    },
    {
      id: 19,
      tipo: 'ALTERACAO',
      titulo: 'Filtro de depósito com produto controlado por lote',
      sintaxeValida: true,
      gherkin: `Dado que o produto "PRD-0333" é controlado por lote
E possui os lotes "L01" e "L02" no depósito "02 - Expedição"
E o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição" e marca a opção "Detalhar lotes"
Então são listados os lotes "L01" e "L02" com o saldo de cada um no depósito`,
      resultadoEsperado:
        'O detalhamento por lote respeita o depósito filtrado.',
    },
    {
      id: 20,
      tipo: 'ALTERACAO',
      titulo: 'Depósito informado e limpo antes de gerar',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição"
E limpa o campo "Depósito"
E gera o relatório
Então são listados os saldos de todos os depósitos da filial`,
      resultadoEsperado:
        'Limpar o filtro volta ao comportamento sem filtro, sem guardar o último depósito informado.',
    },
    {
      id: 21,
      tipo: 'ALTERACAO',
      titulo: 'Filtro de depósito mantido ao voltar para a tela',
      sintaxeValida: true,
      gherkin: `Dado que o usuário gerou o relatório com o depósito "02 - Expedição" no menu ERP » Estoque » Relatórios » Posição de Estoque
Quando fecha o relatório e volta para a tela de filtros
Então o campo "Depósito" continua preenchido com "02 - Expedição"`,
      resultadoEsperado:
        'A tela mantém os filtros da última geração, como já faz com os outros campos.',
    },
    {
      id: 22,
      tipo: 'REGRESSAO',
      titulo: 'Relatório agrupado por depósito continua funcionando',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando marca a opção "Agrupar por depósito"
E não informa o depósito
E gera o relatório
Então cada depósito aparece em um grupo com o seu subtotal`,
      resultadoEsperado:
        'O agrupamento por depósito existente não é afetado pelo novo filtro.',
    },
    {
      id: 23,
      tipo: 'REGRESSAO',
      titulo: 'Produtos inativos continuam fora do relatório',
      sintaxeValida: true,
      gherkin: `Dado que o produto "PRD-0021" está inativo e possui saldo no depósito "02 - Expedição"
E o usuário acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando informa o depósito "02 - Expedição"
E gera o relatório
Então o produto "PRD-0021" não é listado`,
      resultadoEsperado:
        'A regra de não listar produtos inativos continua valendo com o filtro de depósito.',
    },
    {
      id: 24,
      tipo: 'ALTERACAO',
      titulo: 'Depósito de outra filial digitado manualmente',
      sintaxeValida: true,
      gherkin: `Dado que o usuário está logado na filial 1
E acessa o menu ERP » Estoque » Relatórios » Posição de Estoque
Quando digita no campo "Depósito" o código de um depósito da filial 2
Então o sistema exibe a mensagem "Depósito não pertence à filial logada"
E o relatório não é gerado`,
      resultadoEsperado:
        'Não é possível consultar o saldo de depósito de outra filial digitando o código diretamente.',
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
  pontosAtencao: [
    {
      tipo: 'AMBIGUIDADE',
      texto:
        'O requisito não diz se o filtro "Depósito" aceita mais de um depósito ao mesmo tempo. Os casos consideram seleção única; vale confirmar com o PO.',
    },
    {
      tipo: 'AMBIGUIDADE',
      texto:
        'Não está definido se o valor do estoque usa o custo médio da filial ou do depósito. A apuração A2 usou o da filial, e o Llama divergiu justamente por não cruzar o custo com a filial.',
    },
    {
      tipo: 'REGRESSAO',
      texto:
        'Segundo o NID, a Posição de Estoque serve de base para a conferência do Inventário. Vale rodar um inventário de teste depois da alteração.',
    },
    {
      tipo: 'MASSA',
      texto:
        'Para o caso 1 provar alguma coisa, o produto PRD-0457 precisa ter saldo em pelo menos dois depósitos da filial 1. Com saldo em um depósito só, o resultado é o mesmo com ou sem filtro.',
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
      gherkin: `Dado que o usuário acessa o menu ERP » Vendas » Relatórios » Faturamento por Vendedor
E está logado na empresa 1, filial 1
E existem notas fiscais canceladas em 09/2026
Quando informa o período de 01/09/2026 a 30/09/2026
E gera o relatório
Então os totais por vendedor são:
«A3»`,
      resultadoEsperado:
        'As notas canceladas não entram em nenhum total. Cada vendedor exibe só o faturamento de notas autorizadas no período, já com as devoluções abatidas.',
    },
    {
      id: 5,
      tipo: 'ALTERACAO',
      titulo: 'Devolução abatida do vendedor',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Vendas » Relatórios » Faturamento por Vendedor
E está logado na empresa 1, filial 1
E o vendedor "Bruno Lima" possui devoluções em 09/2026
Quando informa o período de 01/09/2026 a 30/09/2026
E filtra o vendedor "Bruno Lima"
Então o total líquido exibido é «A4»`,
      resultadoEsperado:
        'As devoluções do período continuam sendo abatidas do total do vendedor, resultando em «A4» para Bruno Lima.',
    },
    {
      id: 6,
      tipo: 'REGRESSAO',
      titulo: 'Filtro por período continua funcionando',
      sintaxeValida: true,
      gherkin: `Dado que existe uma nota fiscal autorizada emitida em 31/08/2026
E o usuário acessa o menu ERP » Vendas » Relatórios » Faturamento por Vendedor
Quando gera o relatório para o período de 01/09/2026 a 30/09/2026
Então essa nota não compõe o total de nenhum vendedor`,
      resultadoEsperado:
        'O filtro de período continua funcionando como antes da alteração; notas fora do intervalo não são consideradas.',
    },
    {
      id: 25,
      tipo: 'ALTERACAO',
      titulo: 'Vendedor só com notas canceladas no período',
      sintaxeValida: true,
      gherkin: `Dado que o vendedor "Diego Rocha" só possui notas canceladas em 09/2026
E o usuário acessa o menu ERP » Vendas » Relatórios » Faturamento por Vendedor
Quando informa o período de 01/09/2026 a 30/09/2026
E gera o relatório
Então o vendedor "Diego Rocha" não é listado`,
      resultadoEsperado:
        'Vendedor sem nenhuma nota autorizada no período deixa de aparecer no relatório.',
    },
    {
      id: 26,
      tipo: 'ALTERACAO',
      titulo: 'Nota cancelada depois do fim do período',
      sintaxeValida: true,
      gherkin: `Dado que uma nota foi autorizada em 28/09/2026 e cancelada em 02/10/2026
E o usuário acessa o menu ERP » Vendas » Relatórios » Faturamento por Vendedor
Quando gera o relatório de 01/09/2026 a 30/09/2026
Então essa nota não compõe o total do vendedor`,
      resultadoEsperado:
        'A situação considerada é a atual da nota, então uma nota cancelada depois do período também sai do total.',
    },
    {
      id: 27,
      tipo: 'ALTERACAO',
      titulo: 'Total geral sem notas canceladas',
      sintaxeValida: true,
      gherkin: `Dado que o usuário acessa o menu ERP » Vendas » Relatórios » Faturamento por Vendedor
Quando informa o período de 01/09/2026 a 30/09/2026
E gera o relatório
Então o total geral do rodapé é a soma dos totais dos vendedores listados`,
      resultadoEsperado:
        'O total geral também deixa de somar notas canceladas e bate com a soma das linhas.',
    },
    {
      id: 28,
      tipo: 'REGRESSAO',
      titulo: 'Filtro por filial continua funcionando',
      sintaxeValida: true,
      gherkin: `Dado que o usuário tem acesso às filiais 1 e 2
E acessa o menu ERP » Vendas » Relatórios » Faturamento por Vendedor
Quando informa a filial 2 e o período de 01/09/2026 a 30/09/2026
E gera o relatório
Então são considerados apenas os faturamentos da filial 2`,
      resultadoEsperado:
        'O filtro por filial mantém o comportamento anterior à alteração.',
    },
    {
      id: 29,
      tipo: 'REGRESSAO',
      titulo: 'Exportação para Excel com os mesmos totais',
      sintaxeValida: true,
      gherkin: `Dado que o usuário gerou o relatório no menu ERP » Vendas » Relatórios » Faturamento por Vendedor para 09/2026
Quando exporta o relatório para Excel
Então os totais da planilha são iguais aos exibidos na tela`,
      resultadoEsperado:
        'A exportação usa a mesma regra da tela e também desconsidera as notas canceladas.',
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
  pontosAtencao: [
    {
      tipo: 'AMBIGUIDADE',
      texto:
        '"Devoluções continuam sendo abatidas" não diz se a devolução abate no mês em que foi feita ou no mês da nota original. Os modelos divergiram exatamente nisso na apuração A4.',
    },
    {
      tipo: 'AMBIGUIDADE',
      texto:
        'O requisito fala só de notas canceladas. Notas denegadas e inutilizadas também deveriam ficar fora? Confirmar antes de fechar o teste.',
    },
    {
      tipo: 'REGRESSAO',
      texto:
        'O cálculo de comissão usa a mesma base do faturamento por vendedor. Se a consulta for compartilhada, a comissão também muda.',
    },
    {
      tipo: 'MASSA',
      texto:
        'É preciso ter, na filial 1 em 09/2026, pelo menos uma nota cancelada e uma devolução de um vendedor que também tenha notas autorizadas.',
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
      gherkin: `Dado que o cliente "C-0099" está com a situação "Inativo"
E o usuário acessa o menu ERP » Vendas » Pedido de Venda
Quando inclui um pedido de venda para o cliente "C-0099"
E clica em "Salvar"
Então o pedido não é gravado
E o sistema exibe a mensagem "Cliente inativo. Reative o cadastro para emitir pedidos."`,
      resultadoEsperado:
        'O sistema impede a gravação do pedido para cliente inativo e orienta o usuário a reativar o cadastro.',
    },
    {
      id: 8,
      tipo: 'REGRESSAO',
      titulo: 'Cliente ativo segue normal',
      sintaxeValida: true,
      gherkin: `Dado que o cliente "C-0012" está com a situação "Ativo"
E o usuário acessa o menu ERP » Vendas » Pedido de Venda
Quando inclui um pedido de venda para o cliente "C-0012"
E clica em "Salvar"
Então o pedido é gravado com a situação "Em digitação"`,
      resultadoEsperado:
        'Pedidos para clientes ativos continuam sendo gravados normalmente.',
    },
    {
      id: 30,
      tipo: 'ALTERACAO',
      titulo: 'Cliente inativado com o pedido já aberto na tela',
      sintaxeValida: true,
      gherkin: `Dado que o usuário está incluindo um pedido no menu ERP » Vendas » Pedido de Venda para o cliente "C-0045"
E outro usuário inativa o cliente "C-0045" nesse momento
Quando o primeiro usuário clica em "Salvar"
Então o pedido não é gravado
E o sistema exibe a mensagem "Cliente inativo. Reative o cadastro para emitir pedidos."`,
      resultadoEsperado:
        'A validação acontece na gravação, então vale mesmo que o cliente tenha sido inativado depois de o pedido ser aberto.',
    },
    {
      id: 31,
      tipo: 'ALTERACAO',
      titulo: 'Cliente reativado volta a aceitar pedidos',
      sintaxeValida: true,
      gherkin: `Dado que o cliente "C-0099" estava inativo e foi reativado
E o usuário acessa o menu ERP » Vendas » Pedido de Venda
Quando inclui um pedido para o cliente "C-0099"
E clica em "Salvar"
Então o pedido é gravado normalmente`,
      resultadoEsperado:
        'Depois de reativar o cadastro, o cliente volta a aceitar pedidos sem nenhum passo extra.',
    },
    {
      id: 32,
      tipo: 'REGRESSAO',
      titulo: 'Cópia de pedido de cliente inativo',
      sintaxeValida: true,
      gherkin: `Dado que existe um pedido antigo do cliente "C-0099", que hoje está inativo
E o usuário acessa o menu ERP » Vendas » Pedido de Venda
Quando usa a opção "Copiar pedido" sobre esse pedido
E clica em "Salvar"
Então o novo pedido não é gravado
E o sistema exibe a mensagem "Cliente inativo. Reative o cadastro para emitir pedidos."`,
      resultadoEsperado:
        'A cópia de pedido também passa pela validação de cliente inativo.',
    },
  ],
  apuracoes: [],
  pontosAtencao: [
    {
      tipo: 'AMBIGUIDADE',
      texto:
        'Não está definido o que acontece com pedidos já digitados antes de o cliente ser inativado: se ainda podem ser alterados ou faturados.',
    },
    {
      tipo: 'REGRESSAO',
      texto:
        'Pedidos que chegam por integração (força de vendas, e-commerce) podem ser gravados sem passar pela tela. Verificar se o bloqueio também vale para eles.',
    },
  ],
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
      gherkin: `Dado que o produto "PRD-0457" teve transferências da filial 1 para a filial 2 em 09/2026
E o usuário acessa o menu ERP » Estoque » Indicadores » Giro de Estoque
E está logado na filial 1
Quando consulta o giro do produto "PRD-0457" em 09/2026
Então o giro exibido é «A5»`,
      resultadoEsperado:
        'As transferências entram como saída na filial de origem e como entrada na de destino, e o giro da filial 1 passa a ser «A5».',
    },
    {
      id: 33,
      tipo: 'ALTERACAO',
      titulo: 'Giro na filial de destino da transferência',
      sintaxeValida: true,
      gherkin: `Dado que o produto "PRD-0457" recebeu transferências da filial 1 na filial 2 em 09/2026
E o usuário está logado na filial 2
E acessa o menu ERP » Estoque » Indicadores » Giro de Estoque
Quando consulta o giro do produto "PRD-0457" em 09/2026
Então as transferências recebidas entram como entrada no cálculo`,
      resultadoEsperado:
        'Na filial de destino, a transferência entra como entrada e não altera as saídas usadas no giro.',
    },
    {
      id: 34,
      tipo: 'REGRESSAO',
      titulo: 'Giro de produto sem transferências',
      sintaxeValida: true,
      gherkin: `Dado que o produto "PRD-0100" não teve transferências em 09/2026
E o usuário acessa o menu ERP » Estoque » Indicadores » Giro de Estoque
Quando consulta o giro do produto "PRD-0100" em 09/2026
Então o giro exibido é o mesmo de antes da alteração`,
      resultadoEsperado:
        'Produtos sem transferência mantêm o mesmo giro de antes.',
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
  pontosAtencao: [
    {
      tipo: 'DOCUMENTACAO',
      texto:
        'A rotina não tem documentação no NID, e a fórmula do giro não está escrita em lugar nenhum. Por isso os modelos chegaram a resultados diferentes.',
    },
    {
      tipo: 'AMBIGUIDADE',
      texto:
        'Transferência em trânsito, que saiu da origem e ainda não chegou ao destino: em qual filial ela conta no período?',
    },
    {
      tipo: 'MASSA',
      texto:
        'É preciso ter uma transferência entre a filial 1 e a filial 2 do produto PRD-0457 dentro de 09/2026.',
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
  cenarios: exec1.cenarios.slice(0, 2).map((c) => ({ ...c, execucaoTeste: null })),
  pontosAtencao: [
    {
      tipo: 'DOCUMENTACAO',
      texto:
        'Gerada sem a documentação da rotina. Os casos não cobrem o comportamento do relatório sem filtro, que está descrito no NID.',
    },
    ...exec1.pontosAtencao.slice(0, 1),
  ],
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


// ───────────────────────── Relatórios de conferência (dados da base que formam cada valor) ─────────────────────────

const REL_A1: RelatorioConferencia = {
  "titulo": "Saldo do PRD-0457 no depósito 02 - Expedição, por lote",
  "colunas": [
    "Depósito",
    "Produto",
    "Descrição",
    "Lote",
    "Validade",
    "Saldo"
  ],
  "linhas": [
    [
      "02 - Expedição",
      "PRD-0457",
      "Adubo NPK 10-10-10 50kg",
      "L2607",
      "31/07/2027",
      520
    ],
    [
      "02 - Expedição",
      "PRD-0457",
      "Adubo NPK 10-10-10 50kg",
      "L2608",
      "31/08/2027",
      480
    ],
    [
      "02 - Expedição",
      "PRD-0457",
      "Adubo NPK 10-10-10 50kg",
      "L2609",
      "30/09/2027",
      250
    ]
  ],
  "total": [
    "Total",
    null,
    null,
    null,
    null,
    1250
  ]
}

const REL_A2: RelatorioConferencia = {
  "titulo": "Produtos com saldo no depósito 02 - Expedição (quantidade × custo médio da filial 1)",
  "colunas": [
    "Produto",
    "Descrição",
    "Quantidade",
    "Custo médio",
    "Valor"
  ],
  "linhas": [
    [
      "PRD-0457",
      "Adubo NPK 10-10-10 50kg",
      1250,
      18.4,
      23000.0
    ],
    [
      "PRD-0458",
      "Adubo NPK 04-14-08 50kg",
      150,
      21.75,
      3262.5
    ],
    [
      "PRD-0512",
      "Ureia agrícola 50kg",
      90,
      27.9,
      2511.0
    ],
    [
      "PRD-0533",
      "Calcário dolomítico 40kg",
      420,
      6.35,
      2667.0
    ],
    [
      "PRD-0601",
      "Semente milho híbrido 20kg",
      12,
      289.0,
      3468.0
    ],
    [
      "PRD-0712",
      "Herbicida glifosato 20L",
      10,
      154.2,
      1542.0
    ],
    [
      "PRD-0718",
      "Fungicida sistêmico 5L",
      15,
      98.6,
      1479.0
    ],
    [
      "PRD-0790",
      "Inseticida piretroide 5L",
      25,
      415.33,
      10383.25
    ]
  ],
  "total": [
    "Total",
    null,
    1972,
    null,
    48312.75
  ]
}

const REL_A3: RelatorioConferencia = {
  "titulo": "Notas fiscais de 09/2026 da filial 1 (canceladas listadas, mas fora do total)",
  "colunas": [
    "Nota",
    "Emissão",
    "Vendedor",
    "Situação",
    "Valor da nota",
    "Devolução",
    "Líquido considerado"
  ],
  "linhas": [
    [
      "10451",
      "02/09/2026",
      "Ana Souza",
      "Autorizada",
      9850.0,
      0.0,
      9850.0
    ],
    [
      "10452",
      "09/09/2026",
      "Ana Souza",
      "Autorizada",
      12340.5,
      0.0,
      12340.5
    ],
    [
      "10453",
      "17/09/2026",
      "Ana Souza",
      "Autorizada",
      7790.1,
      0.0,
      7790.1
    ],
    [
      "10454",
      "28/09/2026",
      "Ana Souza",
      "Autorizada",
      8229.8,
      0.0,
      8229.8
    ],
    [
      "10462",
      "11/09/2026",
      "Ana Souza",
      "Cancelada",
      4380.0,
      0.0,
      0.0
    ],
    [
      "10470",
      "04/09/2026",
      "Bruno Lima",
      "Autorizada",
      11200.0,
      0.0,
      11200.0
    ],
    [
      "10471",
      "15/09/2026",
      "Bruno Lima",
      "Autorizada",
      8640.3,
      0.0,
      8640.3
    ],
    [
      "10472",
      "28/09/2026",
      "Bruno Lima",
      "Autorizada",
      8076.2,
      460.6,
      7615.6
    ],
    [
      "10479",
      "19/09/2026",
      "Bruno Lima",
      "Cancelada",
      2915.4,
      0.0,
      0.0
    ],
    [
      "10488",
      "05/09/2026",
      "Carla Mendes",
      "Autorizada",
      6420.75,
      0.0,
      6420.75
    ],
    [
      "10489",
      "22/09/2026",
      "Carla Mendes",
      "Autorizada",
      9015.0,
      0.0,
      9015.0
    ],
    [
      "10490",
      "28/09/2026",
      "Carla Mendes",
      "Autorizada",
      4544.6,
      0.0,
      4544.6
    ]
  ],
  "total": [
    "Total",
    null,
    null,
    null,
    86107.25,
    460.6,
    85646.65
  ]
}

const REL_A4: RelatorioConferencia = {
  "titulo": "Notas e devoluções do vendedor Bruno Lima em 09/2026",
  "colunas": [
    "Documento",
    "Data",
    "Tipo",
    "Nota de origem",
    "Valor"
  ],
  "linhas": [
    [
      "NF 10470",
      "04/09/2026",
      "Nota autorizada",
      null,
      11200.0
    ],
    [
      "NF 10471",
      "15/09/2026",
      "Nota autorizada",
      null,
      8640.3
    ],
    [
      "NF 10472",
      "28/09/2026",
      "Nota autorizada",
      null,
      8076.2
    ],
    [
      "DEV 0381",
      "29/09/2026",
      "Devolução",
      "NF 10472 (09/2026)",
      -460.6
    ],
    [
      "DEV 0377",
      "03/09/2026",
      "Devolução",
      "NF 10398 (08/2026)",
      -460.6
    ]
  ],
  "total": null
}

const REL_A5: RelatorioConferencia = {
  "titulo": "Movimentações do PRD-0457 na filial 1 em 09/2026",
  "colunas": [
    "Data",
    "Tipo de movimento",
    "Documento",
    "Origem",
    "Destino",
    "Entrada",
    "Saída"
  ],
  "linhas": [
    [
      "01/09/2026",
      "Saldo inicial",
      null,
      null,
      null,
      1480,
      null
    ],
    [
      "03/09/2026",
      "Venda",
      "NF 10452",
      "Filial 1",
      null,
      null,
      120
    ],
    [
      "08/09/2026",
      "Compra",
      "NF-e 88231",
      null,
      "Filial 1",
      600,
      null
    ],
    [
      "12/09/2026",
      "Transferência",
      "TR 0091",
      "Filial 1",
      "Filial 2",
      null,
      300
    ],
    [
      "18/09/2026",
      "Venda",
      "NF 10466",
      "Filial 1",
      null,
      null,
      210
    ],
    [
      "25/09/2026",
      "Transferência",
      "TR 0097",
      "Filial 1",
      "Filial 2",
      null,
      200
    ],
    [
      "29/09/2026",
      "Transferência",
      "TR 0102",
      "Filial 2",
      "Filial 1",
      150,
      null
    ]
  ],
  "total": [
    "Total",
    null,
    null,
    null,
    null,
    2230,
    830
  ]
}

const RELATORIOS: Record<number, RelatorioConferencia> = { 1: REL_A1, 2: REL_A2, 3: REL_A3, 4: REL_A4, 5: REL_A5 }
for (const e of [exec1, exec2, exec4, exec5]) for (const a of e.apuracoes) a.conferencia = RELATORIOS[a.id] ?? null

// As duas primeiras servem de modelo para as execuções novas do modo simulado (estoque e vendas).
export const EXECUCOES_EXEMPLO: Execucao[] = [exec1, exec2, exec3, exec4, exec5]

export const DEMANDAS_EXEMPLO: Demanda[] = [
  { chaveJira: 'DEMO-101', status: 'EM_TESTE', criadaEm: '2026-10-08T10:12:00', prazo: '2026-10-24', estimativaH: 6 },
  { chaveJira: 'DEMO-114', status: 'AGUARDANDO_TESTE', criadaEm: '2026-10-09T08:40:00', prazo: '2026-10-17', estimativaH: 8 },
  { chaveJira: 'DEMO-120', status: 'FINALIZADA', criadaEm: '2026-10-07T13:25:00', prazo: '2026-10-16', estimativaH: 3 },
  { chaveJira: 'DEMO-133', status: 'EM_DESENVOLVIMENTO', criadaEm: '2026-10-10T16:05:00', prazo: null, estimativaH: 12 },
]
