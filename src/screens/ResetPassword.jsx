import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'
import { mapAuthError } from '../utils/authErrors'
import '../styles/ResetPassword.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const { t } = useLanguage()

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // The recovery link's token is exchanged for a session automatically
    // by the Supabase client (detectSessionInUrl). We just need to know
    // once that's happened before letting the user set a new password.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Même mécanisme que les 21 écrans du chantier mode sombre (fond
  // derrière .app-wrapper, overscroll iOS compris) — absent jusqu'ici
  // puisque cet écran n'avait jamais de fond propre en clair.
  useEffect(() => {
    document.body.classList.add('reset-password-body-bg')
    return () => document.body.classList.remove('reset-password-body-bg')
  }, [])

  async function handleSubmit() {
    setError('')
    if (!password || password.length < 6) { setError('6 caractères minimum'); return }
    if (password !== confirm) { setError(t('passwords_no_match')); return }
    setSaving(true)
    const result = await updatePassword(password)
    setSaving(false)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } else {
      setError(mapAuthError({ message: result.error }))
    }
  }

  // Matches Login.jsx's inputStyle — same solid #1A1A1A-bordered treatment
  // the rest of the Auth flow got in Session 13; this screen just hadn't
  // been compared against the prototype yet.
  // Couleurs retirées d'ici (2026-09-08, migration mode sombre) — voir
  // ResetPassword.css, classe .rp-input : mêmes valeurs exactes en clair,
  // suit --dark-* en sombre. Layout inchangé.
  const inputStyle = {
    padding: '16px',
    fontSize: 15,
    fontWeight: 700,
    width: '100%',
    outline: 'none',
    borderRadius: 14,
    fontFamily: 'inherit',
  }

  return (
    <div className="app-wrapper reset-password">
      <div style={{ padding: '0 28px 48px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, paddingBottom: 48 }}>
          <Logo variant="lockup" size={72} style={{ marginBottom: 14 }} />
          <p className="rp-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t('reset_password_title')}</p>
        </div>

        {success ? (
          <span className="rp-success-text" style={{ fontSize: 13, textAlign: 'center' }}>{t('password_updated_success')}</span>
        ) : ready ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="rp-input" style={inputStyle} type="password" placeholder={t('new_password_placeholder')} value={password} onChange={e => setPassword(e.target.value)} />
            <input className="rp-input" style={inputStyle} type="password" placeholder={t('confirm_password')} value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            {error && <span className="rp-error-text" style={{ fontSize: 11, letterSpacing: '0.05em' }}>{error}</span>}
            <button className="btn-accent" onClick={handleSubmit} disabled={saving} style={{ marginTop: 4, opacity: saving ? 0.7 : 1 }}>
              {saving ? '...' : t('update_password_btn')}
            </button>
          </div>
        ) : (
          <span className="rp-waiting-text" style={{ fontSize: 13, textAlign: 'center' }}>...</span>
        )}
      </div>
    </div>
  )
}
