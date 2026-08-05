import { useState, useMemo } from 'react'
import Modal from './Modal.jsx'
import './Estoque.css'

const KEY       = 'ol_estoque'
const KEY_MOV   = 'ol_estoque_mov'

function load()    { return JSON.parse(localStorage.getItem(KEY)     || '[]') }
function loadMov() { return JSON.parse(localStorage.getItem(KEY_MOV) || '[]') }
function save(d)   { localStorage.setItem(KEY,     JSON.stringify(d)) }
function saveMov(d){ localStorage.setItem(KEY_MOV, JSON.stringify(d)) }
function nextId(a) { return a.length ? Math.max(...a.map(x => x.id)) + 1 : 1 }

const CATEGORIAS = ['Motor','Freios','Suspensão','Elétrica','Filtros','Transmissão','Arrefecimento','Outros']
const UNIDADES   = ['UN','JG','L','KG','M','CJ','PAR']

const emptyForm = () => ({
  nome: '', codigo: '', categoria: 'Outros', fornecedor: '',
  un: 'UN', qtd: 0, qtdMinima: 3,
  precoCusto: '', precoVenda: '',
  localizacao: '', obs: '',
})

const fmt  = v => `R$ ${Number(v||0).toFixed(2).replace('.',',')}`
const today = () => new Date().toISOString().split('T')[0]
const nowStr = () => new Date().toLocaleString('pt-BR')

export function getAlertasEstoque() {
  return load().filter(p => Number(p.qtd) <= Number(p.qtdMinima || 3))
}

