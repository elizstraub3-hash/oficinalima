import { noPeriodo, dataOS } from './Periodo.jsx'

// Porcentagem que o Pedro coloca em cima do custo de cada peça vendida, por faixa de preço
const KEY = 'ol_faixas_pecas'
const PADRAO = { limite: 50, ate: 50, acima: 40 }

export function lerFaixas() {
  try { return { ...PADRAO, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...PADRAO } }
}

export function salvarFaixas(f) {
  localStorage.setItem(KEY, JSON.stringify({ limite: Number(f.limite) || 0, ate: Number(f.ate) || 0, acima: Number(f.acima) || 0 }))
}

export function pctDaFaixa(custo, f = lerFaixas()) {
  return Number(custo) <= Number(f.limite) ? Number(f.ate) : Number(f.acima)
}

export function vendaPorFaixa(custo, f = lerFaixas()) {
  const c = Number(custo) || 0
  if (!c) return ''
  return Math.round(c * (1 + pctDaFaixa(c, f) / 100) * 100) / 100
}

// Custo estimado a partir do preço de venda, desfazendo a margem da faixa (para peça sem custo informado)
export function custoPorVenda(venda, f = lerFaixas()) {
  const v = Number(venda) || 0
  if (!v) return 0
  const cAte = v / (1 + Number(f.ate) / 100)
  const c = cAte <= Number(f.limite) ? cAte : v / (1 + Number(f.acima) / 100)
  return Math.round(c * 100) / 100
}

// Peças vendidas nas OS concluídas do período: custo, venda e lucro
export function pecasDasOS(periodo, abertas = false) {
  const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
    .filter(o => abertas
      ? !['concluido', 'cancelado'].includes(o.status)
      : o.status === 'concluido' && (!periodo || noPeriodo(dataOS(o), periodo)))
  const f = lerFaixas()
  let custo = 0, venda = 0, qtdPecas = 0, estimadas = 0
  ordens.forEach(o => (o.itens || []).forEach(it => {
    const q = Number(it.qtd) || 1
    const vUnit = Number(it.valor ?? it.valorUnit) || 0
    let cUnit = Number(it.custo) || 0
    if (!cUnit && vUnit) { cUnit = custoPorVenda(vUnit, f); estimadas++ }
    venda += vUnit * q; custo += cUnit * q; qtdPecas += q
  }))
  return { custo, venda, lucro: venda - custo, qtdPecas, estimadas, ordens: ordens.length }
}
