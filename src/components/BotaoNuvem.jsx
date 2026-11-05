import { useEffect, useState } from 'react'
import { ouvirNuvem, entrarComGoogle } from '../nuvem.js'

export default function BotaoNuvem() {
  const [e, setE] = useState({ status: 'sem_config' })
  useEffect(() => ouvirNuvem(setE), [])
  if (e.status === 'sem_config') return null
  const base = { position: 'fixed', top: 10, right: 12, zIndex: 999, fontSize: 12, padding: '6px 12px', borderRadius: 20, border: 'none', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }
  if (e.status === 'desconectado') return <button style={{ ...base, background: '#fde68a', cursor: 'pointer' }} onClick={entrarComGoogle}>☁️ Entrar com Google para salvar na nuvem</button>
  if (e.status === 'erro') return <button title={e.erro} style={{ ...base, background: '#fecaca', cursor: 'pointer' }} onClick={entrarComGoogle}>⚠️ Nuvem: {e.erro.slice(0, 60)}</button>
  return <span style={{ ...base, background: '#d1fae5' }}>{e.status === 'ok' ? `☁️ Salvo na nuvem (${e.email})` : '☁️ Sincronizando…'}</span>
}
