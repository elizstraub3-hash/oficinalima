require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3001
const PRODUCAO = process.env.FOCUS_AMBIENTE === 'producao'
const BASE = PRODUCAO ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br'

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '10mb' }))

// Focus NFe usa o token como usuário da autenticação básica, com senha vazia
const focus = axios.create({
  baseURL: BASE,
  auth: { username: process.env.FOCUS_TOKEN || '', password: '' },
})

const STATUS = {
  processando_autorizacao: 'processando',
  autorizado: 'autorizado',
  cancelado: 'cancelado',
  erro_autorizacao: 'rejeitado',
  denegado: 'rejeitado',
}

function erroMsg(err) {
  const d = err.response?.data
  if (d?.erros) return d.erros.map(e => e.mensagem).join(' | ')
  return d?.mensagem || d || err.message
}

app.get('/api/health', (req, res) => {
  res.json({ ok: !!process.env.FOCUS_TOKEN, cnpj: process.env.CNPJ_EMITENTE, ambiente: PRODUCAO ? 'producao' : 'homologacao' })
})

app.post('/api/nfe/emitir', async (req, res) => {
  try {
    const { destinatario = {}, itens = [], pagamento, obs, numero } = req.body
    const cnpj = process.env.CNPJ_EMITENTE
    if (!cnpj) return res.status(500).json({ erro: 'CNPJ_EMITENTE não configurado no .env' })
    if (!itens.length) return res.status(400).json({ erro: 'Nenhum item na nota.' })

    const doc = (destinatario.cpfCnpj || '').replace(/\D/g, '')
    const end = destinatario.endereco || {}
    const total = itens.reduce((s, it) => s + Number(it.total || 0), 0)
    const ref = `os${numero || ''}-${Date.now()}`

    const payload = {
      natureza_operacao: 'Venda de mercadoria',
      data_emissao: new Date().toISOString(),
      tipo_documento: 1,
      finalidade_emissao: 1,
      local_destino: 1,
      consumidor_final: 1,
      presenca_comprador: 1,
      modalidade_frete: 9,
      cnpj_emitente: cnpj,
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

    const r = await focus.post(`/v2/nfe?ref=${encodeURIComponent(ref)}`, payload)
    res.json({ ok: true, nfe: { id: ref, status: STATUS[r.data.status] || 'processando' } })
  } catch (err) {
    console.error('[emitir]', err.response?.data || err.message)
    res.status(500).json({ erro: erroMsg(err) })
  }
})

app.get('/api/nfe/:ref', async (req, res) => {
  try {
    const { data } = await focus.get(`/v2/nfe/${encodeURIComponent(req.params.ref)}`)
    res.json({
      status: STATUS[data.status] || data.status,
      chave_acesso: data.chave_nfe,
      numero: data.numero,
      mensagem: data.mensagem_sefaz,
    })
  } catch (err) {
    res.status(500).json({ erro: erroMsg(err) })
  }
})

app.post('/api/nfe/:ref/cancelar', async (req, res) => {
  try {
    const { justificativa } = req.body
    if (!justificativa || justificativa.length < 15) {
      return res.status(400).json({ erro: 'Justificativa deve ter pelo menos 15 caracteres.' })
    }
    const { data } = await focus.delete(`/v2/nfe/${encodeURIComponent(req.params.ref)}`, { data: { justificativa } })
    if (data.status !== 'cancelado') return res.status(400).json({ erro: data.mensagem_sefaz || data.mensagem || 'Cancelamento não autorizado.' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: erroMsg(err) })
  }
})

app.get('/api/nfe/:ref/danfe', async (req, res) => {
  try {
    const { data } = await focus.get(`/v2/nfe/${encodeURIComponent(req.params.ref)}`)
    if (!data.caminho_danfe) return res.status(404).json({ erro: 'DANFE ainda não disponível.' })
    const pdf = await focus.get(data.caminho_danfe, { responseType: 'arraybuffer' })
    res.set('Content-Type', 'application/pdf')
    res.set('Content-Disposition', `inline; filename="danfe-${req.params.ref}.pdf"`)
    res.send(pdf.data)
  } catch (err) {
    res.status(500).json({ erro: erroMsg(err) })
  }
})

app.listen(PORT, () => {
  console.log(`\n✅ Lima Oficina Backend na porta ${PORT} — Focus NFe (${PRODUCAO ? 'PRODUÇÃO' : 'homologação/teste'})`)
  console.log(`   CNPJ: ${process.env.CNPJ_EMITENTE || '⚠️  não definido'}`)
  if (!process.env.FOCUS_TOKEN) console.log('   ⚠️  FOCUS_TOKEN não definido no .env')
})
