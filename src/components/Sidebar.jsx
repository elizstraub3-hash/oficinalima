import { useState, useRef, useEffect } from 'react'
import './Sidebar.css'

const MENU = [
  { id: 'dashboard',      label: 'Dashboard',         icon: '📊' },
  { separator: true, label: 'ATENDIMENTO' },
  { id: 'ordens',         label: 'Ordens de Serviço', icon: '📋' },
  { id: 'clientes',       label: 'Clientes',           icon: '👤' },
  { id: 'temporizadores', label: 'Temporizadores',     icon: '⏱️' },
  { separator: true, label: 'FINANCEIRO' },
  { id: 'caixa',          label: 'Caixa',              icon: '💰' },
  { id: 'gastos',         label: 'Planilha de Gastos', icon: '🧾' },
  { id: 'contas',         label: 'Contas da Oficina',  icon: '📄' },
  { id: 'notinhas', label: 'Notinhas de Peças', icon: '🔩' },
  { separator: true, label: 'CADASTROS' },
  { id: 'servicos',       label: 'Serviços',           icon: '🔧' },
  { id: 'funcionarios',   label: 'Funcionários',       icon: '👷' },
]

function exportData() {
  const keys = ['ol_servicos','ol_funcionarios','ol_caixa','ol_timers','ol_timers_hist','ol_clientes','ol_ordens','ol_gastos','ol_contas','ol_notinhas','ol_timer_alertas']
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
  localStorage.setItem('ol_ultimo_backup', new Date().toISOString())
}

export function diasSemBackup() {
  const ultimo = localStorage.getItem('ol_ultimo_backup')
  if (!ultimo) return 999
  return Math.floor((Date.now() - new Date(ultimo).getTime()) / 86400000)
}

function importData(file) {
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result)
      const keys = ['ol_servicos','ol_funcionarios','ol_caixa','ol_timers','ol_timers_hist','ol_clientes','ol_ordens','ol_gastos','ol_contas','ol_notinhas','ol_timer_alertas']
      keys.forEach(k => { if (data[k]) localStorage.setItem(k, JSON.stringify(data[k])) })
      alert('✅ Dados importados com sucesso! A página será recarregada.')
      window.location.reload()
    } catch {
      alert('❌ Arquivo inválido. Certifique-se de importar um backup da Lima Oficina Mecanica.')
    }
  }
  reader.readAsText(file)
}

const PAGE_LABEL = Object.fromEntries(MENU.filter(m => m.id).map(m => [m.id, `${m.icon} ${m.label}`]))

export default function Sidebar({ page, setPage, onLogout, theme, setTheme }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function navigate(id) { setPage(id); setOpen(false) }

  function handleImport(e) {
    const file = e.target.files[0]
    if (file) importData(file)
    e.target.value = ''
  }

  return (
    <header className="topbar" ref={ref}>
      {/* Logo + nome */}
      <div className="topbar-brand">
        <div className="topbar-logo-wrap">
          <img src="/logo da oficina.png" alt="Logo" className="topbar-logo-img"
            onError={e => { e.target.style.display='none' }} />
        </div>
        <div className="topbar-brand-text">
          <strong>Lima Oficina Mecanica</strong>
          <small>📞 (41) 9 9595-5516</small>
        </div>
      </div>

      {/* Página atual (centro) */}
      <div className="topbar-current">{PAGE_LABEL[page] || '📊 Dashboard'}</div>

      {/* Botão de tema */}
      <button
        className="topbar-theme-btn"
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
      >
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>

      {/* Dropdown menu */}
      <div className="topbar-right">
        <button className="topbar-menu-btn" onClick={() => setOpen(o => !o)}>
          {open ? '✕ Fechar' : '☰ Menu'}
        </button>

        {open && (
          <div className="topbar-dropdown">
            <nav className="td-nav">
              {MENU.map((item, i) =>
                item.separator ? (
                  <div key={i} className="td-separator">{item.label}</div>
                ) : (
                  <button
                    key={item.id}
                    className={`td-item ${page === item.id ? 'active' : ''}`}
                    onClick={() => navigate(item.id)}
                  >
                    <span className="td-icon">{item.icon}</span>
                    {item.label}
                  </button>
                )
              )}
            </nav>
            <div className="td-footer">
              <button id="btn-export-backup" className="td-io-btn" onClick={() => { exportData(); setOpen(false) }}>⬇️ Exportar dados</button>
              <label className="td-io-btn">
                ⬆️ Importar dados
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
              <button className="td-logout" onClick={onLogout}>🚪 Sair</button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
