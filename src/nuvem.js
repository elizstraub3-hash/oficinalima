import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import { getDatabase, ref, get, set, onValue } from 'firebase/database'
import { firebaseConfig, nuvemConfigurada } from './firebaseConfig.js'

// Sincroniza com a nuvem tudo o que o painel guarda no navegador (chaves "ol_").
// Cada chave guarda o valor e a hora da última mudança; vale sempre a versão mais nova.
// Antes de trocar o que está no computador pela versão da nuvem, uma cópia vai para backups/.

const IGNORAR = new Set(['ol_auth', 'ol_nfe_senha', 'ol__ts'])
const KEY_TS = 'ol__ts'
const sincroniza = k => typeof k === 'string' && k.startsWith('ol_') && !IGNORAR.has(k)

const nativoSet = Storage.prototype.setItem
const nativoRemove = Storage.prototype.removeItem

let db = null
let usuario = null
let pronto = false          // só depois da 1ª sincronização as mudanças locais ganham hora e sobem
const ouvintes = new Set()
let estado = { status: nuvemConfigurada() ? 'desconectado' : 'sem_config', email: '', erro: '' }

function avisar(novo) {
  estado = { ...estado, ...novo }
  ouvintes.forEach(f => f(estado))
}

export function ouvirNuvem(f) { ouvintes.add(f); f(estado); return () => ouvintes.delete(f) }

function lerTs() { try { return JSON.parse(localStorage.getItem(KEY_TS) || '{}') } catch { return {} } }
function gravarTs(t) { nativoSet.call(localStorage, KEY_TS, JSON.stringify(t)) }

const caminho = k => `dados/${k}`

function subir(k, valor, t) {
  if (!db || !usuario) return
  set(ref(db, caminho(k)), { v: valor, t }).catch(e => avisar({ status: 'erro', erro: e.message }))
}

// Toda gravação local de uma chave "ol_" marca a hora e sobe para a nuvem
export function instalarGancho() {
  Storage.prototype.setItem = function (k, v) {
    nativoSet.call(this, k, v)
    if (this === localStorage && sincroniza(k) && pronto) {
      const t = Date.now(); const ts = lerTs(); ts[k] = t; gravarTs(ts)
      subir(k, String(v), t)
    }
  }
  Storage.prototype.removeItem = function (k) {
    nativoRemove.call(this, k)
    if (this === localStorage && sincroniza(k) && pronto) {
      const t = Date.now(); const ts = lerTs(); ts[k] = t; gravarTs(ts)
      subir(k, null, t)
    }
  }
}

async function backupDoDia(locais) {
  const dia = new Date().toISOString().slice(0, 10)
  const r = ref(db, `backups/${dia}`)
  const ja = await get(r)
  if (!ja.exists()) await set(r, { feitoEm: Date.now(), dados: locais })
}

async function sincronizarInicial(aoMudar) {
  avisar({ status: 'sincronizando' })
  const snap = await get(ref(db, 'dados'))
  const nuvem = snap.val() || {}
  const ts = lerTs()
  const locais = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (sincroniza(k)) locais[k] = localStorage.getItem(k)
  }
  // Cópia de segurança do que está neste computador, antes de qualquer troca
  if (Object.keys(locais).length) await backupDoDia(locais).catch(() => {})

  let mudouLocal = false
  const chaves = new Set([...Object.keys(nuvem), ...Object.keys(locais)])
  for (const k of chaves) {
    if (!sincroniza(k)) continue
    const n = nuvem[k]
    const tLocal = ts[k] || 0
    if (n && n.t >= tLocal) {
      if (n.v === null || n.v === undefined) { if (k in locais) { nativoRemove.call(localStorage, k); mudouLocal = true } }
      else if (locais[k] !== n.v) { nativoSet.call(localStorage, k, n.v); mudouLocal = true }
      ts[k] = n.t
    } else if (k in locais) {
      const t = tLocal || Date.now()
      ts[k] = t
      await set(ref(db, caminho(k)), { v: locais[k], t })
    }
  }
  gravarTs(ts)
  pronto = true
  avisar({ status: 'ok' })
  if (mudouLocal) aoMudar()

  // Mudanças feitas em outro computador chegam aqui na hora
  onValue(ref(db, 'dados'), s => {
    const dados = s.val() || {}
    const t2 = lerTs()
    let mudou = false
    Object.entries(dados).forEach(([k, n]) => {
      if (!sincroniza(k) || !n || n.t <= (t2[k] || 0)) return
      if (n.v === null || n.v === undefined) nativoRemove.call(localStorage, k)
      else nativoSet.call(localStorage, k, n.v)
      t2[k] = n.t; mudou = true
    })
    if (mudou) { gravarTs(t2); aoMudar() }
  })
}

export function iniciarNuvem(aoMudar) {
  if (!nuvemConfigurada()) return
  const app = initializeApp(firebaseConfig)
  db = getDatabase(app)
  const auth = getAuth(app)
  onAuthStateChanged(auth, async u => {
    usuario = u
    if (!u) { pronto = false; avisar({ status: 'desconectado', email: '' }); return }
    avisar({ email: u.email })
    try { await sincronizarInicial(aoMudar) }
    catch (e) {
      pronto = false
      const negado = /permission|PERMISSION_DENIED/i.test(e.message)
      avisar({ status: 'erro', erro: negado ? `A conta ${u.email} não tem acesso aos dados da oficina.` : e.message })
    }
  })
}

export async function entrarComGoogle() {
  try { await signInWithPopup(getAuth(), new GoogleAuthProvider()) }
  catch (e) { avisar({ status: 'erro', erro: e.message }) }
}

export function sairDaNuvem() { return signOut(getAuth()) }
