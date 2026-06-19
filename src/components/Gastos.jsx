import { useState } from 'react'
import Modal from './Modal.jsx'
import './Gastos.css'

const KEY = 'ol_gastos'

const CATS_INFO = [
  { nome: 'Peças',                  icon: '🔩', ex: 'Filtro, pastilha, correia, vela...' },
  { nome: 'Café / Alimentação',     icon: '☕', ex: 'Café da manhã, pão, lanche da equipe, almoço...' },
  { nome: 'Combustível / Posto',    icon: '⛽', ex: 'Gasolina, etanol, diesel da moto ou carro da oficina...' },
  { nome: 'Pintura / Manutenção',   icon: '🎨', ex: 'Tinta para parede, conserto de porta, reforma...' },
  { nome: 'Material de Limpeza',    icon: '🧹', ex: 'Detergente, pano, vassoura, produto de limpeza...' },
  { nome: 'Material de Escritório', icon: '🖊️', ex: 'Papel, caneta, impressão, pasta, agenda...' },
  { nome: 'Ferramentas',            icon: '🔧', ex: 'Chave, soquete, alicate, equipamento novo...' },
  { nome: 'EPI / Uniformes',        icon: '🦺', ex: 'Luvas, óculos, uniforme, bota de segurança...' },
  { nome: 'Conta Fixa',             icon: '💡', ex: 'Luz, água, internet, telefone, gás...' },
  { nome: 'Compras Gerais',         icon: '🛒', ex: 'Supermercado, itens variados para a oficina...' },
  { nome: 'Frete / Entrega',        icon: '📦', ex: 'Motoboy, entrega de peças, frete de compra...' },
  { nome: 'Outros',                 icon: '📝', ex: 'Qualquer outro gasto da oficina...' },
]
const CATS = CATS_INFO.map(c => c.nome)

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ descricao: '', descBreve: '', categoria: 'Peças', valor: '', comissao: '', fornecedor: '', nota: '', data: new Date().toISOString().split('T')[0] })

const fmt = v => `R$ ${Number(v).toFixed(2).replace('.', ',')}`

export default function Gastos() {
  const [items, setItems] = useState(load)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [filtrocat, setFiltrocat] = useState('todos')
  const [busca, setBusca] = useState('')

  function refresh() { setItems(load()) }
  function openAdd() { setEditing(null); setForm(empty()); setModal(true) }
  function openEdit(item) {
    setEditing(item.id)
    setForm({ descricao: item.descricao, descBreve: item.descBreve || '', categoria: item.categoria, valor: item.valor, comissao: item.comissao || '', fornecedor: item.fornecedor || '', nota: item.nota || '', data: item.data })
    setModal(true)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor) return
    const arr = load()
    if (editing) {
      const idx = arr.findIndex(x => x.id === editing)
      arr[idx] = { ...arr[idx], ...form, valor: parseFloat(form.valor) }
    } else {
      arr.push({ ...form, id: nextId(arr), valor: parseFloat(form.valor) })
    }
    save(arr)
    setModal(false)
    refresh()
  }

  function handleDelete(id) {
    if (!confirm('Excluir este gasto?')) return
    save(load().filter(x => x.id !== id))
    refresh()
  }

  const filtered = items.filter(g => {
    if (filtrocat !== 'todos' && g.categoria !== filtrocat) return false
    if (busca && !g.descricao.toLowerCase().includes(busca.toLowerCase()) && !(g.fornecedor || '').toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const total = filtered.reduce((s, g) => s + Number(g.valor), 0)

  const porCategoria = CATS.map(cat => ({
    cat,
    total: items.filter(g => g.categoria === cat).reduce((s, g) => s + Number(g.valor), 0),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div>
      <div className="page-header">
        <h1>🧾 Planilha de Gastos</h1>
        <button className="btn-primary" onClick={openAdd}>+ Adicionar Gasto</button>
      </div>

      <div className="gastos-resumo">
        <div className="gastos-total-card">
          <span className="resumo-label">Total de Gastos</span>
          <strong>{fmt(items.reduce((s, g) => s + Number(g.valor), 0))}</strong>
        </div>
        <div className="gastos-cats">
          {porCategoria.map(x => {
            const info = CATS_INFO.find(c => c.nome === x.cat)
            return (
              <button
                key={x.cat}
                className={`cat-chip ${filtrocat === x.cat ? 'active' : ''}`}
                onClick={() => setFiltrocat(filtrocat === x.cat ? 'todos' : x.cat)}
              >
                {info?.icon} {x.cat}: <strong>{fmt(x.total)}</strong>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="gastos-filtros">
          <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
            <span className="search-icon">🔍</span>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por descrição ou fornecedor..." />
          </div>
          <select value={filtrocat} onChange={e => setFiltrocat(e.target.value)}>
            <option value="todos">Todas as categorias</option>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="gastos-subtotal">
          Exibindo <strong>{filtered.length}</strong> registro(s) · Total: <strong style={{ color: '#ef4444' }}>{fmt(total)}</strong>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <p>Nenhum gasto registrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th>Nota/NF</th>
                <th>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map(g => (
                <tr key={g.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(g.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>
                    <strong>{g.descricao}</strong>
                    {g.descBreve && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{g.descBreve}</div>}
                  </td>
                  <td><span className="badge badge-gray">{CATS_INFO.find(c => c.nome === g.categoria)?.icon} {g.categoria}</span></td>
                  <td style={{ color: 'var(--text-light)' }}>{g.fornecedor || '—'}</td>
                  <td style={{ color: 'var(--text-light)', fontSize: 13 }}>{g.nota || '—'}</td>
                  <td>
                    <strong style={{ color: '#ef4444' }}>{fmt(g.valor)}</strong>
                    {g.comissao ? <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600 }}>Comissão: {fmt(g.comissao)}</div> : null}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-edit" onClick={() => openEdit(g)}>✏️</button>
                      <button className="btn-danger" onClick={() => handleDelete(g.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={editing ? 'Editar Gasto' : 'Novo Gasto'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Descrição *</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Filtro de óleo, gasolina..." required />
            </div>
            <div className="form-group">
              <label>Descrição Breve <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>({(form.descBreve || '').length}/50)</span></label>
              <input
                value={form.descBreve}
                onChange={e => setForm(f => ({ ...f, descBreve: e.target.value.slice(0, 50) }))}
                placeholder="Resumo rápido (máx. 50 caracteres)"
                maxLength={50}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATS_INFO.map(c => <option key={c.nome} value={c.nome}>{c.icon} {c.nome}</option>)}
                </select>
                {(() => { const info = CATS_INFO.find(c => c.nome === form.categoria); return info ? <small style={{ color: 'var(--text-light)', fontSize: 11, marginTop: 4, display: 'block' }}>Ex: {info.ex}</small> : null })()}
              </div>
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input type="number" min="0.01" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" required />
              </div>
            </div>
            {form.categoria === 'Peças' && (
              <div className="form-group">
                <label>💜 Comissão sobre esta peça (R$)</label>
                <input type="number" min="0" step="0.01" value={form.comissao} onChange={e => setForm(f => ({ ...f, comissao: e.target.value }))} placeholder="Valor da comissão..." />
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label>Fornecedor / Loja</label>
                <input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Ex: Auto Peças Brasil" />
              </div>
              <div className="form-group">
                <label>Número da Nota / NF</label>
                <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ex: NF-1234" />
              </div>
            </div>
            <div className="form-group">
              <label>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
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
