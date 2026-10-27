const ler = k => JSON.parse(localStorage.getItem(k) || '[]')
const sem = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const cap = s => s.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' ')

const MODELOS = ['gol', 'uno', 'palio', 'onix', 'prisma', 'celta', 'corsa', 'classic', 'fiesta', 'ka', 'ecosport', 'hb20', 'hb20s', 'civic', 'corolla', 'fox', 'polo', 'voyage', 'saveiro', 'strada', 'toro', 'argo', 'cronos', 'mobi', 'kwid', 'sandero', 'logan', 'duster', 'captur', 's10', 'hilux', 'ranger', 'cruze', 'spin', 'cobalt', 'fit', 'city', 'hrv', 'hr-v', 'compass', 'renegade', 'tracker', 't-cross', 'nivus', 'virtus', 'siena', 'idea', 'punto', 'march', 'versa', 'kicks', 'frontier', 'sentra', '208', '2008', '206', '207', 'c3', 'c4', 'up', 'golf', 'jetta', 'amarok', 'montana', 'agile', 'astra', 'vectra', 'zafira', 'meriva', 'doblo', 'fiorino', 'parati', 'santana', 'creta', 'tucson', 'ix35', 'etios', 'yaris', 'sw4', 'outlander', 'l200', 'pajero', 'lancer', 'tiggo', 'clio', 'megane', 'fluence', 'oroch', 'master', 'sprinter', 'kombi', 'biz', 'cg', 'fan', 'titan', 'bros']
const CORES = ['branco', 'branca', 'preto', 'preta', 'prata', 'cinza', 'vermelho', 'vermelha', 'azul', 'verde', 'amarelo', 'amarela', 'bege', 'marrom', 'dourado', 'vinho', 'laranja']
const SERVICO = /(troca|trocar|revis|alinha|balance|freio|pastilha|disco|embreag|oleo|motor|suspens|amortec|correia|bateria|barulho|vazament|eletric|ar condicionado|injec|vela|filtro|radiador|diagnos|funilaria|pintura|escapamento|problema|consert|arrum|verific|olhar|ver o|ver a|cabecote|junta|bomba|rolamento|pneu|farol|lampada|retifica|direcao|cambio|mecanica)/

// Separa o ditado em pedaços: vírgulas, pontos e palavras que costumam abrir um novo dado
function pedacos(texto) {
  return texto
    .replace(/\b(placa|carro|modelo|servi[cç]o|valor|telefone|cliente|mec[aâ]nico)\b/gi, '|$1')
    .split(/[|,;.\n]/).map(s => s.trim()).filter(Boolean)
}

export function ehPedidoDeOS(t) {
  if (/\b(como|onde)\b/.test(t)) return false
  return /\b(cria|criar|crie|abre|abrir|abra|abri|nova|novo|faz|faca|fazer|cadastra|cadastrar|registra|registrar|lanca|lancar)\b.{0,25}\b(os|o\.s|ordem|orcamento)\b/.test(t)
}

