import { useState, useEffect } from 'react'
import './Dashboard.css'

const KEY_NOTINHAS = 'ol_notinhas'
function loadNotinhas() { return JSON.parse(localStorage.getItem(KEY_NOTINHAS) || '[]') }
function saveNotinhas(d) { localStorage.setItem(KEY_NOTINHAS, JSON.stringify(d)) }
function nextNotinhaId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const MARGEM_PECAS = 1.35 // 35% fixo sobre o custo
const emptyNotinha = () => ({ desc: '', fornecedor: '', qtd: 1, custoUnit: '', precoVenda: '' })

// Horário da oficina: 8h–12h / 13h30–18h
function getSaudacao() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { texto: 'Bom dia', emoji: '☀️' }
  if (h >= 12 && h < 18) return { texto: 'Boa tarde', emoji: '🌤️' }
  return { texto: 'Boa noite', emoji: '🌙' }
}

function getAvisoAlmoco() {
  const h = new Date().getHours()
  const m = new Date().getMinutes()
  const minutos = h * 60 + m
  return minutos >= 720 && minutos < 810 // 12:00 às 13:30
}

function getFraseContextual(checkedIds, agora) {
  const h = agora.getHours()
  const m = agora.getMinutes()
  const min = h * 60 + m
  const checkedCount = ITEMS_FIXOS.filter(i => checkedIds.includes(i.id)).length
  const faltam = ITEMS_FIXOS.length - checkedCount

  // Antes da abertura
  if (min < 8 * 60) return { texto: 'A oficina abre às 8h — descanse bem, Leandra! Amanhã tem mais! 🌙', cor: '#6b7280' }

  // Chegando
  if (min >= 8 * 60 && min < 8 * 60 + 20) return { texto: 'Bom dia, Leandra! Que ótimo te ver por aqui! Vamos começar o dia com tudo? 💪', cor: '#000' }

  // Manhã — checklist não feito
  if (min >= 8 * 60 + 20 && min < 12 * 60) {
    if (checkedCount === 0) return { texto: 'Não esqueceu do checklist, né Leandra? Já está esperando por você! 📋', cor: '#e63946' }
    if (faltam > 0) return { texto: `Boa, Leandra! Você já marcou ${checkedCount} item(s). Ainda faltam ${faltam} — bora lá! 🔥`, cor: '#f59e0b' }
    return { texto: 'Checklist completo! Que começo de dia incrível, Leandra! Agora é só arrasar! ⭐', cor: '#10b981' }
  }

  // Pré-almoço (11h40–12h)
  if (min >= 11 * 60 + 40 && min < 12 * 60) return { texto: 'Quase na hora do almoço, Leandra! Não para não — mais um pouquinho! 😄', cor: '#f59e0b' }

  // Almoço (12h–13h30)
  if (min >= 12 * 60 && min < 13 * 60 + 30) return { texto: 'Hora de almoçar, Leandra! Você merece essa pausa. Volte renovada às 13h30! 🍽️', cor: '#f59e0b' }

  // Retorno do almoço
  if (min >= 13 * 60 + 30 && min < 13 * 60 + 50) return { texto: 'Bem-vinda de volta, Leandra! Tarde produtiva te espera! ☕', cor: '#3b82f6' }

  // Tarde — meio da tarde
  if (min >= 13 * 60 + 50 && min < 16 * 60) return { texto: 'A tarde está passando, Leandra! Como estão os carros com os mecânicos? Vale conferir! 🔧', cor: '#3b82f6' }

  // Pré-fechamento (16h–17h30)
  if (min >= 16 * 60 && min < 17 * 60 + 30) return { texto: 'A tarde está acabando! Aproveita pra fechar os orçamentos e alinhar com os mecânicos, Leandra! 📋', cor: '#8b5cf6' }

  // Quase fechando (17h30–18h)
  if (min >= 17 * 60 + 30 && min < 18 * 60) return { texto: 'Estamos quase fechando, não é mesmo, Leandra? Só mais um pouco — você chegou até aqui! 🏁', cor: '#e63946' }

  // Fechamento (18h em ponto)
  if (min >= 18 * 60 && min < 18 * 60 + 20) return { texto: 'Oficina fechada! Parabéns pelo dia de trabalho, Leandra! Descanse bem! 🎉', cor: '#10b981' }

  // Após fechamento
  return { texto: 'O expediente acabou, Leandra! Vai descansar — você merece! Até amanhã! 🌙', cor: '#6b7280' }
}

