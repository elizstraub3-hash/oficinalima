import { useState } from 'react'
import Modal from './Modal.jsx'
import CampoPct, { pctSalva, fatorMargem } from './CampoPct.jsx'
import { listarPeriodos, hojeISO } from './Periodo.jsx'
import { adicionarLancamento } from './Caixa.jsx'

const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const ler = k => JSON.parse(localStorage.getItem(k) || '[]')

// Boleto semanal de peças: o total pode ser dividido em duas faixas, cada uma com sua porcentagem
export default function BoletoPecas({ onClose, onSalvo }) {
  const [f, setF] = useState(() => ({
    semana: 'semana-1', fornecedor: '',
    ate: '', pctAte: pctSalva('boleto_pct_ate50'),
    acima: '', pctAcima: pctSalva('boleto_pct_acima50'),
    lancarCaixa: true,
  }))
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  const vAte = parseFloat(f.ate) || 0
  const vAcima = parseFloat(f.acima) || 0
  const fAte = fatorMargem(f.pctAte)
  const fAcima = fatorMargem(f.pctAcima)
  const custo = vAte + vAcima
  const venda = vAte * (fAte || 1) + vAcima * (fAcima || 1)
  const faltaPct = (vAte > 0 && !fAte) || (vAcima > 0 && !fAcima)

  function salvar(e) {
    e.preventDefault()
    if (!custo) return alert('Coloque o valor das peças do boleto.')
    if (faltaPct) return alert('Coloque a porcentagem de cada faixa que tem valor.')
    const sem = listarPeriodos().semanas.find(x => x.id === f.semana)
    const periodo = sem.label.replace(/^[^(]*\(|\)$/g, '')
    const vendaR = Math.round(venda * 100) / 100
    const lucro = Math.round((vendaR - custo) * 100) / 100
    const arr = ler('ol_notinhas')
    arr.push({
      id: arr.length ? Math.max(...arr.map(x => Number(x.id) || 0)) + 1 : 1,
      tipo: 'boleto', desc: `Boleto de peças ${periodo}`, fornecedor: f.fornecedor,
      qtd: 1, custoUnit: custo, precoVenda: vendaR,
      faixas: { ate50: { valor: vAte, pct: f.pctAte }, acima50: { valor: vAcima, pct: f.pctAcima } },
      totalCusto: custo, totalVenda: vendaR, lucro, porcLucro: custo ? (lucro / custo) * 100 : 0,
      comOficina: lucro, comLeandra: 0, data: hojeISO(),
    })
    localStorage.setItem('ol_notinhas', JSON.stringify(arr))
    if (f.lancarCaixa) adicionarLancamento({ tipo: 'saida', categoria: 'Peças', valor: custo, descricao: `Boleto de peças ${periodo}${f.fornecedor ? ' — ' + f.fornecedor : ''}` })
    onSalvo && onSalvo()
    onClose()
  }

  const linha = { display: 'flex', justifyContent: 'space-between', fontSize: 14 }

  return (
    <Modal title="🧾 Boleto de peças da semana" onClose={onClose}>
      <form onSubmit={salvar}>
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 0 }}>
          Coloque o total do boleto. Se quiser, separe as peças baratas (até R$ 50) das mais caras, cada uma com sua porcentagem. Se não separar, coloque tudo em uma faixa só.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label>Semana das peças</label>
            <select value={f.semana} onChange={e => set('semana', e.target.value)}>
              {listarPeriodos().semanas.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Fornecedor</label>
            <input value={f.fornecedor} onChange={e => set('fornecedor', e.target.value)} placeholder="Nome da loja" />
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
          <strong style={{ fontSize: 13 }}>🔩 Peças até R$ 50</strong>
          <div className="form-row" style={{ marginTop: 6 }}>
            <div className="form-group">
              <label>Total dessas peças (R$)</label>
              <input type="number" min="0" step="0.01" value={f.ate} onChange={e => set('ate', e.target.value)} placeholder="Ex: 300" />
            </div>
            <CampoPct chave="boleto_pct_ate50" label="Porcentagem (%)" value={f.pctAte ?? ''} onChange={v => set('pctAte', v)} placeholder="Ex: 50" />
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
          <strong style={{ fontSize: 13 }}>⚙️ Peças acima de R$ 50</strong>
          <div className="form-row" style={{ marginTop: 6 }}>
            <div className="form-group">
              <label>Total dessas peças (R$)</label>
              <input type="number" min="0" step="0.01" value={f.acima} onChange={e => set('acima', e.target.value)} placeholder="Ex: 700" />
            </div>
            <CampoPct chave="boleto_pct_acima50" label="Porcentagem (%)" value={f.pctAcima ?? ''} onChange={v => set('pctAcima', v)} placeholder="Ex: 40" />
          </div>
        </div>

        {custo > 0 && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid #10b981', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'grid', gap: 4 }}>
            <div style={linha}><span>💸 Total do boleto (custo)</span><strong style={{ color: '#ef4444' }}>{fmt(custo)}</strong></div>
            <div style={linha}><span>➕ Margem</span><strong style={{ color: '#10b981' }}>{faltaPct ? '—' : fmt(venda - custo)}</strong></div>
            <div style={linha}><span>💳 Valor para o cliente</span><strong style={{ color: '#3b82f6', fontSize: 17 }}>{faltaPct ? 'falta a %' : fmt(venda)}</strong></div>
          </div>
        )}

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.lancarCaixa} onChange={e => set('lancarCaixa', e.target.checked)} style={{ width: 'auto' }} />
          💰 Lançar o boleto no Caixa como saída
        </label>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Salvar boleto</button>
        </div>
      </form>
    </Modal>
  )
}
