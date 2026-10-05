import { exigirSenha, focus } from '../../_focus.js'

export default async function handler(req, res) {
  if (!exigirSenha(req, res)) return
  try {
    const data = await focus(`/v2/nfe/${encodeURIComponent(req.query.ref)}`)
    if (!data.caminho_danfe) return res.status(404).json({ erro: 'DANFE ainda não disponível.' })
    const pdf = await focus(data.caminho_danfe, { raw: true })
    res.setHeader('Content-Type', 'application/pdf')
    res.send(Buffer.from(await pdf.arrayBuffer()))
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
}
