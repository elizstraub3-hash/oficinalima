import { useState, useEffect } from 'react'
import Login from './components/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import Caixa from './components/Caixa.jsx'
import Servicos from './components/Servicos.jsx'
import Funcionarios from './components/Funcionarios.jsx'
import Temporizadores from './components/Temporizadores.jsx'
import Gastos from './components/Gastos.jsx'
import Contas from './components/Contas.jsx'
import Clientes from './components/Clientes.jsx'
import OrdemServico from './components/OrdemServico.jsx'
import Notinhas from './components/Notinhas.jsx'

function seedData() {
  if (!localStorage.getItem('ol_seeded2')) {
    const now = Date.now()
    if (!localStorage.getItem('ol_servicos')) {
      localStorage.setItem('ol_servicos', JSON.stringify([
        { id: 1, nome: 'Troca de Óleo', descricao: 'Troca completa de óleo e filtro', preco: 80, tempo: 30 },
        { id: 2, nome: 'Alinhamento', descricao: 'Alinhamento e regulagem de direção', preco: 120, tempo: 60 },
        { id: 3, nome: 'Balanceamento', descricao: 'Balanceamento de todos os pneus', preco: 80, tempo: 45 },
        { id: 4, nome: 'Revisão Completa', descricao: 'Revisão geral do veículo', preco: 350, tempo: 180 },
      ]))
    }
    if (!localStorage.getItem('ol_funcionarios')) {
      localStorage.setItem('ol_funcionarios', JSON.stringify([
        { id: 1, nome: 'João Silva', cargo: 'Mecânico', telefone: '(11) 99999-1111', status: 'ativo' },
        { id: 2, nome: 'Carlos Oliveira', cargo: 'Mecânico', telefone: '(11) 99999-2222', status: 'ativo' },
        { id: 3, nome: 'Maria Santos', cargo: 'Atendente', telefone: '(11) 99999-3333', status: 'ativo' },
      ]))
    }
    if (!localStorage.getItem('ol_caixa')) {
      localStorage.setItem('ol_caixa', JSON.stringify([
        { id: 1, descricao: 'Troca de óleo - Fiat Uno', valor: 80, tipo: 'entrada', categoria: 'Serviço', data: new Date().toISOString().split('T')[0] },
        { id: 2, descricao: 'Compra de filtros de óleo', valor: 45, tipo: 'saida', categoria: 'Estoque', data: new Date().toISOString().split('T')[0] },
      ]))
    }
    if (!localStorage.getItem('ol_clientes')) {
      localStorage.setItem('ol_clientes', JSON.stringify([
        { id: 1, nome: 'Roberto Lima', telefone: '(11) 98888-1111', email: '', cpf: '' },
        { id: 2, nome: 'Ana Paula', telefone: '(11) 97777-2222', email: '', cpf: '' },
      ]))
    }
    if (!localStorage.getItem('ol_ordens')) {
      localStorage.setItem('ol_ordens', JSON.stringify([
        {
          id: 1, numero: 'OS-001',
          clienteNome: 'Roberto Lima', clienteTelefone: '(11) 98888-1111',
          placa: 'ABC-1234', modelo: 'Fiat Uno', ano: '2018', cor: 'Branco',
          servico: 'Revisão Completa', descricao: 'Revisão completa + troca de óleo',
          funcionario: 'João Silva', valor: 350,
          status: 'em_andamento', inicio: now - 3600000, fim: null,
          data: new Date().toISOString().split('T')[0],
        },
        {
          id: 2, numero: 'OS-002',
          clienteNome: 'Ana Paula', clienteTelefone: '(11) 97777-2222',
          placa: 'XYZ-5678', modelo: 'Honda Civic', ano: '2020', cor: 'Prata',
          servico: 'Alinhamento', descricao: 'Alinhamento e balanceamento',
          funcionario: 'Carlos Oliveira', valor: 120,
          status: 'aguardando', inicio: null, fim: null,
          data: new Date().toISOString().split('T')[0],
        },
      ]))
    }
    if (!localStorage.getItem('ol_gastos')) {
      localStorage.setItem('ol_gastos', JSON.stringify([
        { id: 1, descricao: 'Filtros de óleo', categoria: 'Peças', valor: 45, fornecedor: 'Auto Peças Brasil', data: new Date().toISOString().split('T')[0], nota: 'NF-001' },
        { id: 2, descricao: 'Abastecimento moto de serviço', categoria: 'Posto', valor: 80, fornecedor: 'Posto Shell', data: new Date().toISOString().split('T')[0], nota: '' },
        { id: 3, descricao: 'Material de limpeza', categoria: 'Mercado', valor: 35, fornecedor: 'Supermercado X', data: new Date().toISOString().split('T')[0], nota: '' },
      ]))
    }
    if (!localStorage.getItem('ol_contas')) {
      localStorage.setItem('ol_contas', JSON.stringify([
        { id: 1, descricao: 'Aluguel', valor: 2500, vencimento: 5, status: 'pendente', categoria: 'Fixo' },
        { id: 2, descricao: 'Energia Elétrica', valor: 380, vencimento: 10, status: 'pendente', categoria: 'Fixo' },
        { id: 3, descricao: 'Internet', valor: 120, vencimento: 15, status: 'pago', categoria: 'Fixo' },
        { id: 4, descricao: 'Água', valor: 90, vencimento: 20, status: 'pendente', categoria: 'Fixo' },
      ]))
    }
    localStorage.setItem('ol_seeded2', '1')
  }
}

