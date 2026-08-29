import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { mapAuthError } from '../utils/authErrors'
import '../styles/auth-redesign.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, sendPasswordResetEmail } = useAuth()
  const { t } = useLanguage()
  const [tab, setTab] = useState(location.state?.tab === 'signup' ? 'signup' : 'login')

  // Même mécanisme que Settings.jsx (settings-redesign.css) — le body a
  // besoin de sa propre classe pour couvrir le fond derrière le contenu
  // (au-delà de .app-wrapper), notamment pendant l'overscroll iOS.
  useEffect(() => {
    document.body.classList.add('auth-body-bg')
    return () => document.body.classList.remove('auth-body-bg')
  }, [])

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
    if (!result.success) {
      setError(mapAuthError({ message: result.error }))
      return
    }
    // Pas de navigate() manuel ici — login() (AuthContext.jsx) peuple
    // désormais `user` lui-même de façon synchrone (setUser), donc la route
    // /login (App.jsx, déjà réactive à `user`) redirige d'elle-même vers
    // /coach ou /dashboard. Naviguer ici en plus, sur la base du result.role
    // local, créait une course avec le listener onAuthStateChange qui
    // provoquait un flash retour sur /login juste après une connexion
    // pourtant réussie (surtout visible côté coach) — cf. JOURNAL.md.
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
      setForgotError(mapAuthError({ message: result.error }))
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
      setSignupError(mapAuthError({ message: result.error }))
    }
  }

  return (
    <div className="app-wrapper auth-redesign">
      <div style={{ padding: '80px 28px 28px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

        <h1 className="auth-title">
          Bienvenue.
        </h1>

        {/* Tabs */}
        <div className="auth-tabs">
          {['login', 'signup'].map(tabKey => (
            <button key={tabKey} onClick={() => { setTab(tabKey); setError(''); setSignupError(''); setForgotMode(false) }} className={`auth-tab${tab === tabKey ? ' active' : ''}`}>
              {tabKey === 'login' ? t('login_tab') : t('signup_tab')}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          forgotMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="auth-subtitle" style={{ margin: '0 0 4px' }}>{t('reset_password_subtitle')}</p>
              {!forgotSent ? (
                <>
                  <input className="auth-field" type="email" placeholder={t('email_placeholder')} value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendReset()} />
                  {forgotError && <span className="auth-error">{forgotError}</span>}
                  <button onClick={handleSendReset} disabled={sendingReset} className="auth-primary-btn" style={{ marginTop: 4 }}>
                    {sendingReset ? '...' : <>{t('send_reset_link_btn')} <span>→</span></>}
                  </button>
                </>
              ) : (
                <span className="auth-success">{t('reset_email_sent')}</span>
              )}
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError(''); setForgotEmail('') }}
                className="auth-link-btn"
              >
                {t('back_to_login_btn')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="auth-field" type="email" placeholder={t('email_placeholder')} value={email} onChange={e => setEmail(e.target.value)} />
              <input className="auth-field" type="password" placeholder={t('password_placeholder')} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              {error && <span className="auth-error">{error}</span>}
              <button
                onClick={() => { setForgotMode(true); setError('') }}
                className="auth-link-btn align-end"
              >
                {t('forgot_password_link')}
              </button>
              <button onClick={handleLogin} disabled={loggingIn} className="auth-primary-btn" style={{ marginTop: 4 }}>
                {loggingIn ? '...' : <>{t('connect_btn')} <span>→</span></>}
              </button>
              {/* "Accès coach" (Landing.jsx) lands here to sign in — but until
                  now there was no way for a NEW coach to get an account at
                  all short of Arnaud creating it by hand in the SQL editor.
                  Self-service entry point, discoverable exactly where a
                  prospective coach lands. */}
              <button
                onClick={() => navigate('/coach-signup')}
                className="auth-link-btn"
              >
                Pas encore de salle ? Créer la mienne →
              </button>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="auth-field" type="text" placeholder={t('first_name_placeholder')} value={signupData.firstName} onChange={e => setSignupData(d => ({ ...d, firstName: e.target.value }))} />
            <input className="auth-field" type="email" placeholder={t('email_placeholder')} value={signupData.email} onChange={e => setSignupData(d => ({ ...d, email: e.target.value }))} />
            <input className="auth-field" type="password" placeholder={t('password_placeholder')} value={signupData.password} onChange={e => setSignupData(d => ({ ...d, password: e.target.value }))} />
            <input className="auth-field" type="password" placeholder={t('confirm_password')} value={signupData.confirm} onChange={e => setSignupData(d => ({ ...d, confirm: e.target.value }))} />
            <input className="auth-field" type="text" placeholder={t('access_code')} value={signupData.code} onChange={e => setSignupData(d => ({ ...d, code: e.target.value }))} />
            {signupError && <span className="auth-error">{signupError}</span>}
            {signupSuccess && <span className="auth-success">{t('welcome_toast')} {signupData.firstName} 👋 {t('account_created')}</span>}
            {needsConfirmation && <span className="auth-success">Compte créé — vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.</span>}
            <button onClick={handleSignup} disabled={signingUp} className="auth-primary-btn" style={{ marginTop: 4 }}>
              {signingUp ? '...' : <>{t('signup_btn')} <span>→</span></>}
            </button>
            {/* Équivalent symétrique du lien "Pas encore de salle ? Créer la
                mienne" côté onglet Connexion (ci-dessus) — jusqu'ici absent
                ici. Le segmented control en haut de page permet déjà de
                basculer vers Connexion, mais reste un composant de nav
                générique au-dessus du formulaire, peu visible au moment où
                un membre déjà inscrit réalise qu'il s'est trompé d'onglet
                (audit JOURNAL.md). Même state (`tab`) que ce toggle. */}
            <button
              type="button"
              onClick={() => { setTab('login'); setSignupError(''); setError('') }}
              className="auth-link-btn"
            >
              Déjà un compte ? Connecte-toi →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
