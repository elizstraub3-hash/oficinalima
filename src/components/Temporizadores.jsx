import { useState, useEffect, useRef } from 'react'
import Modal from './Modal.jsx'
import './Temporizadores.css'

const KEY = 'ol_timers'
const KEY_HIST = 'ol_timers_hist'

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function loadHist() { return JSON.parse(localStorage.getItem(KEY_HIST) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function saveHist(d) { localStorage.setItem(KEY_HIST, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ placa: '', proprietario: '', servico: '', funcionario: '' })

function formatMs(ms) {
  if (!ms || ms < 0) return '0min'
  const total = Math.floor(ms / 1000)
  const dias = Math.floor(total / 86400)
  const h    = Math.floor((total % 86400) / 3600)
  const m    = Math.floor((total % 3600) / 60)
  if (dias > 0) return `${dias}d ${h}h ${m}min`
  if (h > 0)    return `${h}h ${m}min`
  return `${m}min`
}

function getColor(ms) {
  const h = ms / 3600000
  if (h < 2) return 'green'
  if (h < 4) return 'yellow'
  return 'red'
}

function TimerCell({ inicio }) {
  const [elapsed, setElapsed] = useState(Date.now() - inicio)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - inicio), 1000)
    return () => clearInterval(id)
  }, [inicio])
  const color = getColor(elapsed)
  return (
    <span className={`timer-display timer-${color}`}>
      {formatMs(elapsed)}
    </span>
  )
}

export default function Temporizadores() {
  const [ativos, setAtivos] = useState(load)
  const [hist, setHist] = useState(loadHist)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty())
  const [funcionarios] = useState(() => JSON.parse(localStorage.getItem('ol_funcionarios') || '[]').filter(f => f.status === 'ativo'))
  const [servicos] = useState(() => JSON.parse(localStorage.getItem('ol_servicos') || '[]'))

  function refresh() { setAtivos(load()); setHist(loadHist()) }

  function handleAdd(e) {
    e.preventDefault()
    if (!form.placa || !form.proprietario) return
    const arr = load()
    arr.push({ ...form, id: nextId(arr), inicio: Date.now(), status: 'ativo' })
    save(arr)
    setModal(false)
    setForm(empty())
    refresh()
  }

  function handleConcluir(id) {
    if (!confirm('Marcar como concluído?')) return
    const arr = load()
    const item = arr.find(x => x.id === id)
    if (!item) return
    const fim = Date.now()
    const hArr = loadHist()
    hArr.unshift({ ...item, fim, total: fim - item.inicio, status: 'concluido' })
    saveHist(hArr)
    save(arr.filter(x => x.id !== id))
    refresh()
  }

  function handleRemover(id) {
    if (!confirm('Remover este carro da fila?')) return
    save(load().filter(x => x.id !== id))
    refresh()
  }

  function clearHist() {
    if (!confirm('Limpar todo o histórico?')) return
    saveHist([])
    refresh()
  }

  return (
    <div>
      <div className="page-header">
        <h1>⏱️ Temporizadores</h1>
        <button className="btn-primary" onClick={() => { setForm(empty()); setModal(true) }}>
          + Adicionar Carro
        </button>
      </div>

      <div className="timer-legenda">
        <span className="leg-item green">● menos de 2h</span>
        <span className="leg-item yellow">● 2h – 4h</span>
        <span className="leg-item red">● mais de 4h</span>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>🚗 Carros em Atendimento ({ativos.length})</h3>
        {ativos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <p>Nenhum carro em atendimento no momento.</p>
          </div>
        ) : (
          <div className="timer-cards">
            {ativos.map(t => (
              <div key={t.id} className="timer-card">
                <div className="timer-header">
                  <div className="timer-placa">{t.placa}</div>
                  <TimerCell inicio={t.inicio} />
                </div>
                <div className="timer-info">
                  <div><span>👤</span> {t.proprietario}</div>
                  {t.servico && <div><span>🔧</span> {t.servico}</div>}
                  {t.funcionario && <div><span>👷</span> {t.funcionario}</div>}
                  <div><span>🕐</span> Entrada: {new Date(t.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="timer-actions">
                  <button className="btn-concluir" onClick={() => handleConcluir(t.id)}>✅ Concluído</button>
                  <button className="btn-danger" onClick={() => handleRemover(t.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hist.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>📋 Histórico ({hist.length})</h3>
            <button className="btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={clearHist}>Limpar histórico</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Proprietário</th>
                <th>Serviço</th>
                <th>Responsável</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Tempo Total</th>
              </tr>
            </thead>
            <tbody>
              {hist.map(h => (
                <tr key={h.id}>
                  <td><strong>{h.placa}</strong></td>
                  <td>{h.proprietario}</td>
                  <td>{h.servico || '—'}</td>
                  <td>{h.funcionario || '—'}</td>
                  <td>{new Date(h.inicio).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
                  <td>{new Date(h.fim).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
                  <td><span className="badge badge-gray">{formatMs(h.total)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="Adicionar Carro" onClose={() => setModal(false)}>
          <form onSubmit={handleAdd}>
            <div className="form-row">
              <div className="form-group">
                <label>Placa *</label>
                <input
                  value={form.placa}
                  onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))}
                  placeholder="ABC-1234"
                  maxLength={8}
                  required
                />
              </div>
              <div className="form-group">
                <label>Proprietário *</label>
                <input value={form.proprietario} onChange={e => setForm(f => ({ ...f, proprietario: e.target.value }))} placeholder="Nome do cliente" required />
              </div>
            </div>
            <div className="form-group">
              <label>Serviço</label>
              <select value={form.servico} onChange={e => setForm(f => ({ ...f, servico: e.target.value }))}>
                <option value="">Selecione um serviço...</option>
                {servicos.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Responsável</label>
              <select value={form.funcionario} onChange={e => setForm(f => ({ ...f, funcionario: e.target.value }))}>
                <option value="">Selecione um funcionário...</option>
                {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome} – {f.cargo}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Iniciar Temporizador</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
