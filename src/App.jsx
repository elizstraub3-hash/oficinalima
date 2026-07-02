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

function ExpiryPopup({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#1a0000',
        border: '3px solid #ff0000',
        borderRadius: 16,
        maxWidth: 520,
        width: '100%',
        padding: '40px 36px',
        textAlign: 'center',
        boxShadow: '0 0 60px rgba(255,0,0,0.5), 0 0 20px rgba(255,0,0,0.3)',
        animation: 'expiry-pulse 1.5s ease-in-out infinite',
      }}>
        <style>{`
          @keyframes expiry-pulse {
            0%, 100% { box-shadow: 0 0 60px rgba(255,0,0,0.5), 0 0 20px rgba(255,0,0,0.3); }
            50% { box-shadow: 0 0 90px rgba(255,0,0,0.9), 0 0 40px rgba(255,0,0,0.6); }
          }
        `}</style>

        <div style={{ fontSize: 64, marginBottom: 8 }}>🚨</div>
        <h1 style={{ color: '#ff2222', fontSize: 28, fontWeight: 900, margin: '0 0 8px', letterSpacing: 1 }}>
          SISTEMA VENCIDO
        </h1>
        <div style={{ color: '#ff6666', fontSize: 15, fontWeight: 700, marginBottom: 24, letterSpacing: 2 }}>
          VENCEU EM 30/06/2026
        </div>

        <p style={{ color: '#f0f0f0', fontSize: 15, lineHeight: 1.7, margin: '0 0 24px' }}>
          O acesso ao sistema <strong>Lima Oficina Mecânica</strong> está <strong style={{ color: '#ff4444' }}>vencido</strong>.<br />
          As funcionalidades serão <strong style={{ color: '#ff4444' }}>desativadas</strong> até a renovação do plano.
        </p>

        <div style={{
          background: '#2a0000',
          border: '1px solid #ff3333',
          borderRadius: 10,
          padding: '18px 20px',
          marginBottom: 24,
          textAlign: 'left',
        }}>
          <div style={{ color: '#ff9999', fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            💳 Renove agora via PIX
          </div>
          <div style={{ color: '#f0f0f0', fontSize: 14, lineHeight: 2 }}>
            <div><strong style={{ color: '#aaa' }}>Chave PIX:</strong> <strong style={{ color: '#fff', fontFamily: 'monospace', fontSize: 16 }}>10595735983</strong></div>
            <div><strong style={{ color: '#aaa' }}>Beneficiária:</strong> Elizandra Cardoso de Lima</div>
            <div><strong style={{ color: '#aaa' }}>Plano Mensal:</strong> <strong style={{ color: '#4ade80' }}>R$ 60,00</strong></div>
            <div><strong style={{ color: '#aaa' }}>Plano Anual (5% desc):</strong> <strong style={{ color: '#4ade80' }}>R$ 57,00/mês</strong></div>
          </div>
        </div>

        <p style={{ color: '#ff9999', fontSize: 13 }}>
          Após o pagamento, envie o comprovante para reativar o acesso imediatamente.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ol_auth') === '1')
  const [page, setPage] = useState('dashboard')
  const [showExpiry, setShowExpiry] = useState(true)

  useEffect(() => { seedData() }, [])

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
      {showExpiry && <ExpiryPopup onClose={() => setShowExpiry(false)} />}
      <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
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
        <footer className="app-footer">
          Criado por <strong>Elizandra Cardoso</strong> · Lima Oficina Mecanica © {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  )
}
