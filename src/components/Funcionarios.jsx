import { useState } from 'react'
import Modal from './Modal.jsx'
import './Funcionarios.css'

const KEY = 'ol_funcionarios'
function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ nome: '', cargo: '', telefone: '', status: 'ativo' })
const CARGOS = ['Mecânico', 'Eletricista', 'Atendente', 'Gerente', 'Auxiliar', 'Outros']

function formatMs(ms) {
  if (!ms || ms < 0) return '—'
  const total = Math.floor(ms / 1000)
  const dias = Math.floor(total / 86400)
  const h    = Math.floor((total % 86400) / 3600)
  const m    = Math.floor((total % 3600) / 60)
  if (dias > 0) return `${dias}d ${h}h ${m}min`
  if (h > 0)    return `${h}h ${m}min`
  return `${m}min`
}

function calcResumoFuncionario(nome) {
  const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')

  // OS onde o mecânico aparece como responsável principal OU em algum serviço
  const minhas = ordens.filter(o => {
    if (o.funcionario === nome) return true
    if (o.servicos && o.servicos.some(sv => sv.funcionario === nome)) return true
    return false
  })

  const concluidas = minhas.filter(o => o.status === 'concluido')

  // Soma apenas os serviços atribuídos a este mecânico
  const totalMaoDeObra = ordens.reduce((s, o) => {
    if (o.servicos && o.servicos.length > 0) {
      return s + o.servicos
        .filter(sv => sv.funcionario === nome)
        .reduce((a, sv) => a + (parseFloat(sv.maoDeObra) || 0), 0)
    }
    // OS legada sem array de serviços: usa maoDeObra do nível principal
    if (o.funcionario === nome) return s + Number(o.maoDeObra || 0)
    return s
  }, 0)

  const totalValor = minhas.reduce((s, o) => s + Number(o.valor || 0), 0)
  const tempoTotal = concluidas.reduce((s, o) => {
    if (o.inicio && o.fim) return s + (o.fim - o.inicio)
    return s
  }, 0)
  return {
    total: minhas.length,
    concluidas: concluidas.length,
    emAndamento: minhas.filter(o => o.status === 'em_andamento').length,
    maoDeObra: totalMaoDeObra,
    totalValor,
    tempo: tempoTotal,
    ordens: minhas.slice().reverse().slice(0, 5),
  }
}

const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

