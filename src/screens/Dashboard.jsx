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

function ActivityCard({ label, value, unit, target, onSave }) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const handleSave = () => {
    const num = parseFloat(inputVal)
    if (!isNaN(num) && num >= 0) onSave(num)
    setEditing(false)
    setInputVal('')
    navigator.vibrate && navigator.vibrate(8)
  }

  return (
    <div className="activity-card" onClick={() => !editing && setEditing(true)}>
      <p className="activity-card-label">{label}</p>
      {editing ? (
        <div className="activity-card-input-wrap" onClick={e => e.stopPropagation()}>
          <input
            className="activity-card-input"
            type="number"
            placeholder={String(value)}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button className="activity-card-save" onClick={handleSave}>✓</button>
        </div>
      ) : (
        <>
          <p className="activity-card-value">
            {value}<span className="activity-card-unit"> {unit}</span>
          </p>
          {target && (
            <p className="activity-card-target">/ {target} {unit}</p>
          )}
        </>
      )}
      {!editing && <p className="activity-card-tap">Tap pour modifier</p>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { appData, updateData } = useApp()
  const { t } = useLanguage()
  const [quote, setQuote] = useState(null)

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

        {/* Mini rings row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Calories', current: appData.calories, target: appData.calorieGoal, color: 'var(--accent)' },
            { label: 'Séances', current: appData.weeklyWorkouts, target: appData.weeklyGoal, color: '#A78BFA' },
            { label: 'Eau', current: appData.water, target: appData.waterGoal, color: '#4FC3F7' },
            { label: 'Course', current: appData.kmRun * 10, target: 40 * 10, color: 'var(--success)' },
          ].map(ring => {
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

        {/* Tappable activity cards */}
        <div className="section-label">{t('activity')}</div>
        <div className="activity-grid">
          <ActivityCard
            label="PAS"
            value={appData.steps.toLocaleString()}
            unit="pas"
            target="10 000"
            onSave={val => { updateData('steps', val); save('steps', val) }}
          />
          <ActivityCard
            label="COURSE"
            value={appData.kmRun}
            unit="km"
            target={null}
            onSave={val => { updateData('kmRun', val); save('kmRun', val) }}
          />
          <ActivityCard
            label="EAU"
            value={appData.water}
            unit="ml"
            target={appData.waterGoal}
            onSave={val => { updateData('water', val); save('water', val) }}
          />
          <ActivityCard
            label="SOMMEIL"
            value={appData.sleep?.hours || 0}
            unit="h"
            target={8}
            onSave={val => {
              const h = Math.floor(val)
              const quality = val >= 7 ? 'GOOD' : val >= 5 ? 'FAIR' : 'POOR'
              const s = { hours: h, minutes: 0, quality }
              updateData('sleep', s)
              save('sleep', s)
            }}
          />
        </div>

        {/* Weekly sessions */}
        <div className="section-label">{t('weekly_sessions')}</div>
        <div className="card card-animated" style={{ '--delay': '380ms' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
            <span className="text-lg bold">{appData.weeklyWorkouts}/{appData.weeklyGoal}</span>
            <span className="text-xs text-muted">{t('workouts_done')}</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill macro-fill" style={{ '--w': `${appData.weeklyWorkouts/appData.weeklyGoal*100}%`, '--delay': '450ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
