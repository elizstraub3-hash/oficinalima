import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import './OrdemServico.css'

const KEY = 'ol_ordens'
const KEY_CLI = 'ol_clientes'

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
function nextNumero(arr) {
  if (!arr.length) return 'OS-001'
  const nums = arr.map(o => parseInt(o.numero?.replace('OS-', '') || '0'))
  return 'OS-' + String(Math.max(...nums) + 1).padStart(3, '0')
}

const STATUS = {
  aguardando:    { label: 'Aguardando',    color: '#f59e0b', bg: '#fef3c7' },
  em_andamento:  { label: 'Em Andamento',  color: '#3b82f6', bg: '#dbeafe' },
  concluido:     { label: 'Concluído',     color: '#10b981', bg: '#d1fae5' },
  cancelado:     { label: 'Cancelado',     color: '#ef4444', bg: '#fee2e2' },
}

function formatMs(ms) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function LiveTimer({ inicio }) {
  const [elapsed, setElapsed] = useState(Date.now() - inicio)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - inicio), 1000)
    return () => clearInterval(id)
  }, [inicio])
  const h = elapsed / 3600000
  const cls = h < 2 ? 'green' : h < 4 ? 'yellow' : 'red'
  return <span className={`os-timer os-timer-${cls}`}>{formatMs(elapsed)}</span>
}

const emptyForm = () => ({
  clienteNome: '', clienteTelefone: '', placa: '', modelo: '', ano: '', cor: '',
  servico: '', descricao: '', funcionario: '', valor: '', status: 'aguardando',
})

