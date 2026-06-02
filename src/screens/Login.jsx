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

  const [signupData, setSignupData] = useState({ firstName: '', email: '', password: '', confirm: '', code: '' })
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)

  function handleLogin() {
    setError('')
    const result = login(email, password)
    if (result.success) {
      navigate(result.user.role === 'coach' ? '/coach' : '/dashboard')
    } else {
      setError(t('wrong_credentials'))
    }
  }

  function handleSignup() {
    setSignupError('')
    const { firstName, email: se, password: sp, confirm, code } = signupData
    if (!firstName || !se || !sp || !confirm || !code) { setSignupError('Tous les champs sont requis'); return }
    if (sp !== confirm) { setSignupError(t('passwords_no_match')); return }
    if (code !== 'ONAIR2026') { setSignupError(t('invalid_code')); return }
    const result = register(firstName, se, sp)
    if (result.success) {
      setSignupSuccess(true)
      setTimeout(() => navigate('/dashboard'), 800)
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
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{
              fontSize: 48, fontWeight: 900, letterSpacing: 8,
              color: 'var(--text-primary)', textTransform: 'uppercase',
              animation: 'focusIn 700ms cubic-bezier(0.25,0.46,0.45,0.94) forwards',
            }}>ON AIR</div>
            <div style={{ height: 2, background: 'var(--accent)', animation: 'slideUnderline 300ms ease-out 700ms both' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 10, animation: 'fadeInDelay 400ms ease-out 800ms both' }}>
            FITNESS · CLICHY
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
            <button className="btn-accent" onClick={handleLogin} style={{ marginTop: 4 }}>{t('connect_btn')}</button>
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
            <button className="btn-accent" onClick={handleSignup} style={{ marginTop: 4 }}>{t('signup_btn')}</button>
          </div>
        )}

        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            @keyframes focusIn {
              from { font-size: 80px; filter: blur(12px); opacity: 0.3; letter-spacing: 16px; }
              to   { font-size: 48px; filter: blur(0);    opacity: 1;   letter-spacing: 8px; }
            }
            @keyframes slideUnderline {
              from { width: 0%; }
              to   { width: 100%; }
            }
            @keyframes fadeInDelay {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
          }
        `}</style>

        {tab === 'login' && (
          <div style={{ marginTop: 32 }}>
            <p className="text-sm text-muted">Comptes de test :</p>
            <p className="text-sm text-secondary" style={{ marginTop: 6 }}>Coach: coach@onair.fr / coach123</p>
            <p className="text-sm text-secondary">Membre: membre@onair.fr / membre123</p>
            <p className="text-sm text-secondary">Code inscription: ONAIR2026</p>
          </div>
        )}
      </div>
    </div>
  )
}
