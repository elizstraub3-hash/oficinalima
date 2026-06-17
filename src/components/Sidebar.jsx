import './Sidebar.css'

const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'caixa', label: 'Caixa', icon: '💰' },
  { id: 'servicos', label: 'Serviços', icon: '🔧' },
  { id: 'funcionarios', label: 'Funcionários', icon: '👷' },
  { id: 'temporizadores', label: 'Temporizadores', icon: '⏱️' },
]

export default function Sidebar({ page, setPage, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>🔧</span>
        <div>
          <strong>Oficina Lima</strong>
          <small>Painel Admin</small>
        </div>
      </div>
      <nav className="sidebar-nav">
        {MENU.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <span>🚪</span> Sair
        </button>
      </div>
    </aside>
  )
}
