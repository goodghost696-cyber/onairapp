import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { BOUNDS, clamp } from '../utils/validation'
import { calculateCalorieGoal } from '../utils/metabolism'
import { isPushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from '../utils/push'
import DeleteAccountButton from '../components/DeleteAccountButton'
import { storageKey } from '../components/OnboardingTour'

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, background: on ? 'var(--accent)' : 'var(--border)', borderRadius: 13, position: 'relative', cursor: 'pointer', transition: 'background 200ms ease', flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: 20, height: 20, background: 'white', borderRadius: '50%', top: 3, left: 3, transform: on ? 'translateX(18px)' : 'none', transition: 'transform 200ms ease' }} />
    </div>
  )
}

// Same 4 options/values as Onboarding.jsx's "goal" step — the values are
// the actual keys GOAL_MULTIPLIERS (utils/metabolism.js) matches against,
// so this list has to stay in sync with that one, not just look similar.
const GOAL_OPTIONS = [
  { label: 'Perdre du poids',   value: 'Perte de poids' },
  { label: 'Prendre du muscle', value: 'Prise de masse' },
  { label: 'Mieux manger',      value: 'Nutrition' },
  { label: 'Performance',       value: 'Performance' },
]

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
      <span className="text-sm text-secondary">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 15, textAlign: 'right', width: 140, outline: 'none', fontFamily: 'inherit' }} />
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout, updateUserProfile } = useAuth()
  const { appData, updateData } = useApp()
  const { lang, setLanguage, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [showHealthSync, setShowHealthSync] = useState(false)
  const [healthData, setHealthData] = useState({ steps: '', sleep_hours: '', sleep_minutes: '' })
  const [syncToast, setSyncToast] = useState(false)
  // Real (not simulated) — the three toggles above are still local-state
  // placeholders (no scheduling logic built yet). This one actually
  // subscribes the browser to Web Push and persists it in push_subscriptions.
  const [pushState, setPushState] = useState('loading')

  useEffect(() => {
    if (!isPushSupported()) { setPushState('unsupported'); return }
    getPushSubscriptionState().then(setPushState)
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
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', weight: '', height: '', age: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [goals, setGoals] = useState({ calories: String(appData.calorieGoal), protein: String(appData.proteinGoal), water: String(appData.waterGoal), steps: String(appData.stepsGoal) })
  const [goalsSaving, setGoalsSaving] = useState(false)
  const [goalsSaved, setGoalsSaved] = useState(false)
  // "il faut remettre l'objectif et toujours laisser le choix à
  // l'utilisateur de redéfinir son objectif" — the goal(s) picked at
  // onboarding (Perte de poids / Prise de masse / Nutrition / Performance,
  // multi-select) drove the calorie target but had nowhere to be reviewed
  // or changed again afterwards. user.goal is the comma-joined string
  // Onboarding wrote (see its handleComplete) — sessionToUser maps it
  // reliably from auth metadata even after a fresh reload.
  const [selectedGoals, setSelectedGoals] = useState(() => user?.goal ? user.goal.split(', ').filter(Boolean) : [])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase.from('profiles').select('prenom, email, poids, taille, age').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('[Settings] profile fetch failed', error); return }
        if (data) {
          setProfile(p => ({
            name: data.prenom || p.name,
            email: data.email || p.email,
            weight: data.poids != null ? String(data.poids) : p.weight,
            height: data.taille != null ? String(data.taille) : p.height,
            age: data.age != null ? String(data.age) : p.age,
          }))
        }
      })
    return () => { cancelled = true }
  }, [user?.id])

  // Recalculates calorie/protein targets from the same formula Onboarding
  // used (utils/metabolism.js), using whatever weight/height/age/frequency
  // is on file — called right when a goal chip is toggled so the member
  // sees the new numbers land in the fields below immediately, still free
  // to hand-edit them before hitting "ENREGISTRER LES OBJECTIFS" same as
  // any other goal here.
  function recalcCalorieGoals(goalsList) {
    const weightKg = parseFloat(profile.weight) || 75
    const { calorieGoal } = calculateCalorieGoal({
      weightKg,
      heightCm: parseFloat(profile.height) || 175,
      age: parseFloat(profile.age) || 25,
      goals: goalsList,
      frequency: user?.frequency,
    })
    setGoals(g => ({ ...g, calories: String(calorieGoal), protein: String(Math.round(weightKg * 2)) }))
  }

  function toggleGoal(value) {
    setSelectedGoals(prev => {
      const next = prev.includes(value) ? prev.filter(g => g !== value) : [...prev, value]
      recalcCalorieGoals(next)
      return next
    })
  }

  // "Profil" card had inputs but no save button at all — editing name/
  // weight/height did nothing beyond local component state, same class of
  // bug as the goals-that-never-persisted issue this app has already been
  // through once. updateUserProfile already existed (used by Onboarding)
  // and upserts both auth user_metadata and profiles.poids/taille — just
  // never wired up here.
  async function saveProfile() {
    setProfileSaving(true)
    await updateUserProfile({
      name: profile.name,
      email: profile.email,
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

  async function saveGoals() {
    const calorieGoal = clamp(parseInt(goals.calories), BOUNDS.calorieGoal, appData.calorieGoal)
    const proteinGoal = clamp(parseInt(goals.protein), BOUNDS.proteinGoal, appData.proteinGoal)
    const waterGoal = clamp(parseInt(goals.water), BOUNDS.waterGoal, appData.waterGoal)
    const stepsGoal = clamp(parseInt(goals.steps), BOUNDS.stepsGoal, appData.stepsGoal)
    // Immediate local reflection (Dashboard's ring, Nutrition's bars, etc.
    // all read appData.*Goal directly).
    updateData('calorieGoal', calorieGoal)
    updateData('proteinGoal', proteinGoal)
    updateData('waterGoal', waterGoal)
    updateData('stepsGoal', stepsGoal)
    setGoalsSaving(true)
    // Was: this whole function only ever called updateData above, which is
    // in-memory + localStorage only (utils/storage.js) — nothing here ever
    // reached Supabase's `objectifs` table, so a redefined goal silently
    // reverted to whatever was last saved server-side on the next login /
    // different device. Also the only place `objectif` (the goal TYPE, not
    // the numeric targets) gets persisted, now that it's editable here.
    await updateUserProfile({
      goal: selectedGoals.join(', '),
      calorieGoal, proteinGoal,
      carbGoal: appData.carbsGoal, fatGoal: appData.fatGoal,
      waterGoal, stepsGoal,
    })
    setGoalsSaving(false)
    setGoalsSaved(true)
    setTimeout(() => setGoalsSaved(false), 2000)
  }

  return (
    <div className="app-wrapper">
      {/* Sync Toast */}
      <div style={{
        position: 'fixed', top: syncToast ? 16 : -60, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--success)', color: '#000', padding: '10px 20px', borderRadius: 50,
        fontSize: 12, fontWeight: 700, letterSpacing: 1, zIndex: 300, whiteSpace: 'nowrap',
        transition: 'top 300ms cubic-bezier(0.34,1.56,0.64,1)',
      }}>Données synchronisées ✓</div>

      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ paddingTop: 56, paddingBottom: 20 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 16 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginBottom: 7 }}>⚙️ SETTINGS</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, color: 'var(--text-primary)' }}>{t('settings_title')}</h1>
        </div>

        <div className="section-label">{t('profile_section')}</div>
        <div className="card card-animated" style={{ '--delay': '0ms' }}>
          <Field label={t('first_name')} value={profile.name} onChange={v => setProfile(p => ({...p, name: v}))} />
          <Field label={t('email')} value={profile.email} onChange={v => setProfile(p => ({...p, email: v}))} type="email" />
          <Field label={t('weight')} value={profile.weight} onChange={v => setProfile(p => ({...p, weight: v}))} type="number" />
          <Field label={t('height')} value={profile.height} onChange={v => setProfile(p => ({...p, height: v}))} type="number" />
        </div>
        <button className="btn-ghost" onClick={saveProfile} disabled={profileSaving} style={{ marginBottom: 8, opacity: profileSaving ? 0.6 : 1 }}>
          {profileSaving ? '...' : profileSaved ? '✓ ENREGISTRÉ' : 'ENREGISTRER LE PROFIL'}
        </button>

        <div className="section-label">{t('goals_section')}</div>
        <div className="card card-animated" style={{ '--delay': '60ms' }}>
          <p className="text-xs text-muted" style={{ marginBottom: 10 }}>Ton ou tes objectifs — choisir en modifie automatiquement les calories/protéines ci-dessous.</p>
          <div className="goal-selector">
            {GOAL_OPTIONS.map(o => (
              <button
                key={o.value}
                type="button"
                className={`goal-chip${selectedGoals.includes(o.value) ? ' active' : ''}`}
                onClick={() => toggleGoal(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <Field label={t('calories_day')} value={goals.calories} onChange={v => setGoals(g => ({...g, calories: v}))} type="number" />
          <Field label={t('proteins')} value={goals.protein} onChange={v => setGoals(g => ({...g, protein: v}))} type="number" />
          <Field label={t('water_goal')} value={goals.water} onChange={v => setGoals(g => ({...g, water: v}))} type="number" />
          <Field label={t('steps_goal')} value={goals.steps} onChange={v => setGoals(g => ({...g, steps: v}))} type="number" />
        </div>
        <button className="btn-ghost" onClick={saveGoals} disabled={goalsSaving} style={{ marginBottom: 8, opacity: goalsSaving ? 0.6 : 1 }}>
          {goalsSaving ? '...' : goalsSaved ? '✓ ENREGISTRÉ' : t('save_goals')}
        </button>

        <div className="section-label">{t('notifications_section')}</div>
        <div className="card card-animated" style={{ '--delay': '120ms' }}>
          {pushState !== 'unsupported' && (
            <div className="flex justify-between items-center" style={{ padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div>
                <div className="text-sm text-secondary">Notifications push</div>
                {pushState === 'denied' && <div className="text-xs" style={{ color: 'var(--danger)', marginTop: 2 }}>Bloquées dans les réglages du navigateur</div>}
              </div>
              <Toggle on={pushState === 'subscribed'} onToggle={handleTogglePush} />
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

        <div className="section-label">Apparence</div>
        <div className="card card-animated" style={{ '--delay': '180ms' }}>
          <div className="flex justify-between items-center" style={{ padding: '14px 0' }}>
            <div>
              <p className="text-sm text-secondary">Thème</p>
              <p className="text-xs text-muted">{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</p>
            </div>
            <Toggle on={theme === 'light'} onToggle={toggleTheme} />
          </div>
        </div>

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
          <div className="flex justify-between items-center" style={{ padding: '14px 0', cursor: 'pointer' }} onClick={() => setShowHealthSync(true)}>
            <div>
              <p className="text-sm text-secondary">Synchroniser mes données</p>
              <p className="text-xs text-muted">Pas, sommeil · Intégration Apple Health sur app native</p>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>→</span>
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

        <div className="section-label">{t('account_section')}</div>
        <button className="btn-ghost" onClick={replayTour} style={{ marginBottom: 8 }}>
          Revoir le didacticiel
        </button>
        <button onClick={() => { logout(); navigate('/') }} style={{ width: '100%', padding: 16, background: 'transparent', border: '2px solid var(--danger)', color: 'var(--danger)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 12, cursor: 'pointer', marginBottom: 12 }}>
          {t('logout')}
        </button>
        <DeleteAccountButton />
      </div>

    </div>
  )
}
