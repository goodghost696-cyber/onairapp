import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { BOUNDS, clamp } from '../utils/validation'
import { isPushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush, isIOSNotStandalone } from '../utils/push'
import { uploadAvatar } from '../utils/avatar'
import DeleteAccountButton from '../components/DeleteAccountButton'
import Avatar from '../components/Avatar'
import { storageKey } from '../components/OnboardingTour'
import { activable } from '../utils/a11y'
import { fetchConsentState, setCoachDataConsent } from '../utils/consent'
import '../styles/settings-redesign.css'

// Recoloré pour le restyle "pastel chaud" (2026-08-14, handoff dédié) —
// piste + pastille en dur via .set-toggle/.set-toggle-knob
// (settings-redesign.css) plutôt qu'en inline comme avant : mêmes deux
// classes réutilisables si un autre écran adopte ce composant plus tard.
// `role="switch"` + aria-checked plutôt que `button` : c'est un interrupteur
// à deux états, et sans ça un lecteur d'écran l'annonçait comme rien du tout
// (div nu, non atteignable au clavier). Même traitement dans CoachSettings.jsx.
function Toggle({ on, onToggle, label }) {
  return (
    <div {...activable(onToggle, { role: 'switch', 'aria-checked': !!on, label })} className={`set-toggle ${on ? 'on' : 'off'}`}>
      <div className="set-toggle-knob" />
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div className="set-field">
      <span className="set-field-label">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout, updateUserProfile } = useAuth()
  const { appData, updateData } = useApp()
  const { lang, setLanguage, t } = useLanguage()
  const [showHealthSync, setShowHealthSync] = useState(false)
  const [healthData, setHealthData] = useState({ steps: '', sleep_hours: '', sleep_minutes: '' })
  const [syncToast, setSyncToast] = useState(false)
  // Real (not simulated) — the three toggles above are still local-state
  // placeholders (no scheduling logic built yet). This one actually
  // subscribes the browser to Web Push and persists it in push_subscriptions.
  const [pushState, setPushState] = useState('loading')
  // Photo de profil (2026-08-15) — tap sur l'avatar → sélecteur photo natif
  // (input file caché) → resize client (utils/avatar.js) → upload Storage
  // → update profiles.avatar_url → updateData('avatarUrl', ...) pour que
  // Dashboard.jsx (et tout autre écran affichant Avatar.jsx) reflète la
  // nouvelle photo immédiatement, sans re-fetch ni navigation.
  const avatarInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de re-sélectionner le même fichier plus tard
    if (!file || !user?.id) return
    setAvatarError('')
    setAvatarUploading(true)
    try {
      const url = await uploadAvatar(user.id, file)
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id)
      if (error) throw error
      updateData('avatarUrl', url)
    } catch (err) {
      console.error('[Settings] avatar upload failed', err)
      setAvatarError("Échec de l'envoi — réessaie.")
    }
    setAvatarUploading(false)
  }

  useEffect(() => {
    if (!isPushSupported()) { setPushState('unsupported'); return }
    getPushSubscriptionState().then(setPushState)
  }, [])

  // Consentement au partage avec le coach — voir la section Confidentialité
  // plus bas et utils/consent.js.
  const [consentState, setConsentState] = useState(null)
  const [consentSaving, setConsentSaving] = useState(false)
  const [consentError, setConsentError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchConsentState(user.id).then(s => { if (!cancelled) setConsentState(s) })
    return () => { cancelled = true }
  }, [user?.id])

  async function toggleCoachConsent() {
    if (!consentState || consentSaving) return
    const next = !consentState.consent
    setConsentSaving(true)
    setConsentError('')
    const { success } = await setCoachDataConsent(user.id, next)
    setConsentSaving(false)
    if (success) {
      // État local recalé sur ce qui vient d'être écrit, pas sur une
      // supposition : si l'écriture échoue, le toggle ne bouge pas et
      // l'utilisateur ne croit pas avoir retiré un accès toujours actif.
      setConsentState(s => ({ ...s, consent: next, hasDecided: true }))
    } else {
      setConsentError("Impossible d'enregistrer — réessaie dans un instant.")
    }
  }

  // Même fix que les 6 écrans précédents (voir dashboard.css/JOURNAL.md) :
  // couvre le rubber-band iOS. Classe active seulement tant que ce screen
  // est monté.
  useEffect(() => {
    document.body.classList.add('settings-body-bg')
    return () => document.body.classList.remove('settings-body-bg')
  }, [])

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

  // Was seeded with hard-coded weight:'78'/height:'180' and never actually
  // loaded from Supabase — a real member (Myriam) entered 65kg/160cm at
  // registration, Réglages kept showing 78/180 regardless, because these
  // two lines were the entire "load". The onboarding wizard does persist
  // the real values (profiles.poids/taille via updateUserProfile), this
  // screen just never read them back.
  // `email` retiré de cet état (2026-08-16) : il n'est plus éditable, et
  // l'adresse affichée vient désormais de `user.email` (AuthContext), c'est-
  // à-dire de l'identité de connexion réelle — voir le bloc Email du rendu.
  const [profile, setProfile] = useState({ name: user?.name || '', weight: '', height: '', age: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  // Race condition rapportée en test réel (2026-08-14, investigation
  // JOURNAL.md) : le fetch initial de profiles.poids/taille (useEffect
  // ci-dessous) peuplait `profile` via un .then() qui écrasait
  // inconditionnellement weight/height/etc. dès que la valeur serveur
  // n'était pas null — sans vérifier si le membre avait déjà tapé une
  // nouvelle valeur entre le montage et la résolution du fetch. Un membre
  // qui édite un champ avant que le fetch revienne voyait sa saisie
  // écrasée par l'ancienne valeur serveur. Un Set en ref (pas un state :
  // pas besoin de re-render, juste lu au moment où le fetch résout) suit
  // quels champs ont été touchés localement — le fetch ne peuple plus que
  // les champs encore vierges de toute saisie.
  const touchedProfileFields = useRef(new Set())
  function updateProfileField(field, value) {
    touchedProfileFields.current.add(field)
    setProfile(p => ({ ...p, [field]: value }))
  }
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase.from('profiles').select('prenom, poids, taille, age').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('[Settings] profile fetch failed', error); return }
        if (data) {
          const touched = touchedProfileFields.current
          setProfile(p => ({
            name: !touched.has('name') && data.prenom ? data.prenom : p.name,
            weight: !touched.has('weight') && data.poids != null ? String(data.poids) : p.weight,
            height: !touched.has('height') && data.taille != null ? String(data.taille) : p.height,
            age: !touched.has('age') && data.age != null ? String(data.age) : p.age,
          }))
        }
      })
    return () => { cancelled = true }
  }, [user?.id])

  // "Profil" card had inputs but no save button at all — editing name/
  // weight/height did nothing beyond local component state, same class of
  // bug as the goals-that-never-persisted issue this app has already been
  // through once. updateUserProfile already existed (used by Onboarding)
  // and upserts both auth user_metadata and profiles.poids/taille — just
  // never wired up here.
  async function saveProfile() {
    setProfileSaving(true)
    // `email` volontairement absent du payload : le modifier ici ne changeait
    // pas l'identité de connexion (voir le bloc Email du rendu). Omis, donc
    // upsertOwnProfile ne touche pas la colonne — il ne filtre que les
    // `undefined`, exactement comme pour `age`.
    await updateUserProfile({
      name: profile.name,
      weight: profile.weight,
      height: profile.height,
    })
    setProfileSaving(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  function handleHealthSync() {
    const steps = parseInt(healthData.steps)
    const sleepH = parseInt(healthData.sleep_hours)
    const sleepM = parseInt(healthData.sleep_minutes)
    if (steps > 0) updateData('steps', clamp(steps, BOUNDS.steps))
    if (sleepH > 0 || sleepM > 0) {
      const hours = clamp((sleepH || 0) + (sleepM || 0) / 60, BOUNDS.sleepHours)
      updateData('sleep', { hours: Math.floor(hours), minutes: Math.round((hours % 1) * 60), quality: 'Bonne' })
    }
    setShowHealthSync(false)
    setHealthData({ steps: '', sleep_hours: '', sleep_minutes: '' })
    setSyncToast(true)
    setTimeout(() => setSyncToast(false), 2000)
  }

  // Clears this account's "tour seen" flag then does a hard navigation
  // (not just navigate() from react-router) so OnboardingTour's mount
  // effect actually re-runs — it lives in MemberLayout, which stays
  // mounted across route changes within it, so a soft navigation here
  // wouldn't re-trigger the check.
  function replayTour() {
    if (user?.id) localStorage.removeItem(storageKey(user.id, 'member'))
    window.location.href = '/dashboard'
  }

  return (
    <div className="app-wrapper settings-redesign">
      {/* Sync Toast */}
      <div style={{
        position: 'fixed', top: syncToast ? 16 : -60, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--success)', color: '#000', padding: '10px 20px', borderRadius: 50,
        fontSize: 12, fontWeight: 700, letterSpacing: 1, zIndex: 300, whiteSpace: 'nowrap',
        transition: 'top 300ms cubic-bezier(0.34,1.56,0.64,1)',
      }}>Données synchronisées ✓</div>

      <div className="screen settings-screen">
        <div className="screen-header" style={{ paddingTop: 56, paddingBottom: 20 }}>
          <button className="set-back-btn" onClick={() => navigate('/dashboard')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--set-ink)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <p className="set-eyebrow">RÉGLAGES</p>
          <h1 className="set-title">{t('settings_title')}</h1>
        </div>

        <div className="section-label">{t('profile_section')}</div>
        <div className="set-avatar-row">
          <button
            type="button"
            className="set-avatar-btn"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            aria-label="Changer la photo de profil"
          >
            <Avatar name={profile.name} avatarUrl={appData.avatarUrl} />
            {avatarUploading && <span className="set-avatar-spinner" />}
          </button>
          <div>
            <button type="button" className="set-avatar-change-link" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}>
              {avatarUploading ? 'Envoi...' : 'Changer la photo'}
            </button>
            {avatarError && <p className="set-avatar-error">{avatarError}</p>}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>
        <div className="card card-animated" style={{ '--delay': '0ms' }}>
          <Field label={t('first_name')} value={profile.name} onChange={v => updateProfileField('name', v)} />
          {/* Était un champ éditable qui mentait (audit 2026-08-16) : le
              saisir affichait « ✓ Enregistré » et écrivait la nouvelle
              adresse dans profiles.email + user_metadata, mais JAMAIS dans
              auth.users.email — l'identité de connexion. Mesuré en test réel
              : après « enregistrement », la connexion avec la nouvelle
              adresse échouait ("Invalid login credentials") et seule
              l'ancienne fonctionnait encore. Le membre se croyait donc sur
              une adresse qui ne lui ouvrait plus rien, la réinitialisation de
              mot de passe partait toujours vers l'ancienne boîte, et le coach
              voyait la nouvelle dans ClientsList — une adresse à laquelle le
              compte n'est pas rattaché.
              Un vrai changement d'adresse (auth.updateUser({ email })) est
              impossible sur ce projet aujourd'hui : testé, il répond 500
              « Error sending email change email », l'email transactionnel
              étant toujours en bac à sable (voir JOURNAL.md 2026-08-12).
              En lecture seule tant que ce flux n'existe pas — l'adresse
              affichée vient de user.email, donc de l'identité réelle et non
              de profiles.email, qui a pu diverger. */}
          <div className="set-field">
            <span className="set-field-label">{t('email')}</span>
            <span className="set-field-value">{user?.email || '—'}</span>
          </div>
          <Field label={t('weight')} value={profile.weight} onChange={v => updateProfileField('weight', v)} type="number" />
          <Field label={t('height')} value={profile.height} onChange={v => updateProfileField('height', v)} type="number" />
        </div>
        <p className="text-xs text-muted" style={{ margin: '8px 2px 0' }}>
          Ton adresse e-mail sert à te connecter et ne peut pas être modifiée ici pour l'instant.
        </p>
        <button className="btn-ghost set-outline-btn" onClick={saveProfile} disabled={profileSaving} style={{ opacity: profileSaving ? 0.6 : 1 }}>
          {profileSaving ? '...' : profileSaved ? '✓ Enregistré' : 'Enregistrer le profil'}
        </button>

        {/* Résumé en lecture seule (2026-08-15) — l'édition (chips
            d'objectif + calories/protéines + sauvegarde) a déménagé sur
            Bilan (Weekly.jsx), à côté du bloc RÉSUMÉ : demande explicite
            de centraliser l'édition d'objectif à un seul endroit plutôt
            que de la dupliquer entre Réglages et Bilan. Ce bloc-ci lit
            juste user.goal (AuthContext) et appData.calorieGoal/
            proteinGoal (AppContext) — les deux sont déjà tenus à jour en
            temps réel par ces contexts partagés, donc un changement fait
            depuis Bilan apparaît ici sans rien de plus à câbler, dès le
            prochain montage de cet écran. */}
        <div className="section-label">{t('goals_section')}</div>
        <div className="card card-animated" style={{ '--delay': '60ms' }}>
          <div className="set-field">
            <span className="set-field-label">Objectif</span>
            <span className="set-field-value">{user?.goal || '—'}</span>
          </div>
          <div className="set-field">
            <span className="set-field-label">{t('calories_day')}</span>
            <span className="set-field-value">{appData.calorieGoal} kcal</span>
          </div>
          <div className="set-field">
            <span className="set-field-label">{t('proteins')}</span>
            <span className="set-field-value">{appData.proteinGoal} g</span>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 10 }}>Modifiable depuis Bilan.</p>
        </div>

        <div className="section-label">{t('notifications_section')}</div>
        <div className="card card-animated" style={{ '--delay': '120ms' }}>
          {pushState !== 'unsupported' && (
            <div className="flex justify-between items-center" style={{ padding: '14px 0', borderBottom: pushState !== 'unsupported' ? `1px solid var(--set-field-border)` : 'none' }}>
              <div>
                <div className="text-sm text-secondary">Notifications push</div>
                {pushState === 'denied' && <div className="text-xs set-danger-text" style={{ color: 'var(--danger)', marginTop: 2 }}>Bloquées dans les réglages du navigateur</div>}
              </div>
              <Toggle on={pushState === 'subscribed'} onToggle={handleTogglePush} label="Notifications push" />
            </div>
          )}
          {/* Was rendering nothing at all here when unsupported — on iOS
              that's the DEFAULT case (Safari restricts the Push API to an
              installed home-screen app, always, in every regular tab), so
              this empty card was what most iPhone users actually saw.
              Reported directly: "ne propose rien... je dois avoir le
              choix". Explains why instead of leaving a silent void — with
              the actual fix (install to home screen) when that's the
              specific cause, a plain "not supported" otherwise. */}
          {pushState === 'unsupported' && (
            <div style={{ padding: '14px 0' }}>
              <div className="text-sm text-secondary">Notifications push</div>
              <div className="text-xs text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                {isIOSNotStandalone()
                  ? "Indisponibles depuis Safari sur iPhone — ajoute VOLTA à ton écran d'accueil (icône de partage → \"Sur l'écran d'accueil\") pour pouvoir les activer."
                  : "Non prises en charge par ce navigateur."}
              </div>
            </div>
          )}
          {/* The "hydratation"/"séance"/"récap hebdo" toggles that used to
              live here were pure local-state placeholders — no scheduling
              logic existed behind them, so toggling them did nothing at
              all. Removed rather than left to mislead a member into
              thinking they'd get reminders that were never sent. If/when a
              real scheduled-reminder system gets built, this is where the
              toggles would come back, wired to something real. */}
        </div>

        {/* Confidentialité — retrait du consentement au partage avec le
            coach (chantier juridique, JOURNAL.md 2026-08-17). Affichée
            uniquement si le membre a effectivement un coach : sans salle
            rattachée, il n'y a rien à partager et la section n'aurait aucun
            sens. Le toggle écrit `coach_data_consent`, que les policies RLS
            lisent — le retrait coupe réellement l'accès du coach, ce n'est
            pas un masquage d'affichage. */}
        {consentState?.hasCoach && (
          <>
            <div className="section-label">CONFIDENTIALITÉ</div>
            <div className="card card-animated" style={{ '--delay': '180ms' }}>
              <div className="privacy-row">
                <div className="privacy-row-text">
                  <div className="privacy-row-title">Partager mes données avec mon coach</div>
                  <div className="privacy-row-sub">
                    Nutrition, poids, activité, sommeil et entraînement. Le retrait
                    coupe immédiatement l'accès de ton coach à ces données ; elles
                    restent conservées et utilisables par toi.
                  </div>
                  {consentSaving && <div className="privacy-row-sub" style={{ marginTop: 6 }}>Enregistrement...</div>}
                  {consentError && <div className="privacy-row-sub set-danger-text" style={{ marginTop: 6, color: 'var(--danger)' }}>{consentError}</div>}
                </div>
                <Toggle
                  on={consentState.consent}
                  onToggle={toggleCoachConsent}
                  label="Partager mes données avec mon coach"
                />
              </div>
            </div>
          </>
        )}

        {/* Section "Apparence" (toggle Mode sombre/clair) retirée
            (2026-08-15, tâche 4 du rapport d'investigation JOURNAL.md) :
            le restyle "pastel chaud" est une palette fixe, sans variante
            sombre — le toggle n'avait plus rien à faire varier de façon
            cohérente sur les écrans déjà restylés (voir aussi le sujet 3
            du rapport : le thème "dark" n'a jamais été vraiment distinct
            du défaut depuis le pivot vers le corail). ThemeContext.jsx et
            la logique data-theme elle-même ne sont pas touchées — retiré
            uniquement le contrôle utilisateur, pas le mécanisme. */}

        <div className="section-label">{t('language_section')}</div>
        <div className="lang-selector card-animated" style={{ '--delay': '240ms' }}>
          {[
            { code: 'fr', label: 'Français', flag: '🇫🇷' },
            { code: 'en', label: 'English', flag: '🇬🇧' },
            { code: 'es', label: 'Español', flag: '🇪🇸' },
          ].map(l => (
            <button
              key={l.code}
              className={`lang-btn${lang === l.code ? ' active' : ''}`}
              onClick={() => setLanguage(l.code)}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        <div className="section-label">SANTÉ & CAPTEURS</div>
        <div className="card card-animated" style={{ '--delay': '300ms' }}>
          <div className="flex justify-between items-center" style={{ padding: '14px 0', cursor: 'pointer' }} {...activable(() => setShowHealthSync(true), { label: 'Synchroniser mes données' })}>
            <div>
              <p className="text-sm text-secondary">Synchroniser mes données</p>
              <p className="text-xs text-muted">Pas, sommeil · Intégration Apple Health sur app native</p>
            </div>
            <span className="set-arrow">→</span>
          </div>
        </div>

        {showHealthSync && (
          <>
            <div onClick={() => setShowHealthSync(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />
            <div style={{
              position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: '100%', maxWidth: 480, background: 'var(--surface-solid)',
              backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--glass-border)',
              padding: '24px 20px 48px', zIndex: 200,
            }}>
              <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />
              <h2 className="text-lg bold" style={{ marginBottom: 8 }}>Synchroniser mes données</h2>
              <p className="text-sm text-muted" style={{ marginBottom: 20 }}>Intégration Apple Health disponible sur l'app native iOS.</p>
              <div style={{ marginBottom: 16 }}>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>PAS AUJOURD'HUI</label>
                <input type="number" placeholder="8 000"
                  value={healthData.steps}
                  onChange={e => setHealthData(p => ({ ...p, steps: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>SOMMEIL CETTE NUIT</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="number" placeholder="7" value={healthData.sleep_hours}
                    onChange={e => setHealthData(p => ({ ...p, sleep_hours: e.target.value }))}
                    style={{ flex: 1 }} />
                  <span className="text-sm text-muted">h</span>
                  <input type="number" placeholder="30" value={healthData.sleep_minutes}
                    onChange={e => setHealthData(p => ({ ...p, sleep_minutes: e.target.value }))}
                    style={{ flex: 1 }} />
                  <span className="text-sm text-muted">min</span>
                </div>
              </div>
              <button className="btn-accent" onClick={handleHealthSync} style={{ marginBottom: 10 }}>SYNCHRONISER</button>
              <button className="btn-ghost" onClick={() => setShowHealthSync(false)}>Annuler</button>
            </div>
          </>
        )}

        {user?.isPlatformAdmin && (
          <>
            <div className="section-label">VOLTA</div>
            <button className="btn-ghost set-outline-btn" onClick={() => navigate('/admin')} style={{ marginBottom: 12 }}>
              Console admin — toutes les salles
            </button>
          </>
        )}

        <div className="section-label">{t('account_section')}</div>
        <button className="btn-ghost set-solid-btn" onClick={replayTour}>
          Revoir le didacticiel
        </button>
        {/* logout() était appelé sans await — navigate('/') partait avant que
            supabase.auth.signOut() (et donc AuthContext.user) n'ait fini de
            se vider. Se déconnecter puis cliquer vite sur "Accès coach"
            (Landing.jsx → /login) retombait sur la garde de route de
            App.jsx avec un `user` encore membre, qui redirige direct vers
            /dashboard — l'app semblait "reconnecter" tout seule. Signalé
            directement par Arnaud (2026-08-11). */}
        <button className="set-logout-btn" onClick={async () => { await logout(); navigate('/') }}>
          {t('logout')}
        </button>
        <DeleteAccountButton />
      </div>

    </div>
  )
}
