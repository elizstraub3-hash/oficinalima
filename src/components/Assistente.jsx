import { useState, useRef, useEffect } from 'react'
import { lancamentosCaixa } from './Caixa.jsx'
import { calcResumoFuncionario } from './Funcionarios.jsx'
import { getAlertasEstoque } from './Estoque.jsx'
import { listarPeriodos, noPeriodo, hojeISO } from './Periodo.jsx'
import { AJUDA } from './AjudaPainel.js'
import { ehPedidoDeOS, extrairOS, criarOS } from './OsPorVoz.js'

const ler = k => JSON.parse(localStorage.getItem(k) || '[]')
const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const sem = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STATUS = { orcamento: 'Orçamento', aprovado: 'Aprovado', em_andamento: 'Em serviço', aguardando: 'Aguardando', concluido: 'Concluído', cancelado: 'Cancelado' }

const ATALHOS = [
  { id: 'criar_os', label: '🎤 Criar OS por voz' },
  { id: 'hoje', label: '💵 Caixa de hoje' },
  { id: 'semana', label: '📆 Caixa da semana' },
  { id: 'mecanicos', label: '👷 Pagar mecânicos' },
  { id: 'estoque', label: '📦 Peças acabando' },
  { id: 'andamento', label: '🔧 Carros em serviço' },
  { id: 'orcamentos', label: '📋 Orçamentos parados' },
  { id: 'contas', label: '📄 Contas a vencer' },
  { id: 'msg_pronto', label: '✅ Mensagem carro pronto' },
  { id: 'msg_orcamento', label: '💬 Mensagem de orçamento' },
  { id: 'ajuda', label: '❓ Como usar o painel' },
  { id: 'melhoria', label: '💡 Pedir uma melhoria' },
]

const KEY_LOG = 'ol_assistente_log'
export function lerPerguntas() { return ler(KEY_LOG) }
function registrar(pergunta, intencao, origem) {
  try {
    const log = ler(KEY_LOG)
    log.push({ id: Date.now(), quando: new Date().toISOString(), pergunta, intencao: intencao || null, origem })
    localStorage.setItem(KEY_LOG, JSON.stringify(log.slice(-1000)))
  } catch { /* sem espaço: ignora */ }
}

const INTENCOES = [
  { id: 'msg_pronto', p: ['pronto', 'pronta', 'buscar', 'retirar', 'liberado'] },
  { id: 'msg_orcamento', p: ['mensagem de orcamento', 'mandar orcamento', 'enviar orcamento', 'mensagem orcamento'] },
  { id: 'mecanicos', p: ['mecanico', 'pagar', 'celio', 'pedro lima', 'mao de obra', 'comissao'] },
  { id: 'estoque', p: ['estoque', 'peca', 'acabando', 'faltando', 'oleo', 'repor'] },
  { id: 'andamento', p: ['andamento', 'servico agora', 'na oficina', 'carros', 'patio'] },
  { id: 'orcamentos', p: ['orcamento', 'aprovacao', 'aprovar'] },
  { id: 'contas', p: ['conta', 'vence', 'vencer', 'luz', 'agua', 'aluguel', 'internet', 'pagar conta'] },
  { id: 'semana', p: ['semana', 'semanal', 'relatorio'] },
  { id: 'hoje', p: ['hoje', 'caixa', 'entrou', 'saldo', 'faturamento', 'faturou'] },
]

function resumoCaixa(periodo, titulo) {
  const l = lancamentosCaixa().filter(e => noPeriodo(e.data, periodo))
  const ent = l.filter(e => e.tipo === 'entrada').reduce((s, e) => s + e.valor, 0)
  const sai = l.filter(e => e.tipo === 'saida').reduce((s, e) => s + e.valor, 0)
  return `${titulo}\n💵 Entradas: ${fmt(ent)}\n💸 Saídas: ${fmt(sai)}\n📈 Saldo: ${fmt(ent - sai)}`
}

function acharOS(texto, statusOk) {
  const t = sem(texto).replace(/[^a-z0-9 ]/g, ' ')
  const ordens = ler('ol_ordens').filter(o => statusOk.includes(o.status)).sort((a, b) => Number(b.id) - Number(a.id))
  const achada = ordens.find(o => {
    const placa = sem(o.placa).replace(/[^a-z0-9]/g, '')
    const nome = sem(o.clienteNome).split(' ')[0]
    return (placa && t.replace(/ /g, '').includes(placa)) || (nome && nome.length > 2 && t.split(' ').includes(nome))
  })
  return { achada, ordens }
}