export function extrairOS(texto) {
  const t = sem(texto)
  const clientes = ler('ol_clientes')
  const funcionarios = ler('ol_funcionarios').filter(f => f.status === 'ativo')
  const r = { clienteNome: '', clienteTelefone: '', placa: '', modelo: '', ano: '', cor: '', servico: '', valor: '', funcionario: '', status: 'orcamento' }

  // Placa: depois da palavra "placa" (juntando letras soltas ditadas) ou no padrão ABC1D23 / ABC-1234
  const aposPlaca = t.match(/placa\s*(?:e|eh|é|:)?\s*([a-z0-9\s-]{6,20})/)
  const candidatas = []
  if (aposPlaca) candidatas.push(aposPlaca[1].replace(/[^a-z0-9]/g, ''))
  candidatas.push(...(t.match(/\b[a-z]{3}[\s-]?\d[a-z0-9]\d{2}\b/g) || []).map(p => p.replace(/[^a-z0-9]/g, '')))
  const placa = candidatas.map(c => c.slice(0, 7)).find(c => /^[a-z]{3}\d[a-z0-9]\d{2}$/.test(c))
  if (placa) r.placa = placa.toUpperCase()

  // Cliente: primeiro procura nos clientes cadastrados (nome completo, depois primeiro nome)
  const cad = clientes.find(c => c.nome && t.includes(sem(c.nome)))
    || clientes.find(c => { const p = sem(c.nome).split(' ')[0]; return p.length > 2 && new RegExp(`\\b${p}\\b`).test(t) && !funcionarios.some(f => sem(f.nome).split(' ')[0] === p) })
    || (r.placa && clientes.find(c => (c.placa || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() === r.placa))
  if (cad) {
    Object.assign(r, { clienteNome: cad.nome, clienteTelefone: cad.telefone || '', clienteDoc: cad.cpf || cad.cnpj || '', clienteEndereco: cad.endereco || '' })
    if (!r.placa && cad.placa) r.placa = cad.placa
    r.modelo = cad.modelo || ''; r.ano = cad.ano || ''; r.cor = cad.cor || ''
  } else {
    const m = texto.match(/(?:cliente|para (?:o|a)|pro|pra|do|da)\s+([A-Za-zÀ-ú]+(?:\s+(?!placa|carro|que|com|de|do|da)[A-Za-zÀ-ú]+)?)/i)
    if (m && !/^(carro|placa|servi|troca|oleo|óleo)/i.test(m[1])) r.clienteNome = cap(m[1].trim())
  }

  const tel = texto.match(/\(?\b\d{2}\)?\s?9?\s?\d{4}[-\s]?\d{4}\b/)
  if (tel && !r.clienteTelefone) r.clienteTelefone = tel[0]

  const modelo = MODELOS.find(m => new RegExp(`(^|[^a-z0-9-])${m.replace('-', '\\-')}([^a-z0-9-]|$)`).test(t))
  if (modelo) r.modelo = /\d/.test(modelo) ? modelo.toUpperCase() : cap(modelo)
  const ano = t.match(/\b(19[89]\d|20[0-3]\d)\b/)
  if (ano) r.ano = ano[1]
  const cor = CORES.find(c => new RegExp(`\\b${c}\\b`).test(t))
  if (cor) r.cor = cap(cor)

  const valor = t.match(/(?:r\$\s*)(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|pila)/)
  if (valor) r.valor = (valor[1] || valor[2]).replace(',', '.')

  const mec = funcionarios.find(f => new RegExp(`\\b${sem(f.nome).split(' ')[0]}\\b`).test(t))
  if (mec) r.funcionario = mec.nome

  if (/\b(em servico|em andamento|comecar|comecou|ja comeca|ja esta fazendo)\b/.test(t)) r.status = 'em_andamento'
  else if (/\baprovad/.test(t)) r.status = 'aprovado'

  // Serviço: a partir da primeira palavra de serviço, até o valor, o mecânico ou o fim do pedaço
  const pedaco = pedacos(texto).find(p => SERVICO.test(sem(p)))
  if (pedaco) {
    const ini = sem(pedaco).search(SERVICO)
    let serv = pedaco.slice(ini)
    const nomesMec = funcionarios.map(f => sem(f.nome).split(' ')[0])
    const corte = sem(serv).search(new RegExp(`(r\\$|\\d+([.,]\\d+)?\\s*(reais|real|conto|pila)|\\bja\\b|\\bmecanico\\b|\\bvalor\\b|\\bcom o\\b${nomesMec.map(n => `|\\b${n}\\b`).join('')})`))
    if (corte > 0) serv = serv.slice(0, corte)
    r.servico = serv.replace(/[\s,.-]+$/, '').trim().slice(0, 60)
    r.servico = r.servico.charAt(0).toUpperCase() + r.servico.slice(1)
  }

  return r
}

function nextNumero(arr) {
  if (!arr.length) return 'OS-001'
  const nums = arr.map(o => parseInt(String(o.numero || '').replace(/\D/g, '') || '0'))
  return 'OS-' + String(Math.max(...nums) + 1).padStart(3, '0')
}

export function criarOS(d, ditado) {
  const ordens = ler('ol_ordens')
  const valor = Number(d.valor) || 0
  const os = {
    id: ordens.length ? Math.max(...ordens.map(o => Number(o.id) || 0)) + 1 : 1,
    numero: nextNumero(ordens),
    clienteNome: d.clienteNome.trim(), clienteTelefone: d.clienteTelefone || '',
    clienteDoc: d.clienteDoc || '', clienteEndereco: d.clienteEndereco || '',
    placa: d.placa.toUpperCase(), modelo: d.modelo || '', ano: d.ano || '', cor: d.cor || '',
    descBreve: d.servico || '', descricao: ditado ? `Criada por voz: "${ditado}"` : '',
    status: d.status || 'orcamento', funcionario: d.funcionario || '',
    itens: [],
    servicos: d.servico || valor ? [{ id: Date.now(), desc: d.servico || 'Serviço', funcionario: d.funcionario || '', maoDeObra: valor ? String(valor) : '' }] : [],
    valor, maoDeObra: valor,
    inicio: d.status === 'em_andamento' ? Date.now() : null, fim: null,
    data: new Date().toISOString().split('T')[0],
  }
  ordens.push(os)
  localStorage.setItem('ol_ordens', JSON.stringify(ordens))

  const clis = ler('ol_clientes')
  const i = clis.findIndex(c => sem(c.nome).trim() === sem(os.clienteNome))
  const dados = Object.fromEntries(Object.entries({ telefone: os.clienteTelefone, placa: os.placa, modelo: os.modelo, ano: os.ano, cor: os.cor }).filter(([, v]) => v))
  if (i >= 0) clis[i] = { ...clis[i], ...dados }
  else clis.push({ id: clis.length ? Math.max(...clis.map(c => Number(c.id) || 0)) + 1 : 1, nome: os.clienteNome, email: '', cpf: '', endereco: '', obs: '', telefone: '', ...dados })
  localStorage.setItem('ol_clientes', JSON.stringify(clis))
  return os
}
