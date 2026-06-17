import { useState, useEffect } from 'react'
import './Dashboard.css'

export default function Dashboard({ setPage }) {
  const [stats, setStats] = useState({ receita: 0, servicos: 0, funcionarios: 0, carros: 0 })

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const caixa = JSON.parse(localStorage.getItem('ol_caixa') || '[]')
    const receita = caixa
      .filter(e => e.tipo === 'entrada' && e.data === today)
      .reduce((s, e) => s + Number(e.valor), 0)
    const funcionarios = JSON.parse(localStorage.getItem('ol_funcionarios') || '[]')
      .filter(f => f.status === 'ativo').length
    const timers = JSON.parse(localStorage.getItem('ol_timers') || '[]')
      .filter(t => t.status === 'ativo').length
    const servicos = JSON.parse(localStorage.getItem('ol_servicos') || '[]').length
    setStats({ receita, servicos, funcionarios, carros: timers })
  }, [])

  const cards = [
    { label: 'Receita Hoje', value: `R$ ${stats.receita.toFixed(2).replace('.', ',')}`, icon: '💰', color: '#10b981', page: 'caixa' },
    { label: 'Serviços Cadastrados', value: stats.servicos, icon: '🔧', color: '#3b82f6', page: 'servicos' },
    { label: 'Funcionários Ativos', value: stats.funcionarios, icon: '👷', color: '#8b5cf6', page: 'funcionarios' },
    { label: 'Carros em Atendimento', value: stats.carros, icon: '🚗', color: '#e63946', page: 'temporizadores' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className="dash-date">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div className="dash-cards">
        {cards.map((c, i) => (
          <button key={i} className="dash-card" onClick={() => setPage(c.page)} style={{ '--accent': c.color }}>
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
          <h3>💡 Acesso Rápido</h3>
          <p>Use o menu lateral para navegar entre os módulos do painel.</p>
          <ul>
            <li>💰 <strong>Caixa</strong> – Controle financeiro de entradas e saídas</li>
            <li>🔧 <strong>Serviços</strong> – Cadastro e gestão de serviços</li>
            <li>👷 <strong>Funcionários</strong> – Gerenciar equipe</li>
            <li>⏱️ <strong>Temporizadores</strong> – Acompanhar carros em serviço</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
