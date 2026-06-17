import { useState, useEffect } from 'react'
import './Dashboard.css'

export default function Dashboard({ setPage }) {
  const [stats, setStats] = useState({ receita: 0, gastos: 0, ordens: 0, contasPendentes: 0, clientes: 0, carros: 0 })

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
  }, [])

  const fmt = v => `R$ ${v.toFixed(2).replace('.', ',')}`

  const cards = [
    { label: 'Receita Hoje', value: fmt(stats.receita), icon: '💰', color: '#10b981', page: 'caixa' },
    { label: 'Gastos Hoje', value: fmt(stats.gastos), icon: '🧾', color: '#f59e0b', page: 'gastos' },
    { label: 'OS em Andamento', value: stats.ordens, icon: '📋', color: '#3b82f6', page: 'ordens' },
    { label: 'Contas a Pagar', value: fmt(stats.contasPendentes), icon: '📄', color: '#e63946', page: 'contas' },
    { label: 'Clientes Cadastrados', value: stats.clientes, icon: '👤', color: '#8b5cf6', page: 'clientes' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className="dash-date">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
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
      <div className="dash-bottom">
        <div className="card dash-tip">
          <h3>💡 Módulos do Sistema</h3>
          <ul>
            <li>📋 <strong>Ordens de Serviço</strong> – OS com dados do cliente, veículo, status e cronômetro</li>
            <li>👤 <strong>Clientes</strong> – Cadastro salvo com histórico</li>
            <li>💰 <strong>Caixa</strong> – Controle de entradas e saídas</li>
            <li>🧾 <strong>Planilha de Gastos</strong> – Notinhas de peças, posto, mercado...</li>
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
