import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import './OrdemServico.css'

const KEY = 'ol_ordens'
const KEY_CLI = 'ol_clientes'

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
function nextNumero(arr) {
  if (!arr.length) return 'OS-001'
  const nums = arr.map(o => parseInt(o.numero?.replace('OS-', '') || '0'))
  return 'OS-' + String(Math.max(...nums) + 1).padStart(3, '0')
}

const STATUS = {
  orcamento:    { label: 'Orçamento',    color: '#8b5cf6', bg: '#ede9fe', icon: '💬' },
  aprovado:     { label: 'Aprovado',     color: '#0ea5e9', bg: '#e0f2fe', icon: '✅' },
  em_andamento: { label: 'Em Serviço',   color: '#3b82f6', bg: '#dbeafe', icon: '🔧' },
  aguardando:   { label: 'Aguardando',   color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  concluido:    { label: 'Concluído',    color: '#10b981', bg: '#d1fae5', icon: '✔️' },
  cancelado:    { label: 'Cancelado',    color: '#ef4444', bg: '#fee2e2', icon: '✖️' },
}

function formatMs(ms) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function LiveTimer({ inicio }) {
  const [elapsed, setElapsed] = useState(Date.now() - inicio)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - inicio), 1000)
    return () => clearInterval(id)
  }, [inicio])
  const h = elapsed / 3600000
  const cls = h < 2 ? 'green' : h < 4 ? 'yellow' : 'red'
  return <span className={`os-timer os-timer-${cls}`}>{formatMs(elapsed)}</span>
}

const emptyForm = () => ({
  clienteNome: '', clienteTelefone: '', placa: '', modelo: '', ano: '', cor: '',
  servico: '', descricao: '', funcionario: '', valor: '', status: 'orcamento',
  itens: [],
})

