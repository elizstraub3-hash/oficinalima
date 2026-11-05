// Ações do assistente além de criar OS: lançar gasto e concluir OS
const ler = k => JSON.parse(localStorage.getItem(k) || '[]')
const sem = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }

const CATEGORIAS = [
  ['Peças', /(peca|filtro|pastilha|correia|vela|oleo|lubrax|paraflu|fluido|rolamento|amortecedor)/],
  ['Café / Alimentação', /(cafe|almoco|lanche|pao|comida|marmita|agua mineral|refri)/],
  ['Combustível / Posto', /(gasolina|etanol|alcool|diesel|combustivel|posto|abastec)/],
  ['Pintura / Manutenção', /(pintura|tinta|reforma|conserto|manutencao|elevador|portao)/],
  ['Material de Limpeza', /(limpeza|detergente|pano|vassoura|sabao|desengraxante)/],
  ['Material de Escritório', /(papel|caneta|impressao|escritorio|pasta|toner)/],
  ['Ferramentas', /(ferramenta|chave|soquete|alicate|macaco|compressor|equipamento)/],
  ['EPI / Uniformes', /(luva|oculos|uniforme|bota|epi|mascara)/],
  ['Conta Fixa', /(luz|copel|agua|internet|telefone|gas|aluguel|conta)/],
  ['Frete / Entrega', /(frete|motoboy|entrega|correio)/],
]

export function ehPedidoDeGasto(t) {
  if (/\b(como|onde)\b/.test(t)) return false
  return /\b(gastei|paguei|gasto|despesa|comprei|lanca|lancar|adiciona|adicionar|registra|anota)\b/.test(t) && /\d/.test(t)
}

export function extrairGasto(texto) {
  const t = sem(texto)
  const valor = t.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|pila)?/)
  let desc = texto
    .replace(/(?:r\$\s*)?\d+(?:[.,]\d{1,2})?\s*(?:reais|real|conto|pila)?/i, ' ')
    .replace(/\b(adiciona|adicionar|lanca|lança|lançar|lancar|registra|anota|um|uma|o|a|gasto|despesa|gastei|paguei|comprei|de|do|da|no|na|com|em|pra|para|hoje)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim()
  desc = desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : ''
  const cat = CATEGORIAS.find(([, re]) => re.test(t))?.[0] || 'Outros'
  return { descricao: desc, valor: valor ? valor[1].replace(',', '.') : '', categoria: cat, data: hoje(), fornecedor: '' }
}

export function salvarGasto(g) {
  const arr = ler('ol_gastos')
  arr.push({ id: arr.length ? Math.max(...arr.map(x => Number(x.id) || 0)) + 1 : 1, descricao: g.descricao, descBreve: '', categoria: g.categoria, valor: parseFloat(g.valor), comissao: '', fornecedor: g.fornecedor || '', nota: '', data: g.data || hoje() })
  localStorage.setItem('ol_gastos', JSON.stringify(arr))
}

export const CATEGORIAS_GASTO = CATEGORIAS.map(c => c[0]).concat('Compras Gerais', 'Outros')

export function ehPedidoDeConcluir(t) {
  return /\b(conclui|concluir|conclua|finaliza|finalizar|finalize|fecha|fechar|terminou|ficou pronto|esta pronto|pronta)\b/.test(t) && /\b(os|ordem|carro|placa)\b|[a-z]{3}\d[a-z0-9]\d{2}/.test(t)
}

// Procura OS aberta pela placa ou pelo nome do cliente citado
export function acharOSAberta(texto) {
  const t = sem(texto)
  const junto = t.replace(/[^a-z0-9]/g, '')
  const abertas = ler('ol_ordens').filter(o => !['concluido', 'cancelado'].includes(o.status))
  const porPlaca = abertas.find(o => o.placa && junto.includes(sem(o.placa).replace(/[^a-z0-9]/g, '')))
  if (porPlaca) return { os: porPlaca, abertas }
  const porNome = abertas.filter(o => { const n = sem(o.clienteNome).split(' ')[0]; return n.length > 2 && new RegExp(`\\b${n}\\b`).test(t) })
  return { os: porNome.length === 1 ? porNome[0] : null, abertas: porNome.length > 1 ? porNome : abertas }
}

export function concluirOS(id) {
  const arr = ler('ol_ordens')
  const i = arr.findIndex(o => String(o.id) === String(id))
  if (i < 0) return null
  arr[i] = { ...arr[i], status: 'concluido', fim: Date.now() }
  localStorage.setItem('ol_ordens', JSON.stringify(arr))
  return arr[i]
}
