import { useState } from 'react'
import Modal from './Modal.jsx'
import './Funcionarios.css'

const KEY = 'ol_funcionarios'
function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ nome: '', cargo: '', telefone: '', status: 'ativo' })

const CARGOS = ['Mecânico', 'Eletricista', 'Atendente', 'Gerente', 'Auxiliar', 'Outros']

export default function Funcionarios() {
  const [items, setItems] = useState(load)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())

  function refresh() { setItems(load()) }
  function openAdd() { setEditing(null); setForm(empty()); setModal(true) }
  function openEdit(item) { setEditing(item.id); setForm({ nome: item.nome, cargo: item.cargo, telefone: item.telefone, status: item.status }); setModal(true) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.nome || !form.cargo) return
    const arr = load()
    if (editing) {
      const idx = arr.findIndex(x => x.id === editing)
      arr[idx] = { ...arr[idx], ...form }
    } else {
      arr.push({ ...form, id: nextId(arr) })
    }
    save(arr)
    setModal(false)
    refresh()
  }

  function handleDelete(id) {
    if (!confirm('Excluir este funcionário?')) return
    save(load().filter(x => x.id !== id))
    refresh()
  }

  function toggleStatus(id) {
    const arr = load()
    const idx = arr.findIndex(x => x.id === id)
    arr[idx].status = arr[idx].status === 'ativo' ? 'inativo' : 'ativo'
    save(arr)
    refresh()
  }

  const ativos = items.filter(f => f.status === 'ativo')
  const inativos = items.filter(f => f.status === 'inativo')

  const renderTable = (list) => (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Cargo</th>
          <th>Telefone</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {list.map(f => (
          <tr key={f.id}>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar">{f.nome.charAt(0).toUpperCase()}</div>
                <strong>{f.nome}</strong>
              </div>
            </td>
            <td>{f.cargo}</td>
            <td>{f.telefone || '—'}</td>
            <td>
              <button
                className={`status-btn ${f.status}`}
                onClick={() => toggleStatus(f.id)}
                title="Clique para alternar status"
              >
                {f.status === 'ativo' ? '● Ativo' : '○ Inativo'}
              </button>
            </td>
            <td>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-edit" onClick={() => openEdit(f)}>✏️ Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(f.id)}>🗑️</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div>
      <div className="page-header">
        <h1>👷 Funcionários</h1>
        <button className="btn-primary" onClick={openAdd}>+ Novo Funcionário</button>
      </div>

      <div className="func-stats">
        <div className="func-stat">
          <span>👥</span>
          <div>
            <strong>{items.length}</strong>
            <small>Total</small>
          </div>
        </div>
        <div className="func-stat">
          <span>✅</span>
          <div>
            <strong>{ativos.length}</strong>
            <small>Ativos</small>
          </div>
        </div>
        <div className="func-stat">
          <span>⏸️</span>
          <div>
            <strong>{inativos.length}</strong>
            <small>Inativos</small>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">👷</div>
            <p>Nenhum funcionário cadastrado.</p>
          </div>
        </div>
      ) : (
        <>
          {ativos.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: 15 }}>Funcionários Ativos</h3>
              {renderTable(ativos)}
            </div>
          )}
          {inativos.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 15, color: 'var(--text-light)' }}>Inativos</h3>
              {renderTable(inativos)}
            </div>
          )}
        </>
      )}

      {modal && (
        <Modal title={editing ? 'Editar Funcionário' : 'Novo Funcionário'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Nome Completo *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: João Silva" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cargo *</label>
                <select value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} required>
                  <option value="">Selecione...</option>
                  {CARGOS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
