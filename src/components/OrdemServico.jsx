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

// Horário de funcionamento da oficina
// Seg=1, Ter=2, Qua=3, Qui=4, Sex=5, Sáb=6, Dom=0
const HORARIO_OFICINA = [
  { dia: 1, abre: 8, fecha: 18 },
  { dia: 2, abre: 8, fecha: 18 },
  { dia: 3, abre: 8, fecha: 18 },
  { dia: 4, abre: 8, fecha: 18 },
  { dia: 5, abre: 8, fecha: 18 },
  { dia: 6, abre: 8, fecha: 12 },
]

function calcTempoTrabalho(inicio) {
  if (!inicio) return 0
  const agora = Date.now()
  if (inicio >= agora) return 0
  let total = 0
  const cursor = new Date(inicio)
  cursor.setHours(0, 0, 0, 0)
  const fimDia = new Date(agora)
  fimDia.setHours(23, 59, 59, 999)
  while (cursor <= fimDia) {
    const diaSemana = cursor.getDay()
    const horario = HORARIO_OFICINA.find(h => h.dia === diaSemana)
    if (horario) {
      const base = cursor.getTime()
      const abreMs  = base + horario.abre  * 3600000
      const fechaMs = base + horario.fecha * 3600000
      const start = Math.max(inicio, abreMs)
      const end   = Math.min(agora,  fechaMs)
      if (end > start) total += end - start
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return total
}

function formatTempo(ms) {
  if (!ms || ms < 0) return '0h 0min 0s'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}min ${s}s`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function formatMs(ms) {
  return formatTempo(ms)
}

function LiveTimer({ inicio }) {
  const [elapsed, setElapsed] = useState(() => calcTempoTrabalho(inicio))
  useEffect(() => {
    const id = setInterval(() => setElapsed(calcTempoTrabalho(inicio)), 1000)
    return () => clearInterval(id)
  }, [inicio])
  const horas = elapsed / 3600000
  const cls = horas >= 10 ? 'red' : horas >= 4 ? 'yellow' : 'green'
  return <span className={`os-timer os-timer-${cls}`}>{formatTempo(elapsed)}</span>
}

const emptyForm = () => ({
  clienteNome: '', clienteTelefone: '', placa: '', modelo: '', ano: '', cor: '',
  descricao: '', descBreve: '', valor: '', status: '', funcionario: '',
  itens: [],
  servicos: [],
})

// ─── Gerador de PDF ──────────────────────────────────────────────────────────
function gerarPDF(ordem) {
  const fmt  = v => `R$${Number(v || 0).toFixed(2).replace('.', ',')}`
  const fmt2 = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
  const hoje = new Date().toLocaleDateString('pt-BR')
  const st   = STATUS[ordem.status]
  const logoUrl = window.location.origin + '/logo da oficina.png'

  const tempoStr = (() => {
    if (ordem.inicio && ordem.fim) {
      const ms = ordem.fim - ordem.inicio
      const dias = Math.floor(ms / 86400000)
      const h    = Math.floor((ms % 86400000) / 3600000)
      const m    = Math.floor((ms % 3600000) / 60000)
      if (dias > 0) return `${dias}d ${h}h ${m}min`
      if (h > 0)    return `${h}h ${m}min`
      return `${m}min`
    }
    return null
  })()

  const itens      = ordem.itens && ordem.itens.length > 0 ? ordem.itens : []
  const totalPecas = itens.reduce((s, it) => s + Number(it.valor) * Number(it.qtd), 0)
  const servicosArr = ordem.servicos && ordem.servicos.length > 0
    ? ordem.servicos
    : (Number(ordem.maoDeObra || 0) > 0
        ? [{ id: 0, desc: ordem.servico || 'Mao de Obra', funcionario: ordem.funcionario || '', maoDeObra: ordem.maoDeObra }]
        : [])
  const totalMob   = servicosArr.reduce((s, sv) => s + (parseFloat(sv.maoDeObra) || 0), 0)
  const totalGeral = totalPecas + totalMob || Number(ordem.valor || 0)

  const pecasRows = itens.length > 0
    ? itens.map((it, i) => `
      <tr>
        <td>${it.qtd}</td>
        <td>${it.uni || 'UN'}</td>
        <td>${it.cod || '—'}</td>
        <td>${it.desc}</td>
        <td style="text-align:right">${fmt(it.valor)}</td>
        <td style="text-align:right"><strong>${fmt(Number(it.valor) * Number(it.qtd))}</strong></td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:14px">Nenhuma peca informada</td></tr>`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${ordem.numero} – Lima Oficina Mecanica</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:28px;font-size:12.5px}
    @media print{body{padding:14px}.no-print{display:none!important}}

    /* Cabeçalho */
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #000;padding-bottom:14px;margin-bottom:14px}
    .header-left h1{font-size:18px;font-weight:900;color:#000;letter-spacing:0.5px}
    .header-left p{font-size:11px;color:#555;margin-top:2px}
    .logo-wrap{width:90px;height:90px;background:#000;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .logo-img{width:78px;height:78px;object-fit:contain;border-radius:8px;filter:brightness(0) invert(1)}

    /* Título OS */
    .os-title-bar{background:#000;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;border-radius:6px;margin-bottom:14px}
    .os-title-bar span{font-size:13px;font-weight:700;letter-spacing:1px}
    .status-pill{background:${st.bg};color:${st.color};font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px}

    /* Seções info */
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
    .info-box{border:1px solid #ddd;border-radius:6px;overflow:hidden}
    .info-box-title{background:#000;color:#fff;font-size:10px;font-weight:700;padding:5px 10px;text-transform:uppercase;letter-spacing:1px}
    .info-box-body{padding:10px}
    .info-row{display:flex;gap:8px;margin-bottom:4px;font-size:12px}
    .info-label{color:#888;font-weight:700;min-width:65px;text-transform:uppercase;font-size:10px}
    .info-val{font-weight:700;color:#000}

    /* Descricao breve */
    .desc-box{border:1px solid #fde68a;background:#fffbeb;border-radius:6px;padding:9px 12px;margin-bottom:14px;font-size:12px;color:#374151}
    .desc-box strong{display:block;font-size:10px;text-transform:uppercase;color:#b45309;margin-bottom:3px}

    /* Tabelas */
    .section-head{background:#000;color:#fff;text-align:center;font-size:11px;font-weight:700;letter-spacing:2px;padding:7px;text-transform:uppercase;margin-bottom:0}
    table{width:100%;border-collapse:collapse}
    table th{background:#f0f0f0;padding:7px 10px;font-size:10px;font-weight:700;text-transform:uppercase;color:#333;border:1px solid #ddd}
    table td{padding:7px 10px;border:1px solid #e5e5e5;font-size:12px;vertical-align:middle}
    table tr:nth-child(even) td{background:#fafafa}

    /* Subtotais */
    .sub-table{width:100%;border-collapse:collapse;margin-top:0}
    .sub-table td{padding:5px 10px;font-size:12px;border:1px solid #e5e5e5}
    .sub-table .sub-label{color:#555;text-align:right}
    .sub-table .sub-val{text-align:right;font-weight:700;width:120px}
    .sub-table .total-row td{background:#000;color:#fff;font-size:15px;font-weight:900;padding:10px}

    /* Mecanico */
    .mec-box{border:1.5px solid #bbf7d0;background:#f0fdf4;border-radius:6px;padding:10px 14px;margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .mec-item label{font-size:9px;text-transform:uppercase;color:#6b7280;font-weight:700;display:block;margin-bottom:2px}
    .mec-item span{font-size:13px;font-weight:800;color:#111}
    .mec-item span.verde{color:#059669}

    /* Garantia */
    .garantia-box{border:1.5px solid #86efac;background:#f0fdf4;border-radius:6px;padding:10px 14px;margin-top:10px;font-size:11.5px;color:#166534;line-height:1.7}
    .garantia-box strong{font-size:12px;display:block;margin-bottom:3px}

    /* Termo */
    .termo-box{border:1px solid #e2e8f0;border-left:4px solid #000;background:#f8fafc;border-radius:6px;padding:10px 14px;margin-top:8px;font-size:11px;color:#374151;line-height:1.75}
    .termo-box strong{display:block;font-size:11px;font-weight:800;margin-bottom:4px;text-transform:uppercase;color:#000}

    /* Rodapé */
    .footer{margin-top:20px;padding-top:12px;border-top:2px solid #000;display:flex;justify-content:space-between;align-items:flex-end}
    .footer p{font-size:11px;color:#888;line-height:1.8}
    .assinatura{text-align:center}
    .assinatura .linha{border-top:1px solid #aaa;width:200px;margin:0 auto 4px;padding-top:5px}
    .assinatura p{font-size:11px;color:#888}

    .print-btn{display:block;margin:0 auto 18px;padding:12px 32px;background:#000;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    .wpp-note{text-align:center;font-size:12px;color:#888;margin-bottom:20px}
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Salvar como PDF / Enviar WhatsApp</button>
  <p class="wpp-note no-print">Salve como PDF e envie pelo WhatsApp para o cliente.</p>

  <!-- CABECALHO -->
  <div class="header">
    <div class="header-left">
      <h1>Lima Oficina Mecanica</h1>
      <p>(41) 9 9595-5516 &nbsp;|&nbsp; Servicos Automotivos</p>
      <p style="margin-top:6px;font-size:11px;color:#888">Data de emissao: <strong>${hoje}</strong></p>
    </div>
    <div class="logo-wrap"><img src="${logoUrl}" class="logo-img" alt="Logo" onerror="this.parentElement.style.display='none'" /></div>
  </div>

  <!-- BARRA OS + STATUS -->
  <div class="os-title-bar">
    <span>${ordem.numero}</span>
    <span class="status-pill">${st.label}</span>
  </div>

  <!-- CLIENTE + VEICULO -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-title">Dados do Cliente</div>
      <div class="info-box-body">
        <div class="info-row"><span class="info-label">Nome</span><span class="info-val">${ordem.clienteNome || '—'}</span></div>
        <div class="info-row"><span class="info-label">Telefone</span><span class="info-val">${ordem.clienteTelefone || '—'}</span></div>
      </div>
    </div>
    <div class="info-box">
      <div class="info-box-title">Dados do Veiculo</div>
      <div class="info-box-body">
        <div class="info-row"><span class="info-label">Placa</span><span class="info-val">${ordem.placa || '—'}</span></div>
        <div class="info-row"><span class="info-label">Modelo</span><span class="info-val">${ordem.modelo || '—'}</span></div>
        <div class="info-row"><span class="info-label">Ano</span><span class="info-val">${ordem.ano || '—'}</span><span class="info-label" style="margin-left:10px">Cor</span><span class="info-val">${ordem.cor || '—'}</span></div>
      </div>
    </div>
  </div>

  ${(ordem.descBreve || ordem.descricao) ? `
  <div class="desc-box">
    <strong>Descricao do Servico</strong>
    ${ordem.descBreve ? `<span style="font-weight:700">${ordem.descBreve}</span>` : ''}
    ${ordem.descricao ? `<div style="color:#555;margin-top:3px">${ordem.descricao}</div>` : ''}
  </div>` : ''}

  <!-- TABELA PECAS -->
  <div class="section-head">P R O D U T O S</div>
  <table>
    <thead>
      <tr>
        <th style="width:42px">Qtde</th>
        <th style="width:42px">Uni.</th>
        <th style="width:52px">Cod.</th>
        <th>Descricao</th>
        <th style="width:110px;text-align:right">Valor Unit.</th>
        <th style="width:110px;text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>${pecasRows}</tbody>
  </table>
  <table class="sub-table">
    <tr><td class="sub-label">Produtos</td><td class="sub-val">${fmt2(totalPecas)}</td></tr>
    <tr><td class="sub-label">Sub-Total</td><td class="sub-val">${fmt2(totalPecas)}</td></tr>
  </table>

  <!-- TABELA SERVICO / MAO DE OBRA -->
  <div class="section-head" style="margin-top:16px">S E R V I C O S  /  M Ã O  D E  O B R A</div>
  <table>
    <thead>
      <tr>
        <th style="width:42px">Qtde</th>
        <th>Descricao</th>
        <th style="width:140px">Mecanico</th>
        <th style="width:110px;text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${servicosArr.length > 0
        ? servicosArr.map(sv => `
      <tr>
        <td>1</td>
        <td>${sv.desc || 'Mao de Obra'}</td>
        <td>${sv.funcionario || '—'}</td>
        <td style="text-align:right"><strong>${fmt(sv.maoDeObra)}</strong></td>
      </tr>`).join('')
        : `<tr><td colspan="4" style="text-align:center;color:#aaa;padding:14px">Nenhum servico informado</td></tr>`
      }
    </tbody>
  </table>

  <!-- RESUMO TOTAIS -->
  <table class="sub-table" style="margin-top:0">
    <tr><td class="sub-label">📦 Total Peças / Produtos</td><td class="sub-val">${fmt2(totalPecas)}</td></tr>
    <tr><td class="sub-label">🔧 Total Mão de Obra / Serviços</td><td class="sub-val">${fmt2(totalMob)}</td></tr>
    <tr class="total-row">
      <td style="text-align:right;font-size:14px">💰 TOTAL GERAL</td>
      <td style="text-align:right;width:120px;font-size:16px;font-weight:900">${fmt2(totalGeral)}</td>
    </tr>
  </table>

  <!-- MECANICO RESPONSAVEL -->
  ${servicosArr.length > 0 || tempoStr ? `
  <div class="mec-box">
    ${servicosArr.length > 0 ? `<div class="mec-item"><label>Mecanico(s) Responsavel(is)</label><span>${[...new Set(servicosArr.map(sv => sv.funcionario).filter(Boolean))].join(', ') || '—'}</span></div>` : ''}
    ${tempoStr ? `<div class="mec-item"><label>Tempo de Servico</label><span>${tempoStr}</span></div>` : ''}
  </div>` : ''}

  <!-- GARANTIA -->
  <div class="garantia-box">
    <strong>Garantia e Validade do Orcamento</strong>
    Garantia de <strong>3 (tres) meses</strong> para todos os servicos aprovados e executados pela Lima Oficina Mecanica, contados a partir da data de conclusao do servico.<br>
    A validade deste orcamento e de <strong>7 (sete) dias uteis</strong> a partir da data de emissao. Apos esse prazo, os valores poderao ser revisados.
  </div>

  <!-- TERMO -->
  <div class="termo-box">
    <strong>Termo de Responsabilidade e Seguranca</strong>
    A Lima Oficina Mecanica possui sistema de <strong>monitoramento por cameras</strong> em todas as dependencias do estabelecimento, com gravacao continua de imagens e registros fotograficos.
    Realizamos um <strong>checklist detalhado do estado do veiculo</strong> no momento da entrada — incluindo lataria, vidros, pneus, acessorios e itens internos — com fotos e registros documentados.
    Em caso de qualquer divergencia relacionada ao estado do veiculo, as gravacoes e registros fotograficos ficam disponiveis para conferencia. Nosso compromisso e com a transparencia e a seguranca do seu patrimonio.
  </div>

  <!-- RODAPE -->
  <div class="footer">
    <div>
      <p><strong>Lima Oficina Mecanica</strong> &nbsp;|&nbsp; (41) 9 9595-5516</p>
      <p>Criado por Elizandra Cardoso &nbsp;·&nbsp; © ${new Date().getFullYear()}</p>
      <p style="margin-top:2px;color:#bbb;font-size:10px">Sistema criado por Elizandra Lima</p>
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

export default function OrdemServico({ setPage }) {
  const [ordens, setOrdens] = useState(load)
  const [modal, setModal] = useState(false)
  const [preModal, setPreModal] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const [statusError, setStatusError] = useState(false)
  const [novoItem, setNovoItem] = useState({ desc: '', qtd: 1, uni: 'UN', cod: '', valor: '' })
  const [novoServico, setNovoServico] = useState({ desc: '', funcionario: '', maoDeObra: '' })
  const [editMecanico, setEditMecanico] = useState(false)
  const [editMecanicoId, setEditMecanicoId] = useState(null)
  const [editStatusId, setEditStatusId] = useState(null)

  const clientes = JSON.parse(localStorage.getItem(KEY_CLI) || '[]')
  const servicos = JSON.parse(localStorage.getItem('ol_servicos') || '[]')
  const funcionarios = JSON.parse(localStorage.getItem('ol_funcionarios') || '[]').filter(f => f.status === 'ativo')

  function refresh() { setOrdens(load()) }

  function openAdd() { setEditing(null); setForm(emptyForm()); setViewing(null); setStatusError(false); setPreModal(true) }
  function confirmarNovaOS() { setPreModal(false); setModal(true) }

  function openEdit(ordem) {
    setEditing(ordem.id)
    setStatusError(false)
    const legacyServicos = (!ordem.servicos || !ordem.servicos.length) && Number(ordem.maoDeObra || 0) > 0
      ? [{ id: Date.now(), desc: ordem.servico || 'Mao de Obra', funcionario: ordem.funcionario || '', maoDeObra: String(ordem.maoDeObra) }]
      : (ordem.servicos || [])
    setForm({
      clienteNome: ordem.clienteNome, clienteTelefone: ordem.clienteTelefone,
      placa: ordem.placa, modelo: ordem.modelo, ano: ordem.ano || '', cor: ordem.cor || '',
      descricao: ordem.descricao || '', descBreve: ordem.descBreve || '',
      valor: ordem.valor || '', status: ordem.status, funcionario: ordem.funcionario || '',
      itens: ordem.itens || [],
      servicos: legacyServicos,
    })
    setViewing(null)
    setModal(true)
  }

  function selectCliente(nome) {
    const c = clientes.find(x => x.nome === nome)
    if (c) setForm(f => ({
      ...f,
      clienteNome: c.nome,
      clienteTelefone: c.telefone || '',
      placa: c.placa || f.placa,
      modelo: c.modelo || f.modelo,
      ano: c.ano || f.ano,
      cor: c.cor || f.cor,
    }))
    else setForm(f => ({ ...f, clienteNome: nome }))
  }

  function adicionarItem() {
    if (!novoItem.desc || !novoItem.valor) return
    setForm(f => ({ ...f, itens: [...(f.itens || []), { ...novoItem, id: Date.now() }] }))
    setNovoItem({ desc: '', qtd: 1, uni: 'UN', cod: '', valor: '' })
  }

  function removerItem(id) {
    setForm(f => ({ ...f, itens: f.itens.filter(it => it.id !== id) }))
  }

  function adicionarServico() {
    if (!novoServico.desc && !novoServico.maoDeObra) return
    setForm(f => ({ ...f, servicos: [...(f.servicos || []), { ...novoServico, id: Date.now() }] }))
    setNovoServico({ desc: '', funcionario: '', maoDeObra: '' })
  }

  function removerServico(id) {
    setForm(f => ({ ...f, servicos: f.servicos.filter(sv => sv.id !== id) }))
  }

  function calcTotalPecas() {
    if (!form.itens || !form.itens.length) return 0
    return form.itens.reduce((s, it) => s + Number(it.valor) * Number(it.qtd), 0)
  }

  function calcTotalMob() {
    if (!form.servicos || !form.servicos.length) return 0
    return form.servicos.reduce((s, sv) => s + (parseFloat(sv.maoDeObra) || 0), 0)
  }

  function calcTotal() {
    return calcTotalPecas() + calcTotalMob()
  }

  function _doSave() {
    if (!form.status) { setStatusError(true); return null }
    if (!form.clienteNome || !form.placa) return null
    const arr = load()
    const total = calcTotal() || 0
    let savedOrdem = null
    if (editing) {
      const idx = arr.findIndex(x => x.id === editing)
      const old = arr[idx]
      let inicio = old.inicio, fim = old.fim
      if (form.status === 'em_andamento' && !inicio) inicio = Date.now()
      if ((form.status === 'concluido' || form.status === 'cancelado') && !fim) fim = Date.now()
      arr[idx] = { ...old, ...form, valor: total, maoDeObra: calcTotalMob(), inicio, fim }
      savedOrdem = arr[idx]
    } else {
      const novaOrdem = {
        ...form, id: nextId(arr), numero: nextNumero(arr), valor: total, maoDeObra: calcTotalMob(),
        inicio: form.status === 'em_andamento' ? Date.now() : null,
        fim: null, data: new Date().toISOString().split('T')[0],
      }
      arr.push(novaOrdem)
      savedOrdem = novaOrdem
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
    return savedOrdem
  }

  function handleSave(e) {
    e.preventDefault()
    _doSave()
  }

  function handleSaveAndPDF(e) {
    e.preventDefault()
    const ordem = _doSave()
    if (ordem) gerarPDF(ordem)
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

  function handleChangeMecanico(novoMec) {
    const arr = load()
    const idx = arr.findIndex(x => x.id === viewing.id)
    if (idx === -1) return
    arr[idx] = { ...arr[idx], funcionario: novoMec }
    save(arr)
    setViewing(arr[idx])
    setOrdens(arr)
    setEditMecanico(false)
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
  const totalPecasForm = calcTotalPecas()
  const totalMobForm = calcTotalMob()
  const totalItensForm = calcTotal()

  return (
    <div>
      <div className="page-header">
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
                <th>Mecânico Responsável</th>
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
                    <td onClick={e => e.stopPropagation()} style={{ minWidth: 130 }}>
                      {editMecanicoId === o.id ? (
                        <select
                          autoFocus
                          defaultValue={o.funcionario || ''}
                          onChange={e => {
                            const arr = load()
                            const idx = arr.findIndex(x => x.id === o.id)
                            if (idx !== -1) { arr[idx] = { ...arr[idx], funcionario: e.target.value }; save(arr); setOrdens(arr) }
                            setEditMecanicoId(null)
                          }}
                          onBlur={() => setEditMecanicoId(null)}
                          style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1.5px solid #555', background: '#1a1a1a', color: '#f0f0f0', fontSize: 13 }}
                        >
                          <option value="">— Sem responsável —</option>
                          {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                        </select>
                      ) : (
                        <span
                          onClick={() => setEditMecanicoId(o.id)}
                          title="Clique para trocar"
                          style={{ cursor: 'pointer', borderBottom: '1px dashed #555', paddingBottom: 1 }}
                        >
                          {o.funcionario || '—'}
                        </span>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {editStatusId === o.id ? (
                        <select
                          autoFocus
                          defaultValue={o.status}
                          onChange={e => { handleChangeStatus(o.id, e.target.value); setEditStatusId(null) }}
                          onBlur={() => setEditStatusId(null)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid #555', background: '#1a1a1a', color: '#f0f0f0', fontSize: 13 }}
                        >
                          {Object.entries(STATUS).map(([k, v]) => (
                            <option key={k} value={k}>{v.icon} {v.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="badge"
                          style={{ color: st.color, background: st.bg, cursor: 'pointer' }}
                          onClick={() => setEditStatusId(o.id)}
                          title="Clique para trocar status"
                        >
                          {st.icon} {st.label}
                        </span>
                      )}
                    </td>
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
              <button className="modal-close" onClick={() => { setViewing(null); setEditMecanico(false) }}>✕</button>
            </div>
            <div className="modal-body">
              {/* Troca de status — dropdown */}
              <div className="os-status-footer" style={{ marginBottom: 16 }}>
                <div className="os-status-footer-label">📌 STATUS DA OS</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={viewing.status}
                    onChange={e => handleChangeStatus(viewing.id, e.target.value)}
                    className="os-status-select-dd"
                    style={viewing.status ? { background: STATUS[viewing.status]?.color, color: '#fff', borderColor: STATUS[viewing.status]?.color } : {}}
                  >
                    {Object.entries(STATUS).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                  <div className="os-status-timer-info">
                    {viewing.status === 'em_andamento'
                      ? '⏱️ Cronômetro rodando — tempo de serviço contando agora.'
                      : viewing.status === 'concluido' || viewing.status === 'cancelado'
                        ? '🏁 Serviço encerrado.'
                        : '⏸️ O cronômetro só conta quando o status for "Em Serviço".'}
                  </div>
                </div>
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
                  <h4>👷 Mecânico Responsável</h4>
                  {editMecanico ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        defaultValue={viewing.funcionario || ''}
                        onChange={e => handleChangeMecanico(e.target.value)}
                        style={{ flex: 1, minWidth: 120, padding: '6px 10px', borderRadius: 6, border: '1.5px solid #555', background: '#1a1a1a', color: '#f0f0f0', fontSize: 13 }}
                        autoFocus
                      >
                        <option value="">— Sem responsável —</option>
                        {funcionarios.map(f => (
                          <option key={f.id} value={f.nome}>{f.nome}</option>
                        ))}
                      </select>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setEditMecanico(false)}>Cancelar</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <p style={{ flex: 1 }}>{viewing.funcionario || '—'}</p>
                      <button className="btn-edit" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => setEditMecanico(true)}>✏️ Trocar</button>
                    </div>
                  )}
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
      {/* Aviso antes de abrir nova OS */}
      {preModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>📋 Nova Ordem de Serviço</h2>
              <button className="modal-close" onClick={() => setPreModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="os-pre-aviso">
                <div className="os-pre-aviso-icon">⭐</div>
                <div>
                  <strong>Leandra, cadastre o cliente antes!</strong>
                  <p>É de <strong>extrema importância</strong> que o cliente seja cadastrado no painel de <strong>Clientes</strong> com o veículo dele antes de abrir uma OS.<br /><br />Assim o sistema preenche os dados automaticamente e mantém o histórico completo do cliente!</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn-secondary" onClick={() => { setPreModal(false); setPage && setPage('clientes') }}>👤 Ir para Clientes</button>
                <button className="btn-primary" onClick={confirmarNovaOS}>Continuar mesmo assim →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={editing ? `Editar ${form.numero || 'OS'}` : 'Nova Ordem de Serviço'} onClose={() => setModal(false)} wide>
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

            <p className="os-section-title">🔧 Serviços e Status</p>

            <div className="form-group">
              <label>👷 Mecânico Responsável</label>
              <select value={form.funcionario} onChange={e => setForm(f => ({ ...f, funcionario: e.target.value }))}>
                <option value="">— Selecione o mecânico —</option>
                {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome} · {f.cargo}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Descrição Breve do Serviço</label>
                <input
                  value={form.descBreve}
                  onChange={e => setForm(f => ({ ...f, descBreve: e.target.value.slice(0, 60) }))}
                  placeholder="Ex: Troca de bobina e velas (máx. 60 caracteres)"
                  maxLength={60}
                />
                <small style={{ color: 'var(--text-light)', fontSize: 11 }}>{(form.descBreve || '').length}/60</small>
              </div>
              <div className="form-group">
                <label>Observações / Descrição Detalhada</label>
                <textarea rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes, defeitos relatados..." />
              </div>
            </div>

            <p className="os-section-title">📦 Itens / Peças</p>
            <div className="os-itens-add">
              <input
                placeholder="Descrição da peça"
                value={novoItem.desc}
                onChange={e => setNovoItem(n => ({ ...n, desc: e.target.value }))}
                className="os-item-desc"
              />
              <select
                value={novoItem.uni}
                onChange={e => setNovoItem(n => ({ ...n, uni: e.target.value }))}
                className="os-item-uni"
              >
                <option>UN</option>
                <option>PC</option>
                <option>KG</option>
                <option>LT</option>
                <option>MT</option>
                <option>JG</option>
                <option>PAR</option>
              </select>
              <input
                placeholder="Cód."
                value={novoItem.cod}
                onChange={e => setNovoItem(n => ({ ...n, cod: e.target.value }))}
                className="os-item-cod"
              />
              <select
                value={novoItem.qtd}
                onChange={e => setNovoItem(n => ({ ...n, qtd: e.target.value }))}
                className="os-item-qtd"
              >
                {[1,2,3,4,5,6,7,8,9,10,12,15,20,24,50,100].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <input
                type="number" min="0" step="0.01" placeholder="Valor unit. R$"
                value={novoItem.valor}
                onChange={e => setNovoItem(n => ({ ...n, valor: e.target.value }))}
                className="os-item-valor"
              />
              <button type="button" className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '10px 16px' }} onClick={adicionarItem}>+ Add</button>
            </div>

            {form.itens && form.itens.length > 0 && (
              <div style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <table style={{ fontSize: 13, marginBottom: 0 }}>
                  <thead><tr><th>Descrição</th><th>Uni.</th><th>Cód.</th><th>Qtd</th><th>Unit.</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {form.itens.map(it => (
                      <tr key={it.id}>
                        <td>{it.desc}</td>
                        <td>{it.uni || 'UN'}</td>
                        <td>{it.cod || '—'}</td>
                        <td>{it.qtd}</td>
                        <td>R$ {Number(it.valor).toFixed(2).replace('.', ',')}</td>
                        <td><strong>R$ {(Number(it.valor) * Number(it.qtd)).toFixed(2).replace('.', ',')}</strong></td>
                        <td><button type="button" className="btn-danger" onClick={() => removerItem(it.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="os-section-title">🔧 Serviços / Mão de Obra</p>
            <div className="os-itens-add">
              <input
                list="servicos-list"
                placeholder="Descrição do serviço"
                value={novoServico.desc}
                onChange={e => setNovoServico(n => ({ ...n, desc: e.target.value }))}
                style={{ flex: 3 }}
              />
              <datalist id="servicos-list">{servicos.map(s => <option key={s.id} value={s.nome} />)}</datalist>
              <select
                value={novoServico.funcionario}
                onChange={e => setNovoServico(n => ({ ...n, funcionario: e.target.value }))}
                style={{ flex: 2 }}
              >
                <option value="">Mecânico...</option>
                {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
              </select>
              <input
                type="number" min="0" step="0.01" placeholder="Mão de obra R$"
                value={novoServico.maoDeObra}
                onChange={e => setNovoServico(n => ({ ...n, maoDeObra: e.target.value }))}
                style={{ flex: 1.5 }}
              />
              <button type="button" className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '10px 14px' }} onClick={adicionarServico}>+ Add</button>
            </div>

            {form.servicos && form.servicos.length > 0 && (
              <div style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <table style={{ fontSize: 13, marginBottom: 0 }}>
                  <thead><tr><th>Serviço</th><th>Mecânico</th><th>Mão de Obra</th><th></th></tr></thead>
                  <tbody>
                    {form.servicos.map(sv => (
                      <tr key={sv.id}>
                        <td>{sv.desc || '—'}</td>
                        <td>{sv.funcionario || '—'}</td>
                        <td><strong style={{ color: '#059669' }}>R$ {(parseFloat(sv.maoDeObra) || 0).toFixed(2).replace('.', ',')}</strong></td>
                        <td><button type="button" className="btn-danger" onClick={() => removerServico(sv.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="os-totais-box">
              <div className="os-total-linha">
                <span>📦 Total Peças</span>
                <strong style={{ color: '#3b82f6' }}>R$ {totalPecasForm.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="os-total-linha">
                <span>🔧 Total Mão de Obra</span>
                <strong style={{ color: '#7c3aed' }}>R$ {totalMobForm.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div className="os-total-linha os-total-geral">
                <span>💰 TOTAL GERAL</span>
                <strong>R$ {totalItensForm > 0 ? totalItensForm.toFixed(2).replace('.', ',') : (parseFloat(form.valor) || 0).toFixed(2).replace('.', ',')}</strong>
              </div>
              {totalItensForm === 0 && (
                <input
                  type="number" min="0" step="0.01"
                  value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="Ou informe o valor manualmente..."
                  style={{ marginTop: 8, width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14 }}
                />
              )}
            </div>

            {/* Status — rodapé obrigatório */}
            <div className={`os-status-footer ${statusError ? 'os-status-error' : ''}`}>
              <div className="os-status-footer-label">
                {statusError ? '⚠️ Selecione um STATUS antes de continuar!' : '📌 STATUS DA OS *'}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={form.status}
                  onChange={e => { setForm(f => ({ ...f, status: e.target.value })); setStatusError(false) }}
                  className="os-status-select-dd"
                  style={form.status ? { background: STATUS[form.status]?.color, color: '#fff', borderColor: STATUS[form.status]?.color } : {}}
                >
                  <option value="">— Selecione o status —</option>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
                {form.status && (
                  <div className="os-status-timer-info">
                    {form.status === 'em_andamento'
                      ? '⏱️ O cronômetro vai iniciar agora ao salvar — o tempo de serviço começa a contar!'
                      : form.status === 'concluido' || form.status === 'cancelado'
                        ? '🏁 O cronômetro será encerrado ao salvar.'
                        : '⏸️ O cronômetro só começa quando o status for alterado para "Em Serviço".'}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing ? 'Salvar' : 'Criar OS'}</button>
              <button type="button" className="btn-pdf-lg" onClick={handleSaveAndPDF}>📄 Salvar e Enviar PDF</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
