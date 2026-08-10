import { useState, useMemo } from 'react'
import Modal from './Modal.jsx'
import './Notinhas.css'

const KEY = 'ol_notinhas'
function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }

const MARGEM = 1.35
const COM_OFICINA = 0.30
const COM_LEANDRA = 0.05

const emptyForm = () => ({ desc: '', fornecedor: '', qtd: 1, custoUnit: '', precoVenda: '' })

const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const fmtPct = v => `${Number(v || 0).toFixed(2).replace('.', ',')}%`

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const pad = d => d.toISOString().split('T')[0]
  return { start: pad(mon), end: pad(sun) }
}

function calcComissoes(valorCusto) {
  const c = Number(valorCusto) || 0
  return {
    comOficina: parseFloat((c * COM_OFICINA).toFixed(2)),
    comLeandra: parseFloat((c * COM_LEANDRA).toFixed(2)),
  }
}

function exportCSV(items) {
  const header = ['ID', 'Data', 'Peça/Descrição', 'Fornecedor', 'Qtd', 'Custo Unit.', 'Preço Venda Unit.', 'Total Custo', 'Total Venda', 'Lucro', 'Comissão Oficina (30%)', 'Comissão Leandra (5%)']
  const rows = items.map(n => [
    n.id,
    n.data,
    `"${n.desc || ''}"`,
    `"${n.fornecedor || ''}"`,
    n.qtd,
    Number(n.custoUnit || 0).toFixed(2),
    Number(n.precoVenda || 0).toFixed(2),
    Number(n.totalCusto || 0).toFixed(2),
    Number(n.totalVenda || 0).toFixed(2),
    Number(n.lucro || 0).toFixed(2),
    Number(n.comOficina || 0).toFixed(2),
    Number(n.comLeandra || 0).toFixed(2),
  ])
  const csv = [header.join(';'), ...rows.map(r => r.join(';'))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notinhas_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SummaryBox({ label, items }) {
  const totalVenda   = items.reduce((s, n) => s + Number(n.totalVenda  || 0), 0)
  const totalCusto   = items.reduce((s, n) => s + Number(n.totalCusto  || 0), 0)
  const comOficina   = items.reduce((s, n) => s + Number(n.comOficina  || 0), 0)
  const comLeandra   = items.reduce((s, n) => s + Number(n.comLeandra  || 0), 0)
  const lucro        = items.reduce((s, n) => s + Number(n.lucro       || 0), 0)

  return (
    <div className="notinhas-summary-box">
      <div className="notinhas-summary-title">{label}</div>
      <div className="notinhas-summary-grid">
        <div className="ns-item">
          <span>Notas</span>
          <strong>{items.length}</strong>
        </div>
        <div className="ns-item">
          <span>Total Custo</span>
          <strong style={{ color: '#ef4444' }}>{fmt(totalCusto)}</strong>
        </div>
        <div className="ns-item">
          <span>Total Venda</span>
          <strong style={{ color: '#3b82f6' }}>{fmt(totalVenda)}</strong>
        </div>
        <div className="ns-item">
          <span>Lucro</span>
          <strong style={{ color: '#10b981' }}>{fmt(lucro)}</strong>
        </div>
        <div className="ns-item highlight-oficina">
          <span>Comissão Oficina (30%)</span>
          <strong>{fmt(comOficina)}</strong>
        </div>
        <div className="ns-item highlight-leandra">
          <span>Comissão Leandra (5%)</span>
          <strong>{fmt(comLeandra)}</strong>
        </div>
      </div>
    </div>
  )
}

export default function Notinhas() {
  const [items, setItems]     = useState(load)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(emptyForm())
  const [filtro, setFiltro]   = useState('todos')
  const [busca, setBusca]     = useState('')
  const [confirmModal, setConfirmModal] = useState(null) // { custoCalc, vendaCalc, lucroCalc, formData, pct }
  const [pctInput, setPctInput] = useState('35')

  const todayStr   = new Date().toISOString().split('T')[0]
  const mesStr     = todayStr.slice(0, 7)
  const semana     = getWeekRange()

  const custoUnit    = parseFloat(form.custoUnit) || 0
  const qtd          = parseInt(form.qtd) || 1
  const precoAuto    = form.precoVenda ? parseFloat(form.precoVenda) : Math.round(custoUnit * MARGEM)
  const custoCalc    = custoUnit * qtd
  const vendaCalc    = precoAuto * qtd
  const lucroCalc    = vendaCalc - custoCalc
  const { comOficina: comOficinaCalc, comLeandra: comLeandraCalc } = calcComissoes(custoCalc)

  function refresh() { setItems(load()) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.desc || !form.custoUnit) return
    setPctInput('35')
    setConfirmModal({ custoCalc, vendaCalc, lucroCalc, formData: { ...form, qtd, custoUnit, precoVenda: precoAuto } })
  }

  function confirmarSalvar(tipo) {
    const { custoCalc: cc, vendaCalc: vc, lucroCalc: lc, formData } = confirmModal
    const pct = Math.max(0, parseFloat(pctInput) || 35) / 100
    const leandraFix = 0.05
    const oficinaPct = tipo === 'split' ? Math.max(0, pct - leandraFix) : pct
    const comOficina = parseFloat((cc * oficinaPct).toFixed(2))
    const comLeandra = tipo === 'split' ? parseFloat((cc * leandraFix).toFixed(2)) : 0
    const arr = load()
    arr.push({
      ...formData,
      id: nextId(arr),
      totalCusto: cc,
      totalVenda: vc,
      lucro: lc,
      porcLucro: cc > 0 ? (lc / cc) * 100 : 0,
      comOficina,
      comLeandra,
      data: todayStr,
    })
    save(arr)
    setConfirmModal(null)
    setModal(false)
    setForm(emptyForm())
    refresh()
  }

  function handleDelete(id) {
    if (!confirm('Remover esta notinha?')) return
    save(load().filter(n => n.id !== id))
    refresh()
  }

  const filtered = useMemo(() => {
    let list = [...items].reverse()
    if (filtro === 'hoje')   list = list.filter(n => n.data === todayStr)
    if (filtro === 'semana') list = list.filter(n => n.data >= semana.start && n.data <= semana.end)
    if (filtro === 'mes')    list = list.filter(n => n.data?.startsWith(mesStr))
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(n => n.desc?.toLowerCase().includes(q) || n.fornecedor?.toLowerCase().includes(q))
    }
    return list
  }, [items, filtro, busca, todayStr, mesStr, semana])

  const hoje   = items.filter(n => n.data === todayStr)
  const semItems = items.filter(n => n.data >= semana.start && n.data <= semana.end)
  const mesItems = items.filter(n => n.data?.startsWith(mesStr))

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => { setForm(emptyForm()); setModal(true) }}>+ Nova Notinha</button>
          <button className="btn-secondary" onClick={() => exportCSV([...items].reverse())} disabled={items.length === 0}>
            ⬇️ Exportar CSV
          </button>
        </div>
      </div>

      {/* Somatorias */}
      <div className="notinhas-summaries">
        <SummaryBox label="📅 Hoje" items={hoje} />
        <SummaryBox label="📆 Esta Semana" items={semItems} />
        <SummaryBox label="🗓️ Este Mês" items={mesItems} />
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[['todos','Todas'], ['hoje','Hoje'], ['semana','Esta Semana'], ['mes','Este Mês']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFiltro(v)}
              style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: filtro === v ? '#111' : 'transparent',
                color: filtro === v ? '#fff' : 'var(--text-light)',
                outline: filtro === v ? 'none' : '1.5px solid var(--border)',
              }}
            >{l}</button>
          ))}
          <input
            style={{ marginLeft: 'auto', padding: '6px 12px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-card2)', color: 'var(--text-main)', fontSize: 13, width: 200 }}
            placeholder="🔍 Buscar peça ou fornecedor..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔩</div>
            <p>Nenhuma notinha encontrada.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peça / Descrição</th>
                  <th>Fornecedor</th>
                  <th>Qtd</th>
                  <th>Custo Total</th>
                  <th>Valor Venda</th>
                  <th>Lucro</th>
                  <th style={{ color: '#3b82f6' }}>Com. Oficina 30%</th>
                  <th style={{ color: '#f59e0b' }}>Com. Leandra 5%</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-light)' }}>{n.data}</td>
                    <td>
                      <strong>{n.desc}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Qtd: {n.qtd} · unit R$ {Number(n.custoUnit || 0).toFixed(2).replace('.', ',')}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-light)' }}>{n.fornecedor || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{n.qtd}</td>
                    <td><strong style={{ color: '#ef4444' }}>{fmt(n.totalCusto)}</strong></td>
                    <td><strong style={{ color: '#3b82f6' }}>{fmt(n.totalVenda)}</strong></td>
                    <td><strong style={{ color: Number(n.lucro) >= 0 ? '#10b981' : '#ef4444' }}>{fmt(n.lucro)}</strong></td>
                    <td>
                      <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                        {fmt(n.comOficina != null ? n.comOficina : (n.totalCusto * COM_OFICINA))}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                        {fmt(n.comLeandra != null ? n.comLeandra : (n.totalCusto * COM_LEANDRA))}
                      </span>
                    </td>
                    <td>
                      <button className="btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(n.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                  <td colSpan={4} style={{ paddingTop: 12, fontSize: 13, color: 'var(--text-light)' }}>TOTAL ({filtered.length} notas)</td>
                  <td><strong style={{ color: '#ef4444' }}>{fmt(filtered.reduce((s,n) => s + Number(n.totalCusto||0), 0))}</strong></td>
                  <td><strong style={{ color: '#3b82f6' }}>{fmt(filtered.reduce((s,n) => s + Number(n.totalVenda||0), 0))}</strong></td>
                  <td><strong style={{ color: '#10b981' }}>{fmt(filtered.reduce((s,n) => s + Number(n.lucro||0), 0))}</strong></td>
                  <td>
                    <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 14 }}>
                      {fmt(filtered.reduce((s,n) => s + Number(n.comOficina != null ? n.comOficina : n.totalCusto * COM_OFICINA || 0), 0))}
                    </span>
                  </td>
                  <td>
                    <span style={{ background: 'rgba(251,191,36,0.2)', color: '#d97706', padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 14 }}>
                      {fmt(filtered.reduce((s,n) => s + Number(n.comLeandra != null ? n.comLeandra : n.totalCusto * COM_LEANDRA || 0), 0))}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal nova notinha */}
      {modal && (
        <Modal title="Nova Notinha de Peça" onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 3 }}>
                <label>Peça / Descrição *</label>
                <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Ex: Filtro de óleo, pastilha..." required />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label>Fornecedor</label>
                <input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Nome da loja / fornecedor" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantidade</label>
                <input type="number" min="1" value={form.qtd} onChange={e => setForm(f => ({ ...f, qtd: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Custo Unitário (R$) *</label>
                <input type="number" min="0" step="0.01" value={form.custoUnit} onChange={e => setForm(f => ({ ...f, custoUnit: e.target.value }))} placeholder="Quanto pagou por unidade" required />
              </div>
              <div className="form-group">
                <label>Preço de Venda Unit. (R$) <span style={{ color: '#10b981', fontSize: 11 }}>+35% automático</span></label>
                <input
                  type="number" min="0" step="1"
                  value={form.precoVenda || (custoUnit > 0 ? Math.round(custoUnit * MARGEM) : '')}
                  onChange={e => setForm(f => ({ ...f, precoVenda: e.target.value }))}
                  placeholder={custoUnit > 0 ? `R$ ${Math.round(custoUnit * MARGEM)}` : 'Auto +35%'}
                />
              </div>
            </div>

            {/* Preview de cálculos */}
            {custoCalc > 0 && (
              <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 10 }}>Resumo da nota</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Total Custo</div>
                    <strong style={{ color: '#ef4444' }}>{fmt(custoCalc)}</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Total Venda</div>
                    <strong style={{ color: '#3b82f6' }}>{fmt(vendaCalc)}</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Lucro</div>
                    <strong style={{ color: '#10b981' }}>{fmt(lucroCalc)}</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Com. Oficina 30%</div>
                    <strong style={{ color: '#3b82f6' }}>{fmt(comOficinaCalc)}</strong>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(251,191,36,0.12)', borderRadius: 8, padding: '6px 0' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Com. Leandra 5%</div>
                    <strong style={{ color: '#d97706', fontSize: 16 }}>{fmt(comLeandraCalc)}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar Notinha</button>
            </div>
          </form>
        </Modal>
      )}

      {/* === MODAL CONFIRMAÇÃO COMISSÃO === */}
      {confirmModal && (() => {
        const cc = confirmModal.custoCalc
        const pctNum = Math.max(0, parseFloat(pctInput) || 35)
        const pctDec = pctNum / 100
        const oficinaSplit = Math.max(0, pctDec - 0.05)
        return (
          <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, maxWidth:440, width:'100%', padding:'28px 24px' }}>
              <h3 style={{ margin:'0 0 6px', fontSize:17, fontWeight:800 }}>💰 Como distribuir a comissão?</h3>
              <p style={{ margin:'0 0 14px', fontSize:13, color:'var(--text-light)' }}>
                Custo: <strong style={{color:'#ef4444'}}>{fmt(cc)}</strong> &nbsp;|&nbsp;
                Venda: <strong style={{color:'#3b82f6'}}>{fmt(confirmModal.vendaCalc)}</strong> &nbsp;|&nbsp;
                Lucro: <strong style={{color:'#10b981'}}>{fmt(confirmModal.lucroCalc)}</strong>
              </p>

              {/* Campo de porcentagem livre */}
              <div style={{ background:'var(--bg-card2)', border:'1.5px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                <label style={{ fontWeight:700, fontSize:13, display:'block', marginBottom:8 }}>
                  📊 Porcentagem total sobre o custo:
                </label>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input
                    type="number" min="0" max="200" step="0.5"
                    value={pctInput}
                    onChange={e => setPctInput(e.target.value)}
                    style={{ width:90, padding:'8px 12px', borderRadius:8, border:'2px solid #3b82f6', fontSize:18, fontWeight:800, textAlign:'center', background:'var(--bg-card)', color:'var(--text-main)' }}
                  />
                  <span style={{ fontSize:20, fontWeight:800, color:'#3b82f6' }}>%</span>
                  <div style={{ fontSize:12, color:'var(--text-light)', lineHeight:1.4 }}>
                    = <strong style={{color:'var(--text-main)'}}>{fmt(cc * pctDec)}</strong> de comissão total<br />
                    <span style={{fontSize:11}}>Ex: 34%, 35%, 38%...</span>
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button onClick={() => confirmarSalvar('split')} style={{
                  background:'rgba(59,130,246,0.1)', border:'2px solid #3b82f6',
                  borderRadius:10, padding:'14px 16px', cursor:'pointer', textAlign:'left',
                }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#3b82f6', marginBottom:4 }}>
                    🏢 {(oficinaSplit*100).toFixed(1)}% Oficina + 👩 5% Leandra
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-light)' }}>
                    Oficina: <strong style={{color:'#3b82f6'}}>{fmt(cc * oficinaSplit)}</strong>
                    &nbsp;&nbsp;Leandra: <strong style={{color:'#d97706'}}>{fmt(cc * 0.05)}</strong>
                    &nbsp;&nbsp;Total: <strong>{fmt(cc * pctDec)}</strong>
                  </div>
                </button>

                <button onClick={() => confirmarSalvar('oficina')} style={{
                  background:'rgba(16,185,129,0.08)', border:'2px solid #10b981',
                  borderRadius:10, padding:'14px 16px', cursor:'pointer', textAlign:'left',
                }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#10b981', marginBottom:4 }}>
                    🏢 {pctNum.toFixed(1)}% só para a Oficina
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-light)' }}>
                    Oficina: <strong style={{color:'#10b981'}}>{fmt(cc * pctDec)}</strong>
                    &nbsp;&nbsp;Leandra: <strong style={{color:'var(--text-light)'}}>R$ 0,00</strong>
                  </div>
                </button>
              </div>

              <button onClick={() => setConfirmModal(null)} style={{ marginTop:14, background:'transparent', border:'none', color:'var(--text-light)', cursor:'pointer', fontSize:13 }}>
                ← Voltar e editar
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
