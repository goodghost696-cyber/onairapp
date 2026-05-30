import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/login.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleLogin() {
    setError('')
    const result = login(email, password)
    if (result.success) {
      navigate(result.user.role === 'coach' ? '/coach' : '/dashboard')
    } else {
      setError('Email ou mot de passe incorrect')
    }
  }

  return (
    <div className="app-wrapper">
      <div className="screen login-screen">
        <div className="login-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-primary)">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        </div>
        <h1 className="text-xl bold" style={{ marginBottom: 32 }}>Connexion</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {error && <span className="text-xs" style={{ color: 'var(--danger)' }}>{error}</span>}
          <div style={{ marginTop: 8 }}>
            <button className="btn-accent" onClick={handleLogin}>SE CONNECTER</button>
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <p className="text-sm text-muted">Comptes de test :</p>
          <p className="text-sm text-secondary" style={{ marginTop: 8 }}>Coach: coach@onair.fr / coach123</p>
          <p className="text-sm text-secondary">Membre: membre@onair.fr / membre123</p>
        </div>
      </div>
    </div>
  )
}
