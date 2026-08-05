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
import Estoque from './components/Estoque.jsx'
import { diasSemBackup } from './components/Sidebar.jsx'

function nextClienteId(arr) { return arr.length ? Math.max(...arr.map(x => x.id||0)) + 1 : 1 }

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
        { id: 1, descricao: 'Luz (Copel)',  valor: 0,    vencimento: 4,  status: 'pendente', categoria: 'Fixo' },
        { id: 2, descricao: 'Aluguel',      valor: 1200, vencimento: 20, status: 'pendente', categoria: 'Fixo' },
        { id: 3, descricao: 'Água',         valor: 0,    vencimento: 22, status: 'pendente', categoria: 'Fixo' },
        { id: 4, descricao: 'Sistema',      valor: 0,    vencimento: 30, status: 'pendente', categoria: 'Fixo' },
      ]))
    }
    // Cadastro do cliente Max e OS recuperada
    const clientes = JSON.parse(localStorage.getItem('ol_clientes') || '[]')
    if (!clientes.find(c => c.nome === 'Max')) {
      clientes.push({ id: nextClienteId(clientes), nome: 'Max', telefone: '41 9148-2990', email: '', cpf: '' })
      localStorage.setItem('ol_clientes', JSON.stringify(clientes))
    }
    const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
    if (!clientes.find(c => c.nome === 'Cezar')) {
      const cl2 = JSON.parse(localStorage.getItem('ol_clientes') || '[]')
      cl2.push({ id: nextClienteId(cl2), nome: 'Cezar', telefone: '', email: '', cpf: '' })
      localStorage.setItem('ol_clientes', JSON.stringify(cl2))
    }
    const ordens2 = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
    if (!ordens2.find(o => o.placa === 'CEJ6F00')) {
      const maxId2 = ordens2.reduce((m,o) => Math.max(m, o.id||0), 0)
      ordens2.push({
        id: maxId2+1, numero: 'OS-'+(maxId2+1),
        clienteNome: 'Cezar', clienteTelefone: '',
        placa: 'CEJ6F00', modelo: 'Uno Fire', ano: '', cor: 'Preto',
        servico: 'Montagem e Desmontagem do Cabeçote',
        descricao: 'Plaina no cabeçote + Junta + Correia + Interruptor do radiador — Peças: R$503,00 | Mão de Obra: R$1.100,00',
        funcionario: '', valor: 1603, maoDeObra: 1100,
        status: 'orcamento', inicio: null, fim: null,
        data: '2026-08-05', criadoEm: Date.now(),
        itens: [
          {desc:'PLAINA NO CABEÇOTE',qtd:1,un:'UN',valorUnit:250,total:250},
          {desc:'JUNTA DO CABEÇOTE',qtd:1,un:'UN',valorUnit:73,total:73},
          {desc:'CORREIA DENTADA',qtd:1,un:'UN',valorUnit:73,total:73},
          {desc:'INTERRUPTOR DO RADIADOR',qtd:1,un:'UN',valorUnit:107,total:107},
        ],
        servicos: [
          {desc:'MONTAGEM E DESMONTAGEM DO CABEÇOTE',maoDeObra:1100},
        ]
      })
      localStorage.setItem('ol_ordens', JSON.stringify(ordens2))
    }
    if (!ordens.find(o => o.placa === 'EDB1577')) {
      const maxId = ordens.reduce((m,o) => Math.max(m, o.id||0), 0)
      ordens.push({
        id: maxId+1, numero: 'OS-'+(maxId+1),
        clienteNome: 'Max', clienteTelefone: '41 9148-2990',
        placa: 'EDB1577', modelo: 'Corsa', ano: '2008', cor: '',
        servico: 'Motor Completo + Retifica',
        descricao: 'Motor Completo + Retifica — Peças: R$2.500,00 | Mão de Obra: R$4.900,00',
        funcionario: '', valor: 7400, maoDeObra: 4900,
        status: 'orcamento', inicio: null, fim: null,
        data: '2026-08-05', criadoEm: Date.now(),
        itens: [
          {desc:'BOMBA DE OLEO',qtd:1,un:'UN',valorUnit:242,total:242},
          {desc:'BRONZINA DE BIELA 0,25',qtd:1,un:'UN',valorUnit:84,total:84},
          {desc:'BRONZINA DE MANCAL 0,25',qtd:1,un:'UN',valorUnit:164,total:164},
          {desc:'ANEIS 0,50',qtd:1,un:'JG',valorUnit:373,total:373},
          {desc:'PISTÕES',qtd:4,un:'UN',valorUnit:134,total:536},
          {desc:'RETENTOR TRASEIRO',qtd:1,un:'UN',valorUnit:78,total:78},
          {desc:'RETENTOR COMANDO',qtd:1,un:'UN',valorUnit:33,total:33},
          {desc:'COLA DE SILICONE',qtd:1,un:'UN',valorUnit:38,total:38},
          {desc:'OLEO SEMISINTETICO 15W40',qtd:4,un:'UN',valorUnit:63,total:252},
          {desc:'FILTRO DE OLEO',qtd:1,un:'UN',valorUnit:18,total:18},
          {desc:'PERINHA DO OLEO',qtd:1,un:'UN',valorUnit:83,total:83},
          {desc:'PESCADOR',qtd:1,un:'UN',valorUnit:161,total:161},
          {desc:'SELO DO BLOCO',qtd:7,un:'UN',valorUnit:6,total:42},
          {desc:'JUNTA DO CABEÇOTE',qtd:1,un:'UN',valorUnit:141,total:141},
          {desc:'JUNTA DA TAMPA DE VALVULA',qtd:1,un:'UN',valorUnit:45,total:45},
          {desc:'JUNTA DO ESCAPAMENTO',qtd:1,un:'UN',valorUnit:35,total:35},
          {desc:'PARAFUSO DO CABEÇOTE',qtd:1,un:'UN',valorUnit:175,total:175},
        ],
        servicos: [
          {desc:'MOTOR COMPLETO',maoDeObra:3000},
          {desc:'RETIFICA',maoDeObra:1900},
        ]
      })
      localStorage.setItem('ol_ordens', JSON.stringify(ordens))
    }
    localStorage.setItem('ol_seeded2', '1')
  }
  // Corrige contas para os valores reais (roda sempre)
  localStorage.setItem('ol_contas', JSON.stringify([
    { id: 1, descricao: 'Luz (Copel)',  valor: 0,    vencimento: 4,  status: 'pendente', categoria: 'Fixo' },
    { id: 2, descricao: 'Internet',     valor: 0,    vencimento: 16, status: 'pendente', categoria: 'Fixo' },
    { id: 3, descricao: 'Aluguel',      valor: 1200, vencimento: 20, status: 'pendente', categoria: 'Fixo' },
    { id: 4, descricao: 'Água',         valor: 0,    vencimento: 22, status: 'pendente', categoria: 'Fixo' },
    { id: 5, descricao: 'Sistema',      valor: 0,    vencimento: 30, status: 'pendente', categoria: 'Fixo' },
  ]))
  // Funcionários: apenas Pedro Lima e Celio Lima
  {
    const _funcs = JSON.parse(localStorage.getItem('ol_funcionarios') || '[]')
    const _keep = _funcs.filter(f => f.nome === 'Pedro Lima' || f.nome === 'Celio Lima')
    let _changed = _keep.length !== _funcs.length
    if (!_keep.find(f => f.nome === 'Pedro Lima')) { _keep.push({ id: 1, nome: 'Pedro Lima', cargo: 'Mecânico', telefone: '', status: 'ativo' }); _changed = true }
    if (!_keep.find(f => f.nome === 'Celio Lima'))  { _keep.push({ id: 2, nome: 'Celio Lima',  cargo: 'Mecânico', telefone: '', status: 'ativo' }); _changed = true }
    if (_changed) localStorage.setItem('ol_funcionarios', JSON.stringify(_keep))
  }
  // Max OS recovery (runs always, guarded by placa)
  const _clMax = JSON.parse(localStorage.getItem('ol_clientes') || '[]')
  if (!_clMax.find(c => c.nome === 'Max')) {
    _clMax.push({ id: nextClienteId(_clMax), nome: 'Max', telefone: '41 9148-2990', email: '', cpf: '' })
    localStorage.setItem('ol_clientes', JSON.stringify(_clMax))
  }
  const _ordMax = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
  if (!_ordMax.find(o => o.placa === 'EDB1577')) {
    const _maxIdM = _ordMax.reduce((m,o) => Math.max(m, o.id||0), 0)
    _ordMax.push({
      id: _maxIdM+1, numero: 'OS-'+String(_maxIdM+1).padStart(3,'0'),
      clienteNome: 'Max', clienteTelefone: '41 9148-2990',
      placa: 'EDB1577', modelo: 'Corsa', ano: '2008', cor: '',
      servico: 'Motor Completo + Retifica',
      descricao: 'Motor Completo + Retifica — Peças: R$2.500,00 | Mão de Obra: R$4.900,00',
      funcionario: '', valor: 7400, maoDeObra: 4900,
      status: 'orcamento', inicio: null, fim: null,
      data: '2026-08-05', criadoEm: Date.now(),
      itens: [
        {desc:'BOMBA DE OLEO',qtd:1,un:'UN',valorUnit:242,total:242},
        {desc:'BRONZINA DE BIELA 0,25',qtd:1,un:'UN',valorUnit:84,total:84},
        {desc:'BRONZINA DE MANCAL 0,25',qtd:1,un:'UN',valorUnit:164,total:164},
        {desc:'ANEIS 0,50',qtd:1,un:'JG',valorUnit:373,total:373},
        {desc:'PISTÕES',qtd:4,un:'UN',valorUnit:134,total:536},
        {desc:'RETENTOR TRASEIRO',qtd:1,un:'UN',valorUnit:78,total:78},
        {desc:'RETENTOR COMANDO',qtd:1,un:'UN',valorUnit:33,total:33},
        {desc:'COLA DE SILICONE',qtd:1,un:'UN',valorUnit:38,total:38},
        {desc:'OLEO SEMISINTETICO 15W40',qtd:4,un:'UN',valorUnit:63,total:252},
        {desc:'FILTRO DE OLEO',qtd:1,un:'UN',valorUnit:18,total:18},
        {desc:'PERINHA DO OLEO',qtd:1,un:'UN',valorUnit:83,total:83},
        {desc:'PESCADOR',qtd:1,un:'UN',valorUnit:161,total:161},
        {desc:'SELO DO BLOCO',qtd:7,un:'UN',valorUnit:6,total:42},
        {desc:'JUNTA DO CABEÇOTE',qtd:1,un:'UN',valorUnit:141,total:141},
        {desc:'JUNTA DA TAMPA DE VALVULA',qtd:1,un:'UN',valorUnit:45,total:45},
        {desc:'JUNTA DO ESCAPAMENTO',qtd:1,un:'UN',valorUnit:35,total:35},
        {desc:'PARAFUSO DO CABEÇOTE',qtd:1,un:'UN',valorUnit:175,total:175},
      ],
      servicos: [
        {desc:'MOTOR COMPLETO',maoDeObra:3000},
        {desc:'RETIFICA',maoDeObra:1900},
      ]
    })
    localStorage.setItem('ol_ordens', JSON.stringify(_ordMax))
  }
  // Cezar OS recovery (runs always, guarded by placa)
  const _cl2x = JSON.parse(localStorage.getItem('ol_clientes') || '[]')
  if (!_cl2x.find(c => c.nome === 'Cezar')) {
    _cl2x.push({ id: nextClienteId(_cl2x), nome: 'Cezar', telefone: '', email: '', cpf: '' })
    localStorage.setItem('ol_clientes', JSON.stringify(_cl2x))
  }
  const _ord2x = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
  if (!_ord2x.find(o => o.placa === 'CEJ6F00')) {
    const _maxId2x = _ord2x.reduce((m,o) => Math.max(m, o.id||0), 0)
    _ord2x.push({
      id: _maxId2x+1, numero: 'OS-'+String(_maxId2x+1).padStart(3,'0'),
      clienteNome: 'Cezar', clienteTelefone: '',
      placa: 'CEJ6F00', modelo: 'Uno Fire', ano: '', cor: 'Preto',
      servico: 'Montagem e Desmontagem do Cabeçote',
      descricao: 'Plaina no cabeçote + Junta + Correia + Interruptor do radiador — Peças: R$503,00 | Mão de Obra: R$1.100,00',
      funcionario: '', valor: 1603, maoDeObra: 1100,
      status: 'orcamento', inicio: null, fim: null,
      data: '2026-08-05', criadoEm: Date.now(),
      itens: [
        {desc:'PLAINA NO CABEÇOTE',qtd:1,un:'UN',valorUnit:250,total:250},
        {desc:'JUNTA DO CABEÇOTE',qtd:1,un:'UN',valorUnit:73,total:73},
        {desc:'CORREIA DENTADA',qtd:1,un:'UN',valorUnit:73,total:73},
        {desc:'INTERRUPTOR DO RADIADOR',qtd:1,un:'UN',valorUnit:107,total:107},
      ],
      servicos: [
        {desc:'MONTAGEM E DESMONTAGEM DO CABEÇOTE',maoDeObra:1100},
      ]
    })
    localStorage.setItem('ol_ordens', JSON.stringify(_ord2x))
  }
  // Moises OS - Fiesta MHW1C36 (OS unificada, guarded by valor)
  {
    const _cl3 = JSON.parse(localStorage.getItem('ol_clientes') || '[]')
    if (!_cl3.find(c => c.nome === 'Moises')) {
      _cl3.push({ id: nextClienteId(_cl3), nome: 'Moises', telefone: '', email: '', cpf: '' })
      localStorage.setItem('ol_clientes', JSON.stringify(_cl3))
    }
    // Remove OS antigas separadas se existirem
    let _ord3 = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
    const _temAntiga2872 = _ord3.find(o => o.placa === 'MHW1C36' && o.valor === 2872)
    const _temAntiga1919 = _ord3.find(o => o.placa === 'MHW1C36' && o.valor === 1919)
    const _temUnificada  = _ord3.find(o => o.placa === 'MHW1C36' && o.valor === 4791)
    if (!_temUnificada) {
      _ord3 = _ord3.filter(o => !(o.placa === 'MHW1C36' && (o.valor === 2872 || o.valor === 1919)))
      const _maxId3 = _ord3.reduce((m,o) => Math.max(m, o.id||0), 0)
      _ord3.push({
        id: _maxId3+1, numero: 'OS-'+String(_maxId3+1).padStart(3,'0'),
        clienteNome: 'Moises', clienteTelefone: '',
        placa: 'MHW1C36', modelo: 'Fiesta 1.6', ano: '2010', cor: 'Preto',
        servico: 'Caixa de Direção + Kit Tucho + Homocinética',
        descricao: 'Peças: R$3.576,00 | Mão de Obra: R$1.215,00',
        funcionario: '', valor: 4791, maoDeObra: 1215,
        status: 'orcamento', inicio: null, fim: null,
        data: '2026-08-05', criadoEm: Date.now(),
        itens: [
          {desc:'CAIXA DE DIREÇÃO NOVA',qtd:1,un:'UN',valorUnit:2268,total:2268},
          {desc:'OLEO DE DIREÇÃO',qtd:2,un:'UN',valorUnit:42,total:84},
          {desc:'ALINHAMENTO',qtd:1,un:'UN',valorUnit:120,total:120},
          {desc:'KIT TUCHO',qtd:1,un:'JG',valorUnit:241,total:241},
          {desc:'COMANDO DE VALVULA',qtd:1,un:'UN',valorUnit:377,total:377},
          {desc:'JUNTA DA TAMPA DE VALVULA',qtd:1,un:'UN',valorUnit:80,total:80},
          {desc:'HOMOCINETICA',qtd:2,un:'UN',valorUnit:203,total:406},
        ],
        servicos: [
          {desc:'TROCA DA CAIXA DE DIREÇÃO',maoDeObra:400},
          {desc:'TROCA DA HOMOCINETICA',maoDeObra:180},
          {desc:'TROCA DO KIT TUCHO E COMANDO DE VALVULA',maoDeObra:500},
          {desc:'MADRILHAMENTO DO CABEÇOTE',maoDeObra:135},
        ]
      })
      localStorage.setItem('ol_ordens', JSON.stringify(_ord3))
    }
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

  const totalOrdens = JSON.parse(localStorage.getItem('ol_ordens') || '[]').length
  const precisaBackup = totalOrdens >= 20 && !backupDismissed

  return (
    <div className="app-layout">
      {precisaBackup && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 9000,
          background: '#78350f',
          borderBottom: '2px solid #f59e0b',
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
            ⚠️ Você já tem <strong style={{ fontSize: 16 }}>{totalOrdens} ordens de serviço</strong> salvas. Faça um backup para não perder os dados!
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
        {page === 'estoque'       && <Estoque />}
        <footer className="app-footer">
          Criado por <strong>Elizandra Cardoso</strong> · Lima Oficina Mecanica © {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  )
}
