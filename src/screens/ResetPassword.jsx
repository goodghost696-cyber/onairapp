import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'

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
      setError(result.error || 'Erreur lors de la mise à jour')
    }
  }

  // Matches Login.jsx's inputStyle — same solid #1A1A1A-bordered treatment
  // the rest of the Auth flow got in Session 13; this screen just hadn't
  // been compared against the prototype yet.
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

  return (
    <div className="app-wrapper">
      <div style={{ padding: '0 28px 48px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, paddingBottom: 48 }}>
          <Logo variant="lockup" size={72} style={{ marginBottom: 14 }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('reset_password_title')}</p>
        </div>

        {success ? (
          <span style={{ fontSize: 13, color: 'var(--success)', textAlign: 'center' }}>{t('password_updated_success')}</span>
        ) : ready ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={inputStyle} type="password" placeholder={t('new_password_placeholder')} value={password} onChange={e => setPassword(e.target.value)} />
            <input style={inputStyle} type="password" placeholder={t('confirm_password')} value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            {error && <span style={{ fontSize: 11, color: 'var(--danger)', letterSpacing: '0.05em' }}>{error}</span>}
            <button className="btn-accent" onClick={handleSubmit} disabled={saving} style={{ marginTop: 4, opacity: saving ? 0.7 : 1 }}>
              {saving ? '...' : t('update_password_btn')}
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>...</span>
        )}
      </div>
    </div>
  )
}
