import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CoachNavBar from '../components/CoachNavBar'
import { supabase, authHeader } from '../lib/supabase'
import { isPushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush, isIOSNotStandalone } from '../utils/push'
import DeleteAccountButton from '../components/DeleteAccountButton'
import { storageKey } from '../components/OnboardingTour'
import { useGymConfig } from '../hooks/useGymConfig'
import { isGymAccessActive, trialDaysLeft } from '../utils/billing'
import Icon from '../components/Icon'
import { activable } from '../utils/a11y'
import '../styles/CoachSettings-redesign.css'

// `role="switch"` + aria-checked plutôt que `button` : c'est un interrupteur
// à deux états, et sans ça un lecteur d'écran l'annonçait comme rien du tout
// (div nu, non atteignable au clavier). Même traitement dans Settings.jsx.
function Toggle({ on, onToggle, label }) {
  return (
    <div {...activable(onToggle, { role: 'switch', 'aria-checked': !!on, label })} className={`cs-toggle ${on ? 'on' : 'off'}`}>
      <div className="cs-toggle-knob" />
    </div>
  )
}

// Restyle coach (handoff "Redesign interface VOLTA (8)") — écran 6/6,
// dernier de la série. Réutilise CoachNavBar.jsx tel quel.
export default function CoachSettings() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const gymConfig = useGymConfig()
  const [inviteCode, setInviteCode] = useState('...')
  const [pushState, setPushState] = useState('loading')
  const [gym, setGym] = useState(null)
  const [aiUsage, setAiUsage] = useState(null)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState('')

  // Même raison que les autres écrans coach restylés : évite que le
  // rubber-band iOS au-delà des limites du wrapper ne retombe sur le
  // dégradé corail partagé de <body>.
  useEffect(() => {
    document.body.classList.add('coachsettings-body-bg')
    return () => document.body.classList.remove('coachsettings-body-bg')
  }, [])

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
    supabase.from('gyms').select('subscription_status, trial_ends_at, current_period_end, ai_quota_calls')
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[CoachSettings] gym billing lookup failed', error)
        setGym(data || null)
      })
    // Conso IA du mois en cours (plafond de coût, audit 2026-08-10 point 03).
    // RLS "Coaches can view own gym ai usage" scope déjà à sa propre salle,
    // d'où l'absence de filtre gym_id — même pattern que la requête ci-dessus.
    const period = new Date().toISOString().slice(0, 8) + '01'
    supabase.from('ai_usage').select('calls, input_tokens, output_tokens')
      .eq('period', period)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[CoachSettings] ai usage lookup failed', error)
        setAiUsage(data || { calls: 0 })
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
    <div className="app-wrapper coachsettings-redesign">
      <div className="coachsettings-screen">
        <h1 className="cs-title"><Icon name="settings" size={20} /> Paramètres</h1>

        <div className="cs-section-label">Profil coach</div>
        <div className="cs-card">
          <div className="cs-row">
            <span className="cs-row-label">Nom</span><span className="cs-row-value">{user?.name}</span>
          </div>
          <div className="cs-row">
            <span className="cs-row-label">Email</span><span className="cs-row-value">{user?.email}</span>
          </div>
        </div>

        <div className="cs-section-label">Salle</div>
        <div className="cs-card">
          <div className="cs-row">
            <span className="cs-row-label">Salle</span><span className="cs-row-value">{gymConfig.name}{gymConfig.city ? ` ${gymConfig.city}` : ''}</span>
          </div>
          <div className="cs-row">
            <span className="cs-row-label">Code accès</span><span className="cs-row-value accent">{inviteCode}</span>
          </div>
        </div>

        {!user?.isPlatformAdmin && gym && (
          <>
            <div className="cs-section-label">Facturation</div>
            <div className="cs-card padded">
              <div className="cs-row">
                <span className="cs-row-label">Statut</span>
                <span className={`cs-row-value ${isGymAccessActive(gym) ? 'success' : 'danger'}`}>
                  {gym.subscription_status === 'active' && 'Actif'}
                  {gym.subscription_status === 'trialing' && (isGymAccessActive(gym) ? `Essai — ${trialDaysLeft(gym)} j restants` : 'Essai terminé')}
                  {gym.subscription_status === 'past_due' && 'Paiement en échec'}
                  {gym.subscription_status === 'canceled' && 'Annulé'}
                  {!['active', 'trialing', 'past_due', 'canceled'].includes(gym.subscription_status) && gym.subscription_status}
                </span>
              </div>
              {billingError && <p className="cs-error">{billingError}</p>}
              {gym.subscription_status === 'active' ? (
                <button className="cs-btn-ghost" disabled={billingBusy} onClick={() => handleBillingAction('portal')}>
                  {billingBusy ? '...' : 'Gérer mon abonnement'}
                </button>
              ) : (
                <button className="cs-btn-accent" disabled={billingBusy} onClick={() => handleBillingAction('checkout')}>
                  {billingBusy ? '...' : "S'abonner"}
                </button>
              )}
            </div>
          </>
        )}

        {!user?.isPlatformAdmin && gym && aiUsage && (
          <>
            <div className="cs-section-label">Usage IA</div>
            <div className="cs-card padded">
              <div className="cs-usage-row">
                <span className="cs-row-label">Ce mois-ci</span>
                <span className="cs-row-value">
                  {aiUsage.calls || 0}{gym.ai_quota_calls != null ? ` / ${gym.ai_quota_calls}` : ''} requêtes
                </span>
              </div>
              {gym.ai_quota_calls != null && (
                <div className="cs-usage-bar-track">
                  <div
                    className={`cs-usage-bar-fill${(aiUsage.calls || 0) >= gym.ai_quota_calls ? ' danger' : ''}`}
                    style={{ width: `${Math.min(100, Math.round(((aiUsage.calls || 0) / gym.ai_quota_calls) * 100))}%` }}
                  />
                </div>
              )}
              <p className="cs-usage-note">
                {gym.ai_quota_calls == null
                  ? 'Aucune limite sur ton offre.'
                  : 'Coach IA, recettes et scan. Le compteur repart le 1er du mois.'}
              </p>
            </div>
          </>
        )}

        <div className="cs-section-label">Notifications</div>
        <div className="cs-card padded">
          {pushState !== 'unsupported' && (
            <div className="cs-row" style={{ padding: 0, border: 'none' }}>
              <div>
                <div className="cs-row-label">Nouveaux messages</div>
                {pushState === 'denied' && <div className="cs-notif-sub">Bloquées dans les réglages du navigateur</div>}
              </div>
              <Toggle on={pushState === 'subscribed'} onToggle={handleTogglePush} label="Notifications push" />
            </div>
          )}
          {/* Same fix as Settings.jsx (member side) — was rendering nothing
              at all when unsupported, which on iOS Safari (Push API only
              available in an installed home-screen app) is the default
              case, not an edge case. */}
          {pushState === 'unsupported' && (
            <div>
              <div className="cs-row-label">Nouveaux messages</div>
              <div className="cs-notif-unsupported-note">
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
            <div className="cs-section-label">VOLTA</div>
            <button className="cs-btn-ghost" onClick={() => navigate('/admin')} style={{ marginBottom: 12 }}>
              Console admin — toutes les salles
            </button>
          </>
        )}

        <div className="cs-section-label">Compte</div>
        <div className="cs-account-list">
          <button className="cs-btn-ghost" onClick={replayTour}>
            Revoir le didacticiel
          </button>
          {/* Même course que Settings.jsx (côté membre) — logout() doit être
              attendu avant navigate(), sinon AuthContext.user est encore
              peuplé au moment où /login réévalue sa garde de route. */}
          <button className="cs-btn-danger" onClick={async () => { await logout(); navigate('/') }}>
            Se déconnecter
          </button>
          <DeleteAccountButton />
        </div>
      </div>
      <CoachNavBar />
    </div>
  )
}
