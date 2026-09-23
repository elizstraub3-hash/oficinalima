import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import './NotaFiscal.css'
import { loadEstoque } from './Estoque.jsx'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const MEIOS_PAG = [
  { v: '01', l: '💵 Dinheiro' },
  { v: '03', l: '💳 Cartão de Crédito' },
  { v: '04', l: '💳 Cartão de Débito' },
  { v: '17', l: '📱 PIX' },
  { v: '15', l: '🔄 Transferência' },
  { v: '99', l: '📋 Outros' },
]

const STATUS_LABELS = {
  pendente:    { label: '⏳ Pendente',    color: '#f59e0b' },
  autorizado:  { label: '✅ Autorizada',  color: '#10b981' },
  cancelado:   { label: '❌ Cancelada',   color: '#ef4444' },
  processando: { label: '🔄 Processando', color: '#6366f1' },
  rejeitado:   { label: '🚫 Rejeitada',   color: '#ef4444' },
}

function loadOS() { return JSON.parse(localStorage.getItem('ol_ordens') || '[]') }
function loadNFes() { return JSON.parse(localStorage.getItem('ol_nfes') || '[]') }
function saveNFes(d) { localStorage.setItem('ol_nfes', JSON.stringify(d)) }
const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

export default function NotaFiscal() {
  const [nfes, setNfes] = useState(loadNFes)
  const [ordens, setOrdens] = useState([])
  const [backendOk, setBackendOk] = useState(null)
  const [modal, setModal] = useState(false)
  const [cancelModal, setCancelModal] = useState(null)
  const [justificativa, setJustificativa] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    osId: '',
    destNome: '',
    destCpfCnpj: '',
    destEmail: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cep: '',
    municipio: 'Colombo',
    uf: 'PR',
    meioPag: '01',
    obs: '',
  })

  useEffect(() => {
    setOrdens(loadOS().filter(o => o.status !== 'cancelado'))
    fetch(`${API}/api/health`)
      .then(r => r.json())
      .then(d => setBackendOk(d.ok))
      .catch(() => setBackendOk(false))
  }, [])

  function refresh() { setNfes(loadNFes()) }

  function preencherOS(osId) {
    const os = ordens.find(o => String(o.id) === String(osId))
    if (!os) return
    const cli = JSON.parse(localStorage.getItem('ol_clientes') || '[]').find(c => c.id === os.clienteId)
    setForm(f => ({
      ...f,
      osId,
      destNome: cli?.nome || os.cliente || '',
      destCpfCnpj: cli?.cpf || cli?.cnpj || '',
      destEmail: cli?.email || '',
      obs: `OS #${os.numero || os.id} - ${os.veiculo || ''}`.trim(),
    }))
  }

  async function handleEmitir(e) {
    e.preventDefault()
    setErro('')
    const os = ordens.find(o => String(o.id) === String(form.osId))
    if (!os) return setErro('Selecione uma OS válida.')

    const estoque = loadEstoque()
    const itens = (os.itens || []).map(it => {
      const peca = it.pecaId ? estoque.find(p => String(p.id) === String(it.pecaId)) : null
      const qtd = Number(it.qtd) || 1
      const valorUnit = Number(it.valor ?? it.valorUnit) || 0
      return {
        descricao: it.desc || it.descricao || 'Peça/Material',
        codigo: it.cod || peca?.codigo || '',
        ncm: peca?.ncm || '',
        cfop: '5102',
        unidade: it.uni || 'UN',
        qtd, valorUnit, total: qtd * valorUnit,
      }
    }).filter(it => it.total > 0)

    if (!itens.length) return setErro('A OS não tem peças com valor. (Mão de obra vai em NFS-e, não em NF-e.)')

    setLoading(true)
    try {
      const res = await fetch(`${API}/api/nfe/emitir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: os.numero || os.id,
          destinatario: {
            nome: form.destNome,
            cpfCnpj: form.destCpfCnpj.replace(/\D/g, ''),
            email: form.destEmail,
            endereco: {
              logradouro: form.logradouro || 'A definir',
              numero: form.numero || 'SN',
              bairro: form.bairro || 'Centro',
              cep: (form.cep || '').replace(/\D/g, ''),
              uf: form.uf || 'PR',
              municipio: form.municipio || 'Colombo',
            },
          },
          itens,
          pagamento: { meio: form.meioPag },
          obs: form.obs,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.erro) throw new Error(JSON.stringify(data.erro))

      const novas = loadNFes()
      novas.push({
        id: data.nfe.id,
        osId: form.osId,
        osNumero: os.numero || os.id,
        destNome: form.destNome,
        valor: itens.reduce((s, it) => s + it.total, 0),
        status: data.nfe.status || 'processando',
        emitidaEm: new Date().toISOString(),
        nuvemId: data.nfe.id,
      })
      saveNFes(novas)
      refresh()
      setModal(false)
    } catch (err) {
      setErro(String(err.message))
    } finally {
      setLoading(false)
    }
  }

  async function consultarStatus(nfe) {
    try {
      const res = await fetch(`${API}/api/nfe/${nfe.nuvemId}`)
      const data = await res.json()
      const lista = loadNFes()
      const idx = lista.findIndex(n => n.id === nfe.id)
      if (idx >= 0) {
        lista[idx].status = data.status || lista[idx].status
        lista[idx].chave = data.chave_acesso || lista[idx].chave
        saveNFes(lista)
        refresh()
      }
    } catch { /* silencioso */ }
  }

  async function handleCancelar() {
    if (!cancelModal) return
    if (justificativa.length < 15) return setErro('Justificativa mínima de 15 caracteres.')
    setLoading(true)
    setErro('')
    try {
      const res = await fetch(`${API}/api/nfe/${cancelModal.nuvemId}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justificativa }),
      })
      const data = await res.json()
      if (!res.ok || data.erro) throw new Error(JSON.stringify(data.erro))
      const lista = loadNFes()
      const idx = lista.findIndex(n => n.id === cancelModal.id)
      if (idx >= 0) { lista[idx].status = 'cancelado'; saveNFes(lista) }
      refresh()
      setCancelModal(null)
      setJustificativa('')
    } catch (err) {
      setErro(String(err.message))
    } finally {
      setLoading(false)
    }
  }

  function abrirDANFE(nfe) {
    window.open(`${API}/api/nfe/${nfe.nuvemId}/danfe`, '_blank')
  }

  const totalEmitido = nfes.filter(n => n.status === 'autorizado').reduce((s, n) => s + Number(n.valor || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={`backend-badge ${backendOk === null ? 'checking' : backendOk ? 'online' : 'offline'}`}>
            {backendOk === null ? '⏳ Verificando backend...' : backendOk ? '🟢 Backend online' : '🔴 Backend offline'}
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setErro(''); setModal(true) }} disabled={!backendOk}>
          + Emitir NF-e
        </button>
      </div>

      {backendOk === false && (
        <div className="nfe-aviso-backend">
          <strong>⚙️ Backend não encontrado.</strong> Inicie o servidor com:
          <pre>cd backend && npm install && node server.js</pre>
          Confira se o arquivo <code>backend/.env</code> tem o <code>FOCUS_TOKEN</code> da Focus NFe.
        </div>
      )}

      <div className="nfe-resumo">
        <div className="nfe-card">
          <span>📄 Total emitidas</span>
          <strong>{nfes.length}</strong>
        </div>
        <div className="nfe-card verde">
          <span>✅ Autorizadas</span>
          <strong>{nfes.filter(n => n.status === 'autorizado').length}</strong>
        </div>
        <div className="nfe-card azul">
          <span>💰 Valor total autorizado</span>
          <strong>{fmt(totalEmitido)}</strong>
        </div>
      </div>

      {nfes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Nenhuma NF-e emitida ainda.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>OS / Ref.</th>
                <th>Destinatário</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Emitida em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...nfes].reverse().map(nfe => {
                const st = STATUS_LABELS[nfe.status] || { label: nfe.status, color: '#888' }
                return (
                  <tr key={nfe.id}>
                    <td><strong>OS #{nfe.osNumero}</strong></td>
                    <td>{nfe.destNome}</td>
                    <td><strong>{fmt(nfe.valor)}</strong></td>
                    <td><span className="badge-status" style={{ color: st.color, borderColor: st.color }}>{st.label}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {nfe.emitidaEm ? new Date(nfe.emitidaEm).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn-sm" onClick={() => consultarStatus(nfe)} title="Atualizar status">🔄</button>
                        {nfe.status === 'autorizado' && (
                          <>
                            <button className="btn-sm" onClick={() => abrirDANFE(nfe)} title="Ver DANFE">📄 DANFE</button>
                            <button className="btn-sm btn-danger-sm" onClick={() => { setErro(''); setCancelModal(nfe) }} title="Cancelar NF-e">✖ Cancelar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal emissão */}
      {modal && (
        <Modal title="Emitir NF-e" onClose={() => setModal(false)}>
          <form onSubmit={handleEmitir}>
            <div className="form-group">
              <label>Ordem de Serviço *</label>
              <select value={form.osId} onChange={e => { setForm(f => ({ ...f, osId: e.target.value })); preencherOS(e.target.value) }} required>
                <option value="">Selecione a OS...</option>
                {ordens.map(os => (
                  <option key={os.id} value={os.id}>
                    OS #{os.numero || os.id} — {os.cliente || os.veiculo || 'sem nome'} — {fmt(os.totalVenda || 0)}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="nfe-fieldset">
              <legend>👤 Destinatário</legend>
              <div className="form-group">
                <label>Nome / Razão Social *</label>
                <input value={form.destNome} onChange={e => setForm(f => ({ ...f, destNome: e.target.value }))} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>CPF / CNPJ *</label>
                  <input value={form.destCpfCnpj} onChange={e => setForm(f => ({ ...f, destCpfCnpj: e.target.value }))} placeholder="000.000.000-00" required />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input type="email" value={form.destEmail} onChange={e => setForm(f => ({ ...f, destEmail: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 3 }}>
                  <label>Logradouro</label>
                  <input value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} placeholder="Rua das Flores" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Número</label>
                  <input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="123" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bairro</label>
                  <input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>CEP</label>
                  <input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
                </div>
                <div className="form-group">
                  <label>Cidade</label>
                  <input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
                </div>
                <div className="form-group" style={{ flex: '0 0 80px' }}>
                  <label>UF</label>
                  <input value={form.uf} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} maxLength={2} />
                </div>
              </div>
            </fieldset>

            <div className="form-row">
              <div className="form-group">
                <label>Meio de Pagamento</label>
                <select value={form.meioPag} onChange={e => setForm(f => ({ ...f, meioPag: e.target.value }))}>
                  {MEIOS_PAG.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea rows={2} value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
            </div>

            {erro && <div className="nfe-erro">{erro}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Enviando...' : '📤 Emitir NF-e'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal cancelamento */}
      {cancelModal && (
        <Modal title="Cancelar NF-e" onClose={() => setCancelModal(null)}>
          <p style={{ marginBottom: 16, color: 'var(--text-light)' }}>
            Cancelar NF-e da OS <strong>#{cancelModal.osNumero}</strong> — {cancelModal.destNome}
          </p>
          <div className="form-group">
            <label>Justificativa (mínimo 15 caracteres) *</label>
            <textarea
              rows={3}
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
            />
            <small>{justificativa.length}/15 mínimo</small>
          </div>
          {erro && <div className="nfe-erro">{erro}</div>}
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setCancelModal(null)}>Voltar</button>
            <button className="btn-danger" onClick={handleCancelar} disabled={loading || justificativa.length < 15}>
              {loading ? '⏳...' : '❌ Confirmar cancelamento'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
