require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ── Auth token cache ─────────────────────────────────────────────────────────
let _token = null
let _tokenExpires = 0

async function getToken() {
  if (_token && Date.now() < _tokenExpires) return _token
  const res = await axios.post(
    'https://auth.nuvemfiscal.com.br/oauth/token',
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.NUVEM_FISCAL_CLIENT_ID,
      client_secret: process.env.NUVEM_FISCAL_CLIENT_SECRET,
      scope: 'nfe',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  _token = res.data.access_token
  _tokenExpires = Date.now() + (res.data.expires_in - 60) * 1000
  return _token
}

function nuvemApi() {
  return axios.create({ baseURL: 'https://api.nuvemfiscal.com.br/v1' })
}

async function nuvemGet(path) {
  const token = await getToken()
  const res = await nuvemApi().get(path, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

async function nuvemPost(path, body) {
  const token = await getToken()
  const res = await nuvemApi().post(path, body, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

// ── Rotas ────────────────────────────────────────────────────────────────────

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ ok: true, cnpj: process.env.CNPJ_EMITENTE })
})

// Emitir NF-e
app.post('/api/nfe/emitir', async (req, res) => {
  try {
    const { destinatario, itens, pagamento, obs, numero } = req.body

    const cnpj = process.env.CNPJ_EMITENTE
    if (!cnpj) return res.status(500).json({ erro: 'CNPJ_EMITENTE não configurado no .env' })

    // Monta payload NF-e para Nuvem Fiscal
    const payload = {
      ambiente: 'homologacao', // troque para 'producao' quando estiver pronto
      referencia: `OS-${numero || Date.now()}`,
      emitente: { cpf_cnpj: cnpj },
      destinatario: {
        cpf_cnpj: destinatario.cpfCnpj?.replace(/\D/g, '') || '',
        nome: destinatario.nome,
        email: destinatario.email || '',
        endereco: destinatario.endereco || {
          logradouro: 'A definir',
          numero: 'SN',
          bairro: 'Centro',
          codigo_municipio: '4106902', // Curitiba padrão
          uf: 'PR',
          cep: '80000000',
        },
        indicador_ie: 9, // 9 = não contribuinte
      },
      itens: itens.map((it, i) => ({
        numero_item: i + 1,
        codigo_produto: it.codigo || String(i + 1).padStart(4, '0'),
        descricao: it.descricao,
        ncm: it.ncm || '87089990', // NCM genérico para autopeças
        cfop: it.cfop || '5102',   // Venda dentro do estado
        unidade_comercial: it.unidade || 'UN',
        quantidade_comercial: Number(it.qtd) || 1,
        valor_unitario_comercial: Number(it.valorUnit) || 0,
        valor_bruto: Number(it.total) || 0,
        unidade_tributavel: it.unidade || 'UN',
        quantidade_tributavel: Number(it.qtd) || 1,
        valor_unitario_tributavel: Number(it.valorUnit) || 0,
        tributos: {
          icms: {
            origem: 0,
            cst: '400', // tributado normalmente
            modalidade_bc: 3,
            valor_bc: Number(it.total) || 0,
            aliquota: 0,
            valor: 0,
          },
          pis: { cst: '07', valor_bc: 0, aliquota_percentual: 0, valor: 0 },
          cofins: { cst: '07', valor_bc: 0, aliquota_percentual: 0, valor: 0 },
        },
      })),
      cobranca: {
        fatura: {
          numero: String(numero || Date.now()),
          valor_original: itens.reduce((s, it) => s + Number(it.total || 0), 0),
          valor_liquido: itens.reduce((s, it) => s + Number(it.total || 0), 0),
        },
        duplicatas: [],
      },
      pagamentos: [
        {
          indicador_forma_pagamento: 1,
          meio_pagamento: pagamento?.meio || '01', // 01=dinheiro, 03=cartão, 17=pix
          valor: itens.reduce((s, it) => s + Number(it.total || 0), 0),
        },
      ],
      informacoes_adicionais: {
        informacoes_contribuinte: obs || 'Serviço de manutenção automotiva - Lima Oficina',
      },
    }

    const resultado = await nuvemPost('/nfe', payload)
    res.json({ ok: true, nfe: resultado })
  } catch (err) {
    const msg = err.response?.data || err.message
    console.error('[emitir]', msg)
    res.status(500).json({ erro: msg })
  }
})

// Consultar NF-e por ID
app.get('/api/nfe/:id', async (req, res) => {
  try {
    const data = await nuvemGet(`/nfe/${req.params.id}`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ erro: err.response?.data || err.message })
  }
})

// Listar NF-e emitidas
app.get('/api/nfe', async (req, res) => {
  try {
    const cnpj = process.env.CNPJ_EMITENTE
    const data = await nuvemGet(`/nfe?cpf_cnpj=${cnpj}&top=50`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ erro: err.response?.data || err.message })
  }
})

// Cancelar NF-e
app.post('/api/nfe/:id/cancelar', async (req, res) => {
  try {
    const { justificativa } = req.body
    if (!justificativa || justificativa.length < 15) {
      return res.status(400).json({ erro: 'Justificativa deve ter pelo menos 15 caracteres.' })
    }
    const data = await nuvemPost(`/nfe/${req.params.id}/cancelamento`, { justificativa })
    res.json({ ok: true, data })
  } catch (err) {
    res.status(500).json({ erro: err.response?.data || err.message })
  }
})

// Download DANFE (PDF)
app.get('/api/nfe/:id/danfe', async (req, res) => {
  try {
    const token = await getToken()
    const response = await nuvemApi().get(`/nfe/${req.params.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    })
    res.set('Content-Type', 'application/pdf')
    res.set('Content-Disposition', `inline; filename="danfe-${req.params.id}.pdf"`)
    res.send(response.data)
  } catch (err) {
    res.status(500).json({ erro: err.response?.data || err.message })
  }
})

app.listen(PORT, () => {
  console.log(`\n✅ Lima Oficina Backend rodando na porta ${PORT}`)
  console.log(`   CNPJ configurado: ${process.env.CNPJ_EMITENTE || '⚠️  não definido'}`)
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}\n`)
})
