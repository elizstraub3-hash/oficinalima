import { useState, useEffect } from 'react'
import Login from './components/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import Caixa from './components/Caixa.jsx'
import Servicos from './components/Servicos.jsx'
import Funcionarios from './components/Funcionarios.jsx'
import Temporizadores from './components/Temporizadores.jsx'

function seedData() {
  if (!localStorage.getItem('ol_seeded')) {
    localStorage.setItem('ol_servicos', JSON.stringify([
      { id: 1, nome: 'Troca de Óleo', descricao: 'Troca completa de óleo e filtro', preco: 80, tempo: 30 },
      { id: 2, nome: 'Alinhamento', descricao: 'Alinhamento e regulagem de direção', preco: 120, tempo: 60 },
      { id: 3, nome: 'Balanceamento', descricao: 'Balanceamento de todos os pneus', preco: 80, tempo: 45 },
      { id: 4, nome: 'Revisão Completa', descricao: 'Revisão geral do veículo', preco: 350, tempo: 180 },
    ]))
    localStorage.setItem('ol_funcionarios', JSON.stringify([
      { id: 1, nome: 'João Silva', cargo: 'Mecânico', telefone: '(11) 99999-1111', status: 'ativo' },
      { id: 2, nome: 'Carlos Oliveira', cargo: 'Mecânico', telefone: '(11) 99999-2222', status: 'ativo' },
      { id: 3, nome: 'Maria Santos', cargo: 'Atendente', telefone: '(11) 99999-3333', status: 'ativo' },
    ]))
    const now = Date.now()
    localStorage.setItem('ol_caixa', JSON.stringify([
      { id: 1, descricao: 'Troca de óleo - Fiat Uno', valor: 80, tipo: 'entrada', categoria: 'Serviço', data: new Date().toISOString().split('T')[0] },
      { id: 2, descricao: 'Compra de filtros de óleo', valor: 45, tipo: 'saida', categoria: 'Estoque', data: new Date().toISOString().split('T')[0] },
      { id: 3, nome: 'Alinhamento - Honda Civic', valor: 120, tipo: 'entrada', categoria: 'Serviço', data: new Date().toISOString().split('T')[0] },
    ]))
    localStorage.setItem('ol_timers', JSON.stringify([
      { id: 1, placa: 'ABC-1234', proprietario: 'Roberto Lima', servico: 'Revisão Completa', funcionario: 'João Silva', inicio: now - 3600000, status: 'ativo' },
      { id: 2, placa: 'XYZ-5678', proprietario: 'Ana Paula', servico: 'Alinhamento', funcionario: 'Carlos Oliveira', inicio: now - 1800000, status: 'ativo' },
    ]))
    localStorage.setItem('ol_timers_hist', JSON.stringify([
      { id: 99, placa: 'DEF-9999', proprietario: 'Paulo Mendes', servico: 'Troca de Óleo', funcionario: 'João Silva', inicio: now - 7200000, fim: now - 5400000, total: 1800000 },
    ]))
    localStorage.setItem('ol_seeded', '1')
  }
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ol_auth') === '1')
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    seedData()
  }, [])

  function handleLogin() {
    sessionStorage.setItem('ol_auth', '1')
    setAuthed(true)
  }

  function handleLogout() {
    sessionStorage.removeItem('ol_auth')
    setAuthed(false)
    setPage('dashboard')
  }

  if (!authed) return <Login onLogin={handleLogin} />

  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
      <main className="main-content">
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'caixa' && <Caixa />}
        {page === 'servicos' && <Servicos />}
        {page === 'funcionarios' && <Funcionarios />}
        {page === 'temporizadores' && <Temporizadores />}
        <footer className="app-footer">
          Criado por <strong>Elizandra Cardoso</strong> · Oficina Lima © {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  )
}
