import { useState } from 'react'
import { lerPerguntas } from './Assistente.jsx'

export default function PerguntasAssistente() {
  const [filtro, setFiltro] = useState('todas')
  const [log, setLog] = useState(() => lerPerguntas().slice().reverse())
  const lista = log.filter(l =>
    filtro === 'todas' ? true :
    filtro === 'sem' ? !l.intencao :
    l.origem === 'digitada')
  const semResposta = log.filter(l => !l.intencao).length

  function limpar() {
    if (!confirm('Apagar todo o histórico de perguntas?')) return
    localStorage.removeItem('ol_assistente_log'); setLog([])
  }

  return (
    <div>
      <div className="page-header">
        <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ minWidth: 220, fontWeight: 600 }}>
          <option value="todas">Todas as perguntas ({log.length})</option>
          <option value="digitada">Só as digitadas</option>
          <option value="sem">❓ Sem resposta ({semResposta})</option>
        </select>
        <button className="btn-secondary" onClick={limpar} disabled={!log.length}>🗑️ Limpar histórico</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: -8 }}>
        Tudo o que foi perguntado ao assistente 💬 neste computador. As "sem resposta" são as que ele ainda não sabe — dá para ensinar depois.
      </p>
      <div className="card">
        {lista.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💬</div><p>Nenhuma pergunta ainda.</p></div>
        ) : (
          <table>
            <thead><tr><th>Quando</th><th>Pergunta</th><th>Como</th><th>Respondeu?</th></tr></thead>
            <tbody>
              {lista.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(l.quando).toLocaleString('pt-BR')}</td>
                  <td><strong>{l.pergunta}</strong></td>
                  <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{l.origem === 'botao' ? 'botão' : 'digitou'}</td>
                  <td>{l.intencao ? <span style={{ color: '#10b981', fontWeight: 700 }}>✅ Sim</span> : <span style={{ color: '#ef4444', fontWeight: 700 }}>❓ Não sabia</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
