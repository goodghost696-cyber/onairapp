import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

function RingProgress({ current, target, color, size = 80 }) {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(current / target, 1)
  const offset = circumference - pct * circumference

  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border)" strokeWidth={5}
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${size/2}px ${size/2}px` }} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: `${size/2}px ${size/2}px`,
          transition: 'stroke-dashoffset 1000ms cubic-bezier(0.25,0.46,0.45,0.94)',
          filter: `drop-shadow(0 0 8px ${color}60)`,
        }}
      />
    </svg>
  )
}

const RING_ICONS = {
  calories: (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 2c0 3-3 4-3 7a3 3 0 006 0c0-3-3-4-3-7z"/>
    </svg>
  ),
  sessions: (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="6" y1="9" x2="12" y2="9"/>
      <rect x="1" y="7" width="3" height="4" rx="1"/>
      <rect x="14" y="7" width="3" height="4" rx="1"/>
      <rect x="4" y="6" width="2" height="6" rx="1"/>
      <rect x="12" y="6" width="2" height="6" rx="1"/>
    </svg>
  ),
  hydration: (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 2L4 10a5 5 0 0010 0L9 2z"/>
    </svg>
  ),
  run: (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="3" r="1.5"/>
      <path d="M8 16l2-5 3 3"/>
      <path d="M6 10l2-3 4 1 2-3"/>
    </svg>
  ),
}

export default function Rings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { appData } = useApp()
  const [celebration, setCelebration] = useState(null)
  const [dismissed, setDismissed] = useState({})

  const rings = [
    { id: 'calories', label: 'Calories', current: appData.calories, target: appData.calorieGoal, unit: 'kcal', color: '#E00000' },
    { id: 'sessions', label: 'Séances', current: appData.weeklyWorkouts, target: appData.weeklyGoal, unit: '/sem', color: '#1FD66B' },
    { id: 'hydration', label: 'Hydratation', current: appData.water, target: appData.waterGoal, unit: 'ml', color: '#2EA8FF' },
    { id: 'run', label: 'Course', current: appData.kmRun, target: 40, unit: 'km', color: '#F5A623' },
  ]

  useEffect(() => {
    const completed = rings.find(r => r.current >= r.target && !dismissed[r.id])
    if (completed && !celebration) {
      setCelebration(completed)
    }
  }, [appData])

  function dismissCelebration() {
    if (celebration) {
      setDismissed(prev => ({ ...prev, [celebration.id]: true }))
      setCelebration(null)
    }
  }

  useEffect(() => {
    if (celebration) {
      const t = setTimeout(dismissCelebration, 4000)
      return () => clearTimeout(t)
    }
  }, [celebration])

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => navigate('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-primary)">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h1 className="text-xl bold">Mes Objectifs</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {rings.map((ring, i) => {
            const pct = Math.min(Math.round(ring.current / ring.target * 100), 100)
            const complete = ring.current >= ring.target
            return (
              <div key={ring.id} className="card card-animated" style={{ '--delay': `${i * 80}ms`, padding: 20, textAlign: 'center', position: 'relative' }}>
                {complete && (
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 12 }}>
                  <RingProgress current={ring.current} target={ring.target} color={ring.color} />
                  <div style={{ position: 'absolute', textAlign: 'center', color: ring.color }}>
                    {RING_ICONS[ring.id]}
                  </div>
                </div>
                <div className="text-sm bold">{ring.label}</div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  {ring.current} / {ring.target} {ring.unit}
                </div>
                <div style={{ fontSize: 11, color: ring.color, fontWeight: 700, marginTop: 4 }}>{pct}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Celebration overlay */}
      {celebration && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 300, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: 32,
        }} onClick={dismissCelebration}>
          <div style={{ animation: 'ringPulse 1s ease-in-out infinite' }}>
            <RingProgress current={celebration.target} target={celebration.target} color={celebration.color} size={120} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>
            OBJECTIF ATTEINT
          </div>
          <div className="text-xl bold">{celebration.label}</div>
          <div className="text-base text-secondary" style={{ marginTop: 8 }}>Bien joué, {user?.name}.</div>
          <button className="btn-accent" onClick={dismissCelebration} style={{ marginTop: 8, maxWidth: 200 }}>
            CONTINUER
          </button>
          <style>{`
            @keyframes ringPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `}</style>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