export default function OrdemServico() {
  const [ordens, setOrdens] = useState(load)
  const [modal, setModal] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const clientes = JSON.parse(localStorage.getItem(KEY_CLI) || '[]')
  const servicos = JSON.parse(localStorage.getItem('ol_servicos') || '[]')
  const funcionarios = JSON.parse(localStorage.getItem('ol_funcionarios') || '[]').filter(f => f.status === 'ativo')

  function refresh() { setOrdens(load()) }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setViewing(null)
    setModal(true)
  }

  function openEdit(ordem) {
    setEditing(ordem.id)
    setForm({
      clienteNome: ordem.clienteNome, clienteTelefone: ordem.clienteTelefone,
      placa: ordem.placa, modelo: ordem.modelo, ano: ordem.ano || '', cor: ordem.cor || '',
      servico: ordem.servico, descricao: ordem.descricao || '',
      funcionario: ordem.funcionario || '', valor: ordem.valor || '',
      status: ordem.status,
    })
    setViewing(null)
    setModal(true)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.clienteNome || !form.placa) return
    const arr = load()
    if (editing) {
      const idx = arr.findIndex(x => x.id === editing)
      const old = arr[idx]
      const novoStatus = form.status
      let inicio = old.inicio
      let fim = old.fim
      if (novoStatus === 'em_andamento' && !inicio) inicio = Date.now()
      if ((novoStatus === 'concluido' || novoStatus === 'cancelado') && !fim) fim = Date.now()
      arr[idx] = { ...old, ...form, valor: parseFloat(form.valor) || 0, inicio, fim }
    } else {
      const num = nextNumero(arr)
      arr.push({
        ...form,
        id: nextId(arr),
        numero: num,
        valor: parseFloat(form.valor) || 0,
        inicio: form.status === 'em_andamento' ? Date.now() : null,
        fim: null,
        data: new Date().toISOString().split('T')[0],
      })
      // salvar cliente se não existir
      if (form.clienteNome) {
        const clis = JSON.parse(localStorage.getItem(KEY_CLI) || '[]')
        const existe = clis.find(c => c.nome.toLowerCase() === form.clienteNome.toLowerCase())
        if (!existe) {
          clis.push({ id: nextId(clis), nome: form.clienteNome, telefone: form.clienteTelefone, email: '', cpf: '', endereco: '', obs: '' })
          localStorage.setItem(KEY_CLI, JSON.stringify(clis))
        }
      }
    }
    save(arr)
    setModal(false)
    refresh()
  }

  function handleChangeStatus(id, novoStatus) {
    const arr = load()
    const idx = arr.findIndex(x => x.id === id)
    const old = arr[idx]
    let inicio = old.inicio
    let fim = old.fim
    if (novoStatus === 'em_andamento' && !inicio) inicio = Date.now()
    if ((novoStatus === 'concluido' || novoStatus === 'cancelado') && !fim) fim = Date.now()
    arr[idx] = { ...old, status: novoStatus, inicio, fim }
    save(arr)
    refresh()
    if (viewing && viewing.id === id) setViewing(arr[idx])
  }

  function handleDelete(id) {
    if (!confirm('Excluir esta ordem de serviço?')) return
    save(load().filter(x => x.id !== id))
    setViewing(null)
    refresh()
  }

  function selectCliente(nome) {
    const c = clientes.find(x => x.nome === nome)
    if (c) setForm(f => ({ ...f, clienteNome: c.nome, clienteTelefone: c.telefone || '' }))
    else setForm(f => ({ ...f, clienteNome: nome }))
  }

  const filtered = ordens.filter(o => {
    if (filtroStatus !== 'todos' && o.status !== filtroStatus) return false
    const q = busca.toLowerCase()
    if (q && !o.clienteNome.toLowerCase().includes(q) && !o.placa.toLowerCase().includes(q) && !o.numero.toLowerCase().includes(q)) return false
    return true
  })

  const counts = Object.keys(STATUS).reduce((acc, s) => {
    acc[s] = ordens.filter(o => o.status === s).length
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <h1>📋 Ordens de Serviço</h1>
        <button className="btn-primary" onClick={openAdd}>+ Nova OS</button>
      </div>

      <div className="os-status-bar">
        {['todos', ...Object.keys(STATUS)].map(s => (
          <button
            key={s}
            className={`os-status-chip ${filtroStatus === s ? 'active' : ''}`}
            onClick={() => setFiltroStatus(s)}
            style={s !== 'todos' && filtroStatus === s ? { background: STATUS[s].color, color: 'white', borderColor: STATUS[s].color } : {}}
          >
            {s === 'todos' ? `Todas (${ordens.length})` : `${STATUS[s].label} (${counts[s]})`}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente, placa ou número da OS..." />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Nenhuma ordem de serviço encontrada.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nº OS</th>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Serviço</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Tempo</th>
                <th>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map(o => {
                const st = STATUS[o.status]
                return (
                  <tr key={o.id} className="os-row" onClick={() => setViewing(o)} style={{ cursor: 'pointer' }}>
                    <td><strong className="os-numero">{o.numero}</strong></td>
                    <td>
                      <strong>{o.clienteNome}</strong>
                      {o.clienteTelefone && <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.clienteTelefone}</div>}
                    </td>
                    <td>
                      <strong>{o.placa}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.modelo} {o.ano}</div>
                    </td>
                    <td>{o.servico || '—'}</td>
                    <td>{o.funcionario || '—'}</td>
                    <td>
                      <span className="badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {o.status === 'em_andamento' && o.inicio
                        ? <LiveTimer inicio={o.inicio} />
                        : o.inicio && o.fim
                          ? <span className="badge badge-gray">{formatMs(o.fim - o.inicio)}</span>
                          : <span style={{ color: 'var(--text-light)' }}>—</span>
                      }
                    </td>
                    <td><strong style={{ color: '#10b981' }}>R$ {Number(o.valor || 0).toFixed(2).replace('.', ',')}</strong></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-edit" onClick={() => openEdit(o)}>✏️</button>
                        <button className="btn-danger" onClick={() => handleDelete(o.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de visualização detalhada */}
      {viewing && !modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewing(null)}>
          <div className="modal-box os-detail-box">
            <div className="modal-header">
              <h2>📋 {viewing.numero}</h2>
              <button className="modal-close" onClick={() => setViewing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="os-detail-status">
                {Object.keys(STATUS).map(s => (
                  <button
                    key={s}
                    className={`os-detail-status-btn ${viewing.status === s ? 'active' : ''}`}
                    style={viewing.status === s ? { background: STATUS[s].color, color: 'white' } : {}}
                    onClick={() => handleChangeStatus(viewing.id, s)}
                  >
                    {STATUS[s].label}
                  </button>
                ))}
              </div>

              <div className="os-detail-grid">
                <div className="os-detail-section">
                  <h4>👤 Cliente</h4>
                  <p><strong>{viewing.clienteNome}</strong></p>
                  {viewing.clienteTelefone && <p>📞 {viewing.clienteTelefone}</p>}
                </div>
                <div className="os-detail-section">
                  <h4>🚗 Veículo</h4>
                  <p><strong>{viewing.placa}</strong> · {viewing.modelo}</p>
                  {viewing.ano && <p>Ano: {viewing.ano} {viewing.cor ? `· Cor: ${viewing.cor}` : ''}</p>}
                </div>
                <div className="os-detail-section">
                  <h4>🔧 Serviço</h4>
                  <p><strong>{viewing.servico || '—'}</strong></p>
                  {viewing.descricao && <p style={{ color: 'var(--text-light)', fontSize: 13 }}>{viewing.descricao}</p>}
                </div>
                <div className="os-detail-section">
                  <h4>👷 Responsável</h4>
                  <p>{viewing.funcionario || '—'}</p>
                </div>
                <div className="os-detail-section">
                  <h4>⏱️ Tempo</h4>
                  {viewing.status === 'em_andamento' && viewing.inicio
                    ? <LiveTimer inicio={viewing.inicio} />
                    : viewing.inicio && viewing.fim
                      ? <p>{formatMs(viewing.fim - viewing.inicio)}</p>
                      : <p>—</p>
                  }
                  {viewing.inicio && <p style={{ fontSize: 12, color: 'var(--text-light)' }}>Entrada: {new Date(viewing.inicio).toLocaleString('pt-BR')}</p>}
                  {viewing.fim && <p style={{ fontSize: 12, color: 'var(--text-light)' }}>Saída: {new Date(viewing.fim).toLocaleString('pt-BR')}</p>}
                </div>
                <div className="os-detail-section">
                  <h4>💰 Valor</h4>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>R$ {Number(viewing.valor || 0).toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-danger" onClick={() => { handleDelete(viewing.id); setViewing(null) }}>🗑️ Excluir</button>
                <button className="btn-secondary" onClick={() => setViewing(null)}>Fechar</button>
                <button className="btn-primary" onClick={() => openEdit(viewing)}>✏️ Editar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de criação/edição */}
      {modal && (
        <Modal title={editing ? 'Editar OS' : 'Nova Ordem de Serviço'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <p className="os-section-title">👤 Dados do Cliente</p>
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Cliente *</label>
                <input
                  list="clientes-list"
                  value={form.clienteNome}
                  onChange={e => selectCliente(e.target.value)}
                  placeholder="Nome ou selecione..."
                  required
                />
                <datalist id="clientes-list">
                  {clientes.map(c => <option key={c.id} value={c.nome} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input value={form.clienteTelefone} onChange={e => setForm(f => ({ ...f, clienteTelefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <p className="os-section-title">🚗 Dados do Veículo</p>
            <div className="form-row">
              <div className="form-group">
                <label>Placa *</label>
                <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" maxLength={8} required />
              </div>
              <div className="form-group">
                <label>Modelo / Marca</label>
                <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: Fiat Uno, Honda Civic" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Ano</label>
                <input value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} placeholder="Ex: 2020" maxLength={4} />
              </div>
              <div className="form-group">
                <label>Cor</label>
                <input value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="Ex: Branco, Prata..." />
              </div>
            </div>

            <p className="os-section-title">🔧 Serviço</p>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Serviço</label>
                <input
                  list="servicos-list"
                  value={form.servico}
                  onChange={e => setForm(f => ({ ...f, servico: e.target.value }))}
                  placeholder="Selecione ou digite..."
                />
                <datalist id="servicos-list">
                  {servicos.map(s => <option key={s.id} value={s.nome} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Responsável</label>
                <select value={form.funcionario} onChange={e => setForm(f => ({ ...f, funcionario: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome} – {f.cargo}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Descrição / Observações</label>
              <textarea rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes do serviço, peças necessárias..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Valor (R$)</label>
                <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing ? 'Salvar' : 'Criar OS'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
