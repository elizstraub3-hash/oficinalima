import { exigirSenha, focus, STATUS } from '../../_focus.js'

export default async function handler(req, res) {
  if (!exigirSenha(req, res)) return
  try {
    const data = await focus(`/v2/nfe/${encodeURIComponent(req.query.ref)}`)
    res.json({ status: STATUS[data.status] || data.status, chave_acesso: data.chave_nfe, numero: data.numero, mensagem: data.mensagem_sefaz })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
}
