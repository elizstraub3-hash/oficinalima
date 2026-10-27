import { useState } from 'react'

// Campo de porcentagem livre, com a pergunta "deixar salva?".
// Sim: a porcentagem fica salva e já vem preenchida da próxima vez. Não: da próxima vez vem em branco.
const KEY = 'ol_pct_salvas'

function lerTudo() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }

export function pctSalva(chave) {
  const v = lerTudo()[chave]
  return v === undefined || v === null ? '' : String(v)
}

function gravar(chave, valor, salvar) {
  const t = lerTudo()
  if (salvar && valor !== '' && !Number.isNaN(Number(valor))) t[chave] = Number(valor)
  else delete t[chave]
  localStorage.setItem(KEY, JSON.stringify(t))
}

// Converte "35" em 1.35 (fator de venda); vazio = sem margem automática
export const fatorMargem = pct => (pct === '' || pct === undefined || Number.isNaN(Number(pct)) ? null : 1 + Number(pct) / 100)

export default function CampoPct({ chave, label, value, onChange, placeholder = 'Ex: 35', ajuda }) {
  const [salvar, setSalvar] = useState(() => pctSalva(chave) !== '')

  function mudarValor(v) {
    onChange(v)
    if (salvar) gravar(chave, v, true)
  }

  function escolher(sim) {
    setSalvar(sim)
    gravar(chave, value, sim)
  }

  const btn = ativo => ({
    flex: 1, padding: '6px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
    border: '1.5px solid ' + (ativo ? '#3b82f6' : 'var(--border)'),
    background: ativo ? '#3b82f6' : 'transparent', color: ativo ? '#fff' : 'var(--text-main)',
  })

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type="number" min="0" step="0.5" value={value} placeholder={placeholder}
          onChange={e => mudarValor(e.target.value)} style={{ paddingRight: 28 }} />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontWeight: 700 }}>%</span>
      </div>
      {ajuda && <small style={{ color: 'var(--text-light)' }}>{ajuda}</small>}
      <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-light)' }}>Deixar essa porcentagem salva para as próximas?</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button type="button" style={btn(salvar)} onClick={() => escolher(true)}>Sim</button>
        <button type="button" style={btn(!salvar)} onClick={() => escolher(false)}>Não</button>
      </div>
    </div>
  )
}
