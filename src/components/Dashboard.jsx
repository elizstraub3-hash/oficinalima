import { useState, useEffect } from 'react'
import './Dashboard.css'
import CampoPct, { pctSalva, fatorMargem } from './CampoPct.jsx'
import { lancamentosCaixa } from './Caixa.jsx'
import { calcResumoFuncionario, listarPeriodos, pctFuncionario } from './Funcionarios.jsx'
import { resumoPeriodo } from './Relatorio.jsx'
import { pecasDasOS } from './FaixasPecas.js'
import { noPeriodo, dataOS } from './Periodo.jsx'

const KEY_NOTINHAS = 'ol_notinhas'
function loadNotinhas() { return JSON.parse(localStorage.getItem(KEY_NOTINHAS) || '[]') }
function saveNotinhas(d) { localStorage.setItem(KEY_NOTINHAS, JSON.stringify(d)) }
function nextNotinhaId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const emptyNotinha = () => ({ desc: '', fornecedor: '', qtd: 1, custoUnit: '', precoVenda: '', margem: pctSalva('margem_notinha') })

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
  if (min < 8 * 60) return { texto: 'A oficina abre às 8h — descanse bem, Pedro! Amanhã tem mais! 🌙', cor: '#6b7280' }

  // Chegando
  if (min >= 8 * 60 && min < 8 * 60 + 20) return { texto: 'Bom dia, Pedro! Que ótimo te ver por aqui! Vamos começar o dia com tudo? 💪', cor: '#000' }

  // Manhã — checklist não feito
  if (min >= 8 * 60 + 20 && min < 12 * 60) {
    if (checkedCount === 0) return { texto: 'Não esqueceu do checklist, né Pedro? Já está esperando por você! 📋', cor: '#e63946' }
    if (faltam > 0) return { texto: `Boa, Pedro! Você já marcou ${checkedCount} item(s). Ainda faltam ${faltam} — bora lá! 🔥`, cor: '#f59e0b' }
    return { texto: 'Checklist completo! Que começo de dia incrível, Pedro! Agora é só arrasar! ⭐', cor: '#10b981' }
  }

  // Pré-almoço (11h40–12h)
  if (min >= 11 * 60 + 40 && min < 12 * 60) return { texto: 'Quase na hora do almoço, Pedro! Não para não — mais um pouquinho! 😄', cor: '#f59e0b' }

  // Almoço (12h–13h30)
  if (min >= 12 * 60 && min < 13 * 60 + 30) return { texto: 'Hora de almoçar, Pedro! Você merece essa pausa. Volte renovado às 13h30! 🍽️', cor: '#f59e0b' }

  // Retorno do almoço
  if (min >= 13 * 60 + 30 && min < 13 * 60 + 50) return { texto: 'Bem-vindo de volta, Pedro! Tarde produtiva te espera! ☕', cor: '#3b82f6' }

  // Tarde — meio da tarde
  if (min >= 13 * 60 + 50 && min < 16 * 60) return { texto: 'A tarde está passando, Pedro! Como estão os carros com os mecânicos? Vale conferir! 🔧', cor: '#3b82f6' }

  // Pré-fechamento (16h–17h30)
  if (min >= 16 * 60 && min < 17 * 60 + 30) return { texto: 'A tarde está acabando! Aproveita pra fechar os orçamentos e alinhar com os mecânicos, Pedro! 📋', cor: '#8b5cf6' }

  // Quase fechando (17h30–18h)
  if (min >= 17 * 60 + 30 && min < 18 * 60) return { texto: 'Estamos quase fechando, não é mesmo, Pedro? Só mais um pouco — você chegou até aqui! 🏁', cor: '#e63946' }

  // Fechamento (18h em ponto)
  if (min >= 18 * 60 && min < 18 * 60 + 20) return { texto: 'Oficina fechada! Parabéns pelo dia de trabalho, Pedro! Descanse bem! 🎉', cor: '#10b981' }

  // Após fechamento
  return { texto: 'O expediente acabou, Pedro! Vai descansar — você merece! Até amanhã! 🌙', cor: '#6b7280' }
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

