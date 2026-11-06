import { useState } from 'react'
import Modal from './Modal.jsx'
import { formatarDoc, tipoDoc, soDigitos } from './Documento.js'
import { gerarPDF } from './OrdemServico.jsx'
import { dataOS } from './Periodo.jsx'
import './Clientes.css'

const KEY = 'ol_clientes'
function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const br = iso => iso ? iso.split('-').reverse().join('/') : '—'
const sem = t => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const STATUS_NOME = { orcamento: '💬 Orçamento', aprovado: '✅ Aprovado', em_servico: '🔧 Em serviço', aguardando: '⏳ Aguardando', concluido: '✔️ Concluído', cancelado: '✖️ Cancelado' }

// OS de um cliente: pelo CPF/CNPJ, senão pelo nome
export function ordensDoCliente(c, ordens) {
  const doc = soDigitos(c.cpf || c.cnpj || '')
  return ordens.filter(o => (doc && soDigitos(o.clienteDoc || '') === doc) || sem(o.clienteNome) === sem(c.nome))
    .sort((a, b) => dataOS(b).localeCompare(dataOS(a)))
}
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }
const empty = () => ({ nome: '', telefone: '', email: '', cpf: '', endereco: '', obs: '', placa: '', modelo: '', ano: '', cor: '' })

