import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, authHeader } from '../lib/supabase'
import { mapAuthError } from '../utils/authErrors'
import { mapApiError } from '../utils/apiErrors'
import '../styles/auth-redesign.css'

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

  // Même mécanisme que Login.jsx/auth-redesign.css — couvre le fond
  // derrière .app-wrapper (overscroll iOS compris).
  useEffect(() => {
    document.body.classList.add('auth-body-bg')
    return () => document.body.classList.remove('auth-body-bg')
  }, [])

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
      // Était `signUpError.message || fallbackFR` — exactement le pattern que
      // mapAuthError a été écrit pour corriger sur Login.jsx/ResetPassword.jsx
      // (le `||` ne se déclenche jamais, `message` n'étant jamais vide), mais
      // cet écran-ci avait été oublié. Un coach s'inscrivant avec un email
      // déjà pris voyait donc « User already registered » en anglais, sur
      // l'écran d'acquisition.
      setError(mapAuthError(signUpError))
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
      // `result.error` de /api/create-gym est déjà en FR ; ce qui pouvait
      // fuir ici, c'est l'échec de fetch() lui-même (« Failed to fetch »).
      setError(mapApiError(err, "Erreur lors de la création de la salle"))
    }
    setSubmitting(false)
  }

  function copyCode() {
    navigator.clipboard?.writeText(gym.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="app-wrapper auth-redesign">
      <div style={{ padding: '80px 28px 28px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        {step === 'form' ? (
          <>
            <h1 className="auth-title" style={{ fontSize: 28 }}>
              Créer ma salle
            </h1>
            <p className="auth-subtitle">
              Ton propre espace coach VOLTA, avec ton code d'invitation pour tes membres.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="auth-field" type="text" placeholder="Nom de la salle" value={data.gymName} onChange={e => setData(d => ({ ...d, gymName: e.target.value }))} />
              <input className="auth-field" type="text" placeholder="Ton prénom" value={data.firstName} onChange={e => setData(d => ({ ...d, firstName: e.target.value }))} />
              <input className="auth-field" type="email" placeholder="Email" value={data.email} onChange={e => setData(d => ({ ...d, email: e.target.value }))} />
              <input className="auth-field" type="password" placeholder="Mot de passe" value={data.password} onChange={e => setData(d => ({ ...d, password: e.target.value }))} />
              <input className="auth-field" type="password" placeholder="Confirme le mot de passe" value={data.confirm} onChange={e => setData(d => ({ ...d, confirm: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              {error && <span className="auth-error">{error}</span>}
              <button onClick={handleSubmit} disabled={submitting} className="auth-primary-btn" style={{ marginTop: 4 }}>
                {submitting ? '...' : <>CRÉER MA SALLE <span>→</span></>}
              </button>
              <button
                onClick={() => navigate('/login', { state: { tab: 'login' } })}
                className="auth-link-btn"
              >
                J'ai déjà un compte coach
              </button>
            </div>
          </>
        ) : step === 'needsConfirmation' ? (
          <>
            <h1 className="auth-title" style={{ fontSize: 28 }}>
              Vérifie ta boîte mail
            </h1>
            <p className="auth-subtitle">
              Compte créé — vérifie ta boîte mail pour confirmer ton adresse. Ta salle sera prête dès ta première connexion.
            </p>
            <button onClick={() => navigate('/login', { state: { tab: 'login' } })} className="auth-primary-btn">
              ALLER À LA CONNEXION <span>→</span>
            </button>
          </>
        ) : (
          <>
            <h1 className="auth-title" style={{ fontSize: 28 }}>
              {gym?.name} est prête 🎉
            </h1>
            <p className="auth-subtitle">
              Voici le code à donner à tes membres pour qu'ils rejoignent ta salle. Tu le retrouveras aussi dans tes réglages coach.
            </p>
            <div className="auth-invite-card">
              <div className="auth-invite-eyebrow">
                Code d'invitation
              </div>
              <div className="auth-invite-code">
                {gym?.invite_code}
              </div>
            </div>
            <button onClick={copyCode} className="auth-primary-btn auth-secondary-btn" style={{ marginBottom: 12 }}>
              {copied ? '✓ Copié' : 'Copier le code'}
            </button>
            <button onClick={() => navigate('/coach')} className="auth-primary-btn">
              ALLER À MON ESPACE COACH <span>→</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
