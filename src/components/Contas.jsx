import { useState } from 'react'
import Modal from './Modal.jsx'
import './Contas.css'

const KEY = 'ol_contas'
const CATS = ['Fixo', 'Variável', 'Imposto', 'Funcionários', 'Outros']

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ descricao: '', descBreve: '', valor: '', vencimento: '', status: 'pendente', categoria: 'Fixo', obs: '' })
const fmt = v => `R$ ${Number(v).toFixed(2).replace('.', ',')}`

export default function Contas() {
  const [items, setItems] = useState(load)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())

  function refresh() { setItems(load()) }
  function openAdd() { setEditing(null); setForm(empty()); setModal(true) }
  function openEdit(item) {
    setEditing(item.id)
    setForm({ descricao: item.descricao, descBreve: item.descBreve || '', valor: item.valor, vencimento: item.vencimento, status: item.status, categoria: item.categoria, obs: item.obs || '' })
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
    if (!confirm('Excluir esta conta?')) return
    save(load().filter(x => x.id !== id))
    refresh()
  }

  function toggleStatus(id) {
    const arr = load()
    const idx = arr.findIndex(x => x.id === id)
    arr[idx].status = arr[idx].status === 'pago' ? 'pendente' : 'pago'
    save(arr)
    refresh()
  }

  const pendentes = items.filter(c => c.status === 'pendente')
  const pagas = items.filter(c => c.status === 'pago')
  const totalPendente = pendentes.reduce((s, c) => s + Number(c.valor), 0)
  const totalPago = pagas.reduce((s, c) => s + Number(c.valor), 0)
  const totalGeral = items.reduce((s, c) => s + Number(c.valor), 0)

  function renderTable(list) {
    return (
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map(c => (
            <tr key={c.id}>
              <td>
                <strong>{c.descricao}</strong>
                {c.descBreve && <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2, fontWeight: 600 }}>{c.descBreve}</div>}
                {c.obs && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{c.obs}</div>}
              </td>
              <td><span className="badge badge-gray">{c.categoria}</span></td>
              <td>{c.vencimento ? `Dia ${c.vencimento}` : '—'}</td>
              <td><strong style={{ color: c.status === 'pago' ? '#10b981' : '#ef4444' }}>{fmt(c.valor)}</strong></td>
              <td>
                <button
                  className={`status-conta ${c.status}`}
                  onClick={() => toggleStatus(c.id)}
                  title="Clique para alternar status"
                >
                  {c.status === 'pago' ? '✅ Pago' : '⏳ Pendente'}
                </button>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-edit" onClick={() => openEdit(c)}>✏️</button>
                  <button className="btn-danger" onClick={() => handleDelete(c.id)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const hoje = new Date().getDate()
  const diasParaVencer = hoje <= 30 ? 30 - hoje : 0

  return (
    <div>
      <div className="page-header">
        <h1>📄 Contas da Oficina</h1>
        <button className="btn-primary" onClick={openAdd}>+ Nova Conta</button>
      </div>

      {/* Aviso mensalidade do painel */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 20,
        color: 'white',
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}>
        <div style={{ fontSize: 36, flexShrink: 0 }}>💻</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
            Mensalidade do Painel Lima Oficina
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
            O sistema custa <strong style={{ color: '#4ade80' }}>R$ 60,00/mês</strong>, com vencimento todo dia <strong style={{ color: '#fbbf24' }}>30</strong>.
            {diasParaVencer > 0
              ? <> Faltam <strong style={{ color: '#fbbf24' }}>{diasParaVencer} dia(s)</strong> para o próximo vencimento.</>
              : <> O vencimento é <strong style={{ color: '#f87171' }}>hoje</strong>!</>
            }
            {' '}Caso o pagamento não ocorra no dia, entraremos em contato.
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>💚 PIX (5% desconto)</div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>10595735983</div>
              <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, marginTop: 2 }}>R$ 57,00 no PIX</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>👩‍💻 Suporte / Recebedor</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Elizandra Cardoso de Lima</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Desenvolvadora do sistema</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>📅 Vencimento</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#fbbf24' }}>Dia 30</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Todo mês</div>
            </div>
          </div>
        </div>
      </div>

      <div className="contas-resumo">
        <div className="contas-card pendente">
          <span className="resumo-label">⏳ A Pagar</span>
          <strong>{fmt(totalPendente)}</strong>
          <small>{pendentes.length} conta(s)</small>
        </div>
        <div className="contas-card pago">
          <span className="resumo-label">✅ Pagas</span>
          <strong>{fmt(totalPago)}</strong>
          <small>{pagas.length} conta(s)</small>
        </div>
        <div className="contas-card total">
          <span className="resumo-label">📊 Total Mensal</span>
          <strong>{fmt(totalGeral)}</strong>
          <small>{items.length} conta(s)</small>
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ marginBottom: 16, color: '#ef4444' }}>⏳ Pendentes ({pendentes.length})</h3>
          {renderTable(pendentes)}
        </div>
      )}

      {pagas.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <h3 style={{ marginBottom: 16, color: '#10b981' }}>✅ Pagas ({pagas.length})</h3>
          {renderTable(pagas)}
        </div>
      )}

      {items.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>Nenhuma conta cadastrada.</p>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={editing ? 'Editar Conta' : 'Nova Conta'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Descrição *</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Aluguel, Energia Elétrica..." required />
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
                <label>Valor (R$) *</label>
                <input type="number" min="0.01" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" required />
              </div>
              <div className="form-group">
                <label>Dia do Vencimento</label>
                <input type="number" min="1" max="31" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} placeholder="Ex: 10" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea rows={2} value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Informações adicionais..." />
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