// ─── Gerador de PDF ──────────────────────────────────────────────────────────
function gerarPDF(ordem) {
  const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
  const hoje = new Date().toLocaleDateString('pt-BR')
  const st = STATUS[ordem.status]

  const itensHTML = (ordem.itens && ordem.itens.length > 0)
    ? ordem.itens.map((it, i) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.desc}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${it.qtd}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${fmt(it.valor)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${fmt(Number(it.valor) * Number(it.qtd))}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" style="padding:16px;text-align:center;color:#999">${ordem.servico || 'Serviço não especificado'}</td></tr>`

  const totalItens = (ordem.itens && ordem.itens.length > 0)
    ? ordem.itens.reduce((s, it) => s + Number(it.valor) * Number(it.qtd), 0)
    : Number(ordem.valor || 0)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${ordem.numero} – Oficina Lima</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color: #1a1a2e; background: white; padding: 32px; font-size: 13px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:3px solid #e63946; }
    .logo { display:flex; align-items:center; gap:12px; }
    .logo-icon { font-size:40px; }
    .logo-text h1 { font-size:22px; color:#1a1a2e; font-weight:800; }
    .logo-text p { color:#6b7280; font-size:12px; }
    .os-info { text-align:right; }
    .os-numero { font-size:20px; font-weight:800; color:#e63946; }
    .os-data { color:#6b7280; font-size:12px; margin-top:4px; }
    .status-badge { display:inline-block; padding:4px 14px; border-radius:20px; font-size:12px; font-weight:700; margin-top:6px; background:${st.bg}; color:${st.color}; }
    .section { margin-bottom:20px; }
    .section-title { font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; padding-bottom:4px; border-bottom:1px solid #e5e7eb; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .field label { font-size:11px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:2px; }
    .field span { font-size:14px; font-weight:600; color:#1a1a2e; }
    table { width:100%; border-collapse:collapse; }
    table thead { background:#f9fafb; }
    table th { padding:10px 12px; text-align:left; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; }
    table th:last-child, table td:last-child { text-align:right; }
    .total-row { background:#1a1a2e; color:white; }
    .total-row td { padding:12px 12px; font-size:15px; font-weight:800; }
    .obs-box { background:#f9fafb; border-radius:8px; padding:14px; font-size:13px; color:#374151; line-height:1.5; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; }
    .footer p { font-size:12px; color:#9ca3af; }
    .assinatura { text-align:center; }
    .assinatura .linha { border-top:1px solid #9ca3af; width:200px; margin:0 auto 6px; padding-top:6px; }
    .assinatura p { font-size:12px; color:#6b7280; }
    .print-btn { display:block; margin:20px auto; padding:12px 32px; background:#e63946; color:white; border:none; border-radius:8px; font-size:15px; font-weight:700; cursor:pointer; }
    .wpp-note { text-align:center; font-size:13px; color:#6b7280; margin-top:8px; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
  <p class="wpp-note no-print">Após salvar o PDF, envie pelo WhatsApp ao cliente.</p>

  <div class="header">
    <div class="logo">
      <div class="logo-icon">🔧</div>
      <div class="logo-text">
        <h1>Oficina Lima</h1>
        <p>Serviços Automotivos</p>
      </div>
    </div>
    <div class="os-info">
      <div class="os-numero">${ordem.numero}</div>
      <div class="os-data">Data: ${hoje}</div>
      <div class="status-badge">${st.icon} ${st.label}</div>
    </div>
  </div>

  <div class="grid2" style="margin-bottom:20px">
    <div class="section">
      <div class="section-title">👤 Dados do Cliente</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div class="field"><label>Nome</label><span>${ordem.clienteNome || '—'}</span></div>
        <div class="field"><label>Telefone</label><span>${ordem.clienteTelefone || '—'}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">🚗 Dados do Veículo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="field"><label>Placa</label><span>${ordem.placa || '—'}</span></div>
        <div class="field"><label>Modelo</label><span>${ordem.modelo || '—'}</span></div>
        <div class="field"><label>Ano</label><span>${ordem.ano || '—'}</span></div>
        <div class="field"><label>Cor</label><span>${ordem.cor || '—'}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔧 Serviços / Peças</div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Descrição</th>
          <th style="width:60px;text-align:center">Qtd</th>
          <th style="width:100px;text-align:right">Unit.</th>
          <th style="width:110px;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itensHTML}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4">TOTAL</td>
          <td>${fmt(totalItens)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${ordem.descricao ? `
  <div class="section">
    <div class="section-title">📝 Observações</div>
    <div class="obs-box">${ordem.descricao}</div>
  </div>` : ''}

  ${ordem.funcionario ? `
  <div class="section">
    <div class="section-title">👷 Responsável</div>
    <div class="field"><span>${ordem.funcionario}</span></div>
  </div>` : ''}

  <div class="footer">
    <p>Criado por <strong>Elizandra Cardoso</strong> · Oficina Lima © ${new Date().getFullYear()}</p>
    <div class="assinatura">
      <div class="linha"></div>
      <p>Assinatura do Cliente</p>
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}
// ─────────────────────────────────────────────────────────────────────────────

export default function OrdemServico() {
  const [ordens, setOrdens] = useState(load)
  const [modal, setModal] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const [novoItem, setNovoItem] = useState({ desc: '', qtd: 1, valor: '' })

  const clientes = JSON.parse(localStorage.getItem(KEY_CLI) || '[]')
  const servicos = JSON.parse(localStorage.getItem('ol_servicos') || '[]')
  const funcionarios = JSON.parse(localStorage.getItem('ol_funcionarios') || '[]').filter(f => f.status === 'ativo')

  function refresh() { setOrdens(load()) }

  function openAdd() { setEditing(null); setForm(emptyForm()); setViewing(null); setModal(true) }

  function openEdit(ordem) {
    setEditing(ordem.id)
    setForm({
      clienteNome: ordem.clienteNome, clienteTelefone: ordem.clienteTelefone,
      placa: ordem.placa, modelo: ordem.modelo, ano: ordem.ano || '', cor: ordem.cor || '',
      servico: ordem.servico, descricao: ordem.descricao || '',
      funcionario: ordem.funcionario || '', valor: ordem.valor || '',
      status: ordem.status,
      itens: ordem.itens || [],
    })
    setViewing(null)
    setModal(true)
  }

  function selectCliente(nome) {
    const c = clientes.find(x => x.nome === nome)
    if (c) setForm(f => ({ ...f, clienteNome: c.nome, clienteTelefone: c.telefone || '' }))
    else setForm(f => ({ ...f, clienteNome: nome }))
  }

  function adicionarItem() {
    if (!novoItem.desc || !novoItem.valor) return
    setForm(f => ({ ...f, itens: [...(f.itens || []), { ...novoItem, id: Date.now() }] }))
    setNovoItem({ desc: '', qtd: 1, valor: '' })
  }

  function removerItem(id) {
    setForm(f => ({ ...f, itens: f.itens.filter(it => it.id !== id) }))
  }

  function calcTotal() {
    if (!form.itens || !form.itens.length) return ''
    return form.itens.reduce((s, it) => s + Number(it.valor) * Number(it.qtd), 0)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.clienteNome || !form.placa) return
    const arr = load()
    const total = calcTotal() || parseFloat(form.valor) || 0
    if (editing) {
      const idx = arr.findIndex(x => x.id === editing)
      const old = arr[idx]
      let inicio = old.inicio, fim = old.fim
      if (form.status === 'em_andamento' && !inicio) inicio = Date.now()
      if ((form.status === 'concluido' || form.status === 'cancelado') && !fim) fim = Date.now()
      arr[idx] = { ...old, ...form, valor: total, inicio, fim }
    } else {
      arr.push({
        ...form, id: nextId(arr), numero: nextNumero(arr), valor: total,
        inicio: form.status === 'em_andamento' ? Date.now() : null,
        fim: null, data: new Date().toISOString().split('T')[0],
      })
      if (form.clienteNome) {
        const clis = JSON.parse(localStorage.getItem(KEY_CLI) || '[]')
        if (!clis.find(c => c.nome.toLowerCase() === form.clienteNome.toLowerCase())) {
          clis.push({ id: nextId(clis), nome: form.clienteNome, telefone: form.clienteTelefone, email: '', cpf: '', endereco: '', obs: '' })
          localStorage.setItem(KEY_CLI, JSON.stringify(clis))
        }
      }
    }
    save(arr)
    setModal(false)
    refresh()
  }

  function handleChangeStatus(id, novoStatus) {
    const arr = load()
    const idx = arr.findIndex(x => x.id === id)
    const old = arr[idx]
    let inicio = old.inicio, fim = old.fim
    if (novoStatus === 'em_andamento' && !inicio) inicio = Date.now()
    if ((novoStatus === 'concluido' || novoStatus === 'cancelado') && !fim) fim = Date.now()
    arr[idx] = { ...old, status: novoStatus, inicio, fim }
    save(arr)
    refresh()
    setViewing(arr[idx])
  }

  function handleDelete(id) {
    if (!confirm('Excluir esta ordem de serviço?')) return
    save(load().filter(x => x.id !== id))
    setViewing(null)
    refresh()
  }

  const filtered = ordens.filter(o => {
    if (filtroStatus !== 'todos' && o.status !== filtroStatus) return false
    const q = busca.toLowerCase()
    if (q && !o.clienteNome.toLowerCase().includes(q) && !o.placa.toLowerCase().includes(q) && !(o.numero || '').toLowerCase().includes(q)) return false
    return true
  })

  const counts = Object.keys(STATUS).reduce((acc, s) => { acc[s] = ordens.filter(o => o.status === s).length; return acc }, {})
  const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
  const totalItensForm = calcTotal()

  return (
    <div>
      <div className="page-header">
        <h1>📋 Ordens de Serviço</h1>
        <button className="btn-primary" onClick={openAdd}>+ Nova OS</button>
      </div>

      {/* Barra de status / filtro */}
      <div className="os-status-bar">
        <button className={`os-status-chip ${filtroStatus === 'todos' ? 'active' : ''}`} onClick={() => setFiltroStatus('todos')}>
          Todas ({ordens.length})
        </button>
        {Object.entries(STATUS).map(([k, v]) => (
          <button
            key={k}
            className={`os-status-chip ${filtroStatus === k ? 'active' : ''}`}
            style={filtroStatus === k ? { background: v.color, borderColor: v.color, color: 'white' } : {}}
            onClick={() => setFiltroStatus(k)}
          >
            {v.icon} {v.label} ({counts[k]})
          </button>
        ))}
      </div>

      <div className="card">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente, placa ou número da OS..." />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><p>Nenhuma OS encontrada.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nº OS</th>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Serviço</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Tempo</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map(o => {
                const st = STATUS[o.status]
                return (
                  <tr key={o.id} className="os-row" onClick={() => setViewing(o)} style={{ cursor: 'pointer' }}>
                    <td><strong className="os-numero">{o.numero}</strong></td>
                    <td>
                      <strong>{o.clienteNome}</strong>
                      {o.clienteTelefone && <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.clienteTelefone}</div>}
                    </td>
                    <td>
                      <strong>{o.placa}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.modelo} {o.ano}</div>
                    </td>
                    <td>{o.servico || '—'}</td>
                    <td>{o.funcionario || '—'}</td>
                    <td><span className="badge" style={{ color: st.color, background: st.bg }}>{st.icon} {st.label}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      {o.status === 'em_andamento' && o.inicio
                        ? <LiveTimer inicio={o.inicio} />
                        : o.inicio && o.fim
                          ? <span className="badge badge-gray">{formatMs(o.fim - o.inicio)}</span>
                          : <span style={{ color: 'var(--text-light)' }}>—</span>}
                    </td>
                    <td><strong style={{ color: '#10b981' }}>{fmt(o.valor)}</strong></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-pdf" onClick={() => gerarPDF(o)} title="Gerar PDF">📄</button>
                        <button className="btn-edit" onClick={() => openEdit(o)}>✏️</button>
                        <button className="btn-danger" onClick={() => handleDelete(o.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de detalhes */}
      {viewing && !modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewing(null)}>
          <div className="modal-box os-detail-box">
            <div className="modal-header">
              <h2>📋 {viewing.numero}</h2>
              <button className="modal-close" onClick={() => setViewing(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Troca de status inline */}
              <div className="os-flow">
                {Object.entries(STATUS).map(([k, v]) => (
                  <button
                    key={k}
                    className={`os-flow-btn ${viewing.status === k ? 'active' : ''}`}
                    style={viewing.status === k ? { background: v.color, borderColor: v.color, color: 'white' } : {}}
                    onClick={() => handleChangeStatus(viewing.id, k)}
                  >
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>

              <div className="os-detail-grid">
                <div className="os-detail-section">
                  <h4>👤 Cliente</h4>
                  <p><strong>{viewing.clienteNome}</strong></p>
                  {viewing.clienteTelefone && <p>📞 {viewing.clienteTelefone}</p>}
                </div>
                <div className="os-detail-section">
                  <h4>🚗 Veículo</h4>
                  <p><strong>{viewing.placa}</strong> · {viewing.modelo}</p>
                  {viewing.ano && <p>Ano: {viewing.ano} {viewing.cor ? `· Cor: ${viewing.cor}` : ''}</p>}
                </div>
                <div className="os-detail-section">
                  <h4>🔧 Serviço</h4>
                  <p><strong>{viewing.servico || '—'}</strong></p>
                  {viewing.descricao && <p style={{ color: 'var(--text-light)', fontSize: 13 }}>{viewing.descricao}</p>}
                </div>
                <div className="os-detail-section">
                  <h4>👷 Responsável</h4>
                  <p>{viewing.funcionario || '—'}</p>
                </div>
                <div className="os-detail-section">
                  <h4>⏱️ Tempo</h4>
                  {viewing.status === 'em_andamento' && viewing.inicio
                    ? <LiveTimer inicio={viewing.inicio} />
                    : viewing.inicio && viewing.fim
                      ? <p className="os-timer os-timer-green">{formatMs(viewing.fim - viewing.inicio)}</p>
                      : <p>—</p>}
                  {viewing.inicio && <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Entrada: {new Date(viewing.inicio).toLocaleString('pt-BR')}</p>}
                  {viewing.fim && <p style={{ fontSize: 12, color: 'var(--text-light)' }}>Saída: {new Date(viewing.fim).toLocaleString('pt-BR')}</p>}
                </div>
                <div className="os-detail-section">
                  <h4>💰 Total</h4>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{fmt(viewing.valor)}</p>
                </div>
              </div>

              {/* Itens */}
              {viewing.itens && viewing.itens.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 12, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>📦 Itens / Peças</h4>
                  <table style={{ fontSize: 13 }}>
                    <thead><tr><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
                    <tbody>
                      {viewing.itens.map(it => (
                        <tr key={it.id}>
                          <td>{it.desc}</td>
                          <td>{it.qtd}</td>
                          <td>R$ {Number(it.valor).toFixed(2).replace('.', ',')}</td>
                          <td><strong>R$ {(Number(it.valor) * Number(it.qtd)).toFixed(2).replace('.', ',')}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button className="btn-danger" onClick={() => handleDelete(viewing.id)}>🗑️ Excluir</button>
                <button className="btn-pdf-lg" onClick={() => gerarPDF(viewing)}>📄 Gerar PDF / WhatsApp</button>
                <button className="btn-secondary" onClick={() => setViewing(null)}>Fechar</button>
                <button className="btn-primary" onClick={() => openEdit(viewing)}>✏️ Editar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar / editar */}
      {modal && (
        <Modal title={editing ? `Editar ${form.numero || 'OS'}` : 'Nova Ordem de Serviço'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <p className="os-section-title">👤 Dados do Cliente</p>
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Cliente *</label>
                <input list="clientes-list" value={form.clienteNome} onChange={e => selectCliente(e.target.value)} placeholder="Nome ou selecione..." required />
                <datalist id="clientes-list">{clientes.map(c => <option key={c.id} value={c.nome} />)}</datalist>
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input value={form.clienteTelefone} onChange={e => setForm(f => ({ ...f, clienteTelefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <p className="os-section-title">🚗 Dados do Veículo</p>
            <div className="form-row">
              <div className="form-group">
                <label>Placa *</label>
                <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" maxLength={8} required />
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

            <p className="os-section-title">🔧 Serviço e Status</p>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Serviço</label>
                <input list="servicos-list" value={form.servico} onChange={e => setForm(f => ({ ...f, servico: e.target.value }))} placeholder="Selecione ou digite..." />
                <datalist id="servicos-list">{servicos.map(s => <option key={s.id} value={s.nome} />)}</datalist>
              </div>
              <div className="form-group">
                <label>Responsável</label>
                <select value={form.funcionario} onChange={e => setForm(f => ({ ...f, funcionario: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome} – {f.cargo}</option>)}
                </select>
              </div>
            </div>

            {/* Seletor visual de status */}
            <div className="form-group">
              <label>Status</label>
              <div className="os-status-select">
                {Object.entries(STATUS).map(([k, v]) => (
                  <button
                    type="button"
                    key={k}
                    className={`os-status-opt ${form.status === k ? 'active' : ''}`}
                    style={form.status === k ? { background: v.color, borderColor: v.color, color: 'white' } : {}}
                    onClick={() => setForm(f => ({ ...f, status: k }))}
                  >
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Observações / Descrição</label>
              <textarea rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes, peças necessárias, defeitos relatados..." />
            </div>

            <p className="os-section-title">📦 Itens / Peças</p>
            <div className="os-itens-add">
              <input
                placeholder="Descrição do item / peça"
                value={novoItem.desc}
                onChange={e => setNovoItem(n => ({ ...n, desc: e.target.value }))}
                style={{ flex: 3 }}
              />
              <input
                type="number" min="1" placeholder="Qtd"
                value={novoItem.qtd}
                onChange={e => setNovoItem(n => ({ ...n, qtd: e.target.value }))}
                style={{ flex: 1 }}
              />
              <input
                type="number" min="0" step="0.01" placeholder="Valor unit."
                value={novoItem.valor}
                onChange={e => setNovoItem(n => ({ ...n, valor: e.target.value }))}
                style={{ flex: 1.5 }}
              />
              <button type="button" className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '10px 14px' }} onClick={adicionarItem}>+ Add</button>
            </div>

            {form.itens && form.itens.length > 0 && (
              <table style={{ marginBottom: 12, fontSize: 13 }}>
                <thead><tr><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {form.itens.map(it => (
                    <tr key={it.id}>
                      <td>{it.desc}</td>
                      <td>{it.qtd}</td>
                      <td>R$ {Number(it.valor).toFixed(2).replace('.', ',')}</td>
                      <td><strong>R$ {(Number(it.valor) * Number(it.qtd)).toFixed(2).replace('.', ',')}</strong></td>
                      <td><button type="button" className="btn-danger" onClick={() => removerItem(it.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Valor Total (R$) {form.itens?.length > 0 ? '— calculado automaticamente' : ''}</label>
                <input
                  type="number" min="0" step="0.01"
                  value={totalItensForm !== '' ? totalItensForm : form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  readOnly={form.itens?.length > 0}
                  style={form.itens?.length > 0 ? { background: '#f3f4f6', fontWeight: 700 } : {}}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing ? 'Salvar' : 'Criar OS'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
