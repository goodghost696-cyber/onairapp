import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
// États « données non partagées » côté coach (voir consent.css) — la feuille
// est aussi importée par MemberLayout, l'import explicite ici évite de
// dépendre du hasard de l'ordre des chunks.
import '../styles/consent.css'
import { supabase, authHeader } from '../lib/supabase'
import { isGymAccessActive } from '../utils/billing'
import OnboardingTour from '../components/OnboardingTour'
import '../styles/coach.css'

// Scopes the desktop-responsive rules in coach.css to the /coach/* routes
// only, without touching the member side's mobile-first layout at all —
// #root is otherwise capped at 390px everywhere (global.css), which is
// correct for the member app but cramped for a coach working from a
// computer. Same "toggle a class while mounted, restore on unmount" trick
// already used to force Landing's dark theme regardless of the saved
// preference.
export default function CoachLayout() {
  const { user } = useAuth()
  const [gym, setGym] = useState(null)
  const [checked, setChecked] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [billingError, setBillingError] = useState('')

  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('coach-shell')
    return () => root?.classList.remove('coach-shell')
  }, [])

  // Billing gate (JOURNAL.md 2026-08-10 decisions) — coach access ONLY,
  // members are never touched by this. `supabase.from('gyms').select()`
  // with no explicit filter still returns exactly one row (or none): the
  // "Users can view their own gym" RLS policy already scopes it to
  // id = my_gym_id(), same pattern CoachDashboard/ClientsList already rely
  // on for member data. Skipped entirely for Arnaud's own platform-admin
  // account — the owner's own gym should never lock him out of the app.
  useEffect(() => {
    let cancelled = false
    if (!user || user.isPlatformAdmin) { setChecked(true); return }
    supabase.from('gyms').select('id, subscription_status, trial_ends_at, current_period_end')
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[CoachLayout] gym billing lookup failed', error)
        // Fails OPEN on a lookup error or no row at all (e.g. a network
        // hiccup, or the rare self-healed profile with gym_id still null —
        // see AuthContext.resolveRole()) — must never lock out a
        // legitimate, possibly-paying coach over an infra blip. Only a
        // REAL row that says "inactive" blocks anything.
        setGym(data || null)
        setChecked(true)
      })
    return () => { cancelled = true }
  }, [user?.id, user?.isPlatformAdmin])

  async function handleSubscribe() {
    setBillingError('')
    setSubscribing(true)
    try {
      const res = await fetch('/api/stripe-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action: 'checkout' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur lors de la création de la session de paiement')
      window.location.href = result.url
    } catch (err) {
      setBillingError(err.message)
      setSubscribing(false)
    }
  }

  if (!checked) return null // avoid flashing the real app before we know

  const blocked = user && !user.isPlatformAdmin && gym && !isGymAccessActive(gym)

  if (blocked) {
    return (
      <div className="app-wrapper">
        <div style={{ padding: '80px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16, minHeight: '100dvh' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Abonnement requis</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
            {gym.subscription_status === 'trialing'
              ? "Ton essai gratuit est terminé. Abonne-toi pour retrouver l'accès à ton espace coach."
              : "Ton abonnement n'est plus actif. Réactive-le pour retrouver l'accès à ton espace coach."}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, maxWidth: 320 }}>
            Tes membres gardent leur accès normalement — ceci ne concerne que l'espace coach.
          </p>
          {billingError && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{billingError}</span>}
          <button onClick={handleSubscribe} disabled={subscribing} style={{
            background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 999,
            padding: '16px 28px', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            cursor: 'pointer', opacity: subscribing ? 0.7 : 1, fontFamily: 'inherit',
          }}>
            {subscribing ? '...' : "S'abonner"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Outlet />
      <OnboardingTour variant="coach" />
    </>
  )
}
