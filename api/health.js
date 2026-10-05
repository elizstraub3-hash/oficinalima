import { AMBIENTE, senhaOk } from './_focus.js'

export default function handler(req, res) {
  res.json({ ok: !!process.env.FOCUS_TOKEN && !!process.env.CNPJ_EMITENTE, ambiente: AMBIENTE, senhaOk: senhaOk(req) })
}
