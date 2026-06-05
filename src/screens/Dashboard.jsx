import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { save } from '../utils/storage'
import CalorieRing from '../components/CalorieRing'
import '../styles/dashboard.css'

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { appData, updateData } = useApp()
  const { t } = useLanguage()
  const [quote, setQuote] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [inputVal, setInputVal] = useState('')

  const goalCategory = {
    'Perte de poids': 'health',
    'Prise de masse': 'fitness',
    'Performance': 'success',
    'Nutrition': 'health',
  }[user?.goal] || 'fitness'

  useEffect(() => {
    const today = new Date().toDateString()
    const cached = localStorage.getItem('onair_quote')
    const cachedDate = localStorage.getItem('onair_quote_date')
    if (cached && cachedDate === today) {
      try { setQuote(JSON.parse(cached)) } catch {}
      return
    }
    fetch(`/api/quote?category=${goalCategory}`)
      .then(r => r.json())
      .then(data => {
        if (data.quote) {
          localStorage.setItem('onair_quote', JSON.stringify(data))
          localStorage.setItem('onair_quote_date', today)
          setQuote(data)
        }
      })
      .catch(() => setQuote({ quote: 'Chaque séance compte.', author: 'ON AIR' }))
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting_morning') : hour < 18 ? t('greeting_afternoon') : t('greeting_evening')

  const CARDS = [
    { key: 'steps', label: 'PAS', value: appData.steps, unit: 'pas', target: 10000 },
    { key: 'kmRun', label: 'COURSE', value: appData.kmRun, unit: 'km', target: null },
    { key: 'water', label: 'EAU', value: appData.water, unit: 'ml', target: 2500 },
    { key: 'sleep', label: 'SOMMEIL', value: appData.sleep?.hours || 0, unit: 'h', target: 8 },
  ]

  const handleSave = () => {
    const num = parseFloat(inputVal)
    if (isNaN(num) || num < 0) { setEditingCard(null); return }
    if (editingCard === 'steps') { updateData('steps', num); save('steps', num) }
    if (editingCard === 'kmRun') { updateData('kmRun', num); save('kmRun', num) }
    if (editingCard === 'water') { updateData('water', num); save('water', num) }
    if (editingCard === 'sleep') {
      const s = { hours: Math.floor(num), minutes: 0, quality: num >= 7 ? 'GOOD' : num >= 5 ? 'FAIR' : 'POOR' }
      updateData('sleep', s); save('sleep', s)
    }
    navigator.vibrate && navigator.vibrate(8)
    setEditingCard(null)
    setInputVal('')
  }

  const miniRings = [
    { label: 'Séances', current: appData.weeklyWorkouts, target: 6, color: '#E8726A' },
    { label: 'Eau', current: appData.water, target: 2500, color: '#2EA8FF' },
    { label: 'Course', current: appData.kmRun, target: 40, color: '#C4956A' },
  ]

  return (
    <div className="app-wrapper">
      <div className="screen dashboard-screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header dash-header">
          <span className="text-xs text-accent bold">ON AIR</span>
          <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }} onClick={handleLogout}>
            <LogoutIcon />
          </button>
        </div>

        {/* Greeting */}
        <div style={{ marginBottom: 12 }}>
          <h1 className="text-xl bold">{greeting}, {user?.name}.</h1>
          <p className="text-sm text-secondary">{t('see_progress')}</p>
        </div>

        {/* Daily quote */}
        {quote && (
          <div style={{ padding: '12px 0', borderBottom: '0.5px solid var(--border)', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>"{quote.quote}"</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right', letterSpacing: '1px' }}>— {quote.author}</p>
          </div>
        )}

        {/* Calorie ring + macros */}
        <div className="dash-ring-row card-animated" style={{ '--delay': '50ms' }}>
          <CalorieRing current={appData.calories} goal={appData.calorieGoal} />
          <div className="dash-macros">
            {[
              { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal, unit: 'g' },
              { label: 'Glucides', val: appData.carbs, goal: appData.carbsGoal, unit: 'g' },
              { label: 'Lipides', val: appData.fat, goal: appData.fatGoal, unit: 'g' },
            ].map((m, idx) => (
              <div key={m.label} className="macro-item">
                <span className="text-xs text-muted">{m.label}</span>
                <span className="text-sm bold">{m.val}<span className="text-muted">/{m.goal}{m.unit}</span></span>
                <div className="progress-bar">
                  <div className="progress-fill macro-fill" style={{ '--w': `${Math.min(m.val/m.goal*100,100)}%`, '--delay': `${idx * 100}ms` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini rings — 3 rings: Séances / Eau / Course */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {miniRings.map(ring => {
            const pct = Math.min(ring.current / ring.target, 1)
            const r = 22, stroke = 4
            const circ = 2 * Math.PI * r
            return (
              <div key={ring.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 4px', background: 'var(--surface)', borderRadius: 12 }}>
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
                  <circle cx="26" cy="26" r={r} fill="none" stroke={ring.color} strokeWidth={stroke}
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                    strokeLinecap="round" transform="rotate(-90 26 26)"
                    style={{ transition: 'stroke-dashoffset 800ms ease' }} />
                </svg>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{ring.label}</span>
              </div>
            )
          })}
        </div>

        {/* Activity cards */}
        <div className="section-label">{t('activity')}</div>
        <div className="activity-grid">
          {CARDS.map(card => (
            <div
              key={card.key}
              className="activity-card-compact"
              onClick={() => { setEditingCard(card.key); setInputVal('') }}
            >
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

          {/* Calories — read-only, full width */}
          <div className="activity-card-compact calories-readonly">
            <p className="activity-card-label">CALORIES</p>
            <p className="activity-card-value">
              {appData.calories}<span className="activity-card-unit"> kcal</span>
            </p>
            <div className="activity-card-bar-wrap">
              <div
                className="activity-card-bar-fill"
                style={{
                  width: `${Math.min((appData.calories / appData.calorieGoal) * 100, 100)}%`,
                  background: appData.calories >= appData.calorieGoal ? 'var(--success)' : 'var(--accent)',
                }}
              />
            </div>
            <p className="calories-goal-label">/ {appData.calorieGoal} kcal objectif</p>
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
