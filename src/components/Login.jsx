import { useState } from 'react'
import './Login.css'

const SENHA = 'oficina2024'

export default function Login({ onLogin }) {
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [shake, setShake] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (senha === SENHA) {
      onLogin()
    } else {
      setErro('Senha incorreta. Tente novamente.')
      setShake(true)
      setSenha('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="login-bg">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-logo">
          <span className="login-icon">🔧</span>
          <h1>Oficina Lima</h1>
          <p>Painel Administrativo</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>🔒 Senha de Acesso</label>
            <div className="password-wrap">
              <input
                type={mostrar ? 'text' : 'password'}
                value={senha}
                onChange={e => { setSenha(e.target.value); setErro('') }}
                placeholder="Digite a senha..."
                autoFocus
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setMostrar(v => !v)}
              >
                {mostrar ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {erro && <p className="login-erro">{erro}</p>}
          <button type="submit" className="login-btn">Entrar</button>
        </form>
        <p className="login-footer">Oficina Lima © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
