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

// Peças vendidas nas OS concluídas do período: custo, venda e lucro
export function pecasDasOS(periodo) {
  const ordens = JSON.parse(localStorage.getItem('ol_ordens') || '[]')
    .filter(o => o.status === 'concluido' && (!periodo || noPeriodo(dataOS(o), periodo)))
  let custo = 0, venda = 0, vendaComCusto = 0, qtdPecas = 0, semCusto = 0
  ordens.forEach(o => (o.itens || []).forEach(it => {
    const q = Number(it.qtd) || 1
    const v = (Number(it.valor ?? it.valorUnit) || 0) * q
    const c = (Number(it.custo) || 0) * q
    venda += v; qtdPecas += q
    if (c > 0) { custo += c; vendaComCusto += v } else if (v > 0) semCusto++
  }))
  return { custo, venda, lucro: vendaComCusto - custo, qtdPecas, semCusto, ordens: ordens.length }
}
