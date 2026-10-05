import { exigirSenha, focus, montarNFe, STATUS } from '../_focus.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' })
  if (!exigirSenha(req, res)) return
  try {
    const { itens = [], numero } = req.body || {}
    if (!process.env.CNPJ_EMITENTE) return res.status(500).json({ erro: 'CNPJ_EMITENTE não configurado na Vercel.' })
    if (!itens.length) return res.status(400).json({ erro: 'Nenhum item na nota.' })
    const ref = `os${numero || ''}-${Date.now()}`
    const data = await focus(`/v2/nfe?ref=${encodeURIComponent(ref)}`, { method: 'POST', body: montarNFe(req.body) })
    const status = STATUS[data.status] || 'processando'
    if (status === 'rejeitado') return res.status(400).json({ erro: data.mensagem_sefaz || data.mensagem || 'Nota rejeitada pela SEFAZ.' })
    res.json({ ok: true, nfe: { id: ref, status } })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
}
