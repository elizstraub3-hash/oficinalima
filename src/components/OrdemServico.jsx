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
  servico: '', descricao: '', funcionario: '', valor: '', maoDeObra: '', status: 'orcamento',
  itens: [],
})

// ─── Gerador de PDF ──────────────────────────────────────────────────────────
function gerarPDF(ordem) {
  const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
  const hoje = new Date().toLocaleDateString('pt-BR')
  const st = STATUS[ordem.status]
  const logoUrl = window.location.origin + '/logo da oficina.png'

  const tempoStr = (() => {
    if (ordem.inicio && ordem.fim) {
      const ms = ordem.fim - ordem.inicio
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      return h > 0 ? `${h}h ${m}min` : `${m}min`
    }
    return null
  })()

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

  const totalPecas = (ordem.itens && ordem.itens.length > 0)
    ? ordem.itens.reduce((s, it) => s + Number(it.valor) * Number(it.qtd), 0)
    : 0
  const maoDeObra = Number(ordem.maoDeObra || 0)
  const totalGeral = totalPecas + maoDeObra || Number(ordem.valor || 0)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${ordem.numero} – Oficina Lima</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color: #111; background: white; padding: 36px; font-size: 13px; }
    @media print { body { padding: 16px; } .no-print { display:none !important; } }

    /* Cabeçalho preto */
    .header {
      background: #000;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .logo-wrap { display:flex; align-items:center; gap:14px; }
    .logo-img {
      width: 64px; height: 64px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.2);
      object-fit: contain;
      background: #111;
    }
    .logo-text h1 { font-size:20px; color:#fff; font-weight:800; }
    .logo-text p { color:rgba(255,255,255,0.5); font-size:11px; margin-top:2px; }
    .logo-text .telefone { color:rgba(255,255,255,0.7); font-size:12px; margin-top:4px; }
    .os-badge { text-align:right; }
    .os-numero { font-size:22px; font-weight:900; color:#fff; letter-spacing:1px; }
    .os-data { color:rgba(255,255,255,0.5); font-size:11px; margin-top:4px; }
    .status-badge {
      display:inline-block; padding:4px 14px; border-radius:20px;
      font-size:11px; font-weight:700; margin-top:6px;
      background:${st.bg}; color:${st.color};
    }

    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px; }
    .section { background:#fafafa; border-radius:10px; padding:14px 16px; }
    .section-title {
      font-size:10px; font-weight:700; color:#888;
      text-transform:uppercase; letter-spacing:1px;
      margin-bottom:10px; padding-bottom:6px;
      border-bottom:1px solid #e5e7eb;
    }
    .field { margin-bottom:6px; }
    .field label { font-size:10px; color:#aaa; font-weight:700; text-transform:uppercase; display:block; margin-bottom:1px; }
    .field span { font-size:13px; font-weight:700; color:#111; }

    table { width:100%; border-collapse:collapse; border-radius:10px; overflow:hidden; }
    table thead { background:#000; }
    table th { padding:10px 12px; text-align:left; font-size:11px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
    table th:nth-child(3), table th:nth-child(4), table th:nth-child(5) { text-align:right; }
    table td { padding:9px 12px; border-bottom:1px solid #f0f0f0; font-size:13px; }
    table td:nth-child(3), table td:nth-child(4), table td:nth-child(5) { text-align:right; }

    .subtotal-row td { background:#f5f5f5; font-weight:700; font-size:13px; }
    .mob-row td { background:#f0f0f0; font-weight:700; font-size:13px; color:#555; }
    .total-row td { background:#000; color:#fff; font-size:16px; font-weight:900; padding:13px 12px; }

    .obs-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 14px; font-size:13px; color:#374151; line-height:1.6; margin-top:14px; }

    .resp-box {
      background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px;
      padding:14px 18px; margin-top:14px;
      display:grid; grid-template-columns:repeat(3,1fr); gap:12px;
    }
    .resp-item label { font-size:10px; color:#6b7280; font-weight:700; text-transform:uppercase; display:block; margin-bottom:3px; }
    .resp-item span { font-size:14px; font-weight:800; color:#111; }
    .resp-item span.verde { color:#059669; }

    .footer {
      margin-top:28px; padding-top:16px;
      border-top:2px solid #000;
      display:flex; justify-content:space-between; align-items:flex-end;
    }
    .footer-left p { font-size:11px; color:#999; line-height:1.8; }
    .assinatura { text-align:center; }
    .assinatura .linha { border-top:1px solid #999; width:200px; margin:0 auto 5px; padding-top:5px; }
    .assinatura p { font-size:11px; color:#888; }

    .print-btn { display:block; margin:0 auto 20px; padding:13px 36px; background:#000; color:white; border:none; border-radius:8px; font-size:15px; font-weight:700; cursor:pointer; }
    .wpp-note { text-align:center; font-size:12px; color:#888; margin-bottom:24px; }

    .garantia-box {
      background:#f0fdf4; border:1.5px solid #86efac; border-radius:10px;
      padding:12px 16px; margin-top:14px; font-size:12px; color:#166534; line-height:1.7;
    }
    .garantia-box strong { font-size:13px; display:block; margin-bottom:4px; }

    .termo-box {
      background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #000;
      border-radius:8px; padding:12px 16px; margin-top:12px;
      font-size:11.5px; color:#374151; line-height:1.8;
    }
    .termo-box strong { display:block; font-size:12px; margin-bottom:5px; color:#000; text-transform:uppercase; letter-spacing:0.5px; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Salvar como PDF / Enviar WhatsApp</button>
  <p class="wpp-note no-print">Salve como PDF e envie pelo WhatsApp para o cliente.</p>

  <!-- CABECALHO PRETO COM LOGO -->
  <div class="header">
    <div class="logo-wrap">
      <img src="${logoUrl}" alt="Logo" class="logo-img" onerror="this.style.display='none'" />
      <div class="logo-text">
        <h1>Oficina Lima</h1>
        <p>Servicos Automotivos</p>
        <p class="telefone">(41) 9 9595-5516</p>
      </div>
    </div>
    <div class="os-badge">
      <div class="os-numero">${ordem.numero}</div>
      <div class="os-data">Emitido em: ${hoje}</div>
      <div class="status-badge">${st.label}</div>
    </div>
  </div>

  <!-- CLIENTE + VEICULO -->
  <div class="grid2">
    <div class="section">
      <div class="section-title">Dados do Cliente</div>
      <div class="field"><label>Nome</label><span>${ordem.clienteNome || '—'}</span></div>
      <div class="field"><label>Telefone</label><span>${ordem.clienteTelefone || '—'}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Dados do Veiculo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div class="field"><label>Placa</label><span>${ordem.placa || '—'}</span></div>
        <div class="field"><label>Modelo</label><span>${ordem.modelo || '—'}</span></div>
        <div class="field"><label>Ano</label><span>${ordem.ano || '—'}</span></div>
        <div class="field"><label>Cor</label><span>${ordem.cor || '—'}</span></div>
      </div>
    </div>
  </div>

  <!-- SERVICOS / PECAS -->
  <div style="margin-bottom:14px">
    <table>
      <thead>
        <tr>
          <th style="width:36px">#</th>
          <th>Descricao do Servico / Peca</th>
          <th style="width:50px">Qtd</th>
          <th style="width:100px">Unitario</th>
          <th style="width:110px">Total</th>
        </tr>
      </thead>
      <tbody>${itensHTML}</tbody>
      <tfoot>
        ${totalPecas > 0 ? `<tr class="subtotal-row"><td colspan="4">Subtotal Pecas</td><td>${fmt(totalPecas)}</td></tr>` : ''}
        ${maoDeObra > 0 ? `<tr class="mob-row"><td colspan="4">Mao de Obra (${ordem.funcionario || 'Mecanico'})</td><td>${fmt(maoDeObra)}</td></tr>` : ''}
        <tr class="total-row"><td colspan="4">TOTAL GERAL</td><td>${fmt(totalGeral)}</td></tr>
      </tfoot>
    </table>
  </div>

  ${ordem.descricao ? `<div class="obs-box"><strong>Obs:</strong> ${ordem.descricao}</div>` : ''}

  <!-- MECANICO RESPONSAVEL -->
  ${ordem.funcionario ? `
  <div class="resp-box">
    <div class="resp-item">
      <label>Mecanico Responsavel pelo Servico</label>
      <span>${ordem.funcionario}</span>
    </div>
    ${tempoStr ? `<div class="resp-item"><label>Tempo de Servico</label><span>${tempoStr}</span></div>` : ''}
    ${maoDeObra > 0 ? `<div class="resp-item"><label>Mao de Obra</label><span class="verde">${fmt(maoDeObra)}</span></div>` : ''}
  </div>` : ''}

  <!-- GARANTIA E VALIDADE -->
  <div class="garantia-box">
    <strong>Garantia e Validade do Orcamento</strong>
    Garantia de <strong>3 (tres) meses</strong> para todos os servicos aprovados e executados pela Oficina Lima, contados a partir da data de conclusao do servico.<br>
    A validade deste orcamento e de <strong>7 (sete) dias uteis</strong> a partir da data de emissao. Apos esse prazo, os valores poderao ser revisados.
  </div>

  <!-- TERMO DE RESPONSABILIDADE -->
  <div class="termo-box">
    <strong>Termo de Responsabilidade e Seguranca</strong>
    A Oficina Lima possui sistema de <strong>monitoramento por cameras</strong> em todas as dependencias do estabelecimento, com gravacao contínua de imagens e registros fotograficos.<br>
    Realizamos um <strong>checklist detalhado do estado do veiculo</strong> no momento da entrada — incluindo lataria, vidros, pneus, acessorios e itens internos — com fotos e registros documentados.<br>
    Em caso de qualquer divergencia relacionada ao estado do veiculo, as gravacoes e registros fotograficos ficam disponiveis para conferencia. Nosso compromisso e com a transparencia e a seguranca do seu patrimonio.
  </div>

  <!-- RODAPE -->
  <div class="footer">
    <div class="footer-left">
      <p><strong>Oficina Lima</strong> · (41) 9 9595-5516</p>
      <p>Sistema criado por <strong>Elizandra Lima</strong></p>
      <p>Criado por Elizandra Cardoso · © ${new Date().getFullYear()}</p>
    </div>
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
      maoDeObra: ordem.maoDeObra || '', status: ordem.status,
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
      arr[idx] = { ...old, ...form, valor: total, maoDeObra: parseFloat(form.maoDeObra) || 0, inicio, fim }
    } else {
      arr.push({
        ...form, id: nextId(arr), numero: nextNumero(arr), valor: total, maoDeObra: parseFloat(form.maoDeObra) || 0,
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
                <label>💰 Mão de Obra (R$)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={form.maoDeObra}
                  onChange={e => setForm(f => ({ ...f, maoDeObra: e.target.value }))}
                  placeholder="Valor da mão de obra do mecânico..."
                />
              </div>
              <div className="form-group">
                <label>Valor Total (R$) {form.itens?.length > 0 ? '— calculado automaticamente' : ''}</label>
                <input
                  type="number" min="0" step="0.01"
                  value={totalItensForm !== '' ? (totalItensForm + (parseFloat(form.maoDeObra) || 0)) || '' : form.valor}
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
