import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, authHeader } from '../lib/supabase'

// Self-service "créer ma salle" — the follow-up explicitly flagged as out
// of scope when the multi-tenant foundation (gyms table, gym_id, RLS
// rescoping) shipped: until now, a new gym could only exist via Arnaud
// creating it by hand in the SQL editor. This is the missing entry point.
//
// Deliberately NOT using AuthContext.register() — that function inserts a
// 'member' profile immediately after signUp(), which is exactly the wrong
// shape for a coach (no gym_id, wrong role). Calls supabase.auth.signUp()
// directly instead, same underlying primitive, then hands the fresh
// session to api/create-gym.js (service_role-backed — profiles.role is
// otherwise locked down, on purpose, against a client setting it on
// themselves).
export default function CoachSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState('form') // 'form' | 'needsConfirmation' | 'done'
  const [data, setData] = useState({ gymName: '', firstName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [gym, setGym] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit() {
    setError('')
    const { gymName, firstName, email, password, confirm } = data
    if (!gymName.trim() || !firstName.trim() || !email || !password || !confirm) {
      setError('Tous les champs sont requis')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setSubmitting(true)

    // gymName/firstName also stashed in user_metadata (not just passed
    // straight to /api/create-gym below) so they can still be read and
    // replayed later — see AuthContext.jsx's resolveRole() self-heal path
    // — if Confirm email is active and no session exists yet at this point.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: firstName, role: 'coach', gymName: gymName.trim(), firstName: firstName.trim() } },
    })
    if (signUpError) {
      setSubmitting(false)
      setError(signUpError.message || "Erreur lors de l'inscription")
      return
    }

    // Confirm email active: no session yet, /api/create-gym (RLS-gated via
    // requireUser()) can't be called authenticated here. Deferred to
    // AuthContext.jsx's resolveRole() self-heal path, which reads
    // user_metadata.gymName/firstName once a real session exists (after the
    // confirmation link is clicked and the coach logs in). Dead code today
    // — while Confirm email is off, signUpData.session always exists right
    // out of signUp().
    if (!signUpData.session) {
      setSubmitting(false)
      setStep('needsConfirmation')
      return
    }

    try {
      const res = await fetch('/api/create-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ gymName: gymName.trim(), firstName: firstName.trim() }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur lors de la création de la salle')
      setGym(result.gym)
      setStep('done')
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  function copyCode() {
    navigator.clipboard?.writeText(gym.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputStyle = {
    background: 'var(--surface)', border: '2px solid var(--border-strong)', color: 'var(--text-primary)',
    padding: '16px', fontSize: 15, fontWeight: 700, width: '100%', outline: 'none', borderRadius: 14,
    fontFamily: 'inherit',
  }
  const pillButtonStyle = {
    width: '100%', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 999,
    padding: '18px 16px', fontSize: 14, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
    fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }

  return (
    <div className="app-wrapper">
      <div style={{ padding: '80px 28px 28px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        {step === 'form' ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Créer ma salle
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 22px' }}>
              Ton propre espace coach VOLTA, avec ton code d'invitation pour tes membres.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={inputStyle} type="text" placeholder="Nom de la salle" value={data.gymName} onChange={e => setData(d => ({ ...d, gymName: e.target.value }))} />
              <input style={inputStyle} type="text" placeholder="Ton prénom" value={data.firstName} onChange={e => setData(d => ({ ...d, firstName: e.target.value }))} />
              <input style={inputStyle} type="email" placeholder="Email" value={data.email} onChange={e => setData(d => ({ ...d, email: e.target.value }))} />
              <input style={inputStyle} type="password" placeholder="Mot de passe" value={data.password} onChange={e => setData(d => ({ ...d, password: e.target.value }))} />
              <input style={inputStyle} type="password" placeholder="Confirme le mot de passe" value={data.confirm} onChange={e => setData(d => ({ ...d, confirm: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              {error && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</span>}
              <button onClick={handleSubmit} disabled={submitting} style={{ ...pillButtonStyle, marginTop: 4, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? '...' : <>CRÉER MA SALLE <span>→</span></>}
              </button>
              <button
                onClick={() => navigate('/login', { state: { tab: 'login' } })}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', textAlign: 'center', marginTop: 4, fontFamily: 'inherit' }}
              >
                J'ai déjà un compte coach
              </button>
            </div>
          </>
        ) : step === 'needsConfirmation' ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Vérifie ta boîte mail
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 22px' }}>
              Compte créé — vérifie ta boîte mail pour confirmer ton adresse. Ta salle sera prête dès ta première connexion.
            </p>
            <button onClick={() => navigate('/login', { state: { tab: 'login' } })} style={pillButtonStyle}>
              ALLER À LA CONNEXION <span>→</span>
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 8px' }}>
              {gym?.name} est prête 🎉
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 22px' }}>
              Voici le code à donner à tes membres pour qu'ils rejoignent ta salle. Tu le retrouveras aussi dans tes réglages coach.
            </p>
            <div style={{
              background: 'var(--surface)', border: '2px solid var(--accent)', borderRadius: 16,
              padding: '20px', textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Code d'invitation
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {gym?.invite_code}
              </div>
            </div>
            <button onClick={copyCode} style={{ ...pillButtonStyle, marginBottom: 12, background: 'var(--surface)', color: 'var(--text-primary)', border: '2px solid var(--border-strong)' }}>
              {copied ? '✓ Copié' : 'Copier le code'}
            </button>
            <button onClick={() => navigate('/coach')} style={pillButtonStyle}>
              ALLER À MON ESPACE COACH <span>→</span>
            </button>
          </>
        )}

        <style>{`
          input::placeholder { color: #9A9A9A; }
          input:focus { border-color: var(--accent) !important; outline: none; }
        `}</style>
      </div>
    </div>
  )
}
