import { useState, useEffect, useRef } from 'react'
import Modal from './Modal.jsx'
import './Temporizadores.css'

const KEY = 'ol_timers'
const KEY_HIST = 'ol_timers_hist'
const KEY_ALERTAS = 'ol_timer_alertas'

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function loadHist() { return JSON.parse(localStorage.getItem(KEY_HIST) || '[]') }
function loadAlertas() { return JSON.parse(localStorage.getItem(KEY_ALERTAS) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function saveHist(d) { localStorage.setItem(KEY_HIST, JSON.stringify(d)) }
function saveAlertas(d) { localStorage.setItem(KEY_ALERTAS, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ placa: '', proprietario: '', servico: '', funcionario: '' })

function formatMs(ms) {
  if (!ms || ms < 0) return '0:00:00'
  const total = Math.floor(ms / 1000)
  const dias = Math.floor(total / 86400)
  const h    = Math.floor((total % 86400) / 3600)
  const m    = Math.floor((total % 3600) / 60)
  const s    = total % 60
  const mm   = String(m).padStart(2, '0')
  const ss   = String(s).padStart(2, '0')
  if (dias > 0) return `${dias}d ${h}:${mm}:${ss}`
  if (h > 0)    return `${h}:${mm}:${ss}`
  return `0:${mm}:${ss}`
}

function getColor(ms) {
  const h = ms / 3600000
  if (h >= 10) return 'red'
  if (h < 2) return 'green'
  if (h < 4) return 'yellow'
  return 'red'
}

function TimerCell({ inicio, placa, onDemora }) {
  const [elapsed, setElapsed] = useState(Date.now() - inicio)
  const alertadoRef = useRef(false)
  useEffect(() => {
    const id = setInterval(() => {
      const e = Date.now() - inicio
      setElapsed(e)
      if (e >= 10 * 3600000 && !alertadoRef.current) {
        alertadoRef.current = true
        onDemora && onDemora()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [inicio])
  const color = getColor(elapsed)
  return (
    <span className={`timer-display timer-${color}`} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>
      {formatMs(elapsed)}
    </span>
  )
}

function loadOrdens() {
  return JSON.parse(localStorage.getItem('ol_ordens') || '[]').filter(o => o.status === 'em_andamento' && o.inicio)
}

export default function Temporizadores() {
  const [ativos, setAtivos] = useState(load)
  const [ordensAtivas, setOrdensAtivas] = useState(loadOrdens)
  const [hist, setHist] = useState(loadHist)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty())
  const [funcionarios] = useState(() => JSON.parse(localStorage.getItem('ol_funcionarios') || '[]').filter(f => f.status === 'ativo'))
  const [servicos] = useState(() => JSON.parse(localStorage.getItem('ol_servicos') || '[]'))
  const [alertaDemora, setAlertaDemora] = useState(null) // { placa, id, tipo }
  const [motivoDemora, setMotivoDemora] = useState('')

  function refresh() { setAtivos(load()); setHist(loadHist()); setOrdensAtivas(loadOrdens()) }

  function handleDemora(placa, id, tipo) {
    const alertas = loadAlertas()
    const chave = `${tipo}-${id}`
    if (alertas.includes(chave)) return
    saveAlertas([...alertas, chave])
    setMotivoDemora('')
    setAlertaDemora({ placa, id, tipo })
  }

  function salvarMotivo() {
    if (!motivoDemora.trim()) return
    const hArr = loadHist()
    hArr.unshift({
      id: Date.now(),
      placa: alertaDemora.placa,
      proprietario: '—',
      servico: 'Alerta: +10h sem conclusão',
      funcionario: '—',
      inicio: Date.now() - 10 * 3600000,
      fim: null,
      total: null,
      motivo: motivoDemora,
      status: 'alerta',
    })
    saveHist(hArr)
    setAlertaDemora(null)
    setMotivoDemora('')
    refresh()
  }

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
        <button className="btn-primary" onClick={() => { setForm(empty()); setModal(true) }}>
          + Adicionar Carro
        </button>
      </div>

      <div className="timer-legenda">
        <span className="leg-item green">● menos de 2h</span>
        <span className="leg-item yellow">● 2h – 4h</span>
        <span className="leg-item red">● mais de 4h / +10h alerta</span>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>🚗 Carros em Atendimento ({ativos.length + ordensAtivas.length})</h3>
        {ativos.length === 0 && ordensAtivas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <p>Nenhum carro em atendimento no momento.</p>
          </div>
        ) : (
          <div className="timer-cards">
            {/* OS Em Serviço */}
            {ordensAtivas.map(o => {
              const servicoDesc = o.servicos && o.servicos.length
                ? o.servicos.map(sv => sv.desc).filter(Boolean).join(', ')
                : (o.servico || '')
              const mecDesc = o.servicos && o.servicos.length
                ? [...new Set(o.servicos.map(sv => sv.funcionario).filter(Boolean))].join(', ')
                : (o.funcionario || '')
              return (
                <div key={`os-${o.id}`} className="timer-card timer-card-os">
                  <div className="timer-os-badge">OS {o.numero}</div>
                  <div className="timer-header">
                    <div className="timer-placa">{o.placa}</div>
                    <TimerCell inicio={o.inicio} placa={o.placa} onDemora={() => handleDemora(o.placa, o.id, 'os')} />
                  </div>
                  <div className="timer-info">
                    <div><span>👤</span> {o.clienteNome}</div>
                    {o.modelo && <div><span>🚗</span> {o.modelo} {o.ano}</div>}
                    {servicoDesc && <div><span>🔧</span> {servicoDesc}</div>}
                    {mecDesc && <div><span>👷</span> {mecDesc}</div>}
                    <div><span>🕐</span> Entrada: {new Date(o.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="timer-os-note">Gerencie esta OS em Ordens de Serviço</div>
                </div>
              )
            })}
            {/* Timers manuais */}
            {ativos.map(t => (
              <div key={t.id} className="timer-card">
                <div className="timer-header">
                  <div className="timer-placa">{t.placa}</div>
                  <TimerCell inicio={t.inicio} placa={t.placa} onDemora={() => handleDemora(t.placa, t.id, 'manual')} />
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
            <h3>📋 Histórico de Serviços ({hist.length})</h3>
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
                <tr key={h.id} style={h.status === 'alerta' ? { background: '#fef2f2' } : {}}>
                  <td><strong>{h.placa}</strong></td>
                  <td>{h.proprietario}</td>
                  <td>
                    {h.status === 'alerta'
                      ? <span style={{ color: '#ef4444', fontWeight: 700 }}>🚨 {h.servico}</span>
                      : (h.servico || '—')}
                    {h.motivo && <div style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', borderRadius: 4, padding: '2px 6px', marginTop: 2 }}>Motivo: {h.motivo}</div>}
                  </td>
                  <td>{h.funcionario || '—'}</td>
                  <td>{h.inicio ? new Date(h.inicio).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}</td>
                  <td>{h.fim ? new Date(h.fim).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}</td>
                  <td>{h.total ? <span className="badge badge-gray">{formatMs(h.total)}</span> : <span style={{ color: '#ef4444', fontSize: 12 }}>+10h</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal alerta de demora */}
      {alertaDemora && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '2px solid #ef4444' }}>
              <h2 style={{ color: '#ef4444' }}>🚨 Serviço com +10 horas!</h2>
            </div>
            <div className="modal-body">
              <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 14, color: '#991b1b', lineHeight: 1.6 }}>
                <strong>Leandra, o carro <span style={{ fontFamily: 'monospace', fontSize: 16 }}>{alertaDemora.placa}</span> está há mais de 10 horas em serviço!</strong><br />
                Por favor, informe o motivo da demora para que possamos registrar no histórico.
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 700 }}>Qual o motivo da demora? *</label>
                <textarea
                  rows={3}
                  value={motivoDemora}
                  onChange={e => setMotivoDemora(e.target.value)}
                  placeholder="Ex: Aguardando peça, problema complexo, carro parado no final de semana..."
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #ef4444', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setAlertaDemora(null)}>Fechar</button>
                <button className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={salvarMotivo} disabled={!motivoDemora.trim()}>
                  Registrar Motivo
                </button>
              </div>
            </div>
          </div>
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
