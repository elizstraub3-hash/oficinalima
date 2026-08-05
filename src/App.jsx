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
import { diasSemBackup } from './components/Sidebar.jsx'

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

function OverduePopup() {
  const dias = Math.floor((Date.now() - new Date('2026-07-30').getTime()) / 86400000)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-8px); }
          40%,80% { transform: translateX(8px); }
        }
        @keyframes blink-border {
          0%,100% { border-color: #ff0000; box-shadow: 0 0 40px rgba(255,0,0,0.5); }
          50%      { border-color: #ff6600; box-shadow: 0 0 80px rgba(255,100,0,0.8); }
        }
      `}</style>
      <div style={{
        background: '#0d0000',
        border: '3px solid #ff0000',
        borderRadius: 16,
        maxWidth: 500,
        width: '100%',
        padding: '40px 32px',
        textAlign: 'center',
        animation: 'blink-border 1.2s ease-in-out infinite',
      }}>
        <div style={{ fontSize: 60, marginBottom: 12, animation: 'shake 0.6s ease-in-out infinite' }}>🚨</div>

        <h1 style={{ color: '#ff2222', fontSize: 26, fontWeight: 900, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Pagamento em Atraso!
        </h1>

        <div style={{
          background: '#1a0000', border: '1px solid #ff3333', borderRadius: 10,
          padding: '16px 20px', margin: '20px 0', display: 'inline-block', width: '100%',
        }}>
          <div style={{ color: '#ff9999', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Dias sem pagamento</div>
          <div style={{ color: '#ff2222', fontSize: 56, fontWeight: 900, lineHeight: 1 }}>{dias}</div>
          <div style={{ color: '#ff6666', fontSize: 13, marginTop: 4 }}>desde 30/07/2026</div>
        </div>

        <p style={{ color: '#f0f0f0', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
          O sistema <strong>Lima Oficina Mecânica</strong> está com pagamento em atraso.<br />
          As funcionalidades serão <strong style={{ color: '#ff4444' }}>suspensas</strong> a qualquer momento.
        </p>

        <div style={{
          background: '#1a0800', border: '1px solid #ff6600', borderRadius: 10,
          padding: '16px 20px', textAlign: 'left', marginBottom: 20,
        }}>
          <div style={{ color: '#ffaa66', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            💳 Regularize agora via PIX
          </div>
          <div style={{ color: '#f0f0f0', fontSize: 14, lineHeight: 2 }}>
            <div><strong style={{ color: '#aaa' }}>Chave PIX:</strong> <strong style={{ color: '#fff', fontFamily: 'monospace', fontSize: 16 }}>10595735983</strong></div>
            <div><strong style={{ color: '#aaa' }}>Beneficiária:</strong> Elizandra Cardoso de Lima</div>
            <div><strong style={{ color: '#aaa' }}>Valor:</strong> <strong style={{ color: '#4ade80', fontSize: 18 }}>R$ 60,00 / mês</strong></div>
          </div>
        </div>

        <p style={{ color: '#ff9999', fontSize: 12, margin: 0 }}>
          Após o pagamento, envie o comprovante para reativar o acesso.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ol_auth') === '1')
  const [page, setPage] = useState('dashboard')
  const [showExpiry, setShowExpiry] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('ol_theme') || 'dark')
  const [backupDismissed, setBackupDismissed] = useState(false)

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

  const dias = diasSemBackup()
  const precisaBackup = dias >= 3 && !backupDismissed

  return (
    <div className="app-layout">
      {precisaBackup && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 9000,
          background: dias >= 7 ? '#7c2d12' : '#78350f',
          borderBottom: `2px solid ${dias >= 7 ? '#ef4444' : '#f59e0b'}`,
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
            {dias >= 7 ? '🚨' : '⚠️'} Leandra, faz <strong style={{ fontSize: 16 }}>{dias === 999 ? 'nunca' : `${dias} dias`}</strong> que não é feito backup dos dados!
            {dias >= 7 ? ' Faça AGORA para não perder os orçamentos!' : ' Faça o backup para proteger seus dados.'}
          </span>
          <button
            onClick={() => { document.getElementById('btn-export-backup').click(); setBackupDismissed(true) }}
            style={{ background: '#fff', color: '#7c2d12', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ⬇️ Fazer Backup Agora
          </button>
          <button onClick={() => setBackupDismissed(true)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
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
