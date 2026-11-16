import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, modoApi, type Execucao } from '../api'
import { chamar } from '../api/httpApi'
import { Botao, Card } from './ui'
import { obterConfiguracao, type Configuracao } from '../util/configuracao'
const classe = 'w-full rounded border border-borda bg-fundo px-3 py-2 text-sm'
const mensagem = (e: unknown) => e instanceof Error ? e.message : String(e)
function Campo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{titulo}</span>{children}</label>
}

export function NovaExecucao() {
  const navegar = useNavigate()
  const [chave, setChave] = useState('')
  const [titulo, setTitulo] = useState('')
  const [requisito, setRequisito] = useState('')
  const [gherkin, setGherkin] = useState('Dado que existe um produto\nQuando consulto o saldo\nEntão vejo o saldo atual')
  const [esperado, setEsperado] = useState('')
  const [area, setArea] = useState('ESTOQUE')
  const [manual, setManual] = useState(true)
  const [doc, setDoc] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [config, setConfig] = useState<Configuracao>()
  useEffect(() => { if (modoApi === 'http') obterConfiguracao().then(setConfig).catch(() => {}) }, [])
  async function enviar() {
    setOcupado(true); setErro('')
    try {
      const resultado = manual
        ? await chamar<{ id: number }>('/execucoes/manuais', { method: 'POST', body: JSON.stringify({ chaveJira: chave.trim(), titulo, requisito,
          geracao: { area, exigeApuracao: false, cenarios: [{ tipo: 'ALTERACAO', titulo, gherkin, resultadoEsperado: esperado }], pontosAtencao: [] } }) })
        : await api.iniciarExecucao({ chaveJira: chave.trim(), usarDocumentacao: doc })
      navegar(`/execucoes/${resultado.id}`)
    } catch (e) { setErro(mensagem(e)); setOcupado(false) }
  }
  if (modoApi !== 'http') return <Card className="p-5">Esta é a demonstração. A criação manual está disponível no backend local.</Card>
  return <Card className="space-y-4 p-5">
    <h1 className="text-xl font-bold">Nova execução</h1>
    <p className="text-sm text-texto-sec">Informe os cenários manualmente ou gere a partir de uma tarefa do Jira com os modelos configurados.</p>
    <Campo titulo="Forma de criação"><select className={classe} value={manual ? 'manual' : 'jira'} onChange={(e) => setManual(e.target.value === 'manual')} disabled={ocupado}>
      <option value="manual">Entrada manual, sem IA</option><option value="jira">Gerar a partir do Jira</option>
    </select></Campo>
    <Campo titulo="Chave da tarefa"><input className={classe} value={chave} onChange={(e) => setChave(e.target.value)} placeholder="PROJ-123" disabled={ocupado} /></Campo>
    {manual ? <>
      <Campo titulo="Título"><input className={classe} value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={ocupado} /></Campo>
      <Campo titulo="Área"><select className={classe} value={area} onChange={(e) => setArea(e.target.value)} disabled={ocupado}>
        <option value="ESTOQUE">Estoque</option><option value="VENDAS">Vendas</option><option value="NAO_IDENTIFICADA">A confirmar</option>
      </select></Campo>
      <Campo titulo="Requisito"><textarea rows={4} className={classe} value={requisito} onChange={(e) => setRequisito(e.target.value)} disabled={ocupado} /></Campo>
      <Campo titulo="Passos do cenário"><textarea rows={5} className={classe} value={gherkin} onChange={(e) => setGherkin(e.target.value)} disabled={ocupado} /></Campo>
      <Campo titulo="Resultado esperado"><textarea rows={3} className={classe} value={esperado} onChange={(e) => setEsperado(e.target.value)} disabled={ocupado} /></Campo>
      <p className="text-xs text-texto-sec">A origem fica registrada como manual. Você poderá adicionar apurações e revisar os valores na próxima tela.</p>
    </> : <>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={doc} onChange={(e) => setDoc(e.target.checked)} disabled={ocupado} />Incluir documentação funcional do Confluence</label>
      {config && !config.iaConfigurada && <p className="text-sm text-aviso">A geração por IA ainda não está configurada neste servidor. A entrada manual continua disponível.</p>}
    </>}
    {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
    <Botao onClick={enviar} disabled={ocupado || !chave.trim() || (manual && (!titulo.trim() || !requisito.trim() || !esperado.trim()))}>
      {ocupado ? 'Processando… aguarde sem reenviar' : manual ? 'Criar execução' : 'Gerar cenários'}
    </Botao>
  </Card>
}

export function PainelApuracao({ execucao, onSalvo }: { execucao: Execucao; onSalvo: () => void }) {
  const [pergunta, setPergunta] = useState('')
  const [cenario, setCenario] = useState('')
  const [ordem, setOrdem] = useState(false)
  const [automatico, setAutomatico] = useState(false)
  const [sqls, setSqls] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  if (modoApi !== 'http' || execucao.revisao) return null
  async function enviar() {
    setOcupado(true); setErro('')
    try {
      const dados = { cenarioId: cenario ? Number(cenario) : null, pergunta, preservarOrdem: ordem }
      const candidatos = Object.entries(sqls).filter(([, consulta]) => consulta.trim()).map(([provedor, consulta]) => ({ provedor, consulta }))
      if (!automatico && candidatos.length === 0) throw new Error('Informe ao menos uma consulta.')
      await chamar(`/execucoes/${execucao.id}/apuracoes${automatico ? '/automaticas' : ''}`, {
        method: 'POST', body: JSON.stringify(automatico ? dados : { ...dados, candidatos }),
      })
      setPergunta(''); setSqls({}); onSalvo()
    } catch (e) { setErro(mensagem(e)) } finally { setOcupado(false) }
  }
  return <Card className="p-5"><details>
    <summary className="cursor-pointer font-bold">Adicionar apuração de valores</summary>
    <div className="mt-4 space-y-4">
      <Campo titulo="Pergunta e filtros"><textarea className={classe} rows={3} value={pergunta} onChange={(e) => setPergunta(e.target.value)} disabled={ocupado} placeholder="Saldo do produto X na empresa e filial informadas" /></Campo>
      <Campo titulo="Cenário associado"><select className={classe} value={cenario} onChange={(e) => setCenario(e.target.value)} disabled={ocupado}>
        <option value="">Sem associação</option>{execucao.cenarios.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
      </select></Campo>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={ordem} onChange={(e) => setOrdem(e.target.checked)} disabled={ocupado} />A ordem das linhas faz parte do resultado</label>
      <Campo titulo="Consultas"><select className={classe} value={automatico ? 'auto' : 'manual'} onChange={(e) => setAutomatico(e.target.value === 'auto')} disabled={ocupado}>
        <option value="manual">Informar consultas manualmente</option><option value="auto">Gerar com os provedores habilitados</option>
      </select></Campo>
      {!automatico && <>
        <p className="text-xs text-texto-sec">Informe uma consulta final por provedor. O nome identifica a origem declarada; a plataforma não autentica essa origem.</p>
        {['CLAUDE', 'GEMINI', 'LLAMA'].map((p) => <Campo key={p} titulo={p}><textarea className={`${classe} font-mono`} rows={3} value={sqls[p] ?? ''} onChange={(e) => setSqls((s) => ({ ...s, [p]: e.target.value }))} disabled={ocupado} placeholder="SELECT ..." /></Campo>)}
      </>}
      {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
      <Botao onClick={enviar} disabled={ocupado || !pergunta.trim()}>{ocupado ? 'Apurando… aguarde sem reenviar' : 'Apurar valores'}</Botao>
    </div>
  </details></Card>
}

interface Lote { id: number; nome: string; status: string; itens: { id: number; chaveJira: string; execucaoId: number | null; status: string; mensagem: string | null }[] }
export function Lotes() {
  const [nome, setNome] = useState('Conjunto de referência')
  const [chaves, setChaves] = useState('')
  const [doc, setDoc] = useState(false)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  useEffect(() => { if (modoApi === 'http') chamar<Lote[]>('/lotes').then(setLotes).catch((e: unknown) => setErro(mensagem(e))) }, [])
  if (modoApi !== 'http') return null
  async function enviar() {
    setOcupado(true); setErro('')
    try {
      const lote = await chamar<Lote>('/lotes', { method: 'POST', body: JSON.stringify({ nome, chaves: chaves.split(/[\s,;]+/).filter(Boolean), usarDocumentacao: doc }) })
      setLotes((ls) => [lote, ...ls]); setChaves('')
    } catch (e) { setErro(mensagem(e)) } finally { setOcupado(false) }
  }
  return <Card className="mb-5 p-5"><details><summary className="cursor-pointer font-bold">Processar conjunto de referência em lote</summary><div className="mt-4 space-y-3">
    <Campo titulo="Nome do conjunto"><input className={classe} value={nome} onChange={(e) => setNome(e.target.value)} disabled={ocupado} /></Campo>
    <Campo titulo="Chaves das tarefas (até 20)"><textarea className={classe} rows={3} value={chaves} onChange={(e) => setChaves(e.target.value)} disabled={ocupado} placeholder="PROJ-123, PROJ-124" /></Campo>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={doc} onChange={(e) => setDoc(e.target.checked)} disabled={ocupado} />Incluir documentação funcional</label>
    <p className="text-xs text-texto-sec">As tarefas são processadas em sequência. A geração usa os modelos configurados e pode consumir créditos. Aguarde sem reenviar.</p>
    <Botao onClick={enviar} disabled={ocupado || !chaves.trim()}>{ocupado ? 'Processando lote…' : 'Processar lote'}</Botao>
    {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
    {lotes.map((l) => <div key={l.id} className="border-t border-borda pt-3 text-sm"><strong>{l.nome}</strong> · {l.status}
      <ul>{l.itens.map((i) => <li key={i.id}>{i.execucaoId ? <Link className="text-link underline" to={`/execucoes/${i.execucaoId}`}>{i.chaveJira}</Link> : i.chaveJira} · {i.status}{i.mensagem && ` — ${i.mensagem}`}</li>)}</ul>
    </div>)}
  </div></details></Card>
}

export function PublicarJira({ execucao }: { execucao: Execucao }) {
  const [habilitado, setHabilitado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [resultado, setResultado] = useState('')
  useEffect(() => { if (modoApi === 'http') obterConfiguracao().then((c) => setHabilitado(c.jiraEscritaHabilitada)).catch(() => {}) }, [])
  if (!habilitado || !execucao.revisao || execucao.revisao.decisao === 'REJEITADO') return null
  async function publicar() {
    setOcupado(true); setResultado('')
    try { await chamar(`/execucoes/${execucao.id}/jira`, { method: 'POST' }); setResultado('Cenários publicados no Jira.') }
    catch (e) { setResultado(mensagem(e)) } finally { setOcupado(false) }
  }
  return <Card className="space-y-2 p-5"><Botao onClick={publicar} disabled={ocupado}>{ocupado ? 'Publicando…' : 'Publicar cenários aprovados no Jira'}</Botao>{resultado && <p role="status" className="text-sm">{resultado}</p>}</Card>
}