export default function Funcionarios() {
  const [items, setItems] = useState(load)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [expanded, setExpanded] = useState(null)

  function refresh() { setItems(load()) }
  function openAdd() { setEditing(null); setForm(empty()); setModal(true) }
  function openEdit(item) {
    setEditing(item.id)
    setForm({ nome: item.nome, cargo: item.cargo, telefone: item.telefone, status: item.status })
    setModal(true)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.nome || !form.cargo) return
    const arr = load()
    if (editing) {
      arr[arr.findIndex(x => x.id === editing)] = { ...arr.find(x => x.id === editing), ...form }
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

  const STATUS_LABEL = {
    orcamento: 'Orçamento', aprovado: 'Aprovado', em_andamento: 'Em Serviço',
    aguardando: 'Aguardando', concluido: 'Concluído', cancelado: 'Cancelado',
  }

  function renderCard(f) {
    const r = calcResumoFuncionario(f.nome)
    const isOpen = expanded === f.id

    return (
      <div key={f.id} className="func-card">
        {/* Cabeçalho */}
        <div className="func-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar">{f.nome.charAt(0).toUpperCase()}</div>
            <div>
              <strong className="func-nome">{f.nome}</strong>
              <div style={{ fontSize: 13, color: 'var(--text-light)' }}>{f.cargo}</div>
              {f.telefone && <div style={{ fontSize: 12, color: 'var(--text-light)' }}>📞 {f.telefone}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className={`status-btn ${f.status}`} onClick={() => toggleStatus(f.id)}>
              {f.status === 'ativo' ? '● Ativo' : '○ Inativo'}
            </button>
            <button className="btn-edit" onClick={() => openEdit(f)}>✏️</button>
            <button className="btn-danger" onClick={() => handleDelete(f.id)}>🗑️</button>
          </div>
        </div>

        {/* Resumo de produção */}
        <div className="func-resumo-grid">
          <div className="func-resumo-item">
            <span className="func-resumo-label">OS Atribuídas</span>
            <strong>{r.total}</strong>
          </div>
          <div className="func-resumo-item">
            <span className="func-resumo-label">Concluídas</span>
            <strong style={{ color: '#10b981' }}>{r.concluidas}</strong>
          </div>
          <div className="func-resumo-item">
            <span className="func-resumo-label">Em Andamento</span>
            <strong style={{ color: '#3b82f6' }}>{r.emAndamento}</strong>
          </div>
          <div className="func-resumo-item">
            <span className="func-resumo-label">⏱️ Tempo Total</span>
            <strong>{formatMs(r.tempo)}</strong>
          </div>
          <div className="func-resumo-item highlight">
            <span className="func-resumo-label">💰 Mão de Obra</span>
            <strong style={{ color: '#000', fontSize: 18 }}>{fmt(r.maoDeObra)}</strong>
          </div>
          <div className="func-resumo-item">
            <span className="func-resumo-label">Total em OS</span>
            <strong style={{ color: '#10b981' }}>{fmt(r.totalValor)}</strong>
          </div>
        </div>

        {/* Histórico de OS */}
        {r.ordens.length > 0 && (
          <>
            <button className="func-toggle" onClick={() => setExpanded(isOpen ? null : f.id)}>
              {isOpen ? '▲ Ocultar histórico' : `▼ Ver últimas ${r.ordens.length} OS`}
            </button>
            {isOpen && (
              <table className="func-os-table">
                <thead>
                  <tr>
                    <th>OS</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Tempo</th>
                    <th>Mão de Obra</th>
                  </tr>
                </thead>
                <tbody>
                  {r.ordens.map(o => (
                    <tr key={o.id}>
                      <td><strong style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{o.numero}</strong></td>
                      <td>{o.clienteNome}</td>
                      <td>{o.servico || '—'}</td>
                      <td><span className="badge badge-gray" style={{ fontSize: 11 }}>{STATUS_LABEL[o.status] || o.status}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {o.inicio && o.fim ? formatMs(o.fim - o.inicio) : o.status === 'em_andamento' && o.inicio ? '▶ rodando' : '—'}
                      </td>
                      <td><strong style={{ color: o.maoDeObra ? '#000' : 'var(--text-light)' }}>{o.maoDeObra ? fmt(o.maoDeObra) : '—'}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <button className="btn-primary" onClick={openAdd}>+ Novo Funcionário</button>
      </div>

      <div className="func-stats">
        <div className="func-stat"><span>👥</span><div><strong>{items.length}</strong><small>Total</small></div></div>
        <div className="func-stat"><span>✅</span><div><strong>{ativos.length}</strong><small>Ativos</small></div></div>
        <div className="func-stat"><span>⏸️</span><div><strong>{inativos.length}</strong><small>Inativos</small></div></div>
        <div className="func-stat">
          <span>💰</span>
          <div>
            <strong>{fmt(items.reduce((s, f) => s + calcResumoFuncionario(f.nome).maoDeObra, 0))}</strong>
            <small>Total Mão de Obra</small>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">👷</div><p>Nenhum funcionário cadastrado.</p></div></div>
      ) : (
        <div className="func-cards-list">
          {ativos.length > 0 && (
            <div>
              <h3 className="func-section-title">Ativos</h3>
              {ativos.map(f => renderCard(f))}
            </div>
          )}
          {inativos.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 className="func-section-title" style={{ color: 'var(--text-light)' }}>Inativos</h3>
              {inativos.map(f => renderCard(f))}
            </div>
          )}
        </div>
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