export function lucroDoPeriodo(per) {
  const nomesF = JSON.parse(localStorage.getItem('ol_funcionarios') || '[]').map(x => x.nome)
  {
            let mob = 0, comissao = 0
            const concl = JSON.parse(localStorage.getItem('ol_ordens') || '[]').filter(o => o.status === 'concluido' && noPeriodo(dataOS(o), per))
            concl.forEach(o => {
              const svs = o.servicos?.length ? o.servicos : [{ maoDeObra: o.maoDeObra, funcionario: o.funcionario }]
              svs.forEach(sv => {
                const v = parseFloat(sv.maoDeObra) || 0
                mob += v
                if (sv.funcionario && nomesF.includes(sv.funcionario)) comissao += v * pctFuncionario(sv.funcionario)
              })
            })
            const p = pecasDasOS(per)
            const r = resumoPeriodo(per)
            const salarios = lancamentosCaixa().filter(e => e.origem === 'mecanico' && String(e.descricao || '').startsWith('Salário fixo') && noPeriodo(e.data, per)).reduce((t, e) => t + e.valor, 0)
            const gastos = r.totalGastos + salarios
            const lucroMob = mob - comissao
            const bruto = lucroMob + p.lucro
            return { mob, comissao, lucroMob, pVenda: p.venda, pCusto: p.custo, pLucro: p.lucro, vendido: mob + p.venda, bruto, gastos, gastosPlan: r.totalGastos, salarios, real: bruto - gastos, os: concl.length }
          }
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
  const [pctReserva, setPctReserva] = useState(() => pctSalva('reserva_mes') || 20)
  const [reservas, setReservas] = useState(() => JSON.parse(localStorage.getItem('ol_reservas') || '[]'))
  const [dashPctInput, setDashPctInput] = useState(() => pctSalva('comissao_notinha'))
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
  // Preço de venda = custo + margem escolhida pelo Pedro; campo editável sobrescreve
  const fatorN = fatorMargem(notinhaForm.margem)
  const precoSugeridoN = custoUnit > 0 && fatorN ? Math.round(custoUnit * fatorN * 100) / 100 : 0
  const precoAutoUnit = notinhaForm.precoVenda ? parseFloat(notinhaForm.precoVenda) : (precoSugeridoN || custoUnit)
  const custoCalc = custoUnit * qtd
  const vendaCalc = precoAutoUnit * qtd
  const lucroCalc = vendaCalc - custoCalc
  const porcCalc = custoCalc > 0 ? ((lucroCalc / custoCalc) * 100) : 0

  function salvarNotinha(e) {
    e.preventDefault()
    if (!notinhaForm.desc || !notinhaForm.custoUnit) return
    setDashPctInput(pctSalva('comissao_notinha'))
    setNotinhaConfirm({ custoCalc, vendaCalc, lucroCalc, porcCalc })
  }

  function confirmarNotinha(tipo) {
    const { custoCalc: cc, vendaCalc: vc, lucroCalc: lc, porcCalc: pc } = notinhaConfirm
    if (dashPctInput === '' || Number.isNaN(Number(dashPctInput))) return alert('Digite a porcentagem da comissão.')
    const pct = Math.max(0, parseFloat(dashPctInput)) / 100
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
    const caixa = lancamentosCaixa()
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

  // Dias para vencer o sistema (dia 30)
  const _hoje = new Date()
  const _vencSistema = new Date(_hoje.getFullYear(), _hoje.getMonth(), 30)
  if (_hoje.getDate() > 30) _vencSistema.setMonth(_vencSistema.getMonth() + 1)
  const _diasSistema = Math.ceil((_vencSistema - _hoje) / 86400000)
  const _sistemaHoje = _diasSistema === 0

  return (
    <div>
      {/* === SAUDAÇÃO === */}
      <div className="dash-greeting">
        <div className="dash-greeting-left">
          <span className="dash-greeting-emoji">{saudacao.emoji}</span>
          <div>
            <h1>{saudacao.texto}, Pedro! 👋</h1>
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

      {/* === AVISO FATURA DO SISTEMA (só aparece com 8 dias ou menos) === */}
      {_diasSistema <= 8 && (() => {
        const urgente = _diasSistema <= 3
        const msg = _sistemaHoje
          ? 'Pedro, hoje vence a fatura do site! Bora pagar pra gente não ficar sem o sistema, hein! 😬💳'
          : _diasSistema === 1
            ? 'Pedro, amanhã vence a fatura do site! Não deixa pra última hora não! 😅'
            : `Pedro, fica de olho — daqui ${_diasSistema} dias vence a fatura do site! Vai separando o dinheirinho! 😄💻`
        return (
          <div style={{
            background: urgente ? 'rgba(239,68,68,0.10)' : 'rgba(99,102,241,0.08)',
            border: `1.5px solid ${urgente ? '#ef4444' : '#6366f1'}`,
            borderRadius: 12, padding: '12px 18px', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 26 }}>{_sistemaHoje ? '🚨' : urgente ? '⏰' : '💻'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: urgente ? '#ef4444' : '#6366f1' }}>{msg}</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
                R$ 60,00 · PIX <strong>10595735983</strong> · Elizandra · Pix com desconto = <strong>R$ 57,00</strong>
              </div>
            </div>
          </div>
        )
      })()}

      {/* === AVISO DE ALMOÇO === */}
      {almoco && !almocoConcluido && (
        <div className="dash-almoco">
          <span className="dash-almoco-icon">🍽️</span>
          <div style={{ flex: 1 }}>
            <strong>Pedro, está na hora da pausa para o almoço! (12:00 – 13:30)</strong>
            <p>Você merece descansar — tire sua hora de almoço tranquila. Volte renovado! ☕😊</p>
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
        { dia: 4,  icon: '⚡', nome: 'Luz (Copel)',  valor: null,      msg0: 'A conta de LUZ vence HOJE! Paga logo pra não cortar a energia da oficina! ⚡', msgN: d => `Ei Pedro, a conta de luz vence em ${d} dia${d>1?'s':''}! Não deixa acumular! ⚡` },
        { dia: 16, icon: '📶', nome: 'Internet',      valor: null,      msg0: 'A INTERNET vence HOJE! Paga para não ficar sem sinal! 📶',                        msgN: d => `Pedro, a internet vence em ${d} dia${d>1?'s':''}! Não esquece! 📶` },
        { dia: 20, icon: '🏠', nome: 'Aluguel',      valor: 'R$1.200', msg0: 'O ALUGUEL vence HOJE! Sem pagar não tem onde trabalhar! 🏠',                    msgN: d => `Pedro, o aluguel vence em ${d} dia${d>1?'s':''}! Já separa o dinheiro! 🏠` },
        { dia: 22, icon: '💧', nome: 'Água',          valor: null,      msg0: 'A conta de ÁGUA vence HOJE! Paga antes de faltar água na oficina! 💧',           msgN: d => `Pedro, a água vence em ${d} dia${d>1?'s':''}! Não esquece! 💧` },
        { dia: 30, icon: '💻', nome: 'Sistema',       valor: null,      msg0: 'O SISTEMA vence HOJE! Renova para não perder o acesso! 💻',                      msgN: d => `Pedro, o sistema vence em ${d} dia${d>1?'s':''}! Já avisa para renovar! 💻` },
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

        {/* === RESUMO DA EMPRESA === */}
        {(() => {
          const { semanas, meses } = listarPeriodos()
          const f = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
          const calc = lucroDoPeriodo
          const S = calc(semanas[0]), M = calc(meses[0])
          const cor = v => v >= 0 ? '#10b981' : '#ef4444'
          const Big = ({ t, v, sub }) => (
            <div style={{ flex: '1 1 260px', textAlign: 'center', background: 'var(--bg-card2)', borderRadius: 12, padding: '14px 10px', border: `2px solid ${cor(v)}` }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t}</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: cor(v), lineHeight: 1.15 }}>{f(v)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{sub}</div>
            </div>
          )
          const th = { textAlign: 'right', padding: '6px 8px', fontSize: 12, color: 'var(--text-light)' }
          const Row = ({ t, k, c, forte, sep }) => (
            <tr style={{ borderTop: sep ? '2px solid var(--border)' : '1px solid var(--border)' }}>
              <td style={{ padding: '6px 8px', fontWeight: forte ? 800 : 400 }}>{t}</td>
              {[S, M].map((x, i) => <td key={i} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: forte ? 800 : 600, color: c === 'auto' ? cor(x[k]) : c }}>{f(x[k])}</td>)}
            </tr>
          )
          return (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>💰 Pedro, seu lucro — {meses[0].label}</h3>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
                <Big t="📈 Lucro bruto do mês" v={M.bruto} sub={<>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>O que o trabalho da oficina rendeu, antes de pagar as despesas</div>
                  Mão de obra {f(M.mob)} − comissão {f(M.comissao)} = <strong>{f(M.lucroMob)}</strong><br />
                  Peças {f(M.pVenda)} − custo {f(M.pCusto)} = <strong>{f(M.pLucro)}</strong><br />
                  Semana: {f(S.bruto)}
                </>} />
                <Big t="🏢 Lucro real do mês" v={M.real} sub={<>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>O que sobra no seu bolso depois de pagar tudo</div>
                  Lucro bruto {f(M.bruto)} − gastos {f(M.gastos)} = <strong>{f(M.real)}</strong><br />
                  (luz, aluguel, café, gasolina, salários fixos…)<br />
                  Semana: {f(S.real)}
                </>} />
              </div>
              {M.bruto > 0 && (
                <div style={{ fontSize: 13, background: 'var(--bg-card2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                  💡 {M.real < 0
                    ? 'O trabalho da oficina dá lucro, mas os gastos estão comendo tudo. Corte gastos.'
                    : M.gastos > M.bruto * 0.6
                      ? `Os gastos estão levando ${Math.round(M.gastos / M.bruto * 100)}% do lucro bruto. Vale segurar as despesas.`
                      : 'Lucro bruto bom e gastos controlados. Continue assim!'}
                </div>
              )}
              {(() => {
                const Sec = ({ t, c, children }) => (
                  <div style={{ border: `1.5px solid ${c}`, borderRadius: 12, padding: '4px 6px 6px', marginBottom: 12, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'fixed', minWidth: 420 }}>
                      <colgroup><col style={{ width: '50%' }} /><col style={{ width: '25%' }} /><col style={{ width: '25%' }} /></colgroup>
                      <thead><tr>
                        <th style={{ ...th, textAlign: 'left', color: c, fontSize: 14, fontWeight: 800 }}>{t}</th>
                        <th style={th}>Esta semana</th><th style={th}>Este mês</th>
                      </tr></thead>
                      <tbody>{children}</tbody>
                    </table>
                  </div>
                )
                return (<>
                  <Sec t="🔧 MÃO DE OBRA" c="#3b82f6">
                    <Row t="Total vendido em mão de obra" k="mob" />
                    <Row t="− Comissão dos mecânicos" k="comissao" c="#ef4444" />
                    <Row t="= Lucro na mão de obra" k="lucroMob" c="auto" forte />
                  </Sec>
                  <Sec t="🔩 PEÇAS / PRODUTOS" c="#f59e0b">
                    <Row t="Total vendido em peças" k="pVenda" />
                    <Row t="− Custo das peças" k="pCusto" c="#ef4444" />
                    <Row t="= Lucro nas peças" k="pLucro" c="auto" forte />
                  </Sec>
                  <Sec t="🧾 GASTOS" c="#ef4444">
                    <Row t="Gastos da planilha" k="gastosPlan" />
                    <Row t="Salários fixos" k="salarios" />
                    <Row t="= Total de gastos" k="gastos" c="#ef4444" forte />
                  </Sec>
                  <Sec t="📊 RESULTADO" c="#10b981">
                    <Row t="Total vendido (mão de obra + peças)" k="vendido" />
                    <Row t="Lucro bruto (mão de obra + peças)" k="bruto" c="auto" forte />
                    <Row t="Lucro real (depois dos gastos)" k="real" c="auto" forte />
                  </Sec>
                </>)
              })()}
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8 }}>{S.os} OS concluídas na semana · {M.os} no mês. Só entram OS concluídas.</div>
            </div>
          )
        })()}

      <div className="dash-side-row">
        <div className="dash-col-direita">
        {/* === CONSELHOS PARA O PEDRO === */}
        {(() => {
          const { semanas, meses } = listarPeriodos()
          const f = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
          const m = { ...resumoPeriodo(meses[0]), saldo: lucroDoPeriodo(meses[0]).real }, w = resumoPeriodo(semanas[0]), wAnt = semanas[1] ? resumoPeriodo(semanas[1]) : null
          const avisos = []
          const ruim = t => avisos.push({ c: '#ef4444', i: '🛑', t })
          const atencao = t => avisos.push({ c: '#f59e0b', i: '⚠️', t })
          const bom = t => avisos.push({ c: '#10b981', i: '✅', t })
          if (m.saldo < 0) ruim(`Pare de gastar, Pedro! Este mês saiu mais do que entrou (prejuízo de ${f(-m.saldo)} no lucro real). Segure compras que não são urgentes.`)
          else if (m.entradas > 0 && m.totalGastos > m.entradas * 0.5) atencao(`Os gastos já são ${Math.round(m.totalGastos / m.entradas * 100)}% do que entrou no mês. Evite gastos extras até fechar o mês.`)
          if (wAnt && wAnt.totalGastos > 0 && w.totalGastos > wAnt.totalGastos * 1.3) atencao(`Você gastou mais esta semana (${f(w.totalGastos)}) do que na semana passada (${f(wAnt.totalGastos)}).`)
          const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
          const paradas = ordens.filter(o => !['concluido', 'cancelado'].includes(o.status) && o.data && (Date.now() - new Date(o.data)) / 864e5 > 7)
          if (paradas.length) atencao(`${paradas.length} OS aberta(s) há mais de 7 dias. Conclua ou cobre o cliente para o dinheiro entrar.`)
          const orc = ordens.filter(o => o.status === 'orcamento').length
          if (orc) atencao(`${orc} orçamento(s) esperando resposta. Vale mandar uma mensagem para o cliente.`)
          const semCusto = ordens.filter(o => o.status === 'concluido').some(o => (o.itens || []).some(it => !Number(it.custo)))
          if (semCusto) atencao('Tem peça nas OS sem o custo preenchido. Coloque o custo para o lucro das peças ficar certo.')
          const baixo = JSON.parse(localStorage.getItem('ol_estoque') || '[]').filter(x => Number(x.qtd) <= Number(x.qtdMinima || 3))
          if (baixo.length) atencao(`Estoque baixo: ${baixo.slice(0, 3).map(x => x.nome).join(', ')}${baixo.length > 3 ? '…' : ''}. Compre só o necessário.`)
          if (m.saldo > 0 && m.totalGastos <= m.entradas * 0.5) bom(`Mês no positivo: lucro real de ${f(m.saldo)}. Continue assim e guarde uma reserva.`)
          if (!avisos.length) bom('Tudo em ordem por aqui, Pedro! Continue lançando OS e gastos para os números ficarem certinhos.')
          return (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>🧭 O que fazer agora, Pedro</h3>
              {avisos.map((a, k) => (
                <div key={k} style={{ borderLeft: `4px solid ${a.c}`, padding: '6px 10px', margin: '6px 0', fontSize: 14, background: 'var(--bg-card2)', borderRadius: 6 }}>{a.i} {a.t}</div>
              ))}
            </div>
          )
        })()}

        </div>
        <div className="dash-col-direita">
        {/* === RESERVA DO MÊS === */}
        {(() => {
          const mes = listarPeriodos().meses[0]
          const r = { saldo: lucroDoPeriodo(mes).real }
          const f = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
          const pct = Math.max(0, Number(pctReserva) || 0)
          const sugerido = r.saldo > 0 ? r.saldo * pct / 100 : 0
          const mesId = mes.de.slice(0, 7)
          const guardadoMes = reservas.filter(x => x.mes === mesId).reduce((t, x) => t + x.valor, 0)
          const totalGuardado = reservas.reduce((t, x) => t + x.valor, 0)
          const guardar = () => {
            const v = parseFloat(String(prompt('Quanto você guardou? (R$)', sugerido.toFixed(2)) || '').replace(',', '.'))
            if (!v || v <= 0) return
            const arr = [...reservas, { id: Date.now(), mes: mesId, valor: v, data: new Date().toISOString().slice(0, 10) }]
            localStorage.setItem('ol_reservas', JSON.stringify(arr)); setReservas(arr)
          }
          const desfazer = () => {
            const ult = [...reservas].reverse().find(x => x.mes === mesId)
            if (!ult || !confirm(`Remover o último valor guardado (${f(ult.valor)})?`)) return
            const arr = reservas.filter(x => x.id !== ult.id)
            localStorage.setItem('ol_reservas', JSON.stringify(arr)); setReservas(arr)
          }
          return (
            <div className="card" style={{ marginBottom: 20, border: '2px solid #3b82f6' }}>
              <h3 style={{ marginTop: 0 }}>🐷 Reserva do mês — {mes.label}</h3>
              {r.saldo > 0 ? (
                <p style={{ fontSize: 15, margin: '0 0 8px' }}>
                  Pedro, seu lucro real do mês (depois de mecânicos e gastos) é <strong style={{ color: '#10b981' }}>{f(r.saldo)}</strong>.
                  Recomendo guardar <strong style={{ color: '#3b82f6', fontSize: 18 }}>{f(sugerido)}</strong> ({pct}% do lucro).
                </p>
              ) : (
                <p style={{ fontSize: 15, margin: '0 0 8px', color: '#f59e0b' }}>
                  Este mês ainda não sobrou lucro, Pedro. Sem problema: quando o mês fechar no positivo, eu te digo quanto guardar.
                </p>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
                <span>Porcentagem para guardar:</span>
                <div style={{ maxWidth: 260 }}><CampoPct chave="reserva_mes" label="" value={pctReserva} onChange={setPctReserva} placeholder="20" /></div>
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14, margin: '10px 0' }}>
                <span>✅ Guardado este mês: <strong>{f(guardadoMes)}</strong>{sugerido > 0 && guardadoMes >= sugerido ? ' 🎉 Meta batida!' : ''}</span>
                <span>💰 Total já guardado: <strong style={{ color: '#3b82f6' }}>{f(totalGuardado)}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={guardar}>🐷 Guardei dinheiro</button>
                {guardadoMes > 0 && <button className="btn-secondary" onClick={desfazer}>↩ Desfazer último</button>}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-light)', margin: '8px 0 0' }}>Lance as contas (luz, aluguel…) na Planilha de Gastos para o lucro já vir com elas descontadas. O que você guarda não conta como gasto.</p>
            </div>
          )
        })()}

        </div>
      </div>

        {/* === RELATÓRIO DE SEXTA === */}
        {new Date().getDay() === 5 && (() => {
          const semana = listarPeriodos().semanas[0]
          const r = resumoPeriodo(semana)
          const fmtR = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
          return (
            <div className="card" style={{ marginBottom: 20, border: '2px solid #10b981', background: 'rgba(16,185,129,0.06)' }}>
              <h3 style={{ marginTop: 0 }}>📊 Sextou, Pedro! O relatório da semana está pronto</h3>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14, marginBottom: 12 }}>
                <span>💵 Entradas: <strong style={{ color: '#10b981' }}>{fmtR(r.entradas)}</strong></span>
                <span>💸 Saídas: <strong style={{ color: '#ef4444' }}>{fmtR(r.saidas)}</strong></span>
                <span>📈 Lucro real: <strong>{fmtR(lucroDoPeriodo(semana).real)}</strong></span>
                {r.mecanicos.filter(m => m.maoDeObra > 0).map(m => (
                  <span key={m.nome}>👷 {m.nome}: <strong style={{ color: '#3b82f6' }}>{fmtR(m.aPagar)}</strong></span>
                ))}
              </div>
              <button className="btn-primary" onClick={() => setPage && setPage('relatorio')}>Ver relatório completo →</button>
            </div>
          )
        })()}

      {/* === FUNCIONÁRIOS + DESTAQUES === */}
      {(() => {
        const semana = listarPeriodos().semanas[0]
        const fmtR = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
        const todos = JSON.parse(localStorage.getItem('ol_funcionarios') || '[]').filter(f => (f.nome || '').trim())
        const ativos = todos.filter(f => f.status !== 'inativo')
        const inativos = todos.length - ativos.length
        const concl = JSON.parse(localStorage.getItem('ol_ordens') || '[]').filter(o => o.status === 'concluido' && noPeriodo(dataOS(o), semana))
        const dados = ativos.map(f => {
          const r = calcResumoFuncionario(f.nome, semana)
          const pecas = concl.filter(o => o.funcionario === f.nome).reduce((t, o) => t + (o.itens || []).reduce((x, it) => x + (Number(it.valor ?? it.valorUnit) || 0) * (Number(it.qtd) || 1), 0), 0)
          const pag = r.tipoPagamento === 'fixo' ? `Salário ${fmtR(r.salario)}` : r.tipoPagamento === 'ambos' ? `Fixo + ${Math.round(r.pct * 100)}%` : `${Math.round(r.pct * 100)}%`
          return { f, r, pecas, pag }
        })
        const maxMob = Math.max(0, ...dados.map(d => d.r.maoDeObra || 0))
        const maxPec = Math.max(0, ...dados.map(d => d.pecas))
        const td = { padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }
        const th = { ...td, fontSize: 12, color: 'var(--text-light)', fontWeight: 600 }
        return (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>👷 Funcionários — {semana.label.toLowerCase()}</h3>
              <button className="btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => setPage && setPage('funcionarios')}>Ver todos →</button>
            </div>
            {!dados.length ? (
              <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0 }}>Nenhum funcionário ativo. <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setPage && setPage('funcionarios')}>+ Cadastrar</button></p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead><tr>
                    <th style={{ ...th, textAlign: 'left' }}>Funcionário</th><th style={th}>Pagamento</th><th style={th}>OS</th><th style={th}>Mão de obra</th><th style={th}>Peças vendidas</th><th style={th}>A pagar</th>
                  </tr></thead>
                  <tbody>
                    {dados.map(({ f, r, pecas, pag }) => (
                      <tr key={f.id ?? f.nome} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ ...td, textAlign: 'left' }}><strong>{f.nome}</strong> <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{f.cargo || ''}</span></td>
                        <td style={{ ...td, fontSize: 13, color: 'var(--text-light)' }}>{pag}</td>
                        <td style={td}>{r.concluidas}{r.emAndamento ? <span style={{ fontSize: 12, color: 'var(--text-light)' }}> (+{r.emAndamento})</span> : ''}</td>
                        <td style={td}>{maxMob > 0 && r.maoDeObra === maxMob ? '🏆 ' : ''}{fmtR(r.maoDeObra)}</td>
                        <td style={td}>{maxPec > 0 && pecas === maxPec ? '🏆 ' : ''}{fmtR(pecas)}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#3b82f6' }}>{fmtR(r.aPagar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>🏆 = quem mais fez mão de obra / mais vendeu peças na semana · (+n) = OS em andamento{inativos ? ` · ${inativos} inativo(s) não mostrado(s)` : ''}</div>
              </div>
            )}
          </div>
        )
      })()}

      {/* === CONFIRMAÇÃO COMISSÃO NOTINHA === */}
      {notinhaConfirm && (() => {
        const cc = notinhaConfirm.custoCalc
        const pctNum = Math.max(0, parseFloat(dashPctInput) || 0)
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
                <CampoPct chave="comissao_notinha" label="" value={dashPctInput} onChange={setDashPctInput} placeholder="Ex: 35" />
                <div style={{ fontSize:12, color:'var(--text-light)', lineHeight:1.4 }}>
                  = <strong style={{color:'var(--text-main)'}}>{fmt(cc * pctDec)}</strong> de comissão total
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button onClick={() => confirmarNotinha('split')} style={{ background:'rgba(59,130,246,0.1)', border:'2px solid #3b82f6', borderRadius:10, padding:'14px 16px', cursor:'pointer', textAlign:'left' }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#3b82f6', marginBottom:4 }}>
                    🏢 {(oficinaSplit*100).toFixed(1)}% Oficina + 👨 3% Pedro
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-light)' }}>
                    Oficina: <strong style={{color:'#3b82f6'}}>{fmt(cc * oficinaSplit)}</strong>
                    &nbsp;&nbsp;Pedro: <strong style={{color:'#d97706'}}>{fmt(cc * 0.03)}</strong>
                    &nbsp;&nbsp;Total: <strong>{fmt(cc * pctDec)}</strong>
                  </div>
                </button>
                <button onClick={() => confirmarNotinha('oficina')} style={{ background:'rgba(16,185,129,0.08)', border:'2px solid #10b981', borderRadius:10, padding:'14px 16px', cursor:'pointer', textAlign:'left' }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#10b981', marginBottom:4 }}>
                    🏢 {pctNum.toFixed(1)}% só para a Oficina
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-light)' }}>
                    Oficina: <strong style={{color:'#10b981'}}>{fmt(cc * pctDec)}</strong>
                    &nbsp;&nbsp;Pedro: <strong style={{color:'var(--text-light)'}}>R$ 0,00</strong>
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