function ThanksPopup({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 99999,
      background: '#052e16',
      border: '2px solid #22c55e',
      borderRadius: 14,
      padding: '24px 28px',
      maxWidth: 340,
      boxShadow: '0 0 30px rgba(34,197,94,0.35)',
      animation: 'fadeInUp 0.4s ease',
    }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
      <h2 style={{ color: '#4ade80', fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>
        Obrigada pelo pagamento!
      </h2>
      <p style={{ color: '#bbf7d0', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Seu sistema está ativo e atualizado.<br />
        Bom trabalho, equipe Lima Oficina! 🔧
      </p>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ol_auth') === '1')
  const [page, setPage] = useState('dashboard')
  const [showExpiry, setShowExpiry] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('ol_theme') || 'dark')

  useEffect(() => { seedData() }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ol_theme', theme)
  }, [theme])

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

  const diasAtraso = Math.floor((Date.now() - new Date('2026-06-30').getTime()) / 86400000)

  return (
    <div className="app-layout">
      {showExpiry && <ThanksPopup onClose={() => setShowExpiry(false)} />}
      {diasAtraso > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
          background: '#7f1d1d',
          borderTop: '2px solid #ef4444',
          padding: '6px 20px',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: '#fca5a5',
          letterSpacing: 0.5,
        }}>
          ⚠️ Pagamento em atraso — <span style={{ color: '#fff', fontSize: 15 }}>{diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'}</span> desde 30/06/2026
        </div>
      )}
      <Sidebar page={page} setPage={setPage} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
      <main className="main-content">
        {page === 'dashboard'     && <Dashboard setPage={setPage} />}
        {page === 'ordens'        && <OrdemServico setPage={setPage} />}
        {page === 'clientes'      && <Clientes />}
        {page === 'caixa'         && <Caixa />}
        {page === 'gastos'        && <Gastos />}
        {page === 'contas'        && <Contas />}
        {page === 'servicos'      && <Servicos />}
        {page === 'funcionarios'  && <Funcionarios />}
        {page === 'temporizadores'&& <Temporizadores />}
        {page === 'notinhas'      && <Notinhas />}
        <footer className="app-footer">
          Criado por <strong>Elizandra Cardoso</strong> · Lima Oficina Mecanica © {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  )
}
