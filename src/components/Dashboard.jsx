import { useState, useEffect } from 'react'
import './Dashboard.css'

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

function getFraseMotivacional() {
  const frases = [
    'Cada cliente satisfeito é um anúncio gratuito! 🚗',
    'Qualidade não é um ato, é um hábito. 🔧',
    'Hoje é um ótimo dia para fazer a diferença! ✨',
    'Uma equipe unida constrói grandes resultados! 💪',
    'Cada desafio é uma oportunidade disfarçada. 🌟',
    'Confie no seu trabalho — ele fala por você! 🏆',
  ]
  return frases[new Date().getDay() % frases.length]
}

const CHECKLIST_KEY = 'ol_checklist_'
const ITEMS_FIXOS = [
  { id: 'abrir', label: 'Abrir a oficina 🔑', icon: '🔑' },
  { id: 'cafe', label: 'Tomar café ☕', icon: '☕' },
  { id: 'escritorio', label: 'Arrumar o escritório 🗂️', icon: '🗂️' },
  { id: 'pecas', label: 'Verificar peças para pedir 🔩', icon: '🔩' },
  { id: 'contas', label: 'Verificar contas a pagar 💳', icon: '💳' },
  { id: 'orcamentos', label: 'Conferir orçamentos com os mecânicos 📋', icon: '📋' },
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
  const saudacao = getSaudacao()

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
    { label: 'Receita Hoje', value: fmt(stats.receita), icon: '💰', color: '#10b981', page: 'caixa' },
    { label: 'Gastos Hoje', value: fmt(stats.gastos), icon: '🧾', color: '#f59e0b', page: 'gastos' },
    { label: 'OS Em Andamento', value: stats.ordens, icon: '📋', color: '#3b82f6', page: 'ordens' },
    { label: 'Contas a Pagar', value: fmt(stats.contasPendentes), icon: '📄', color: '#e63946', page: 'contas' },
    { label: 'Clientes Cadastrados', value: stats.clientes, icon: '👤', color: '#8b5cf6', page: 'clientes' },
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
            </p>
            <p className="dash-frase">{getFraseMotivacional()}</p>
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
              <li key={item.id} className={`dash-check-item ${done ? 'done' : ''}`} onClick={() => toggleCheck(item.id)}>
                <span className={`dash-checkbox ${done ? 'checked' : ''}`}>
                  {done ? '✔' : ''}
                </span>
                <span className="dash-check-label">{item.label}</span>
                {!done && <span className="dash-check-pending">Pendente</span>}
              </li>
            )
          })}
        </ul>
      </div>

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

      <div className="dash-bottom-grid">
        {/* === NOTINHAS DE PEÇAS === */}
        <div className="card dash-pecas">
          <div className="dash-pecas-header">
            <h3>🔩 Notinhas de Peças</h3>
            <button className="btn-link" onClick={() => setPage('gastos')}>Ver todas →</button>
          </div>

          <div className="dash-comissao-total">
            <span>💜 Total de Comissões:</span>
            <strong>{fmt(totalComissao)}</strong>
          </div>

          {pecas.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-icon" style={{ fontSize: 32 }}>🔩</div>
              <p>Nenhuma peça registrada ainda.</p>
            </div>
          ) : (
            <table className="pecas-table">
              <thead>
                <tr>
                  <th>Peça / Descrição</th>
                  <th>Fornecedor</th>
                  <th>Valor</th>
                  <th>Comissão</th>
                </tr>
              </thead>
              <tbody>
                {pecas.map(g => (
                  <tr key={g.id}>
                    <td>
                      <strong>{g.descricao}</strong>
                      {g.descBreve && <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{g.descBreve}</div>}
                    </td>
                    <td style={{ color: 'var(--text-light)', fontSize: 13 }}>{g.fornecedor || '—'}</td>
                    <td><strong style={{ color: '#ef4444' }}>{fmt(g.valor)}</strong></td>
                    <td>
                      {g.comissao
                        ? <span className="comissao-badge">{fmt(g.comissao)}</span>
                        : <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* === MÓDULOS === */}
        <div className="dash-tip card">
          <h3>📌 Módulos do Sistema</h3>
          <ul>
            <li>📋 <strong>Ordens de Serviço</strong> – OS com dados do cliente, veículo, status e cronômetro</li>
            <li>👤 <strong>Clientes</strong> – Cadastro salvo com histórico</li>
            <li>💰 <strong>Caixa</strong> – Controle de entradas e saídas</li>
            <li>🧾 <strong>Planilha de Gastos</strong> – Notinhas com comissão por peça</li>
            <li>📄 <strong>Contas da Oficina</strong> – Aluguel, luz, água e outras contas</li>
            <li>🔧 <strong>Serviços</strong> – Tabela de preços</li>
            <li>👷 <strong>Funcionários</strong> – Equipe da oficina</li>
            <li>⬇️⬆️ <strong>Exportar / Importar</strong> – Backup completo no menu lateral</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