const CHECKLIST_KEY = 'ol_checklist_'
const ITEMS_FIXOS = [
  { id: 'abrir', label: 'Abrir a oficina 🔑', icon: '🔑' },
  { id: 'cafe', label: 'Tomar café ☕', icon: '☕' },
  { id: 'escritorio', label: 'Arrumar o escritório 🗂️', icon: '🗂️' },
  { id: 'pecas', label: 'Verificar peças para pedir 🔩', icon: '🔩' },
  { id: 'contas', label: 'Verificar contas a pagar 💳', icon: '💳' },
  { id: 'orcamentos', label: 'Conferir orçamentos com os mecânicos 📋', icon: '📋' },
  { id: 'copel', label: 'Pessoal, pagaram a Copel (luz)? Energia é essencial na oficina! ⚡', icon: '⚡', aviso: true },
  { id: 'aluguel', label: 'Pessoal, o aluguel está em dia? Sem isso não temos onde trabalhar! 🏠', icon: '🏠', aviso: true },
  { id: 'agua', label: 'Pessoal, pagaram a água? Não podemos ficar sem! 💧', icon: '💧', aviso: true },
]

function getTodayKey() {
  return CHECKLIST_KEY + new Date().toISOString().split('T')[0]
}

function loadChecked() {
  return JSON.parse(localStorage.getItem(getTodayKey()) || '[]')
}

function saveChecked(arr) {
  localStorage.setItem(getTodayKey(), JSON.stringify(arr))
}

const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

function calcAlertas() {
  const agora = Date.now()
  const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
  const contas = JSON.parse(localStorage.getItem('ol_contas') || '[]')
  const hoje = new Date()
  const diaHoje = hoje.getDate()
  const alertas = []

  // Carros com mais de 5h em serviço
  ordens.filter(o => o.status === 'em_andamento' && o.inicio).forEach(o => {
    const elapsed = agora - o.inicio
    if (elapsed > 5 * 3600 * 1000) {
      const horas = Math.floor(elapsed / 3600000)
      alertas.push({
        id: `os5h_${o.id}`,
        tipo: 'danger',
        icone: '⏰',
        texto: `OS #${o.numero} — ${o.clienteNome || 'Cliente'} (${o.modelo || 'veículo'}) está há ${horas}h em serviço. Verifique o status com o mecânico ${o.funcionario ? '(' + o.funcionario + ')' : ''}!`,
      })
    }
  })

  // Carros há mais de 3 dias na oficina
  ordens.filter(o => !['concluido', 'cancelado'].includes(o.status) && o.criadoEm).forEach(o => {
    const dias = Math.floor((agora - o.criadoEm) / (86400 * 1000))
    if (dias >= 3) {
      alertas.push({
        id: `os3d_${o.id}`,
        tipo: 'warning',
        icone: '🚗',
        texto: `OS #${o.numero} — ${o.clienteNome || 'Cliente'} (${o.modelo || 'veículo'}) está na oficina há ${dias} dias. Verifique o andamento com o mecânico ${o.funcionario ? '(' + o.funcionario + ')' : ''}!`,
      })
    }
  })

  // Contas vencendo hoje
  contas.filter(c => c.status === 'pendente' && Number(c.vencimento) === diaHoje).forEach(c => {
    alertas.push({
      id: `conta_${c.id}`,
      tipo: 'info',
      icone: '📄',
      texto: `Conta vence HOJE: ${c.descricao}${c.descBreve ? ' — ' + c.descBreve : ''} · ${fmt(c.valor)}. Não esqueça de pagar!`,
    })
  })

  // Orçamentos pendentes — lembrar de verificar com mecânicos
  const orcamentos = ordens.filter(o => o.status === 'orcamento')
  if (orcamentos.length > 0) {
    alertas.push({
      id: 'orcamentos_pendentes',
      tipo: 'info',
      icone: '📋',
      texto: `Você tem ${orcamentos.length} orçamento(s) aguardando aprovação. Confira peça por peça com os mecânicos responsáveis!`,
    })
  }

  return alertas
}

