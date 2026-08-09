import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { save } from '../utils/storage'
import { BOUNDS, clamp } from '../utils/validation'
import { dailyRemainingCalories } from '../utils/metabolism'
import { fetchStreak } from '../utils/streak'
import '../styles/dashboard.css'

const QUOTES = [
  'Reste constant.',
  "Pas d'excuses.",
  'Un jour à la fois.',
  "L'effort paie.",
  'Continue.',
]

function RotatingQuote() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % QUOTES.length)
        setVisible(true)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: '12px 0', borderBottom: '0.5px solid rgba(255,255,255,0.25)', marginBottom: 16 }}>
      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 1.5,
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease',
      }}>
        "{QUOTES[index]}"
      </p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { appData, updateData } = useApp()
  const { t } = useLanguage()
  const [editingCard, setEditingCard] = useState(null)
  const [inputVal, setInputVal] = useState('')
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchStreak(user.id).then(n => { if (!cancelled) setStreak(n) })
    return () => { cancelled = true }
  }, [user?.id])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting_morning') : hour < 18 ? t('greeting_afternoon') : t('greeting_evening')

  // Direction corail (2026-08-06): colored emoji badges instead of
  // monochrome line icons — a warm/playful palette reads better with real
  // color per card than a single neutral icon color did, per direct
  // feedback ("tu peux remmetre les emoji ça marche avec ce style").
  const CARDS = [
    { key: 'steps', label: 'PAS', icon: '👟', tint: '#FDEAD8', value: appData.steps, unit: 'pas', target: 10000 },
    { key: 'kmRun', label: 'COURSE', icon: '🏃', tint: '#E3F0FF', value: appData.kmRun, unit: 'km', target: null },
    { key: 'water', label: 'EAU', icon: '💧', tint: '#E6F6EE', value: appData.water, unit: 'ml', target: 2500 },
    { key: 'sleep', label: 'SOMMEIL', icon: '😴', tint: '#F1EAFB', value: appData.sleep?.hours || 0, unit: 'h', target: 8 },
  ]

  const handleSave = () => {
    const raw = parseFloat(inputVal)
    if (isNaN(raw) || raw < 0) { setEditingCard(null); return }
    if (editingCard === 'steps') { const num = clamp(raw, BOUNDS.steps); updateData('steps', num); save('steps', num) }
    if (editingCard === 'kmRun') { const num = clamp(raw, BOUNDS.kmRun); updateData('kmRun', num); save('kmRun', num) }
    if (editingCard === 'water') { const num = clamp(raw, BOUNDS.water); updateData('water', num); save('water', num) }
    if (editingCard === 'sleep') {
      const num = clamp(raw, BOUNDS.sleepHours)
      const s = { hours: Math.floor(num), minutes: 0, quality: num >= 7 ? 'GOOD' : num >= 5 ? 'FAIR' : 'POOR' }
      updateData('sleep', s); save('sleep', s)
    }
    navigator.vibrate && navigator.vibrate(8)
    setEditingCard(null)
    setInputVal('')
  }

  // Same fix as Nutrition.jsx's hero card: folds in today's logged
  // steps/course instead of a flat calorieGoal - calories, so activity
  // actually shows up in what's left to eat (see utils/metabolism.js).
  const { remaining: calsRemaining, activityBurn } = dailyRemainingCalories({
    calorieGoal: appData.calorieGoal || 2400,
    calories: appData.calories,
    steps: appData.steps,
    kmRun: appData.kmRun,
    weightKg: appData.weightKg,
  })

  return (
    <div className="app-wrapper">
      {/* Direction corail (2026-08-06) — the ring accent from the Behance
          reference, echoed by the AI nav sphere's own gradient (nav.css)
          so the two read as one signature instead of two unrelated
          decorations. Purely decorative: aria-hidden, sits behind content
          (z-index handled by #root > * already putting real content above
          it), clipped by #root's overflow-x so it never causes horizontal
          scroll. */}
      <div className="dashboard-ring" aria-hidden="true" />
      <div className="screen dashboard-screen">
        {/* Header */}
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingBottom: 28 }}>
          <div>
            {/* --text-primary/secondary are DARK by default now (correct
                for the common case: text inside a white card/sheet) — this
                header sits directly on the coral bg, so it needs to force
                light color explicitly rather than rely on those tokens. */}
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginBottom: 7 }}>VOLTA</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, color: '#FFFFFF' }}>{greeting}, {user?.name}.</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {/* Solid --accent → gold gradient, matching the mockup's avatar
              badge exactly. */}
          <button
            onClick={() => navigate('/settings')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #FBE08A)', color: 'var(--accent-ink)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 54, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </button>
        </div>

        {/* Rotating quote */}
        <RotatingQuote />

        {/* Streak — always present now (direct request: "je veux qu'elle
            soit toujours présente"). At 0, neutral/muted treatment (dimmed
            flame, no glow) rather than hidden — reads as an invitation, not
            a failure. From 3 days on (first visual palier, not 30), the
            card gets the --accent glow treatment to read as an actual
            badge instead of just a number. */}
        <div
          className="card card-animated"
          style={{
            marginBottom: 16,
            '--delay': '0ms',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            ...(streak >= 3
              ? { border: '1px solid var(--accent)', boxShadow: '0 0 0 1px var(--accent) inset, 0 4px 20px rgba(240,193,75,0.25)' }
              : {}),
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1, opacity: streak > 0 ? 1 : 0.35 }}>🔥</span>
          <div>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{streak} jour{streak > 1 ? 's' : ''}</span>
            <span className="text-sm text-muted" style={{ marginLeft: 6 }}>{streak > 0 ? 'de suite' : "— à toi de commencer aujourd'hui"}</span>
          </div>
        </div>

        {/* Calorie card — was a ring (CalorieRing.jsx) on a plain dark
            surface; converted to the same flat gold-gradient "hero" card
            Nutrition.jsx already uses, matching the mockup's "Calories du
            jour" card and keeping the two calorie displays in the app
            visually consistent with each other. CalorieRing.jsx itself is
            untouched/still available, just not used here anymore. */}
        <div className="card card-hero card-animated" style={{ marginBottom: 16, '--delay': '0ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
            <div>
              <span className="hero-number" style={{ fontSize: 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-1.5px' }}>{appData.calories}</span>
              <span className="text-sm text-muted" style={{ marginLeft: 6 }}>kcal</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-xs text-muted">Restant</div>
              <div className="text-base bold">{calsRemaining} kcal</div>
              {activityBurn > 0 && (
                <div className="text-xs" style={{ opacity: 0.65 }}>dont +{activityBurn} activité</div>
              )}
            </div>
          </div>
          <div style={{ position: 'relative', height: 8, background: 'rgba(26,22,8,0.15)', borderRadius: 4, marginBottom: 16, marginTop: 12, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(appData.calories / (appData.calorieGoal + activityBurn) * 100, 100)}%`, background: '#1A1608', borderRadius: 4, transition: 'width 500ms ease-out' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal, unit: 'g', color: '#0B5AA8' },
              { label: 'Glucides', val: appData.carbs, goal: appData.carbsGoal, unit: 'g', color: '#8A4600' },
              { label: 'Lipides', val: appData.fat, goal: appData.fatGoal, unit: 'g', color: '#5B3FA8' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <span className="text-xs text-muted">{m.label}</span>
                  <span className="text-xs bold">{m.val}{m.unit} <span className="text-muted">/ {m.goal}{m.unit}</span></span>
                </div>
                <div style={{ height: 4, background: 'rgba(26,22,8,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min((m.val / m.goal) * 100, 100)}%`, height: '100%', background: m.color, borderRadius: 2, transition: 'width 600ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity cards — kept the existing data-rich cards (live numbers
            + progress bar, tap to edit) rather than switching to the
            mockup's icon-only circles: those show no data at all, which
            would be a real functional step back for a tracking app. Took
            the part of the mockup that *is* a straightforward improvement
            instead — the icon now sits in an actual circular badge
            (.activity-card-icon-badge) instead of floating loose, matching
            the mockup's icon-circle language without losing the numbers. */}
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>{t('activity')}</p>
        <div className="activity-grid">
          {CARDS.map((card, i) => (
            <div
              key={card.key}
              className={`activity-card-compact card-animated${card.key === 'water' ? ' activity-card-accent' : ''}`}
              style={{ '--delay': `${80 + i * 40}ms` }}
              onClick={() => { setEditingCard(card.key); setInputVal('') }}
            >
              <span className="activity-card-icon-badge" style={{ background: card.tint }}>{card.icon}</span>
              <p className="activity-card-label">{card.label}</p>
              <p className="activity-card-value">
                {card.key === 'steps' ? appData.steps.toLocaleString('fr-FR') : card.value}
                <span className="activity-card-unit"> {card.unit}</span>
              </p>
              {card.target && (
                <div className="activity-card-bar-wrap">
                  <div
                    className="activity-card-bar-fill"
                    style={{ width: `${Math.min((card.value / card.target) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA to today's workout */}
        <button onClick={() => navigate('/workout')} className="dashboard-cta-btn card-animated" style={{ '--delay': '260ms' }}>
          <span>Voir mon entraînement du jour</span>
          <span className="dashboard-cta-icon">🔥</span>
        </button>

        {/* Weekly sessions card */}
        <div className="card-animated" style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 16, padding: 20, marginTop: 16, marginBottom: 40, '--delay': '320ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Séances cette semaine</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
              {appData.weeklyWorkouts}<span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 400 }}>/{appData.weeklyGoal}</span>
            </span>
          </div>
          <div style={{ height: 2, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((appData.weeklyWorkouts / appData.weeklyGoal) * 100, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 600ms ease' }} />
          </div>
        </div>
      </div>

      {/* Bottom sheet for editing */}
      {editingCard && (
        <>
          <div className="sheet-overlay" onClick={() => setEditingCard(null)} />
          <div className="activity-edit-sheet">
            <div className="modal-handle" />
            <p className="sheet-title">{CARDS.find(c => c.key === editingCard)?.label}</p>
            <p className="sheet-subtitle">
              {editingCard === 'steps' && "Nombre de pas aujourd'hui"}
              {editingCard === 'kmRun' && "Km courus aujourd'hui"}
              {editingCard === 'water' && "Eau bue aujourd'hui (ml)"}
              {editingCard === 'sleep' && "Heures de sommeil cette nuit"}
            </p>
            <input
              className="sheet-input"
              type="text"
              inputMode="decimal"
              placeholder={String(CARDS.find(c => c.key === editingCard)?.value || '0')}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button className="sheet-save-btn" onClick={handleSave}>ENREGISTRER</button>
            <button className="sheet-cancel-btn" onClick={() => setEditingCard(null)}>Annuler</button>
          </div>
        </>
      )}
    </div>
  )
}
