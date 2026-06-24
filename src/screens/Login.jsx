import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

export default function Login() {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const { t } = useLanguage()
  const [tab, setTab] = useState('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [signupData, setSignupData] = useState({ firstName: '', email: '', password: '', confirm: '', code: '' })
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [signingUp, setSigningUp] = useState(false)

  async function handleLogin() {
    setError('')
    setLoggingIn(true)
    const result = await login(email, password)
    setLoggingIn(false)
    if (result.success) {
      navigate(result.role === 'coach' ? '/coach' : '/dashboard')
    } else {
      setError(result.error || t('wrong_credentials'))
    }
  }

  async function handleSignup() {
    setSignupError('')
    const { firstName, email: se, password: sp, confirm, code } = signupData
    if (!firstName || !se || !sp || !confirm || !code) { setSignupError('Tous les champs sont requis'); return }
    if (sp !== confirm) { setSignupError(t('passwords_no_match')); return }
    if (code !== 'ONAIR2026') { setSignupError(t('invalid_code')); return }
    setSigningUp(true)
    const result = await register(firstName, se, sp)
    setSigningUp(false)
    if (result.success) {
      setSignupSuccess(true)
      localStorage.setItem('onair_just_registered', 'true')
      setTimeout(() => navigate('/onboarding'), 800)
    } else {
      setSignupError(result.error || "Erreur lors de l'inscription")
    }
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingTop: 0, paddingBottom: 40, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Logo area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, paddingBottom: 48 }}>
          <button style={{ position: 'absolute', top: 20, left: 16, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <img
            src="/icon-onair.png"
            alt="ON AIR"
            style={{ width: 72, height: 72, mixBlendMode: 'screen', marginBottom: 12 }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', animation: 'fadeInDelay 400ms ease-out 200ms both' }}>
            ORIGINAL FITNESS · CLICHY
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: 28 }}>
          {['login', 'signup'].map(tabKey => (
            <button key={tabKey} onClick={() => { setTab(tabKey); setError(''); setSignupError('') }} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
              color: tab === tabKey ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === tabKey ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '12px 0', marginBottom: -1,
            }}>
              {tabKey === 'login' ? t('login_tab') : t('signup_tab')}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" placeholder={t('email_placeholder')} value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder={t('password_placeholder')} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            {error && <span style={{ fontSize: 11, color: 'var(--danger)', letterSpacing: '0.05em' }}>{error}</span>}
            <button className="btn-accent" onClick={handleLogin} disabled={loggingIn} style={{ marginTop: 4, opacity: loggingIn ? 0.7 : 1 }}>
              {loggingIn ? '...' : t('connect_btn')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder={t('first_name_placeholder')} value={signupData.firstName} onChange={e => setSignupData(d => ({ ...d, firstName: e.target.value }))} />
            <input type="email" placeholder={t('email_placeholder')} value={signupData.email} onChange={e => setSignupData(d => ({ ...d, email: e.target.value }))} />
            <input type="password" placeholder={t('password_placeholder')} value={signupData.password} onChange={e => setSignupData(d => ({ ...d, password: e.target.value }))} />
            <input type="password" placeholder={t('confirm_password')} value={signupData.confirm} onChange={e => setSignupData(d => ({ ...d, confirm: e.target.value }))} />
            <input type="text" placeholder={t('access_code')} value={signupData.code} onChange={e => setSignupData(d => ({ ...d, code: e.target.value }))} />
            {signupError && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{signupError}</span>}
            {signupSuccess && <span style={{ fontSize: 11, color: 'var(--success)' }}>{t('welcome_toast')} {signupData.firstName} 👋 {t('account_created')}</span>}
            <button className="btn-accent" onClick={handleSignup} disabled={signingUp} style={{ marginTop: 4, opacity: signingUp ? 0.7 : 1 }}>
              {signingUp ? '...' : t('signup_btn')}
            </button>
          </div>
        )}

        <style>{`
          @keyframes fadeInDelay {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>

      </div>
    </div>
  )
}