export default function Dashboard({ setPage }) {
  const [stats, setStats] = useState({ receita: 0, gastos: 0, ordens: 0, contasPendentes: 0, clientes: 0 })
  const [pecas, setPecas] = useState([])
  const [totalComissao, setTotalComissao] = useState(0)
  const [agora, setAgora] = useState(new Date())
  const [checked, setChecked] = useState(loadChecked)
  const [alertas, setAlertas] = useState([])
  const [alertasDismissed, setAlertasDismissed] = useState([])
  const [almoco, setAlmoco] = useState(getAvisoAlmoco())
  const [almocoConcluido, setAlmocoConcluido] = useState(
    localStorage.getItem('ol_almoco_' + new Date().toISOString().split('T')[0]) === '1'
  )
  const [notinhas, setNotinhas] = useState(loadNotinhas)
  const [notinhaForm, setNotinhaForm] = useState(emptyNotinha())
  const [notinhaOpen, setNotinhaOpen] = useState(false)
  const [notinhaConfirm, setNotinhaConfirm] = useState(null)
  const [dashPctInput, setDashPctInput] = useState('35')
  const saudacao = getSaudacao()
  const fraseCtx = getFraseContextual(checked, agora)

  const todayStr = new Date().toISOString().split('T')[0]
  const notinhasHoje = notinhas.filter(n => n.data === todayStr)
  const totalGastoHoje   = notinhasHoje.reduce((s, n) => s + (n.totalCusto || 0), 0)
  const totalVendaHoje   = notinhasHoje.reduce((s, n) => s + (n.totalVenda  || (n.precoVenda * n.qtd) || 0), 0)
  const totalLucroHoje   = notinhasHoje.reduce((s, n) => s + (n.lucro || 0), 0)
  const comOficinaHoje   = notinhasHoje.reduce((s, n) => s + (n.comOficina  != null ? n.comOficina  : (n.totalCusto || n.custoUnit * n.qtd || 0) * 0.30), 0)
  const comLeandraHoje   = notinhasHoje.reduce((s, n) => s + (n.comLeandra  != null ? n.comLeandra  : (n.totalCusto || n.custoUnit * n.qtd || 0) * 0.03), 0)

  const custoUnit = parseFloat(notinhaForm.custoUnit) || 0
  const qtd = parseInt(notinhaForm.qtd) || 1
  // Preço de venda = custo * 1.35, arredondado; campo editável sobrescreve
  const precoAutoUnit = notinhaForm.precoVenda ? parseFloat(notinhaForm.precoVenda) : Math.round(custoUnit * MARGEM_PECAS)
  const custoCalc = custoUnit * qtd
  const vendaCalc = precoAutoUnit * qtd
  const lucroCalc = vendaCalc - custoCalc
  const porcCalc = custoCalc > 0 ? ((lucroCalc / custoCalc) * 100) : 0

  function salvarNotinha(e) {
    e.preventDefault()
    if (!notinhaForm.desc || !notinhaForm.custoUnit) return
    setDashPctInput('35')
    setNotinhaConfirm({ custoCalc, vendaCalc, lucroCalc, porcCalc })
  }

  function confirmarNotinha(tipo) {
    const { custoCalc: cc, vendaCalc: vc, lucroCalc: lc, porcCalc: pc } = notinhaConfirm
    const pct = Math.max(0, parseFloat(dashPctInput) || 35) / 100
    const oficinaPct = tipo === 'split' ? Math.max(0, pct - 0.03) : pct
    const arr = loadNotinhas()
    arr.push({
      ...notinhaForm,
      id: nextNotinhaId(arr),
      qtd,
      custoUnit,
      precoVenda: precoAutoUnit,
      totalCusto: cc,
      totalVenda: vc,
      lucro: lc,
      porcLucro: pc,
      comOficina: parseFloat((cc * oficinaPct).toFixed(2)),
      comLeandra: tipo === 'split' ? parseFloat((cc * 0.03).toFixed(2)) : 0,
      data: todayStr,
    })
    saveNotinhas(arr)
    setNotinhas(loadNotinhas())
    setNotinhaForm(emptyNotinha())
    setNotinhaOpen(false)
    setNotinhaConfirm(null)
  }

  function removerNotinha(id) {
    if (!confirm('Remover esta notinha?')) return
    const arr = loadNotinhas().filter(n => n.id !== id)
    saveNotinhas(arr)
    setNotinhas(arr)
  }

  useEffect(() => {
    const id = setInterval(() => {
      setAgora(new Date())
      setAlmoco(getAvisoAlmoco())
    }, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const caixa = JSON.parse(localStorage.getItem('ol_caixa') || '[]')
    const receita = caixa.filter(e => e.tipo === 'entrada' && e.data === today).reduce((s, e) => s + Number(e.valor), 0)
    const gastosArr = JSON.parse(localStorage.getItem('ol_gastos') || '[]')
    const gastos = gastosArr.filter(g => g.data === today).reduce((s, g) => s + Number(g.valor), 0)
    const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
    const ordensAtivas = ordens.filter(o => o.status === 'em_andamento').length
    const contas = JSON.parse(localStorage.getItem('ol_contas') || '[]')
    const contasPendentes = contas.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0)
    const clientes = JSON.parse(localStorage.getItem('ol_clientes') || '[]').length
    setStats({ receita, gastos, ordens: ordensAtivas, contasPendentes, clientes })

    const todasPecas = gastosArr.filter(g => g.categoria === 'Peças').sort((a, b) => b.id - a.id).slice(0, 10)
    setPecas(todasPecas)
    const comTotal = gastosArr.filter(g => g.categoria === 'Peças' && g.comissao).reduce((s, g) => s + Number(g.comissao), 0)
    setTotalComissao(comTotal)

    setAlertas(calcAlertas())
  }, [])

  function toggleCheck(id) {
    const novo = checked.includes(id) ? checked.filter(x => x !== id) : [...checked, id]
    setChecked(novo)
    saveChecked(novo)
  }

  function dismissAlertas(id) {
    setAlertasDismissed(prev => [...prev, id])
  }

  function concluirAlmoco() {
    const key = 'ol_almoco_' + new Date().toISOString().split('T')[0]
    localStorage.setItem(key, '1')
    setAlmocoConcluido(true)
  }

  const totalChecked = checked.filter(id => ITEMS_FIXOS.some(i => i.id === id)).length
  const todosFeitos = totalChecked === ITEMS_FIXOS.length
  const alertasVisiveis = alertas.filter(a => !alertasDismissed.includes(a.id))

  const cards = [
    { label: 'OS Em Andamento', value: stats.ordens, icon: '📋', color: '#3b82f6', page: 'ordens' },
    { label: 'Receita Hoje', value: fmt(stats.receita), icon: '💰', color: '#10b981', page: 'caixa' },
    { label: 'Contas a Pagar', value: fmt(stats.contasPendentes), icon: '📄', color: '#e63946', page: 'contas' },
  ]

  return (
    <div>
      {/* === SAUDAÇÃO === */}
      <div className="dash-greeting">
        <div className="dash-greeting-left">
          <span className="dash-greeting-emoji">{saudacao.emoji}</span>
          <div>
            <h1>{saudacao.texto}, Leandra! 👋</h1>
            <p className="dash-greeting-sub">
              {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              Expediente: 08h–12h / 13h30–18h
            </p>
            <p className="dash-frase" style={{ color: fraseCtx.cor }}>{fraseCtx.texto}</p>
          </div>
        </div>
      </div>

      {/* === AVISO DE ALMOÇO === */}
      {almoco && !almocoConcluido && (
        <div className="dash-almoco">
          <span className="dash-almoco-icon">🍽️</span>
          <div style={{ flex: 1 }}>
            <strong>Leandra, está na hora da pausa para o almoço! (12:00 – 13:30)</strong>
            <p>Você merece descansar — tire sua hora de almoço tranquila. Volte renovada! ☕😊</p>
          </div>
          <button className="dash-almoco-btn" onClick={concluirAlmoco}>✔ Retornei</button>
        </div>
      )}

      {/* === ALERTAS DINÂMICOS === */}
      {alertasVisiveis.length > 0 && (
        <div className="dash-alertas">
          {alertasVisiveis.map(a => (
            <div key={a.id} className={`dash-alerta dash-alerta-${a.tipo}`}>
              <span className="dash-alerta-icon">{a.icone}</span>
              <span className="dash-alerta-texto">{a.texto}</span>
              <button className="dash-alerta-close" onClick={() => dismissAlertas(a.id)} title="Dispensar">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* === CONTAS COUNTDOWN === */}
      {[
        { dia: 4,  icon: '⚡', nome: 'Luz (Copel)',  valor: null,      msg0: 'A conta de LUZ vence HOJE! Paga logo pra não cortar a energia da oficina! ⚡', msgN: d => `Ei Leandra, a conta de luz vence em ${d} dia${d>1?'s':''}! Não deixa acumular! ⚡` },
        { dia: 16, icon: '📶', nome: 'Internet',      valor: null,      msg0: 'A INTERNET vence HOJE! Paga para não ficar sem sinal! 📶',                        msgN: d => `Leandra, a internet vence em ${d} dia${d>1?'s':''}! Não esquece! 📶` },
        { dia: 20, icon: '🏠', nome: 'Aluguel',      valor: 'R$1.200', msg0: 'O ALUGUEL vence HOJE! Sem pagar não tem onde trabalhar! 🏠',                    msgN: d => `Leandra, o aluguel vence em ${d} dia${d>1?'s':''}! Já separa o dinheiro! 🏠` },
        { dia: 22, icon: '💧', nome: 'Água',          valor: null,      msg0: 'A conta de ÁGUA vence HOJE! Paga antes de faltar água na oficina! 💧',           msgN: d => `Leandra, a água vence em ${d} dia${d>1?'s':''}! Não esquece! 💧` },
        { dia: 30, icon: '💻', nome: 'Sistema',       valor: null,      msg0: 'O SISTEMA vence HOJE! Renova para não perder o acesso! 💻',                      msgN: d => `Leandra, o sistema vence em ${d} dia${d>1?'s':''}! Já avisa para renovar! 💻` },
      ].map(({ dia, icon, nome, valor, msg0, msgN }) => {
        const hoje = new Date()
        const venc = new Date(hoje.getFullYear(), hoje.getMonth(), dia)
        if (hoje.getDate() > dia) venc.setMonth(venc.getMonth() + 1)
        const diasRestantes = Math.ceil((venc - hoje) / 86400000)
        if (diasRestantes > 5) return null
        const urgente = diasRestantes <= 2
        return (
          <div key={nome} style={{
            background: urgente ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.10)',
            border: `2px solid ${urgente ? '#ef4444' : '#f59e0b'}`,
            borderRadius: 12, padding: '14px 20px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 28 }}>{urgente ? '🚨' : icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: urgente ? '#ef4444' : '#f59e0b' }}>
                {diasRestantes === 0 ? msg0 : msgN(diasRestantes)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
                Vencimento: dia {dia}{valor ? `  |  Valor: ${valor}` : ''}
              </div>
            </div>
          </div>
        )
      })}

      {/* === CHECKLIST + NOTINHAS LADO A LADO === */}
      <div className="dash-side-row">
      {/* === CHECKLIST === */}
      <div className="dash-checklist card">
        <div className="dash-checklist-header">
          <div>
            <h2 className="dash-checklist-title">
              {saudacao.texto}, Leandra! Vamos fazer o checklist? {todosFeitos ? '🎉' : '📝'}
            </h2>
            <p className="dash-checklist-sub">
              {todosFeitos
                ? 'Tudo concluído! Ótimo começo de dia! 🌟'
                : `${totalChecked} de ${ITEMS_FIXOS.length} itens concluídos`}
            </p>
          </div>
          <div className="dash-checklist-progress">
            <svg viewBox="0 0 36 36" className="dash-progress-ring">
              <path className="dash-progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path
                className="dash-progress-fill"
                strokeDasharray={`${(totalChecked / ITEMS_FIXOS.length) * 100}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="dash-progress-pct">{Math.round((totalChecked / ITEMS_FIXOS.length) * 100)}%</span>
          </div>
        </div>

        <ul className="dash-checklist-list">
          {ITEMS_FIXOS.map(item => {
            const done = checked.includes(item.id)
            return (
              <li key={item.id} className={`dash-check-item ${done ? 'done' : ''} ${item.aviso && !done ? 'aviso' : ''}`} onClick={() => toggleCheck(item.id)}>
                <span className={`dash-checkbox ${done ? 'checked' : ''}`}>
                  {done ? '✔' : ''}
                </span>
                <span className="dash-check-label">{item.label}</span>
                {!done && <span className={`dash-check-pending ${item.aviso ? 'urgente' : ''}`}>{item.aviso ? '❗ Urgente' : 'Pendente'}</span>}
              </li>
            )
          })}
        </ul>
      </div>

        {/* === NOTINHAS DE PEÇAS === */}
        <div className="card dash-pecas">
          <div className="dash-pecas-header">
            <h3>🔩 Notinhas de Peças</h3>
            <button className="btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => setNotinhaOpen(v => !v)}>
              {notinhaOpen ? '✕ Fechar' : '+ Adicionar Notinha'}
            </button>
          </div>

          {/* Lembrete animado */}
          {notinhasHoje.length === 0 ? (
            <div className="dash-notinha-lembrete">
              <span>📝</span>
              <span>Leandra, chegou alguma notinha de peças hoje? Vai lá adicionar, não podemos esquecer! 😄</span>
            </div>
          ) : (
            <div className="dash-notinha-resumo">
              <div className="notinha-resumo-item vermelho">
                <span>🛒 Custo com Peças Hoje</span>
                <strong>{fmt(totalGastoHoje)}</strong>
              </div>
              <div className="notinha-resumo-item azul">
                <span>💳 Total Venda Hoje</span>
                <strong>{fmt(totalVendaHoje)}</strong>
              </div>
              <div className="notinha-resumo-item verde">
                <span>📈 Lucro Hoje</span>
                <strong>{fmt(totalLucroHoje)}</strong>
              </div>
              <div className="notinha-resumo-item cinza">
                <span>🏢 Ganho Oficina (30%)</span>
                <strong style={{ color: '#3b82f6' }}>{fmt(comOficinaHoje)}</strong>
              </div>
              <div className="notinha-resumo-item destaque-leandra">
                <span>👩 Ganho Leandra (3%)</span>
                <strong style={{ color: '#d97706', fontSize: 20 }}>{fmt(comLeandraHoje)}</strong>
              </div>
            </div>
          )}

          {/* Formulário rápido */}
          {notinhaOpen && (
            <form className="dash-notinha-form" onSubmit={salvarNotinha}>
              <div className="notinha-form-row">
                <div className="form-group" style={{ flex: 3 }}>
                  <label>Peça / Descrição *</label>
                  <input value={notinhaForm.desc} onChange={e => setNotinhaForm(f => ({ ...f, desc: e.target.value }))} placeholder="Ex: Filtro de óleo, pastilha de freio..." required />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Fornecedor</label>
                  <input value={notinhaForm.fornecedor} onChange={e => setNotinhaForm(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Nome da loja/fornecedor" />
                </div>
              </div>
              <div className="notinha-form-row">
                <div className="form-group">
                  <label>Qtd</label>
                  <input type="number" min="1" value={notinhaForm.qtd} onChange={e => setNotinhaForm(f => ({ ...f, qtd: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Custo Unit. (R$) *</label>
                  <input type="number" min="0" step="0.01" value={notinhaForm.custoUnit} onChange={e => setNotinhaForm(f => ({ ...f, custoUnit: e.target.value }))} placeholder="Quanto pagou" required />
                </div>
                <div className="form-group">
                  <label>Preço de Venda Unit. (R$) <span style={{ color: '#10b981', fontWeight: 700, fontSize: 11 }}>+35% automático</span></label>
                  <input
                    type="number" min="0" step="1"
                    value={notinhaForm.precoVenda || (custoUnit > 0 ? Math.round(custoUnit * MARGEM_PECAS) : '')}
                    onChange={e => setNotinhaForm(f => ({ ...f, precoVenda: e.target.value }))}
                    placeholder={custoUnit > 0 ? `R$ ${Math.round(custoUnit * MARGEM_PECAS)}` : 'Preenchido auto com +35%'}
                  />
                  {custoUnit > 0 && !notinhaForm.precoVenda && (
                    <small style={{ color: '#10b981', fontSize: 11, marginTop: 3, display: 'block' }}>
                      ✅ Valor sugerido: R$ {Math.round(custoUnit * MARGEM_PECAS)} (custo R$ {custoUnit.toFixed(0)} + 35%)
                    </small>
                  )}
                </div>
              </div>
              {(custoCalc > 0 || vendaCalc > 0) && (
                <div className="dash-notinha-calc">
                  <span>💸 Custo: <strong style={{ color: '#ef4444' }}>{fmt(custoCalc)}</strong></span>
                  <span>💳 Venda: <strong style={{ color: '#3b82f6' }}>{fmt(vendaCalc)}</strong></span>
                  <span>📈 Lucro: <strong style={{ color: lucroCalc >= 0 ? '#10b981' : '#ef4444' }}>{fmt(lucroCalc)}</strong></span>
                  <span>🏢 Oficina 30%: <strong style={{ color: '#3b82f6' }}>{fmt(custoCalc * 0.30)}</strong></span>
                  <span style={{ background: 'rgba(251,191,36,0.15)', borderRadius: 6, padding: '2px 8px' }}>
                    👩 Leandra 3%: <strong style={{ color: '#d97706' }}>{fmt(custoCalc * 0.03)}</strong>
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setNotinhaOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">✔ Salvar Notinha</button>
              </div>
            </form>
          )}

          {/* Lista de notinhas de hoje */}
          {notinhasHoje.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8 }}>Notinhas de Hoje</div>
              <table className="pecas-table">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Custo</th>
                    <th>Venda</th>
                    <th>Lucro</th>
                    <th style={{ color: '#3b82f6' }}>Oficina 30%</th>
                    <th style={{ color: '#d97706' }}>Leandra 3%</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {notinhasHoje.map(n => {
                    const venda = n.totalVenda || (n.precoVenda * n.qtd) || 0
                    const comOf = n.comOficina != null ? n.comOficina : (n.totalCusto || 0) * 0.30
                    const comLe = n.comLeandra != null ? n.comLeandra : (n.totalCusto || 0) * 0.03
                    return (
                      <tr key={n.id}>
                        <td><strong>{n.desc}</strong><br /><span style={{ fontSize: 11, color: 'var(--text-light)' }}>Qtd: {n.qtd} · {n.fornecedor || '—'}</span></td>
                        <td><strong style={{ color: '#ef4444' }}>{fmt(n.totalCusto)}</strong></td>
                        <td><strong style={{ color: '#3b82f6' }}>{fmt(venda)}</strong></td>
                        <td><strong style={{ color: n.lucro >= 0 ? '#10b981' : '#ef4444' }}>{fmt(n.lucro)}</strong></td>
                        <td><span className="comissao-badge azul">{fmt(comOf)}</span></td>
                        <td><span className="comissao-badge amarelo">{fmt(comLe)}</span></td>
                        <td><button className="btn-danger" style={{ padding: '4px 8px' }} onClick={() => removerNotinha(n.id)}>🗑️</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>{/* end dash-side-row */}

      {/* === CARDS === */}
      <div className="dash-cards">
        {cards.map((c, i) => (
          <button key={i} className="dash-card" onClick={() => setPage(c.page)}>
            <div className="dash-card-icon" style={{ background: c.color + '18' }}>
              <span>{c.icon}</span>
            </div>
            <div className="dash-card-info">
              <span className="dash-card-label">{c.label}</span>
              <strong className="dash-card-value" style={{ color: c.color }}>{c.value}</strong>
            </div>
          </button>
        ))}
      </div>

      {/* === CONFIRMAÇÃO COMISSÃO NOTINHA === */}
      {notinhaConfirm && (() => {
        const cc = notinhaConfirm.custoCalc
        const pctNum = Math.max(0, parseFloat(dashPctInput) || 35)
        const pctDec = pctNum / 100
        const oficinaSplit = Math.max(0, pctDec - 0.03)
        return (
          <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, maxWidth:440, width:'100%', padding:'28px 24px' }}>
              <h3 style={{ margin:'0 0 6px', fontSize:17, fontWeight:800 }}>💰 Como distribuir a comissão?</h3>
              <p style={{ margin:'0 0 14px', fontSize:13, color:'var(--text-light)' }}>
                Custo: <strong style={{color:'#ef4444'}}>{fmt(cc)}</strong> &nbsp;|&nbsp;
                Venda: <strong style={{color:'#3b82f6'}}>{fmt(notinhaConfirm.vendaCalc)}</strong> &nbsp;|&nbsp;
                Lucro: <strong style={{color:'#10b981'}}>{fmt(notinhaConfirm.lucroCalc)}</strong>
              </p>

              {/* Campo de porcentagem livre */}
              <div style={{ background:'var(--bg-card2)', border:'1.5px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                <label style={{ fontWeight:700, fontSize:13, display:'block', marginBottom:8 }}>
                  📊 Porcentagem total sobre o custo:
                </label>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input
                    type="number" min="0" max="200" step="0.5"
                    value={dashPctInput}
                    onChange={e => setDashPctInput(e.target.value)}
                    style={{ width:90, padding:'8px 12px', borderRadius:8, border:'2px solid #3b82f6', fontSize:18, fontWeight:800, textAlign:'center', background:'var(--bg-card)', color:'var(--text-main)' }}
                  />
                  <span style={{ fontSize:20, fontWeight:800, color:'#3b82f6' }}>%</span>
                  <div style={{ fontSize:12, color:'var(--text-light)', lineHeight:1.4 }}>
                    = <strong style={{color:'var(--text-main)'}}>{fmt(cc * pctDec)}</strong> de comissão total<br />
                    <span style={{fontSize:11}}>Ex: 34%, 35%, 38%...</span>
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button onClick={() => confirmarNotinha('split')} style={{ background:'rgba(59,130,246,0.1)', border:'2px solid #3b82f6', borderRadius:10, padding:'14px 16px', cursor:'pointer', textAlign:'left' }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#3b82f6', marginBottom:4 }}>
                    🏢 {(oficinaSplit*100).toFixed(1)}% Oficina + 👩 5% Leandra
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-light)' }}>
                    Oficina: <strong style={{color:'#3b82f6'}}>{fmt(cc * oficinaSplit)}</strong>
                    &nbsp;&nbsp;Leandra: <strong style={{color:'#d97706'}}>{fmt(cc * 0.03)}</strong>
                    &nbsp;&nbsp;Total: <strong>{fmt(cc * pctDec)}</strong>
                  </div>
                </button>
                <button onClick={() => confirmarNotinha('oficina')} style={{ background:'rgba(16,185,129,0.08)', border:'2px solid #10b981', borderRadius:10, padding:'14px 16px', cursor:'pointer', textAlign:'left' }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#10b981', marginBottom:4 }}>
                    🏢 {pctNum.toFixed(1)}% só para a Oficina
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-light)' }}>
                    Oficina: <strong style={{color:'#10b981'}}>{fmt(cc * pctDec)}</strong>
                    &nbsp;&nbsp;Leandra: <strong style={{color:'var(--text-light)'}}>R$ 0,00</strong>
                  </div>
                </button>
              </div>
              <button onClick={() => setNotinhaConfirm(null)} style={{ marginTop:14, background:'transparent', border:'none', color:'var(--text-light)', cursor:'pointer', fontSize:13 }}>← Voltar e editar</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
