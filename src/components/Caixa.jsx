import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import './Caixa.css'

const KEY = 'ol_caixa'
const CATS = ['Serviço', 'Estoque', 'Manutenção', 'Outros']

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }

const empty = () => ({ descricao: '', valor: '', tipo: 'entrada', categoria: 'Serviço', data: new Date().toISOString().split('T')[0] })

export default function Caixa() {
  const [entries, setEntries] = useState(load)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty())
  const [filtro, setFiltro] = useState({ tipo: 'todos', de: '', ate: '' })

  function refresh() { setEntries(load()) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor) return
    const arr = load()
    arr.push({ ...form, id: nextId(arr), valor: parseFloat(form.valor) })
    save(arr)
    setModal(false)
    setForm(empty())
    refresh()
  }

  function handleDelete(id) {
    if (!confirm('Excluir este lançamento?')) return
    save(load().filter(e => e.id !== id))
    refresh()
  }

  const filtered = entries.filter(e => {
    if (filtro.tipo !== 'todos' && e.tipo !== filtro.tipo) return false
    if (filtro.de && e.data < filtro.de) return false
    if (filtro.ate && e.data > filtro.ate) return false
    return true
  })

  const totalEntrada = filtered.filter(e => e.tipo === 'entrada').reduce((s, e) => s + e.valor, 0)
  const totalSaida = filtered.filter(e => e.tipo === 'saida').reduce((s, e) => s + e.valor, 0)
  const saldo = totalEntrada - totalSaida

  const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

  const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
  const totalMaoDeObra = ordens.reduce((s, o) => {
    if (o.servicos && o.servicos.length) {
      return s + o.servicos.reduce((ss, sv) => ss + (parseFloat(sv.maoDeObra) || 0), 0)
    }
    return s + (parseFloat(o.maoDeObra) || 0)
  }, 0)

  return (
    <div>
      <div className="page-header">
        <h1>💰 Caixa</h1>
        <button className="btn-primary" onClick={() => { setForm(empty()); setModal(true) }}>
          + Novo Lançamento
        </button>
      </div>

      <div className="caixa-resumo">
        <div className="resumo-card green">
          <span className="resumo-label">Total Entradas</span>
          <strong>{fmt(totalEntrada)}</strong>
        </div>
        <div className="resumo-card red">
          <span className="resumo-label">Total Saídas</span>
          <strong>{fmt(totalSaida)}</strong>
        </div>
        <div className={`resumo-card ${saldo >= 0 ? 'blue' : 'red'} saldo`}>
          <span className="resumo-label">Saldo</span>
          <strong>{fmt(saldo)}</strong>
        </div>
      </div>

      {/* Divisão mão de obra */}
      <div className="caixa-mob-split">
        <div className="mob-split-title">🔧 Divisão de Mão de Obra (Total OS)</div>
        <div className="mob-split-grid">
          <div className="mob-split-item total">
            <span className="mob-split-label">Total Mão de Obra</span>
            <strong>{fmt(totalMaoDeObra)}</strong>
          </div>
          <div className="mob-split-item oficina">
            <span className="mob-split-label">50% Oficina</span>
            <strong>{fmt(totalMaoDeObra * 0.5)}</strong>
          </div>
          <div className="mob-split-item mecanico">
            <span className="mob-split-label">50% Mecânico</span>
            <strong>{fmt(totalMaoDeObra * 0.5)}</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="caixa-filtros">
          <select value={filtro.tipo} onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}>
            <option value="todos">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
          <div className="filtro-datas">
            <label>De: <input type="date" value={filtro.de} onChange={e => setFiltro(f => ({ ...f, de: e.target.value }))} /></label>
            <label>Até: <input type="date" value={filtro.ate} onChange={e => setFiltro(f => ({ ...f, ate: e.target.value }))} /></label>
          </div>
          {(filtro.tipo !== 'todos' || filtro.de || filtro.ate) && (
            <button className="btn-secondary" onClick={() => setFiltro({ tipo: 'todos', de: '', ate: '' })}>Limpar filtros</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <p>Nenhum lançamento encontrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>{e.descricao}</td>
                  <td><span className="badge badge-gray">{e.categoria}</span></td>
                  <td>
                    <span className={`badge ${e.tipo === 'entrada' ? 'badge-green' : 'badge-red'}`}>
                      {e.tipo === 'entrada' ? '▲ Entrada' : '▼ Saída'}
                    </span>
                  </td>
                  <td className={`valor-cell ${e.tipo === 'entrada' ? 'entrada' : 'saida'}`}>
                    {e.tipo === 'saida' ? '-' : '+'}{fmt(e.valor)}
                  </td>
                  <td>
                    <button className="btn-danger" onClick={() => handleDelete(e.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Novo Lançamento" onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Descrição *</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Troca de óleo - Fiat Uno" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input type="number" min="0.01" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" required />
              </div>
              <div className="form-group">
                <label>Data</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
