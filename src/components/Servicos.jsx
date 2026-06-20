import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import './Servicos.css'

const KEY = 'ol_servicos'
function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ nome: '', descricao: '', preco: '', tempo: '' })

export default function Servicos() {
  const [items, setItems] = useState(load)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [busca, setBusca] = useState('')

  function refresh() { setItems(load()) }

  function openAdd() { setEditing(null); setForm(empty()); setModal(true) }
  function openEdit(item) { setEditing(item.id); setForm({ nome: item.nome, descricao: item.descricao, preco: item.preco, tempo: item.tempo }); setModal(true) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.nome || !form.preco) return
    const arr = load()
    if (editing) {
      const idx = arr.findIndex(x => x.id === editing)
      arr[idx] = { ...arr[idx], ...form, preco: parseFloat(form.preco), tempo: parseInt(form.tempo) || 0 }
    } else {
      arr.push({ ...form, id: nextId(arr), preco: parseFloat(form.preco), tempo: parseInt(form.tempo) || 0 })
    }
    save(arr)
    setModal(false)
    refresh()
  }

  function handleDelete(id) {
    if (!confirm('Excluir este serviço?')) return
    save(load().filter(x => x.id !== id))
    refresh()
  }

  const filtered = items.filter(s =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    s.descricao.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h1>🔧 Serviços</h1>
        <button className="btn-primary" onClick={openAdd}>+ Novo Serviço</button>
      </div>

      <div className="card">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar serviços..." />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔧</div>
            <p>Nenhum serviço encontrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Tempo Est.</th>
                <th>Preço</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <>
                  {i > 0 && (
                    <tr key={`sep-${s.id}`}>
                      <td colSpan={5} style={{ padding: 0, borderBottom: '1px solid #2a2a2a' }} />
                    </tr>
                  )}
                  <tr key={s.id}>
                    <td><strong style={{ color: '#f0f0f0' }}>{s.nome}</strong></td>
                    <td style={{ color: '#888' }}>{s.descricao}</td>
                    <td style={{ color: '#ccc' }}>{s.tempo ? `${s.tempo} min` : '—'}</td>
                    <td><strong className="preco">R$ {Number(s.preco).toFixed(2).replace('.', ',')}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-edit" onClick={() => openEdit(s)}>✏️ Editar</button>
                        <button className="btn-danger" onClick={() => handleDelete(s.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Serviço' : 'Novo Serviço'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Nome do Serviço *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Troca de Óleo" required />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea rows={3} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o serviço..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preço (R$) *</label>
                <input type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} placeholder="0,00" required />
              </div>
              <div className="form-group">
                <label>Tempo Estimado (min)</label>
                <input type="number" min="0" value={form.tempo} onChange={e => setForm(f => ({ ...f, tempo: e.target.value }))} placeholder="Ex: 60" />
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
