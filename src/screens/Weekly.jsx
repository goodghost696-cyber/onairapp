import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import '../styles/Weekly.css'

const weekData = [
  { day: 'L', calories: 2100, goal: 2400 },
  { day: 'M', calories: 1950, goal: 2400 },
  { day: 'M', calories: 2300, goal: 2400 },
  { day: 'J', calories: 1800, goal: 2400 },
  { day: 'V', calories: 2400, goal: 2400 },
  { day: 'S', calories: 0,    goal: 2400 },
  { day: 'D', calories: 1847, goal: 2400 },
]
const maxCal = Math.max(...weekData.map(d => d.calories), 1)

const liftProgress = [
  { name: 'Bench Press', unit: 'kg',   sessions: [75, 80, 80, 85],    dates: ['1 juin', '2 juin', '3 juin', '4 juin'] },
  { name: 'Back Squat',  unit: 'kg',   sessions: [100, 100, 110, 120], dates: ['1 juin', '2 juin', '3 juin', '4 juin'] },
  { name: 'Deadlift',    unit: 'kg',   sessions: [120, 130, 130, 140], dates: ['1 juin', '2 juin', '3 juin', '4 juin'] },
  { name: 'Pull-up',     unit: 'reps', sessions: [8, 9, 10, 10],       dates: ['1 juin', '2 juin', '3 juin', '4 juin'] },
]

function calBarColor(cal, goal) {
  if (cal === 0) return 'var(--surface-2)'
  const pct = cal / goal
  if (pct >= 1) return 'var(--success)'
  if (pct >= 0.8) return 'var(--accent)'
  return 'var(--warning)'
}

export default function Weekly() {
  const navigate = useNavigate()
  const { appData } = useApp()
  const { t } = useLanguage()

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-xs text-accent bold">{t('weekly_recap')}</span>
        </div>

        <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('daily_calories')}</span>
          <span style={{ color: 'var(--text-muted)' }}>{t('goal')} : 2 400 kcal</span>
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 64 }}>
            {weekData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${d.calories > 0 ? Math.max((d.calories/maxCal)*56, 6) : 4}px`, background: calBarColor(d.calories, d.goal), borderRadius: '3px 3px 0 0', transition: 'height 600ms ease' }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section-label">{t('summary')}</div>
        {[
          { label: t('workouts_done'), val: `${appData.weeklyWorkouts}/${appData.weeklyGoal}` },
          { label: t('avg_sleep'), val: `${Math.round(appData.weeklyData.filter(d=>d.calories>0).reduce((s,d)=>s+d.calories,0)/appData.weeklyData.filter(d=>d.calories>0).length)} kcal` },
          { label: t('distance_run'), val: `${appData.kmRun} km` },
          { label: t('steps'), val: appData.steps.toLocaleString() },
        ].map((r, idx) => (
          <div key={r.label} className="card flex justify-between items-center card-animated" style={{ padding: '14px 16px', '--delay': `${100 + idx * 60}ms` }}>
            <span className="text-sm text-secondary">{r.label}</span>
            <span className="text-base bold">{r.val}</span>
          </div>
        ))}

        {/* Section 1 — Progression physique */}
        <div className="progress-section">
          <p className="section-label">MA PROGRESSION</p>
          <p className="section-sub">Photos semaine par semaine</p>
          <div className="progress-photos-row">
            {['S-3', 'S-2', 'S-1', 'Cette sem.'].map((week, i) => (
              <div key={i} className="progress-photo-slot">
                <div className="progress-photo-placeholder">
                  <span className="progress-photo-plus">+</span>
                </div>
                <p className="progress-photo-label">{week}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 — Progression des charges */}
        <div className="lifts-section">
          <p className="section-label">MES CHARGES</p>
          <p className="section-sub">Évolution sur les 4 dernières séances</p>
          {liftProgress.map((lift, i) => {
            const max = Math.max(...lift.sessions)
            const min = Math.min(...lift.sessions)
            const latest = lift.sessions[lift.sessions.length - 1]
            const previous = lift.sessions[lift.sessions.length - 2]
            const trend = latest > previous ? '↑' : latest < previous ? '↓' : '→'
            const trendColor = latest > previous ? 'var(--success)' : latest < previous ? 'var(--danger)' : 'var(--text-muted)'

            return (
              <div key={i} className="lift-card">
                <div className="lift-card-header">
                  <p className="lift-name">{lift.name}</p>
                  <div className="lift-latest">
                    <span className="lift-trend" style={{ color: trendColor }}>{trend}</span>
                    <span className="lift-value">{latest} {lift.unit}</span>
                  </div>
                </div>
                <div className="lift-bars">
                  {lift.sessions.map((val, j) => {
                    const height = max === min ? 50 : Math.round(20 + ((val - min) / (max - min)) * 40)
                    const isLatest = j === lift.sessions.length - 1
                    return (
                      <div key={j} className="lift-bar-col">
                        <div className="lift-bar" style={{ height: `${height}px`, background: isLatest ? 'var(--accent)' : 'var(--surface-2)' }} />
                        <span className="lift-bar-val">{val}</span>
                        <span className="lift-bar-date">{lift.dates[j].split(' ')[0]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
