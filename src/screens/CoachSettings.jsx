import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CoachNav from '../components/CoachNav'
import { supabase, authHeader } from '../lib/supabase'
import { isPushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush, isIOSNotStandalone } from '../utils/push'
import DeleteAccountButton from '../components/DeleteAccountButton'
import { storageKey } from '../components/OnboardingTour'
import { useGymConfig } from '../hooks/useGymConfig'
import { isGymAccessActive, trialDaysLeft } from '../utils/billing'
import Icon from '../components/Icon'

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, background: on ? 'var(--accent)' : 'var(--border)', borderRadius: 13, position: 'relative', cursor: 'pointer', transition: 'background 200ms ease', flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: 20, height: 20, background: 'white', borderRadius: '50%', top: 3, left: 3, transform: on ? 'translateX(18px)' : 'none', transition: 'transform 200ms ease' }} />
    </div>
  )
}

export default function CoachSettings() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const gymConfig = useGymConfig()
  const [inviteCode, setInviteCode] = useState('...')
  const [pushState, setPushState] = useState('loading')
  const [gym, setGym] = useState(null)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState('')

  useEffect(() => {
    let cancelled = false
    authHeader().then(headers =>
      fetch('/api/invite', { headers }).then(r => r.json())
    ).then(data => {
      if (!cancelled) setInviteCode(data.code || '—')
    }).catch(() => {
      if (!cancelled) setInviteCode('—')
    })
    return () => { cancelled = true }
  }, [])

  // Own gym's billing row — RLS ("Users can view their own gym") already
  // scopes this with no filter needed, same pattern as CoachLayout's gate.
  // Not fetched for the platform-admin account (CoachLayout never gates it
  // either, so there's nothing meaningful to show/manage here).
  useEffect(() => {
    let cancelled = false
    if (user?.isPlatformAdmin) return
    supabase.from('gyms').select('subscription_status, trial_ends_at, current_period_end')
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[CoachSettings] gym billing lookup failed', error)
        setGym(data || null)
      })
    return () => { cancelled = true }
  }, [user?.id, user?.isPlatformAdmin])

  async function handleBillingAction(action) {
    setBillingError('')
    setBillingBusy(true)
    try {
      const res = await fetch('/api/stripe-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur')
      window.location.href = result.url
    } catch (err) {
      setBillingError(err.message)
      setBillingBusy(false)
    }
  }

  useEffect(() => {
    if (!isPushSupported()) { setPushState('unsupported'); return }
    getPushSubscriptionState().then(setPushState)
  }, [])

  // See Settings.jsx's replayTour for why this is a hard navigation rather
  // than react-router's navigate().
  function replayTour() {
    if (user?.id) localStorage.removeItem(storageKey(user.id, 'coach'))
    window.location.href = '/coach'
  }

  async function handleTogglePush() {
    if (pushState === 'loading') return
    if (pushState === 'subscribed') {
      setPushState('loading')
      await unsubscribeFromPush()
      setPushState('unsubscribed')
    } else {
      setPushState('loading')
      const result = await subscribeToPush(user?.id)
      setPushState(result.success ? 'subscribed' : (result.error === 'permission-denied' ? 'denied' : 'unsubscribed'))
    }
  }

  return (
    <div className="app-wrapper">
      <div className="screen coach-narrow">
        <div className="screen-header" style={{ padding: '20px 0 12px' }}>
          <h1 className="text-xl bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="settings" size={20} /> Paramètres</h1>
        </div>

        <div className="section-label">PROFIL COACH</div>
        <div className="card card-animated" style={{ '--delay': '0ms' }}>
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sm text-secondary">Nom</span><span className="text-sm">{user?.name}</span>
          </div>
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sm text-secondary">Email</span><span className="text-sm">{user?.email}</span>
          </div>
        </div>

        <div className="section-label">SALLE</div>
        <div className="card card-animated" style={{ '--delay': '60ms' }}>
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sm text-secondary">Salle</span><span className="text-sm">{gymConfig.name}{gymConfig.city ? ` ${gymConfig.city}` : ''}</span>
          </div>
          <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sm text-secondary">Code accès</span><span className="text-sm text-accent bold">{inviteCode}</span>
          </div>
        </div>

        {!user?.isPlatformAdmin && gym && (
          <>
            <div className="section-label">FACTURATION</div>
            <div className="card card-animated" style={{ '--delay': '90ms' }}>
              <div style={{ padding: '14px 0', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-sm text-secondary">Statut</span>
                <span className="text-sm bold" style={{ color: isGymAccessActive(gym) ? 'var(--success)' : 'var(--danger)' }}>
                  {gym.subscription_status === 'active' && 'Actif'}
                  {gym.subscription_status === 'trialing' && (isGymAccessActive(gym) ? `Essai — ${trialDaysLeft(gym)} j restants` : 'Essai terminé')}
                  {gym.subscription_status === 'past_due' && 'Paiement en échec'}
                  {gym.subscription_status === 'canceled' && 'Annulé'}
                  {!['active', 'trialing', 'past_due', 'canceled'].includes(gym.subscription_status) && gym.subscription_status}
                </span>
              </div>
              {billingError && <div style={{ padding: '10px 0' }}><span className="text-xs" style={{ color: 'var(--danger)' }}>{billingError}</span></div>}
              <div style={{ padding: '14px 0 0' }}>
                {gym.subscription_status === 'active' ? (
                  <button className="btn-ghost" disabled={billingBusy} onClick={() => handleBillingAction('portal')}>
                    {billingBusy ? '...' : 'Gérer mon abonnement'}
                  </button>
                ) : (
                  <button className="btn-accent" disabled={billingBusy} onClick={() => handleBillingAction('checkout')}>
                    {billingBusy ? '...' : "S'abonner"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        <div className="section-label">NOTIFICATIONS</div>
        <div className="card card-animated" style={{ '--delay': '120ms' }}>
          {pushState !== 'unsupported' && (
            <div className="flex justify-between items-center" style={{ padding: '14px 0', borderBottom: '2px solid var(--border)' }}>
              <div>
                <div className="text-sm text-secondary">Nouveaux messages</div>
                {pushState === 'denied' && <div className="text-xs" style={{ color: 'var(--danger)', marginTop: 2 }}>Bloquées dans les réglages du navigateur</div>}
              </div>
              <Toggle on={pushState === 'subscribed'} onToggle={handleTogglePush} />
            </div>
          )}
          {/* Same fix as Settings.jsx (member side) — was rendering nothing
              at all when unsupported, which on iOS Safari (Push API only
              available in an installed home-screen app) is the default
              case, not an edge case. */}
          {pushState === 'unsupported' && (
            <div style={{ padding: '14px 0' }}>
              <div className="text-sm text-secondary">Nouveaux messages</div>
              <div className="text-xs text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                {isIOSNotStandalone()
                  ? "Indisponibles depuis Safari sur iPhone — ajoute VOLTA à ton écran d'accueil (icône de partage → \"Sur l'écran d'accueil\") pour pouvoir les activer."
                  : "Non prises en charge par ce navigateur."}
              </div>
            </div>
          )}
          {/* "Alertes membres" used to live here as a local-state
              placeholder — no scheduling logic behind it, toggling it did
              nothing. Removed for the same reason as Settings.jsx's three
              (see there) rather than leave a toggle that lies about what it
              does. */}
        </div>

        {user?.isPlatformAdmin && (
          <>
            <div className="section-label">VOLTA</div>
            <button className="btn-ghost" onClick={() => navigate('/admin')} style={{ marginBottom: 12 }}>
              Console admin — toutes les salles
            </button>
          </>
        )}

        <div className="section-label">COMPTE</div>
        <button className="btn-ghost" onClick={replayTour} style={{ marginBottom: 8 }}>
          Revoir le didacticiel
        </button>
        <button onClick={() => { logout(); navigate('/') }} style={{ width: '100%', padding: 16, background: 'transparent', border: '2px solid var(--danger)', color: 'var(--danger)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 12, cursor: 'pointer', marginBottom: 12 }}>
          SE DÉCONNECTER
        </button>
        <DeleteAccountButton />
      </div>
      <CoachNav />
    </div>
  )
}
