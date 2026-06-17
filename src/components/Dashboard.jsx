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
  if (minutos >= 690 && minutos < 780) return true  // 11:30 às 13:00
  return false
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

const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

export default function Dashboard({ setPage }) {
  const [stats, setStats] = useState({ receita: 0, gastos: 0, ordens: 0, contasPendentes: 0, clientes: 0 })
  const [pecas, setPecas] = useState([])
  const [totalComissao, setTotalComissao] = useState(0)
  const [agora, setAgora] = useState(new Date())
  const saudacao = getSaudacao()
  const almoco = getAvisoAlmoco()

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60000)
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

    // notinhas de peças com comissão
    const todasPecas = gastosArr.filter(g => g.categoria === 'Peças').sort((a, b) => b.id - a.id).slice(0, 10)
    setPecas(todasPecas)
    const comTotal = gastosArr.filter(g => g.categoria === 'Peças' && g.comissao).reduce((s, g) => s + Number(g.comissao), 0)
    setTotalComissao(comTotal)
  }, [])

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
      {almoco && (
        <div className="dash-almoco">
          <span className="dash-almoco-icon">🍽️</span>
          <div>
            <strong>Leandra, está na hora da pausa para o almoço!</strong>
            <p>Você merece descansar — tire sua hora de almoço tranquila. Volte renovada! ☕😊</p>
          </div>
          <span className="dash-almoco-icon">⏰</span>
        </div>
      )}

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
        {/* === NOTINHAS DE PEÇAS + COMISSÃO === */}
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

        {/* === DICA === */}
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
