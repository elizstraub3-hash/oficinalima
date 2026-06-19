import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import './Caixa.css'

const KEY = 'ol_caixa'
const CATS = ['Serviço', 'Estoque', 'Manutenção', 'Outros']

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]') }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)) }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1 }

const empty = () => ({ descricao: '', valor: '', tipo: 'entrada', categoria: 'Serviço', data: new Date().toISOString().split('T')[0] })

export default function Caixa() {
  const [entries, setEntries] = useState(load)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty())
  const [filtro, setFiltro] = useState({ tipo: 'todos', de: '', ate: '' })

  function refresh() { setEntries(load()) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor) return
    const arr = load()
    arr.push({ ...form, id: nextId(arr), valor: parseFloat(form.valor) })
    save(arr)
    setModal(false)
    setForm(empty())
    refresh()
  }

  function handleDelete(id) {
    if (!confirm('Excluir este lançamento?')) return
    save(load().filter(e => e.id !== id))
    refresh()
  }

  const filtered = entries.filter(e => {
    if (filtro.tipo !== 'todos' && e.tipo !== filtro.tipo) return false
    if (filtro.de && e.data < filtro.de) return false
    if (filtro.ate && e.data > filtro.ate) return false
    return true
  })

  const totalEntrada = filtered.filter(e => e.tipo === 'entrada').reduce((s, e) => s + e.valor, 0)
  const totalSaida = filtered.filter(e => e.tipo === 'saida').reduce((s, e) => s + e.valor, 0)
  const saldo = totalEntrada - totalSaida

  const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

  const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
  const notinhas = JSON.parse(localStorage.getItem('ol_notinhas') || '[]')
  const totalGastoPecas = notinhas.reduce((s, n) => s + (n.totalCusto || 0), 0)
  const totalLucroPecas = notinhas.reduce((s, n) => s + (n.lucro || 0), 0)

  // Helpers de data
  const hoje = new Date()
  const hojeStr = hoje.toISOString().split('T')[0]
  const semanaInicio = new Date(hoje); semanaInicio.setDate(hoje.getDate() - hoje.getDay())
  const semanaStr = semanaInicio.toISOString().split('T')[0]
  const mesStr = hojeStr.slice(0, 7)

  function ordensDoPeriodo(de) {
    return ordens.filter(o => {
      const d = o.data || (o.inicio ? new Date(o.inicio).toISOString().split('T')[0] : null)
      return d && d >= de
    })
  }

  function somaValor(arr) { return arr.reduce((s, o) => s + Number(o.valor || 0), 0) }
  function somaMob(arr) {
    return arr.reduce((s, o) => {
      if (o.servicos && o.servicos.length) return s + o.servicos.reduce((ss, sv) => ss + (parseFloat(sv.maoDeObra) || 0), 0)
      return s + (parseFloat(o.maoDeObra) || 0)
    }, 0)
  }

  const totalMaoDeObra = somaMob(ordens)

  // Resumo por período
  const ordensHoje = ordensDoPeriodo(hojeStr)
  const ordensSemana = ordensDoPeriodo(semanaStr)
  const ordensMes = ordensDoPeriodo(mesStr + '-01')

  // Por funcionário: agrupa servicos[]
  const porFuncionario = {}
  ordens.forEach(o => {
    if (o.servicos && o.servicos.length) {
      o.servicos.forEach(sv => {
        if (!sv.funcionario) return
        if (!porFuncionario[sv.funcionario]) porFuncionario[sv.funcionario] = 0
        porFuncionario[sv.funcionario] += parseFloat(sv.maoDeObra) || 0
      })
    } else if (o.funcionario && o.maoDeObra) {
      if (!porFuncionario[o.funcionario]) porFuncionario[o.funcionario] = 0
      porFuncionario[o.funcionario] += parseFloat(o.maoDeObra) || 0
    }
  })

  return (
    <div>
      <div className="page-header">
        <h1>💰 Caixa</h1>
        <button className="btn-primary" onClick={() => { setForm(empty()); setModal(true) }}>
          + Novo Lançamento
        </button>
      </div>

      <div className="caixa-resumo">
        <div className="resumo-card green">
          <span className="resumo-label">Total Entradas</span>
          <strong>{fmt(totalEntrada)}</strong>
        </div>
        <div className="resumo-card red">
          <span className="resumo-label">Total Saídas</span>
          <strong>{fmt(totalSaida)}</strong>
        </div>
        <div className={`resumo-card ${saldo >= 0 ? 'blue' : 'red'} saldo`}>
          <span className="resumo-label">Saldo</span>
          <strong>{fmt(saldo)}</strong>
        </div>
      </div>

      {/* Resumo OS por período */}
      <div className="caixa-periodo">
        <div className="periodo-title">📅 Faturamento em OS</div>
        <div className="periodo-grid">
          <div className="periodo-item">
            <span className="periodo-label">Hoje</span>
            <strong>{fmt(somaValor(ordensHoje))}</strong>
            <small>{ordensHoje.length} OS</small>
          </div>
          <div className="periodo-item">
            <span className="periodo-label">Esta Semana</span>
            <strong>{fmt(somaValor(ordensSemana))}</strong>
            <small>{ordensSemana.length} OS</small>
          </div>
          <div className="periodo-item">
            <span className="periodo-label">Este Mês</span>
            <strong>{fmt(somaValor(ordensMes))}</strong>
            <small>{ordensMes.length} OS</small>
          </div>
        </div>
      </div>

      {/* Gasto e Lucro com Peças */}
      <div className="caixa-pecas-split">
        <div className="mob-split-title">🔩 Controle de Peças (Notinhas)</div>
        <div className="mob-split-grid">
          <div className="mob-split-item" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
            <span className="mob-split-label">🛒 Gasto Total com Peças</span>
            <strong style={{ color: '#ef4444', fontSize: 18, fontWeight: 800 }}>{fmt(totalGastoPecas)}</strong>
          </div>
          <div className="mob-split-item" style={{ background: '#f0fdf4', borderColor: '#6ee7b7' }}>
            <span className="mob-split-label">📈 Lucro com Peças</span>
            <strong style={{ color: '#059669', fontSize: 18, fontWeight: 800 }}>{fmt(totalLucroPecas)}</strong>
          </div>
          <div className="mob-split-item" style={{ background: '#eff6ff', borderColor: '#93c5fd' }}>
            <span className="mob-split-label">📊 Margem Média</span>
            <strong style={{ color: '#2563eb', fontSize: 18, fontWeight: 800 }}>
              {totalGastoPecas > 0 ? ((totalLucroPecas / totalGastoPecas) * 100).toFixed(0) : 0}%
            </strong>
          </div>
        </div>
        {notinhas.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8 }}>Últimas Notinhas</div>
            <table>
              <thead>
                <tr>
                  <th>Peça</th>
                  <th>Fornecedor</th>
                  <th>Qtd</th>
                  <th>Custo Total</th>
                  <th>Venda Total</th>
                  <th>Lucro</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {[...notinhas].reverse().slice(0, 10).map(n => (
                  <tr key={n.id}>
                    <td><strong>{n.desc}</strong><br /><span style={{ fontSize: 11, color: 'var(--text-light)' }}>{n.data}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{n.fornecedor || '—'}</td>
                    <td>{n.qtd}</td>
                    <td><strong style={{ color: '#ef4444' }}>{fmt(n.totalCusto)}</strong></td>
                    <td>{n.precoVenda > 0 ? <strong style={{ color: '#3b82f6' }}>{fmt(n.precoVenda * n.qtd)}</strong> : '—'}</td>
                    <td><strong style={{ color: n.lucro >= 0 ? '#059669' : '#ef4444' }}>{fmt(n.lucro)}</strong></td>
                    <td><span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{(n.porcLucro || 0).toFixed(0)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Divisão mão de obra */}
      <div className="caixa-mob-split">
        <div className="mob-split-title">🔧 Divisão de Mão de Obra (Total OS)</div>
        <div className="mob-split-grid">
          <div className="mob-split-item total">
            <span className="mob-split-label">Total Mão de Obra</span>
            <strong>{fmt(totalMaoDeObra)}</strong>
          </div>
          <div className="mob-split-item oficina">
            <span className="mob-split-label">💼 Fica na Oficina (50%)</span>
            <strong>{fmt(totalMaoDeObra * 0.5)}</strong>
          </div>
          <div className="mob-split-item mecanico">
            <span className="mob-split-label">👷 Pagar Mecânicos (50%)</span>
            <strong>{fmt(totalMaoDeObra * 0.5)}</strong>
          </div>
        </div>

        {/* Por funcionário */}
        {Object.keys(porFuncionario).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: 8 }}>
              Detalhamento por Mecânico
            </div>
            <div className="mob-func-grid">
              {Object.entries(porFuncionario).map(([nome, total]) => (
                <div key={nome} className="mob-func-item">
                  <div className="mob-func-avatar">{nome.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="mob-func-nome">{nome}</div>
                    <div className="mob-func-total">Total gerado: {fmt(total)}</div>
                    <div className="mob-func-pagar">A pagar (50%): <strong style={{ color: '#2563eb' }}>{fmt(total * 0.5)}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="caixa-filtros">
          <select value={filtro.tipo} onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}>
            <option value="todos">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
          <div className="filtro-datas">
            <label>De: <input type="date" value={filtro.de} onChange={e => setFiltro(f => ({ ...f, de: e.target.value }))} /></label>
            <label>Até: <input type="date" value={filtro.ate} onChange={e => setFiltro(f => ({ ...f, ate: e.target.value }))} /></label>
          </div>
          {(filtro.tipo !== 'todos' || filtro.de || filtro.ate) && (
            <button className="btn-secondary" onClick={() => setFiltro({ tipo: 'todos', de: '', ate: '' })}>Limpar filtros</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <p>Nenhum lançamento encontrado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>{e.descricao}</td>
                  <td><span className="badge badge-gray">{e.categoria}</span></td>
                  <td>
                    <span className={`badge ${e.tipo === 'entrada' ? 'badge-green' : 'badge-red'}`}>
                      {e.tipo === 'entrada' ? '▲ Entrada' : '▼ Saída'}
                    </span>
                  </td>
                  <td className={`valor-cell ${e.tipo === 'entrada' ? 'entrada' : 'saida'}`}>
                    {e.tipo === 'saida' ? '-' : '+'}{fmt(e.valor)}
                  </td>
                  <td>
                    <button className="btn-danger" onClick={() => handleDelete(e.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Novo Lançamento" onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Descrição *</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Troca de óleo - Fiat Uno" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input type="number" min="0.01" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" required />
              </div>
              <div className="form-group">
                <label>Data</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
