import { exigirSenha, focus } from '../../_focus.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' })
  if (!exigirSenha(req, res)) return
  try {
    const { justificativa = '' } = req.body || {}
    if (justificativa.length < 15) return res.status(400).json({ erro: 'Justificativa deve ter pelo menos 15 caracteres.' })
    const data = await focus(`/v2/nfe/${encodeURIComponent(req.query.ref)}`, { method: 'DELETE', body: { justificativa } })
    if (data.status !== 'cancelado') return res.status(400).json({ erro: data.mensagem_sefaz || data.mensagem || 'Cancelamento não autorizado.' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
}
