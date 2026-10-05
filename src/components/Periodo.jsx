const dLocal = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
const ddmm = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7)
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export const hojeISO = () => dLocal(new Date())

// Data que conta para a OS: dia em que foi concluída, senão o dia de abertura
export function dataOS(o) {
  if (o.fim) return dLocal(new Date(o.fim))
  if (o.data) return o.data
  if (o.inicio) return dLocal(new Date(o.inicio))
  return ''
}

export const noPeriodo = (iso, p) => !!iso && iso >= p.de && iso <= p.ate

// Semanas (segunda a domingo) e meses com dados, para consultar o histórico
export function listarPeriodos() {
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0)
  const seg = new Date(hoje); seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7))
  const semanas = []
  for (let i = 0; i < 8; i++) {
    const ini = new Date(seg); ini.setDate(seg.getDate() - 7 * i)
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6)
    const de = dLocal(ini), ate = dLocal(fim)
    const nome = i === 0 ? 'Esta semana' : i === 1 ? 'Semana passada' : 'Semana'
    semanas.push({ id: `semana-${i}`, de, ate, label: `${nome} (${ddmm(de)} – ${ddmm(ate)})` })
  }
  const ler = k => JSON.parse(localStorage.getItem(k) || '[]')
  const datas = [
    ...ler('ol_ordens').map(dataOS),
    ...ler('ol_gastos').map(g => g.data),
    ...ler('ol_notinhas').map(n => n.data),
    ...ler('ol_caixa').map(c => c.data),
  ].filter(Boolean)
  const meses = new Set([dLocal(hoje).slice(0, 7), ...datas.map(d => d.slice(0, 7))])
  const listaMeses = [...meses].sort().reverse().map(m => {
    const [a, mm] = m.split('-')
    const ultimo = new Date(Number(a), Number(mm), 0).getDate()
    return { id: `mes-${m}`, de: `${m}-01`, ate: `${m}-${String(ultimo).padStart(2, '0')}`, label: `${MESES[Number(mm) - 1]} de ${a}` }
  })
  return { semanas, meses: listaMeses }
}

export function acharPeriodo(id) {
  const { semanas, meses } = listarPeriodos()
  return [...semanas, ...meses].find(p => p.id === id) || semanas[0]
}

export function SeletorPeriodo({ value, onChange }) {
  const { semanas, meses } = listarPeriodos()
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ minWidth: 240, fontWeight: 600 }} title="Período">
      <optgroup label="Semanas">
        {semanas.map(p => <option key={p.id} value={p.id}>📅 {p.label}</option>)}
      </optgroup>
      <optgroup label="Meses">
        {meses.map(p => <option key={p.id} value={p.id}>🗓️ {p.label}</option>)}
      </optgroup>
    </select>
  )
}