function msgPronto(o) {
  const nome = (o.clienteNome || '').split(' ')[0]
  return `Olá, ${nome}! Tudo bem? 😊\n\nAqui é da Lima Oficina Mecânica. Seu ${o.modelo || 'veículo'}${o.placa ? ` (placa ${o.placa})` : ''} já está PRONTO e pode ser retirado! 🚗✅\n\nValor total: ${fmt(o.valor)}\nAceitamos Pix, cartão e dinheiro.\n\nEstamos abertos das 8h às 12h e das 13h30 às 18h. Qualquer dúvida, é só chamar!`
}

function msgOrcamento(o) {
  const nome = (o.clienteNome || '').split(' ')[0]
  const pecas = (o.itens || []).map(it => `• ${it.desc} (${it.qtd}x) — ${fmt(Number(it.valor ?? it.valorUnit) * Number(it.qtd || 1))}`)
  const servs = (o.servicos || []).filter(s => Number(s.maoDeObra) > 0).map(s => `• ${s.desc || 'Mão de obra'} — ${fmt(s.maoDeObra)}`)
  return `Olá, ${nome}! Tudo bem? 😊\n\nAqui é da Lima Oficina Mecânica. Segue o orçamento do seu ${o.modelo || 'veículo'}${o.placa ? ` (placa ${o.placa})` : ''}:\n\n${[...pecas, ...servs].join('\n') || '• (itens a definir)'}\n\n💰 Total: ${fmt(o.valor)}\n\nPodemos dar andamento? É só responder com OK! 👍`
}

function responder(intencao, texto = '') {
  const semana = listarPeriodos().semanas[0]
  switch (intencao) {
    case 'hoje': {
      const h = hojeISO()
      return { texto: resumoCaixa({ de: h, ate: h }, '📅 Caixa de hoje:') }
    }
    case 'semana':
      return { texto: resumoCaixa(semana, `📆 ${semana.label}:`) + '\n\nPara o relatório completo, abra "Relatório Semanal" no menu.' }
    case 'mecanicos': {
      const mecs = ler('ol_funcionarios').filter(f => f.status === 'ativo')
      if (!mecs.length) return { texto: 'Nenhum mecânico ativo cadastrado.' }
      const linhas = mecs.map(f => {
        const r = calcResumoFuncionario(f.nome, semana)
        return `👷 ${f.nome}: ${r.concluidas} OS · mão de obra ${fmt(r.maoDeObra)} → pagar ${fmt(r.aPagar)} (${Math.round(r.pct * 100)}%)`
      })
      return { texto: `Mecânicos — ${semana.label.toLowerCase()}:\n${linhas.join('\n')}\n\nSó conta a mão de obra de serviços com o mecânico escolhido na OS.` }
    }
    case 'estoque': {
      const a = getAlertasEstoque()
      if (!a.length) return { texto: '✅ Nenhuma peça com estoque baixo. Tudo certo!' }
      return { texto: `⚠️ Peças acabando (${a.length}):\n${a.map(p => `• ${p.nome}: ${p.qtd} ${p.un || 'UN'} (mínimo ${p.qtdMinima || 3})`).join('\n')}` }
    }
    case 'andamento': {
      const os = ler('ol_ordens').filter(o => ['em_andamento', 'aprovado', 'aguardando'].includes(o.status))
      if (!os.length) return { texto: 'Nenhum carro em serviço agora.' }
      return { texto: `🔧 Carros na oficina (${os.length}):\n${os.map(o => `• ${o.placa || '—'} ${o.modelo || ''} — ${o.clienteNome} (${STATUS[o.status]})`).join('\n')}` }
    }
    case 'orcamentos': {
      const os = ler('ol_ordens').filter(o => o.status === 'orcamento')
      if (!os.length) return { texto: 'Nenhum orçamento esperando aprovação.' }
      return { texto: `📋 Orçamentos esperando aprovação (${os.length}):\n${os.map(o => `• ${o.clienteNome} — ${o.placa || ''} — ${fmt(o.valor)}`).join('\n')}\n\nDica: peça "mensagem de orçamento" para cobrar o cliente.` }
    }
    case 'contas': {
      const dia = new Date().getDate()
      const pend = ler('ol_contas').filter(c => c.status === 'pendente')
        .map(c => ({ ...c, faltam: Number(c.vencimento) >= dia ? Number(c.vencimento) - dia : null }))
        .sort((a, b) => (a.faltam ?? 99) - (b.faltam ?? 99))
      if (!pend.length) return { texto: '✅ Nenhuma conta pendente.' }
      return { texto: `📄 Contas pendentes:\n${pend.map(c => `• ${c.descricao} — dia ${c.vencimento || '?'}${c.faltam === 0 ? ' (VENCE HOJE)' : c.faltam != null ? ` (faltam ${c.faltam} dias)` : ' (já passou)'} — ${Number(c.valor) ? fmt(c.valor) : 'sem valor'}`).join('\n')}` }
    }
    case 'msg_pronto':
    case 'msg_orcamento': {
      const pronto = intencao === 'msg_pronto'
      const status = pronto ? ['concluido', 'em_andamento', 'aguardando', 'aprovado'] : ['orcamento', 'aprovado', 'aguardando']
      const { achada, ordens } = acharOS(texto, status)
      if (achada) return { texto: pronto ? msgPronto(achada) : msgOrcamento(achada), copiar: true, telefone: achada.clienteTelefone }
      if (!ordens.length) return { texto: pronto ? 'Não achei carros em serviço ou concluídos.' : 'Não achei orçamentos abertos.' }
      return {
        texto: 'Para qual cliente? Escolha abaixo:',
        opcoes: ordens.slice(0, 8).map(o => ({ label: `${o.clienteNome} · ${o.placa || ''}`, intencao })),
      }
    }
    case 'criar_os': {
      const d = extrairOS(texto)
      if (!d.clienteNome && !d.placa) return { texto: 'Bora criar a OS! 🎤 Toque no microfone e fale tudo de uma vez, por exemplo:\n\n"Criar OS para o João, placa ABC1D23, Gol prata, troca de óleo, 150 reais, mecânico Celio"\n\nEu preencho e te mostro para conferir antes de salvar.' }
      return { texto: 'Entendi assim 👇 Confira, ajuste se precisar e toque em "Criar OS":', rascunho: d, ditado: texto }
    }
    case 'melhoria':
      return { texto: 'Pedro, tudo o que estamos conversando pode ser melhorado com a ajuda da minha criadora! 💡\n\nMe conta o que você gostaria que eu fizesse, ou o que quer mudar no painel. Eu anoto tudo e, futuramente, ela pode melhorar o que você está me pedindo.\n\nPode escrever ou falar 🎤 agora:', esperaSugestao: true }
    case 'ajuda':
      return { texto: 'Posso explicar como fazer qualquer coisa no painel. Toque num assunto ou pergunte, ex: "como emitir nota fiscal?"', ajuda: true }
    default: {
      const a = AJUDA.find(x => x.id === intencao)
      if (a) return { texto: a.r }
      return { texto: 'Minha criadora não me preparou para essa pergunta, Pedro 😅. Ainda estou em fase de adaptação e ela está fazendo melhorias em mim. Por enquanto, posso te ajudar com uma destas:', mostrarAtalhos: true }
    }
  }
}

