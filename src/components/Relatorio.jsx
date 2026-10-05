import { useState } from 'react'
import { SeletorPeriodo, acharPeriodo, noPeriodo, dataOS } from './Periodo.jsx'
import { lancamentosCaixa } from './Caixa.jsx'
import { calcResumoFuncionario } from './Funcionarios.jsx'

const ler = k => JSON.parse(localStorage.getItem(k) || '[]')
const fmt = v => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const soma = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)

export function resumoPeriodo(periodo) {
  const caixa = lancamentosCaixa().filter(e => noPeriodo(e.data, periodo))
  const entradas = soma(caixa.filter(e => e.tipo === 'entrada'), e => e.valor)
  const saidas = soma(caixa.filter(e => e.tipo === 'saida'), e => e.valor)

  const ordens = ler('ol_ordens').filter(o => noPeriodo(dataOS(o), periodo))
  const concluidas = ordens.filter(o => o.status === 'concluido')
  const maoDeObra = soma(ordens, o => o.servicos?.length ? soma(o.servicos, sv => parseFloat(sv.maoDeObra)) : o.maoDeObra)

  const mecanicos = ler('ol_funcionarios')
    .map(f => ({ nome: f.nome, ativo: f.status === 'ativo', ...calcResumoFuncionario(f.nome, periodo) }))
    .filter(m => m.ativo || m.maoDeObra > 0)

  const notinhas = ler('ol_notinhas').filter(n => noPeriodo(n.data, periodo))
  const contasPagas = ler('ol_contas').filter(c => c.status === 'pago' && noPeriodo(c.pagoEm, periodo))
  const gastos = ler('ol_gastos').filter(g => noPeriodo(g.data, periodo))
  const gastosPorCat = Object.entries(gastos.reduce((acc, g) => {
    acc[g.categoria || 'Outros'] = (acc[g.categoria || 'Outros'] || 0) + Number(g.valor || 0)
    return acc
  }, {})).sort((a, b) => b[1] - a[1])

  return {
    entradas, saidas, saldo: entradas - saidas,
    osConcluidas: concluidas.length, valorOs: soma(concluidas, o => o.valor),
    maoDeObra, mecanicos,
    pecas: {
      qtd: notinhas.length,
      custo: soma(notinhas, n => n.totalCusto),
      venda: soma(notinhas, n => n.totalVenda),
      lucro: soma(notinhas, n => n.lucro),
      comOficina: soma(notinhas, n => n.comOficina),
      comPedro: soma(notinhas, n => n.comLeandra),
    },
    contasPagas, gastosPorCat, totalGastos: soma(gastos, g => g.valor),
  }
}

function Linha({ label, valor, cor, forte }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
      <span>{label}</span>
      <strong style={{ color: cor, fontSize: forte ? 16 : 14 }}>{valor}</strong>
    </div>
  )
}

function Bloco({ titulo, children }) {
  return (
    <div className="card" style={{ marginBottom: 16, breakInside: 'avoid' }}>
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>{titulo}</h3>
      {children}
    </div>
  )
}

export default function Relatorio() {
  const [periodoId, setPeriodoId] = useState('semana-0')
  const periodo = acharPeriodo(periodoId)
  const r = resumoPeriodo(periodo)
  const vazio = <p style={{ color: 'var(--text-light)', fontSize: 14, margin: 0 }}>Nada registrado no período.</p>

  return (
    <div>
      <div className="page-header no-print">
        <SeletorPeriodo value={periodoId} onChange={setPeriodoId} />
        <button className="btn-primary" onClick={() => window.print()}>🖨️ Imprimir / Salvar PDF</button>
      </div>

      <h2 style={{ marginTop: 0 }}>📊 Relatório — {periodo.label}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ margin: 0 }}><div style={{ fontSize: 13, color: 'var(--text-light)' }}>💵 Entradas</div><strong style={{ fontSize: 22, color: '#10b981' }}>{fmt(r.entradas)}</strong></div>
        <div className="card" style={{ margin: 0 }}><div style={{ fontSize: 13, color: 'var(--text-light)' }}>💸 Saídas</div><strong style={{ fontSize: 22, color: '#ef4444' }}>{fmt(r.saidas)}</strong></div>
        <div className="card" style={{ margin: 0 }}><div style={{ fontSize: 13, color: 'var(--text-light)' }}>📈 Saldo</div><strong style={{ fontSize: 22, color: r.saldo >= 0 ? '#3b82f6' : '#ef4444' }}>{fmt(r.saldo)}</strong></div>
        <div className="card" style={{ margin: 0 }}><div style={{ fontSize: 13, color: 'var(--text-light)' }}>🔧 OS concluídas</div><strong style={{ fontSize: 22 }}>{r.osConcluidas}</strong> <span style={{ fontSize: 13, color: 'var(--text-light)' }}>({fmt(r.valorOs)})</span></div>
      </div>

      <Bloco titulo="👷 Quanto deu para cada um">
        {r.mecanicos.map(m => (
          <Linha key={m.nome} label={`${m.nome} — ${m.concluidas} OS · mão de obra ${fmt(m.maoDeObra)}`} valor={`pagar ${fmt(m.maoDeObra * 0.5)}`} cor="#3b82f6" />
        ))}
        <Linha label="👨 Pedro — comissão de peças (3%)" valor={fmt(r.pecas.comPedro)} cor="#d97706" />
        <Linha label="🏢 Oficina — 50% da mão de obra" valor={fmt(r.maoDeObra * 0.5)} />
        <Linha label="🏢 Oficina — comissão de peças" valor={fmt(r.pecas.comOficina)} />
      </Bloco>

      <Bloco titulo="📄 Contas pagas (luz, internet, aluguel...)">
        {r.contasPagas.length ? r.contasPagas.map(c => (
          <Linha key={c.id} label={`${c.descricao} — paga em ${c.pagoEm.split('-').reverse().join('/')}`} valor={fmt(c.valor)} cor="#ef4444" />
        )) : vazio}
      </Bloco>

      <Bloco titulo="🧾 Gastos por categoria">
        {r.gastosPorCat.length ? (<>
          {r.gastosPorCat.map(([cat, v]) => <Linha key={cat} label={cat} valor={fmt(v)} cor="#ef4444" />)}
          <Linha label="Total de gastos" valor={fmt(r.totalGastos)} cor="#ef4444" forte />
        </>) : vazio}
      </Bloco>

      <Bloco titulo="🔩 Peças (notinhas)">
        {r.pecas.qtd ? (<>
          <Linha label={`${r.pecas.qtd} notinha(s) — custo`} valor={fmt(r.pecas.custo)} cor="#ef4444" />
          <Linha label="Venda" valor={fmt(r.pecas.venda)} cor="#3b82f6" />
          <Linha label="Lucro" valor={fmt(r.pecas.lucro)} cor="#10b981" forte />
        </>) : vazio}
      </Bloco>

      <style>{`@media print { .sidebar, .topbar, .no-print, header, nav { display: none !important; } .card { box-shadow: none !important; } }`}</style>
    </div>
  )
}
