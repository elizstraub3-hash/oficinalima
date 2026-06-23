import { useState } from 'react'
import Modal from './Modal.jsx'
import './Clientes.css'

const KEY = 'ol_clientes'
function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ nome: '', telefone: '', email: '', cpf: '', endereco: '', obs: '', placa: '', modelo: '', ano: '', cor: '' })

export default function Clientes() {
  const [items, setItems] = useState(load)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [busca, setBusca] = useState('')

  function refresh() { setItems(load()) }
  function openAdd() { setEditing(null); setForm(empty()); setModal(true) }
  function openEdit(item) {
    setEditing(item.id)
    setForm({ nome: item.nome, telefone: item.telefone, email: item.email || '', cpf: item.cpf || '', endereco: item.endereco || '', obs: item.obs || '', placa: item.placa || '', modelo: item.modelo || '', ano: item.ano || '', cor: item.cor || '' })
    setModal(true)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.nome) return
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
    if (!confirm('Excluir este cliente?')) return
    save(load().filter(x => x.id !== id))
    refresh()
  }

  const filtered = items.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca) ||
    (c.cpf || '').includes(busca)
  )

  return (
    <div>
      <div className="page-header">
        <button className="btn-primary" onClick={openAdd}>+ Novo Cliente</button>
      </div>

      <div className="card">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou CPF..." />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>CPF</th>
                <th>Veículo</th>
                <th>E-mail</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="cliente-avatar">{c.nome.charAt(0).toUpperCase()}</div>
                      <strong>{c.nome}</strong>
                    </div>
                  </td>
                  <td>{c.telefone || '—'}</td>
                  <td>{c.cpf || '—'}</td>
                  <td>
                    {c.placa
                      ? <span><strong style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{c.placa}</strong>{c.modelo ? ` · ${c.modelo}` : ''}{c.ano ? ` (${c.ano})` : ''}</span>
                      : <span style={{ color: 'var(--text-light)' }}>—</span>}
                  </td>
                  <td>{c.email || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-edit" onClick={() => openEdit(c)}>✏️ Editar</button>
                      <button className="btn-danger" onClick={() => handleDelete(c.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Nome Completo *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do cliente" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Telefone</label>
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div className="form-group">
                <label>CPF</label>
                <input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div className="form-group">
              <label>Endereço</label>
              <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro..." />
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea rows={2} value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Notas sobre o cliente..." />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 8px', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>🚗 Veículo do Cliente</p>
            <div className="form-row">
              <div className="form-group">
                <label>Placa</label>
                <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" maxLength={8} />
              </div>
              <div className="form-group">
                <label>Modelo / Marca</label>
                <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: Fiat Uno" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Ano</label>
                <input value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} placeholder="Ex: 2020" maxLength={4} />
              </div>
              <div className="form-group">
                <label>Cor</label>
                <input value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="Ex: Branco" />
              </div>
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