// Casa a palavra-chave inteira (ou começo de palavra), para "dia" não casar com "ontem dia..." à toa
const temPalavra = (t, p) => new RegExp(`(^|[^a-z0-9])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t)

// Todas as palavras da frase-chave aparecem no texto, aceitando variações (concluir/concluida, claro/clara)
function casaFrase(t, frase) {
  const toks = t.split(/[^a-z0-9]+/).filter(Boolean)
  const palavras = frase.split(' ').filter(w => w.length > 2 || ['os', 'nf'].includes(w))
  return palavras.length > 0 && palavras.every(w => {
    if (w.length <= 3) return toks.includes(w)
    const raiz = w.slice(0, Math.max(4, w.length - 2))
    return toks.some(tok => tok.startsWith(raiz))
  })
}

function melhorAjuda(t) {
  let melhor = null, pontos = 0
  AJUDA.forEach(a => {
    const n = a.p.reduce((s, p) => s + (casaFrase(t, p) ? p.length : 0), 0)
    if (n > pontos) { melhor = a; pontos = n }
  })
  return melhor?.id || null
}

function entender(texto) {
  const t = sem(texto)
  if (ehPedidoDeOS(t)) return 'criar_os'
  const ajuda = melhorAjuda(t)
  if (ajuda && /\b(como|onde|o que|oque|qual o jeito|nao sei|ajuda|faz|faco|fazer|consigo|posso|cadastr|adicion|lanc|emit|cancel|edit|exclu|apag|mud|troc|import|export)/.test(t)) return ajuda
  if (/mensagem|msg|whats|avisar|avisa/.test(t)) {
    if (/orcamento/.test(t)) return 'msg_orcamento'
    return 'msg_pronto'
  }
  return INTENCOES.find(i => i.p.some(p => temPalavra(t, p)))?.id || ajuda
}

function saudacao() {
  const h = new Date().getHours()
  const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return { de: 'bot', texto: `${s}, Pedro! 👋 Sou o assistente da oficina.\n\nEstou em fase de adaptação aqui no sistema 🛠️ — minha criadora está fazendo melhorias em mim, então ainda posso não saber de tudo. Tenha paciência comigo! 😄\n\nPedro, tudo o que estamos conversando pode ser melhorado com a ajuda da minha criadora — se quiser algo diferente, toque em "💡 Pedir uma melhoria".\n\nPosso te ajudar com os números da oficina e com dúvidas de como usar o painel. Pergunte ou toque numa opção:`, mostrarAtalhos: true }
}

export default function Assistente({ onMudou }) {
  const [aberto, setAberto] = useState(false)
  const [msgs, setMsgs] = useState([saudacao()])
  const [entrada, setEntrada] = useState('')
  const fim = useRef(null)
  const [ouvindo, setOuvindo] = useState(false)
  const rec = useRef(null)
  const falado = useRef('')
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

  function microfone() {
    if (!SR) return alert('Este navegador não reconhece voz. Use o Google Chrome (no computador ou no celular).')
    if (ouvindo) { rec.current?.stop(); return }
    const r = new SR()
    r.lang = 'pt-BR'; r.interimResults = true; r.continuous = false
    falado.current = ''
    r.onresult = e => { falado.current = Array.from(e.results).map(x => x[0].transcript).join(' '); setEntrada(falado.current) }
    r.onerror = e => { if (e.error === 'not-allowed') alert('Libere o microfone para o site (ícone de cadeado ao lado do endereço).') }
    r.onend = () => { setOuvindo(false); if (falado.current.trim()) perguntar(falado.current) }
    rec.current = r; setOuvindo(true); r.start()
  }

  function editarRascunho(i, campo, valor) {
    setMsgs(ms => ms.map((m, j) => j === i ? { ...m, rascunho: { ...m.rascunho, [campo]: valor } } : m))
  }

  function confirmarOS(i) {
    const m = msgs[i]
    const d = m.rascunho
    if (!d.clienteNome?.trim() || !d.placa?.trim()) return alert('Preencha pelo menos o nome do cliente e a placa.')
    const os = criarOS(d, m.ditado)
    registrar(`OS criada: ${os.numero}`, 'criar_os', 'voz')
    setMsgs(ms => [...ms.map((x, j) => j === i ? { ...x, rascunho: null, texto: x.texto.replace(/Confira.*$/, 'Pronto!') } : x),
      { de: 'bot', texto: `✅ ${os.numero} criada!\n👤 ${os.clienteNome}\n🚗 ${os.placa}${os.modelo ? ' · ' + os.modelo : ''}\n🔧 ${os.descBreve || '—'}\n💰 ${fmt(os.valor)}\n\nPara adicionar peças, abra em Ordens de Serviço e clique no ✏️.` }])
    onMudou && onMudou()
  }

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, aberto])

  function perguntar(texto, intencao) {
    if (!texto.trim()) return
    if (!intencao && msgs[msgs.length - 1]?.esperaSugestao) {
      registrar(texto, 'sugestao', 'sugestao')
      setMsgs(m => [...m, { de: 'eu', texto }, { de: 'bot', texto: 'Anotado, Pedro! 📝 Sua ideia ficou guardada para a minha criadora. Obrigado por me ajudar a melhorar! 😄\n\nQuer mais alguma coisa?', mostrarAtalhos: true }])
      setEntrada('')
      return
    }
    const qual = intencao || entender(texto)
    registrar(texto, qual, intencao ? 'botao' : 'digitada')
    const r = responder(qual, texto)
    setMsgs(m => [...m, { de: 'eu', texto }, { de: 'bot', ...r }])
    setEntrada('')
  }

  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); alert('Mensagem copiada! É só colar no WhatsApp.') } catch { alert('Não deu para copiar automaticamente. Selecione o texto e copie.') }
  }

  const botao = { padding: '5px 10px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }

  return (
    <>
      <button onClick={() => { if (!aberto) setMsgs([saudacao()]); setAberto(a => !a) }} title="Assistente da oficina" className="no-print"
        style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9500, width: 58, height: 58, borderRadius: '50%', border: 'none', background: '#3b82f6', color: '#fff', fontSize: 26, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
        {aberto ? '✕' : '💬'}
      </button>

      {aberto && (
        <div className="no-print" style={{ position: 'fixed', right: 20, bottom: 88, zIndex: 9500, width: 'min(380px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 120px))', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#3b82f6', color: '#fff', fontWeight: 800 }}>🤖 Assistente da Oficina</div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.de === 'eu' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5, padding: '8px 12px', borderRadius: 12, background: m.de === 'eu' ? '#3b82f6' : 'var(--bg-card2, rgba(127,127,127,0.12))', color: m.de === 'eu' ? '#fff' : 'inherit' }}>
                  {m.texto}
                </div>
                {m.copiar && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button style={botao} onClick={() => copiar(m.texto)}>📋 Copiar</button>
                    {m.telefone && (
                      <a style={{ ...botao, textDecoration: 'none' }} target="_blank" rel="noreferrer"
                        href={`https://wa.me/55${String(m.telefone).replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(m.texto)}`}>📱 Abrir no WhatsApp</a>
                    )}
                  </div>
                )}
                {m.opcoes && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {m.opcoes.map((o, j) => <button key={j} style={botao} onClick={() => perguntar(o.label, o.intencao)}>{o.label}</button>)}
                  </div>
                )}
                {m.rascunho && (
                  <div style={{ marginTop: 6, padding: 10, border: '1.5px solid #3b82f6', borderRadius: 10, display: 'grid', gap: 6 }}>
                    {[['clienteNome', 'Cliente *'], ['placa', 'Placa *'], ['modelo', 'Carro'], ['clienteTelefone', 'Telefone'], ['servico', 'Serviço'], ['valor', 'Mão de obra (R$)']].map(([c, l]) => (
                      <label key={c} style={{ fontSize: 11, fontWeight: 700, display: 'grid', gap: 2 }}>{l}
                        <input value={m.rascunho[c] || ''} onChange={e => editarRascunho(i, c, c === 'placa' ? e.target.value.toUpperCase() : e.target.value)} style={{ padding: '5px 8px', fontSize: 13 }} />
                      </label>
                    ))}
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'grid', gap: 2 }}>Mecânico
                      <select value={m.rascunho.funcionario || ''} onChange={e => editarRascunho(i, 'funcionario', e.target.value)} style={{ padding: '5px 8px', fontSize: 13 }}>
                        <option value="">—</option>
                        {ler('ol_funcionarios').filter(f => f.status === 'ativo').map(f => <option key={f.id}>{f.nome}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'grid', gap: 2 }}>Status
                      <select value={m.rascunho.status} onChange={e => editarRascunho(i, 'status', e.target.value)} style={{ padding: '5px 8px', fontSize: 13 }}>
                        {Object.entries(STATUS).filter(([k]) => k !== 'cancelado').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary" style={{ flex: 1, padding: '8px' }} onClick={() => confirmarOS(i)}>✅ Criar OS</button>
                      <button style={botao} onClick={() => setMsgs(ms => ms.map((x, j) => j === i ? { ...x, rascunho: null, texto: 'OS cancelada. Pode falar de novo quando quiser 🎤' } : x))}>Cancelar</button>
                    </div>
                  </div>
                )}
                {m.ajuda && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {AJUDA.map(a => <button key={a.id} style={botao} onClick={() => perguntar(a.p[0].replace(/^./, c => c.toUpperCase()) + '?', a.id)}>{a.p[0]}</button>)}
                  </div>
                )}
                {m.mostrarAtalhos && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {ATALHOS.map(a => <button key={a.id} style={botao} onClick={() => perguntar(a.label, a.id)}>{a.label}</button>)}
                  </div>
                )}
              </div>
            ))}
            <div ref={fim} />
          </div>

          <form onSubmit={e => { e.preventDefault(); perguntar(entrada) }} style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={microfone} title="Falar" style={{ border: 'none', borderRadius: 8, padding: '0 12px', fontSize: 18, cursor: 'pointer', background: ouvindo ? '#ef4444' : 'var(--bg-card2, rgba(127,127,127,0.15))', color: ouvindo ? '#fff' : 'inherit' }}>{ouvindo ? '⏹' : '🎤'}</button>
            <input value={entrada} onChange={e => setEntrada(e.target.value)} placeholder={ouvindo ? 'Ouvindo... pode falar' : 'Ex: quanto entrou hoje?'} style={{ flex: 1 }} />
            <button type="submit" className="btn-primary" style={{ padding: '8px 14px' }}>➤</button>
          </form>
        </div>
      )}
    </>
  )
}
