import { useState } from 'react'
import './Sidebar.css'

const MENU = [
  { id: 'dashboard',      label: 'Dashboard',       icon: '📊' },
  { separator: true, label: 'ATENDIMENTO' },
  { id: 'ordens',         label: 'Ordens de Serviço', icon: '📋' },
  { id: 'clientes',       label: 'Clientes',         icon: '👤' },
  { id: 'temporizadores', label: 'Temporizadores',   icon: '⏱️' },
  { separator: true, label: 'FINANCEIRO' },
  { id: 'caixa',          label: 'Caixa',            icon: '💰' },
  { id: 'gastos',         label: 'Planilha de Gastos', icon: '🧾' },
  { id: 'contas',         label: 'Contas da Oficina', icon: '📄' },
  { separator: true, label: 'CADASTROS' },
  { id: 'servicos',       label: 'Serviços',         icon: '🔧' },
  { id: 'funcionarios',   label: 'Funcionários',     icon: '👷' },
]

function exportData() {
  const keys = ['ol_servicos','ol_funcionarios','ol_caixa','ol_timers','ol_timers_hist','ol_clientes','ol_ordens','ol_gastos','ol_contas']
  const data = {}
  keys.forEach(k => { data[k] = JSON.parse(localStorage.getItem(k) || '[]') })
  data._exportedAt = new Date().toISOString()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `oficinalima_backup_${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importData(file) {
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result)
      const keys = ['ol_servicos','ol_funcionarios','ol_caixa','ol_timers','ol_timers_hist','ol_clientes','ol_ordens','ol_gastos','ol_contas']
      keys.forEach(k => { if (data[k]) localStorage.setItem(k, JSON.stringify(data[k])) })
      alert('✅ Dados importados com sucesso! A página será recarregada.')
      window.location.reload()
    } catch {
      alert('❌ Arquivo inválido. Certifique-se de importar um backup da Lima Oficina Mecanica.')
    }
  }
  reader.readAsText(file)
}

export default function Sidebar({ page, setPage, onLogout }) {
  const [open, setOpen] = useState(false)

  function handleImport(e) {
    const file = e.target.files[0]
    if (file) importData(file)
    e.target.value = ''
  }

  function navigate(id) {
    setPage(id)
    setOpen(false)
  }

  return (
    <>
      {/* Botão hamburguer — só aparece no mobile */}
      <button className="sidebar-toggle" onClick={() => setOpen(o => !o)} aria-label="Menu">
        <span className="sidebar-toggle-icon">{open ? '✕' : '☰'}</span>
        <span className="sidebar-toggle-label">Lima Oficina</span>
      </button>

      {/* Overlay escuro no mobile quando menu aberto */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-img-wrap">
            <img
              src="/logo da oficina.png"
              alt="Logo"
              className="sidebar-logo-img"
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }}
            />
            <span className="sidebar-logo-icon" style={{ display: 'none' }}>🔧</span>
          </div>
          <div>
            <strong>Lima Oficina Mecanica</strong>
            <small>Painel Admin</small>
            <div className="sidebar-phone">📞 (41) 9 9595-5516</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {MENU.map((item, i) =>
            item.separator ? (
              <div key={i} className="nav-separator">{item.label}</div>
            ) : (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          )}
        </nav>

        <div className="sidebar-io">
          <button className="io-btn" onClick={exportData} title="Exportar todos os dados">
            ⬇️ Exportar dados
          </button>
          <label className="io-btn import-label" title="Importar backup">
            ⬆️ Importar dados
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>
    </>
  )
}