export default function Estoque() {
  const [items,    setItems]    = useState(load)
  const [movs,     setMovs]     = useState(loadMov)
  const [modal,    setModal]    = useState(false)       // 'add'|'edit'|'baixa'|'entrada'|'hist'
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(emptyForm())
  const [movForm,  setMovForm]  = useState({ qtd: 1, obs: '' })
  const [selected, setSelected] = useState(null)
  const [busca,    setBusca]    = useState('')
  const [catFiltro,setCatFiltro]= useState('todas')

  function refresh() { setItems(load()); setMovs(loadMov()) }

  function openAdd()  { setEditing(null); setForm(emptyForm()); setModal('add') }
  function openEdit(p){ setEditing(p.id); setForm({ ...p }); setModal('edit') }
  function openBaixa(p){ setSelected(p); setMovForm({ qtd: 1, obs: '' }); setModal('baixa') }
  function openEntrada(p){ setSelected(p); setMovForm({ qtd: 1, obs: '' }); setModal('entrada') }
  function openHist(p){ setSelected(p); setModal('hist') }

  function handleSave(e) {
    e.preventDefault()
    const arr = load()
    const item = {
      ...form,
      qtd:       Number(form.qtd)       || 0,
      qtdMinima: Number(form.qtdMinima) || 3,
      precoCusto: parseFloat(form.precoCusto) || 0,
      precoVenda: parseFloat(form.precoVenda) || parseFloat((form.precoCusto * 1.35).toFixed(2)) || 0,
    }
    if (editing) {
      arr[arr.findIndex(x => x.id === editing)] = { ...arr.find(x => x.id === editing), ...item }
    } else {
      arr.push({ ...item, id: nextId(arr), criadoEm: Date.now() })
    }
    save(arr); setModal(false); refresh()
  }

  function handleDelete(id) {
    if (!confirm('Excluir esta peça do estoque?')) return
    save(load().filter(x => x.id !== id)); refresh()
  }

  function handleBaixa(e) {
    e.preventDefault()
    const qtdMov = Number(movForm.qtd) || 0
    if (qtdMov <= 0) return
    const arr = load()
    const idx = arr.findIndex(x => x.id === selected.id)
    if (arr[idx].qtd < qtdMov) { alert('Quantidade insuficiente em estoque!'); return }
    arr[idx].qtd = Number(arr[idx].qtd) - qtdMov
    save(arr)
    const ms = loadMov()
    ms.push({ id: nextId(ms), peca: selected.nome, pecaId: selected.id, tipo: 'saida', qtd: qtdMov, obs: movForm.obs, data: today(), hora: nowStr() })
    saveMov(ms)
    setModal(false); refresh()
  }

  function handleEntrada(e) {
    e.preventDefault()
    const qtdMov = Number(movForm.qtd) || 0
    if (qtdMov <= 0) return
    const arr = load()
    const idx = arr.findIndex(x => x.id === selected.id)
    arr[idx].qtd = Number(arr[idx].qtd) + qtdMov
    save(arr)
    const ms = loadMov()
    ms.push({ id: nextId(ms), peca: selected.nome, pecaId: selected.id, tipo: 'entrada', qtd: qtdMov, obs: movForm.obs, data: today(), hora: nowStr() })
    saveMov(ms)
    setModal(false); refresh()
  }

  const filtered = useMemo(() => {
    let list = [...items]
    if (catFiltro !== 'todas') list = list.filter(p => p.categoria === catFiltro)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(p => p.nome?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) || p.fornecedor?.toLowerCase().includes(q))
    }
    return list
  }, [items, catFiltro, busca])

  const alertas = items.filter(p => Number(p.qtd) <= Number(p.qtdMinima || 3))
  const totalItens = items.length
  const totalValorEstoque = items.reduce((s, p) => s + (Number(p.qtd) * Number(p.precoCusto || 0)), 0)
  const histPeca = selected ? movs.filter(m => m.pecaId === selected.id).reverse() : []

  const custoAuto = parseFloat(form.precoCusto) || 0
  const vendaAuto = form.precoVenda ? parseFloat(form.precoVenda) : parseFloat((custoAuto * 1.35).toFixed(2))

  return (
    <div>
      <div className="page-header">
        <button className="btn-primary" onClick={openAdd}>+ Nova Peça</button>
      </div>

      {/* Alertas de estoque baixo */}
      {alertas.length > 0 && (
        <div className="estoque-alertas">
          <div className="estoque-alerta-title">⚠️ Estoque Baixo — {alertas.length} {alertas.length === 1 ? 'peça' : 'peças'}</div>
          <div className="estoque-alerta-list">
            {alertas.map(p => (
              <span key={p.id} className="estoque-alerta-badge">
                {p.nome} — <strong>{p.qtd} {p.un}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="estoque-stats">
        <div className="estoque-stat"><span>📦</span><div><strong>{totalItens}</strong><small>Itens Cadastrados</small></div></div>
        <div className="estoque-stat"><span>⚠️</span><div><strong style={{ color: alertas.length > 0 ? '#ef4444' : 'var(--text-main)' }}>{alertas.length}</strong><small>Estoque Baixo</small></div></div>
        <div className="estoque-stat"><span>💰</span><div><strong>{fmt(totalValorEstoque)}</strong><small>Valor em Estoque (custo)</small></div></div>
        <div className="estoque-stat"><span>💳</span><div><strong>{fmt(items.reduce((s,p) => s + Number(p.qtd)*Number(p.precoVenda||0), 0))}</strong><small>Valor em Estoque (venda)</small></div></div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setCatFiltro('todas')} className={`estoque-cat-btn ${catFiltro === 'todas' ? 'active' : ''}`}>Todas</button>
          {CATEGORIAS.map(c => (
            <button key={c} onClick={() => setCatFiltro(c)} className={`estoque-cat-btn ${catFiltro === c ? 'active' : ''}`}>{c}</button>
          ))}
          <input
            className="estoque-busca"
            placeholder="🔍 Buscar peça, código ou fornecedor..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📦</div><p>Nenhuma peça cadastrada.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Peça / Descrição</th>
                  <th>Categoria</th>
                  <th>Fornecedor</th>
                  <th>Un</th>
                  <th>Qtd</th>
                  <th>Mín.</th>
                  <th>Custo Unit.</th>
                  <th>Venda Unit.</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const baixo = Number(p.qtd) <= Number(p.qtdMinima || 3)
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-light)' }}>{p.codigo || '—'}</td>
                      <td>
                        <strong>{p.nome}</strong>
                        {p.localizacao && <div style={{ fontSize: 11, color: 'var(--text-light)' }}>📍 {p.localizacao}</div>}
                      </td>
                      <td><span className="estoque-cat-tag">{p.categoria}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--text-light)' }}>{p.fornecedor || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{p.un}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`estoque-qtd ${baixo ? 'baixo' : Number(p.qtd) === 0 ? 'zerado' : 'ok'}`}>
                          {p.qtd}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>{p.qtdMinima || 3}</td>
                      <td><strong style={{ color: '#ef4444' }}>{fmt(p.precoCusto)}</strong></td>
                      <td><strong style={{ color: '#10b981' }}>{fmt(p.precoVenda)}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button className="estoque-btn-entrada" onClick={() => openEntrada(p)} title="Entrada">+ Entrada</button>
                          <button className="estoque-btn-baixa" onClick={() => openBaixa(p)} title="Dar baixa">- Baixa</button>
                          <button className="btn-edit" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => openHist(p)}>📋</button>
                          <button className="btn-edit" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => openEdit(p)}>✏️</button>
                          <button className="btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleDelete(p.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal cadastro/edição */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? 'Editar Peça' : 'Nova Peça'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 3 }}>
                <label>Nome da Peça *</label>
                <input value={form.nome} onChange={e => setForm(f=>({...f, nome: e.target.value}))} placeholder="Ex: Filtro de óleo, Pastilha de freio..." required />
              </div>
              <div className="form-group">
                <label>Código</label>
                <input value={form.codigo} onChange={e => setForm(f=>({...f, codigo: e.target.value}))} placeholder="COD-001" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f=>({...f, categoria: e.target.value}))}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Unidade</label>
                <select value={form.un} onChange={e => setForm(f=>({...f, un: e.target.value}))}>
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fornecedor</label>
                <input value={form.fornecedor} onChange={e => setForm(f=>({...f, fornecedor: e.target.value}))} placeholder="Nome do fornecedor" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantidade Atual</label>
                <input type="number" min="0" value={form.qtd} onChange={e => setForm(f=>({...f, qtd: e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Qtd Mínima (alerta)</label>
                <input type="number" min="0" value={form.qtdMinima} onChange={e => setForm(f=>({...f, qtdMinima: e.target.value}))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preço de Custo (R$)</label>
                <input type="number" min="0" step="0.01" value={form.precoCusto} onChange={e => setForm(f=>({...f, precoCusto: e.target.value, precoVenda: ''}))} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label>Preço de Venda (R$) <span style={{ color: '#10b981', fontSize: 11 }}>+35% automático</span></label>
                <input type="number" min="0" step="0.01"
                  value={form.precoVenda || (custoAuto > 0 ? parseFloat((custoAuto*1.35).toFixed(2)) : '')}
                  onChange={e => setForm(f=>({...f, precoVenda: e.target.value}))}
                  placeholder={custoAuto > 0 ? `R$ ${(custoAuto*1.35).toFixed(2)}` : '0,00'} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Localização (prateleira)</label>
                <input value={form.localizacao} onChange={e => setForm(f=>({...f, localizacao: e.target.value}))} placeholder="Ex: Prateleira A, Gaveta 2..." />
              </div>
              <div className="form-group">
                <label>Observações</label>
                <input value={form.obs} onChange={e => setForm(f=>({...f, obs: e.target.value}))} placeholder="Observações opcionais" />
              </div>
            </div>

            {custoAuto > 0 && (
              <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, display: 'flex', gap: 20 }}>
                <span>💰 Custo: <strong style={{ color: '#ef4444' }}>{fmt(custoAuto)}</strong></span>
                <span>💳 Venda: <strong style={{ color: '#10b981' }}>{fmt(vendaAuto)}</strong></span>
                <span>📈 Margem: <strong style={{ color: '#3b82f6' }}>{custoAuto > 0 ? (((vendaAuto - custoAuto)/custoAuto)*100).toFixed(0) : 0}%</strong></span>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{modal === 'edit' ? 'Salvar' : 'Cadastrar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Baixa */}
      {modal === 'baixa' && selected && (
        <Modal title={`Dar Baixa — ${selected.nome}`} onClose={() => setModal(false)}>
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
            Estoque atual: <strong style={{ color: '#ef4444', fontSize: 18 }}>{selected.qtd} {selected.un}</strong>
          </div>
          <form onSubmit={handleBaixa}>
            <div className="form-group">
              <label>Quantidade a retirar *</label>
              <input type="number" min="1" max={selected.qtd} value={movForm.qtd} onChange={e => setMovForm(f=>({...f, qtd: e.target.value}))} required autoFocus />
            </div>
            <div className="form-group">
              <label>Motivo / OS</label>
              <input value={movForm.obs} onChange={e => setMovForm(f=>({...f, obs: e.target.value}))} placeholder="Ex: OS-012, Consumo interno..." />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Confirmar Baixa</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Entrada */}
      {modal === 'entrada' && selected && (
        <Modal title={`Entrada — ${selected.nome}`} onClose={() => setModal(false)}>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid #10b981', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
            Estoque atual: <strong style={{ color: '#10b981', fontSize: 18 }}>{selected.qtd} {selected.un}</strong>
          </div>
          <form onSubmit={handleEntrada}>
            <div className="form-group">
              <label>Quantidade recebida *</label>
              <input type="number" min="1" value={movForm.qtd} onChange={e => setMovForm(f=>({...f, qtd: e.target.value}))} required autoFocus />
            </div>
            <div className="form-group">
              <label>Nota Fiscal / Observação</label>
              <input value={movForm.obs} onChange={e => setMovForm(f=>({...f, obs: e.target.value}))} placeholder="Ex: NF-001, Compra do fornecedor X..." />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Confirmar Entrada</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Histórico */}
      {modal === 'hist' && selected && (
        <Modal title={`Histórico — ${selected.nome}`} onClose={() => setModal(false)}>
          {histPeca.length === 0 ? (
            <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: 20 }}>Nenhuma movimentação registrada.</p>
          ) : (
            <table>
              <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Qtd</th><th>Motivo</th></tr></thead>
              <tbody>
                {histPeca.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{m.hora}</td>
                    <td>
                      <span style={{ background: m.tipo === 'entrada' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: m.tipo === 'entrada' ? '#10b981' : '#ef4444', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        {m.tipo === 'entrada' ? '▲ Entrada' : '▼ Baixa'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.qtd}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-light)' }}>{m.obs || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  )
}