export default function Clientes() {
  const [items, setItems] = useState(load)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [busca, setBusca] = useState('')
  const [historico, setHistorico] = useState(null)
  const [aberta, setAberta] = useState(null)
  const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')

  function refresh() { setItems(load()) }
  function openAdd() { setEditing(null); setForm(empty()); setModal(true) }
  function openEdit(item) {
    setEditing(item.id)
    setForm({ nome: item.nome, telefone: item.telefone, email: item.email || '', cpf: item.cpf || item.cnpj || '', tipoDoc: item.tipoDoc || tipoDoc(item.cpf || item.cnpj), endereco: item.endereco || '', obs: item.obs || '', placa: item.placa || '', modelo: item.modelo || '', ano: item.ano || '', cor: item.cor || '' })
    setModal(true)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.nome) return
    const arr = load()
    if (editing) {
      const idx = arr.findIndex(x => x.id === editing)
      arr[idx] = { ...arr[idx], ...form }
    } else {
      arr.push({ ...form, id: nextId(arr), criadoEm: new Date().toISOString().slice(0, 10) })
    }
    save(arr)
    setModal(false)
    refresh()
  }

  function handleDelete(id) {
    if (!confirm('Excluir este cliente?')) return
    save(load().filter(x => x.id !== id))
    refresh()
  }

  const filtered = items.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca) ||
    (c.cpf || '').includes(busca)
  )

  const mesAtual = new Date().toISOString().slice(0, 7)
  const infos = Object.fromEntries(items.map(c => {
    const os = ordensDoCliente(c, ordens)
    const concl = os.filter(o => o.status === 'concluido')
    const primeira = os.length ? dataOS(os[os.length - 1]) : ''
    return [c.id, { os, gasto: concl.reduce((t, o) => t + Number(o.valor || 0), 0), ultima: os.find(o => o.status !== 'cancelado'), desde: [c.criadoEm, primeira].filter(Boolean).sort()[0] || '' }]
  }))
  const novosMes = items.filter(c => (infos[c.id].desde || '').slice(0, 7) === mesAtual).length
  const histC = historico && items.find(c => c.id === historico)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="card" style={{ margin: 0, padding: '10px 16px', display: 'flex', gap: 20, flex: 1, flexWrap: 'wrap', fontSize: 14 }}>
          <span>👥 Clientes cadastrados: <strong>{items.length}</strong></span>
          <span>🆕 Novos este mês: <strong style={{ color: '#10b981' }}>{novosMes}</strong></span>
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ whiteSpace: 'nowrap' }}>+ Novo Cliente</button>
      </div>

      <div className="card">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou CPF..." />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>CPF / CNPJ</th>
                <th>Veículo</th>
                <th>Já gastou</th>
                <th>Último serviço</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="cliente-avatar">{c.nome.charAt(0).toUpperCase()}</div>
                      <strong>{c.nome}</strong>
                    </div>
                  </td>
                  <td>{c.telefone || '—'}</td>
                  <td>{c.cpf || '—'}</td>
                  <td>
                    {c.placa
                      ? <span><strong style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{c.placa}</strong>{c.modelo ? ` · ${c.modelo}` : ''}{c.ano ? ` (${c.ano})` : ''}</span>
                      : <span style={{ color: 'var(--text-light)' }}>—</span>}
                  </td>
                  <td><strong style={{ color: '#10b981' }}>{fmt(infos[c.id].gasto)}</strong></td>
                  <td>
                    {infos[c.id].ultima ? (
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', textAlign: 'left' }} onClick={() => { setHistorico(c.id); setAberta(null) }} title="Ver todos os serviços deste cliente">
                        📅 {br(dataOS(infos[c.id].ultima))} · {infos[c.id].os.length} serviço(s) ›
                      </button>
                    ) : <span style={{ color: 'var(--text-light)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-edit" onClick={() => openEdit(c)}>✏️ Editar</button>
                      <button className="btn-danger" onClick={() => handleDelete(c.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {histC && (
        <Modal title={`📋 Serviços de ${histC.nome}`} onClose={() => setHistorico(null)}>
          <p style={{ marginTop: 0, fontSize: 14 }}>
            Já gastou <strong style={{ color: '#10b981' }}>{fmt(infos[histC.id].gasto)}</strong> · {infos[histC.id].os.length} serviço(s) · cliente desde {br(infos[histC.id].desde)}
          </p>
          {infos[histC.id].os.map(o => (
            <div key={o.id} style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
              <button onClick={() => setAberta(aberta === o.id ? null : o.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 12px', background: 'var(--bg-card2)', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left', fontSize: 14 }}>
                <span><strong>{o.numero || 'OS ' + o.id}</strong> · {br(dataOS(o))} · {o.placa || ''} <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{STATUS_NOME[o.status] || o.status}</span></span>
                <span><strong>{fmt(o.valor)}</strong> {aberta === o.id ? '▲' : '▼'}</span>
              </button>
              {aberta === o.id && (
                <div style={{ padding: '10px 12px', fontSize: 13 }}>
                  {(o.descBreve || o.descricao) && <p style={{ margin: '0 0 8px' }}>{o.descBreve || o.descricao}</p>}
                  {(o.servicos || []).length > 0 && <><strong>🔧 Serviços</strong>{o.servicos.map((sv, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{sv.desc || 'Serviço'}{sv.funcionario ? ` · ${sv.funcionario}` : ''}</span><span>{fmt(sv.maoDeObra)}</span></div>)}</>}
                  {(o.itens || []).length > 0 && <><strong style={{ display: 'block', marginTop: 6 }}>🔩 Peças</strong>{o.itens.map((it, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{it.qtd || 1}× {it.desc}</span><span>{fmt((Number(it.valor ?? it.valorUnit) || 0) * (Number(it.qtd) || 1))}</span></div>)}</>}
                  <button className="btn-secondary" style={{ marginTop: 10, fontSize: 12 }} onClick={() => gerarPDF(o)}>📄 Ver nota (PDF)</button>
                </div>
              )}
            </div>
          ))}
        </Modal>
      )}

      {modal && (
        <Modal title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Nome Completo *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do cliente" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Telefone</label>
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {['CPF', 'CNPJ'].map(t => (
                    <span key={t} onClick={() => setForm(f => ({ ...f, tipoDoc: t, cpf: formatarDoc(f.cpf, t) }))}
                      style={{ cursor: 'pointer', padding: '2px 10px', borderRadius: 12, border: '1px solid var(--border)', fontWeight: 700,
                        background: (form.tipoDoc || tipoDoc(form.cpf)) === t ? '#3b82f6' : 'transparent', color: (form.tipoDoc || tipoDoc(form.cpf)) === t ? '#fff' : 'inherit' }}>
                      {t}
                    </span>
                  ))}
                </label>
                <input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: formatarDoc(e.target.value, f.tipoDoc || 'CPF') }))}
                  placeholder={(form.tipoDoc || tipoDoc(form.cpf)) === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'} />
              </div>
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div className="form-group">
              <label>Endereço</label>
              <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro..." />
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea rows={2} value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Notas sobre o cliente..." />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 8px', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>🚗 Veículo do Cliente</p>
            <div className="form-row">
              <div className="form-group">
                <label>Placa</label>
                <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" maxLength={8} />
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
