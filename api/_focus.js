import { timingSafeEqual } from 'node:crypto'

const PRODUCAO = process.env.FOCUS_AMBIENTE === 'producao'
const BASE = PRODUCAO ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br'

export const AMBIENTE = PRODUCAO ? 'producao' : 'homologacao'

export const STATUS = {
  processando_autorizacao: 'processando',
  autorizado: 'autorizado',
  cancelado: 'cancelado',
  erro_autorizacao: 'rejeitado',
  denegado: 'rejeitado',
}

export function senhaOk(req) {
  const esperada = process.env.NFE_SENHA || ''
  const enviada = String(req.headers['x-nfe-senha'] || '')
  if (!esperada || esperada.length !== enviada.length) return false
  return timingSafeEqual(Buffer.from(esperada), Buffer.from(enviada))
}

// Responde 401 e devolve false quando a senha da nota fiscal não confere
export function exigirSenha(req, res) {
  if (senhaOk(req)) return true
  res.status(401).json({ erro: 'Senha da nota fiscal incorreta.' })
  return false
}

// Focus NFe: token como usuário da autenticação básica, senha vazia
export async function focus(path, { method = 'GET', body, raw = false } = {}) {
  const auth = Buffer.from(`${process.env.FOCUS_TOKEN || ''}:`).toString('base64')
  const r = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Basic ${auth}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (raw) return r
  const data = await r.json().catch(() => ({}))
  if (!r.ok && r.status !== 422 && !data.status) {
    const msg = data.erros ? data.erros.map(e => e.mensagem).join(' | ') : (data.mensagem || `Erro ${r.status} na Focus NFe`)
    throw new Error(msg)
  }
  return data
}

export function montarNFe({ destinatario = {}, itens = [], pagamento, obs }) {
  const doc = (destinatario.cpfCnpj || '').replace(/\D/g, '')
  const end = destinatario.endereco || {}
  const total = itens.reduce((s, it) => s + Number(it.total || 0), 0)
  return {
    natureza_operacao: 'Venda de mercadoria',
    data_emissao: new Date().toISOString(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    local_destino: 1,
    consumidor_final: 1,
    presenca_comprador: 1,
    modalidade_frete: 9,
    cnpj_emitente: process.env.CNPJ_EMITENTE,
    nome_destinatario: destinatario.nome,
    ...(doc.length === 14 ? { cnpj_destinatario: doc } : { cpf_destinatario: doc }),
    email_destinatario: destinatario.email || undefined,
    logradouro_destinatario: end.logradouro || 'Nao informado',
    numero_destinatario: end.numero || 'SN',
    bairro_destinatario: end.bairro || 'Centro',
    municipio_destinatario: end.municipio || 'Colombo',
    uf_destinatario: end.uf || 'PR',
    cep_destinatario: (end.cep || '').replace(/\D/g, '') || undefined,
    indicador_inscricao_estadual_destinatario: 9,
    informacoes_adicionais_contribuinte: obs || undefined,
    items: itens.map((it, i) => ({
      numero_item: i + 1,
      codigo_produto: it.codigo || String(i + 1).padStart(4, '0'),
      descricao: it.descricao,
      codigo_ncm: it.ncm || '87089990',
      cfop: it.cfop || '5102',
      unidade_comercial: it.unidade || 'UN',
      quantidade_comercial: Number(it.qtd) || 1,
      valor_unitario_comercial: Number(it.valorUnit) || 0,
      valor_bruto: Number(it.total) || 0,
      unidade_tributavel: it.unidade || 'UN',
      quantidade_tributavel: Number(it.qtd) || 1,
      valor_unitario_tributavel: Number(it.valorUnit) || 0,
      icms_origem: 0,
      icms_situacao_tributaria: process.env.ICMS_CSOSN || '102',
      pis_situacao_tributaria: '07',
      cofins_situacao_tributaria: '07',
    })),
    formas_pagamento: [{ forma_pagamento: pagamento?.meio || '01', valor_pagamento: total.toFixed(2) }],
  }
}
