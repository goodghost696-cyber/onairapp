import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, sendPasswordResetEmail } = useAuth()
  const { t } = useLanguage()
  const [tab, setTab] = useState(location.state?.tab === 'signup' ? 'signup' : 'login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [signupData, setSignupData] = useState({ firstName: '', email: '', password: '', confirm: '', code: '' })
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  // Confirm email active (2026-08-12) — register() returns needsConfirmation
  // instead of a usable session when Supabase requires the email link to be
  // clicked first. Distinct from signupSuccess (no session yet, so no
  // onboarding redirect makes sense). Dead code today while Confirm email
  // is off — register() always returns a plain success.
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [signingUp, setSigningUp] = useState(false)

  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  async function handleLogin() {
    setError('')
    setLoggingIn(true)
    const result = await login(email, password)
    setLoggingIn(false)
    if (result.success) {
      navigate(result.role === 'coach' || result.role === 'admin' ? '/coach' : '/dashboard')
    } else {
      setError(result.error || t('wrong_credentials'))
    }
  }

  async function handleSendReset() {
    setForgotError('')
    if (!forgotEmail) { setForgotError('Email requis'); return }
    setSendingReset(true)
    const result = await sendPasswordResetEmail(forgotEmail)
    setSendingReset(false)
    if (result.success) {
      setForgotSent(true)
    } else {
      setForgotError(result.error || "Erreur lors de l'envoi")
    }
  }

  async function handleSignup() {
    setSignupError('')
    setNeedsConfirmation(false)
    const { firstName, email: se, password: sp, confirm, code } = signupData
    if (!firstName || !se || !sp || !confirm || !code) { setSignupError('Tous les champs sont requis'); return }
    if (sp !== confirm) { setSignupError(t('passwords_no_match')); return }
    setSigningUp(true)
    try {
      // Pure UX pre-check (2026-08-10 suite 90) — just tells the user
      // "code invalide" before an account is even created. Does NOT
      // resolve gym_id anymore: register() re-validates the same code
      // server-side, authenticated, right after signUp() — this call has
      // no session yet, so api/invite.js treats it as the public
      // validate-only path (see that file for the dispatch logic).
      const codeRes = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const { valid } = await codeRes.json()
      if (!valid) {
        setSigningUp(false)
        setSignupError(t('invalid_code'))
        return
      }
    } catch {
      setSigningUp(false)
      setSignupError("Erreur lors de la vérification du code")
      return
    }
    const result = await register(firstName, se, sp, {}, code)
    setSigningUp(false)
    if (result.success && result.needsConfirmation) {
      setNeedsConfirmation(true)
    } else if (result.success) {
      setSignupSuccess(true)
      localStorage.setItem('onair_just_registered', 'true')
      setTimeout(() => navigate('/onboarding'), 800)
    } else {
      setSignupError(result.error || "Erreur lors de l'inscription")
    }
  }

  const inputStyle = {
    background: 'var(--surface)',
    border: '2px solid var(--border-strong)',
    color: 'var(--text-primary)',
    padding: '16px',
    fontSize: 15,
    fontWeight: 700,
    width: '100%',
    outline: 'none',
    borderRadius: 14,
    fontFamily: 'inherit',
  }

  const pillButtonStyle = {
    width: '100%',
    background: 'var(--accent)',
    color: 'var(--accent-ink)',
    border: 'none',
    borderRadius: 999,
    padding: '18px 16px',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }

  return (
    <div className="app-wrapper">
      <div style={{ padding: '80px 28px 28px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 22px' }}>
          Bienvenue.
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--surface)', border: '2px solid var(--border-strong)', borderRadius: 16, padding: 4, marginBottom: 22 }}>
          {['login', 'signup'].map(tabKey => (
            <button key={tabKey} onClick={() => { setTab(tabKey); setError(''); setSignupError(''); setForgotMode(false) }} style={{
              flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              color: tab === tabKey ? 'var(--accent-ink)' : 'var(--text-muted)',
              background: tab === tabKey ? 'var(--accent)' : 'transparent',
              borderRadius: 12, padding: '10px 0',
              transition: 'all 150ms ease',
            }}>
              {tabKey === 'login' ? t('login_tab') : t('signup_tab')}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          forgotMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{t('reset_password_subtitle')}</p>
              {!forgotSent ? (
                <>
                  <input style={inputStyle} type="email" placeholder={t('email_placeholder')} value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendReset()} />
                  {forgotError && <span style={{ fontSize: 11, color: 'var(--danger)', letterSpacing: '0.05em' }}>{forgotError}</span>}
                  <button onClick={handleSendReset} disabled={sendingReset} style={{ ...pillButtonStyle, marginTop: 4, opacity: sendingReset ? 0.7 : 1 }}>
                    {sendingReset ? '...' : <>{t('send_reset_link_btn')} <span>→</span></>}
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--success)' }}>{t('reset_email_sent')}</span>
              )}
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError(''); setForgotEmail('') }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', textAlign: 'center', marginTop: 4, fontFamily: 'inherit' }}
              >
                {t('back_to_login_btn')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={inputStyle} type="email" placeholder={t('email_placeholder')} value={email} onChange={e => setEmail(e.target.value)} />
              <input style={inputStyle} type="password" placeholder={t('password_placeholder')} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              {error && <span style={{ fontSize: 11, color: 'var(--danger)', letterSpacing: '0.05em' }}>{error}</span>}
              <button
                onClick={() => { setForgotMode(true); setError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', alignSelf: 'flex-end', fontFamily: 'inherit', padding: 0 }}
              >
                {t('forgot_password_link')}
              </button>
              <button onClick={handleLogin} disabled={loggingIn} style={{ ...pillButtonStyle, marginTop: 4, opacity: loggingIn ? 0.7 : 1 }}>
                {loggingIn ? '...' : <>{t('connect_btn')} <span>→</span></>}
              </button>
              {/* "Accès coach" (Landing.jsx) lands here to sign in — but until
                  now there was no way for a NEW coach to get an account at
                  all short of Arnaud creating it by hand in the SQL editor.
                  Self-service entry point, discoverable exactly where a
                  prospective coach lands. */}
              <button
                onClick={() => navigate('/coach-signup')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', textAlign: 'center', marginTop: 4, fontFamily: 'inherit' }}
              >
                Pas encore de salle ? Créer la mienne →
              </button>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={inputStyle} type="text" placeholder={t('first_name_placeholder')} value={signupData.firstName} onChange={e => setSignupData(d => ({ ...d, firstName: e.target.value }))} />
            <input style={inputStyle} type="email" placeholder={t('email_placeholder')} value={signupData.email} onChange={e => setSignupData(d => ({ ...d, email: e.target.value }))} />
            <input style={inputStyle} type="password" placeholder={t('password_placeholder')} value={signupData.password} onChange={e => setSignupData(d => ({ ...d, password: e.target.value }))} />
            <input style={inputStyle} type="password" placeholder={t('confirm_password')} value={signupData.confirm} onChange={e => setSignupData(d => ({ ...d, confirm: e.target.value }))} />
            <input style={inputStyle} type="text" placeholder={t('access_code')} value={signupData.code} onChange={e => setSignupData(d => ({ ...d, code: e.target.value }))} />
            {signupError && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{signupError}</span>}
            {signupSuccess && <span style={{ fontSize: 11, color: 'var(--success)' }}>{t('welcome_toast')} {signupData.firstName} 👋 {t('account_created')}</span>}
            {needsConfirmation && <span style={{ fontSize: 11, color: 'var(--success)' }}>Compte créé — vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.</span>}
            <button onClick={handleSignup} disabled={signingUp} style={{ ...pillButtonStyle, marginTop: 4, opacity: signingUp ? 0.7 : 1 }}>
              {signingUp ? '...' : <>{t('signup_btn')} <span>→</span></>}
            </button>
          </div>
        )}

        <style>{`
          input::placeholder { color: #9A9A9A; }
          input:focus { border-color: var(--accent) !important; outline: none; }
        `}</style>

      </div>
    </div>
  )
}
