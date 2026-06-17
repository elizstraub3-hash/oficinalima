import { useState } from 'react'
import './Login.css'

const SENHA = 'oficina2024'
const TELEFONE = '(41) 9 9595-5516'

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

        {/* Cabeçalho preto com logo */}
        <div className="login-header">
          <div className="login-logo-wrap">
            <img
              src="/logo.png"
              alt="Oficina Lima"
              className="login-logo-img"
              onError={e => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <span className="login-logo-fallback" style={{ display: 'none' }}>🔧</span>
          </div>
          <h1>Oficina Lima</h1>
          <p className="login-sub">Painel Administrativo</p>
          <div className="login-phone">
            📞 {TELEFONE}
          </div>
        </div>

        {/* Corpo branco com formulário */}
        <div className="login-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>🔒 Senha de acesso</label>
              <div className="password-wrap">
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setErro('') }}
                  placeholder="Digite a senha..."
                  autoFocus
                />
                <button type="button" className="toggle-pw" onClick={() => setMostrar(v => !v)}>
                  {mostrar ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {erro && <p className="login-erro">⚠️ {erro}</p>}
            <button type="submit" className="login-btn">Entrar no Painel</button>
          </form>
          <p className="login-footer">
            Criado por <strong>Elizandra Cardoso</strong> · © {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  )
}
