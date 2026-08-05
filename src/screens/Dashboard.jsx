import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { save } from '../utils/storage'
import { BOUNDS, clamp } from '../utils/validation'
import CalorieRing from '../components/CalorieRing'
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
    <div style={{ padding: '12px 0', borderBottom: '0.5px solid var(--border)', marginBottom: 16 }}>
      <p style={{
        fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5,
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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting_morning') : hour < 18 ? t('greeting_afternoon') : t('greeting_evening')

  const CARDS = [
    { key: 'steps', label: 'PAS', icon: '👟', value: appData.steps, unit: 'pas', target: 10000 },
    { key: 'kmRun', label: 'COURSE', icon: '🏃', value: appData.kmRun, unit: 'km', target: null },
    { key: 'water', label: 'EAU', icon: '💧', value: appData.water, unit: 'ml', target: 2500 },
    { key: 'sleep', label: 'SOMMEIL', icon: '😴', value: appData.sleep?.hours || 0, unit: 'h', target: 8 },
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

  const calsRemaining = Math.max(0, (appData.calorieGoal || 2400) - appData.calories)

  return (
    <div className="app-wrapper">
      <div className="screen dashboard-screen" style={{ paddingBottom: 110, padding: '0 24px 110px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingBottom: 28 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-secondary)', marginBottom: 7 }}>ON AIR</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, color: 'var(--text-primary)' }}>{greeting}, {user?.name}.</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 54, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </button>
        </div>

        {/* Rotating quote */}
        <RotatingQuote />

        {/* Calorie ring + macros card */}
        <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 24, padding: 22, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CalorieRing current={appData.calories} goal={appData.calorieGoal} size={150} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12, marginBottom: 20 }}>
            Restant · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{calsRemaining} kcal</span>
          </p>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal, unit: 'g' },
              { label: 'Glucides', val: appData.carbs, goal: appData.carbsGoal, unit: 'g' },
              { label: 'Lipides', val: appData.fat, goal: appData.fatGoal, unit: 'g' },
            ].map(m => (
              <div key={m.label}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 3px' }}>
                  {m.label} {m.val}/{m.goal}{m.unit}
                </p>
                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min((m.val / m.goal) * 100, 100)}%`, height: '100%', background: 'var(--accent-secondary)', borderRadius: 2, transition: 'width 600ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity cards */}
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>{t('activity')}</p>
        <div className="activity-grid">
          {CARDS.map(card => (
            <div
              key={card.key}
              className={`activity-card-compact${card.key === 'water' ? ' activity-card-accent' : ''}`}
              onClick={() => { setEditingCard(card.key); setInputVal('') }}
            >
              <span className="activity-card-icon">{card.icon}</span>
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
        <button onClick={() => navigate('/workout')} className="dashboard-cta-btn">
          <span>Voir mon entraînement du jour</span>
          <span className="dashboard-cta-icon">🔥</span>
        </button>

        {/* Weekly sessions card */}
        <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 16, padding: 20, marginTop: 16, marginBottom: 40 }}>
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
