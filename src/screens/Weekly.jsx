import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { fetchWeeklyStats } from '../utils/weeklyStats'
import { fetchLiftProgress } from '../utils/liftProgress'
import Icon from '../components/Icon'
import '../styles/Weekly.css'

const BAR_MAX_HEIGHT = 60

function LiftCurve({ lift }) {
  const max = Math.max(...lift.sessions)
  const min = Math.min(...lift.sessions)
  const w = 300, h = 80
  const padding = { top: 10, right: 16, bottom: 24, left: 32 }
  const chartW = w - padding.left - padding.right
  const chartH = h - padding.top - padding.bottom
  const n = lift.sessions.length
  const getX = i => padding.left + (i / (n - 1)) * chartW
  const getY = v => max === min ? padding.top + chartH / 2 : padding.top + chartH - ((v - min) / (max - min)) * chartH
  const points = lift.sessions.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')
  const latest = lift.sessions[n - 1]
  const prev = lift.sessions[n - 2]

  return (
    <div className="lift-curve-card">
      <div className="lift-curve-header">
        <p className="lift-curve-name">{lift.name}</p>
        <div className="lift-curve-trend">
          {latest > prev
            ? <span style={{ color: 'var(--success)' }}>↑ {latest - prev} {lift.unit}</span>
            : <span style={{ color: 'var(--text-muted)' }}>→ stable</span>
          }
          <span className="lift-curve-latest">{latest} {lift.unit}</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={padding.left} y1={padding.top + t * chartH} x2={w - padding.right} y2={padding.top + t * chartH} stroke="var(--border)" strokeWidth="0.5" />
        ))}
        <defs>
          <linearGradient id={`grad-${lift.name.replace(/\s/g,'-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={`${padding.left},${padding.top + chartH} ${points} ${w - padding.right},${padding.top + chartH}`} fill={`url(#grad-${lift.name.replace(/\s/g,'-')})`} />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {lift.sessions.map((v, i) => (
          <circle key={i} cx={getX(i)} cy={getY(v)} r="3" fill={i === n - 1 ? 'var(--accent)' : 'var(--bg)'} stroke="var(--accent)" strokeWidth="1.5" />
        ))}
        {lift.dates.map((d, i) => (
          <text key={i} x={getX(i)} y={h - 4} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{d.split(' ')[0]}</text>
        ))}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" fontSize="8" fill="var(--text-muted)">{max}</text>
        <text x={padding.left - 4} y={padding.top + chartH} textAnchor="end" fontSize="8" fill="var(--text-muted)">{min}</text>
      </svg>
    </div>
  )
}

// This bar chart sits inside .card-hero (the light gold gradient card) —
// var(--success)/var(--accent)/var(--warning)/var(--surface-2) were all
// picked for a dark card and, checked against the new gold background,
// land between ~1.1:1 and ~1.2:1 contrast (--accent is literally gold on
// gold now). Fixed dark tones instead, same semantic meaning, actually
// visible on the light card.
function calBarColor(cal, goal) {
  if (cal === 0) return 'rgba(26,22,8,0.15)'
  const pct = cal / goal
  if (pct >= 1) return '#14532D'
  if (pct >= 0.8) return '#8A4600'
  return '#9A3412'
}

export default function Weekly() {
  const { appData } = useApp()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [weeklyData, setWeeklyData] = useState([])
  const [sleepData, setSleepData] = useState([])
  const [liftProgress, setLiftProgress] = useState([])

  useEffect(() => {
    if (!user?.id) return
    fetchWeeklyStats(user.id).then(({ weeklyData, sleepData }) => {
      setWeeklyData(weeklyData)
      setSleepData(sleepData)
    })
    fetchLiftProgress(user.id).then(setLiftProgress)
  }, [user?.id])

  const maxCalories = Math.max(...weeklyData.map(d => d.calories), 1)
  const loggedSleepDays = sleepData.filter(d => d.hours > 0)
  const avgSleep = loggedSleepDays.length
    ? Math.round((loggedSleepDays.reduce((s, d) => s + d.hours, 0) / loggedSleepDays.length) * 10) / 10
    : 0

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110, padding: '0 24px 110px' }}>
        <div className="screen-header" style={{ paddingTop: 56, paddingBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="bar-chart" size={13} /> BILAN</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{t('weekly_recap')}</h1>
        </div>

        <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('daily_calories')}</span>
          <span style={{ color: 'var(--text-muted)' }}>{t('goal')} : {appData.calorieGoal.toLocaleString('fr-FR')} kcal</span>
        </div>
        <div className="card card-hero card-animated" style={{ marginBottom: 16, '--delay': '0ms' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {weeklyData.map((d, i) => {
              const barH = d.calories > 0 ? Math.max(4, Math.round((d.calories / maxCalories) * BAR_MAX_HEIGHT)) : 4
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', height: `${barH}px`, background: calBarColor(d.calories, appData.calorieGoal), borderRadius: '3px 3px 0 0', transition: 'height 600ms ease' }} />
                  {/* Inline var(--text-muted) resolves from the app theme,
                      not from being inside .card-hero — a CSS class override
                      can't reach an inline style, so this needs its own fix:
                      translucent dark ink instead of translucent white. */}
                  <span style={{ fontSize: 9, color: 'rgba(26,22,8,0.5)' }}>{d.day}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="section-label">{t('summary')}</div>
        {[
          { label: t('workouts_done'), val: `${appData.weeklyWorkouts}/${appData.weeklyGoal}` },
          { label: t('avg_sleep'), val: loggedSleepDays.length ? `${avgSleep} h` : '—' },
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
          {liftProgress.length
            ? liftProgress.map((lift, i) => <LiftCurve key={i} lift={lift} />)
            : <div className="card text-sm text-muted" style={{ textAlign: 'center', padding: '20px 16px' }}>
                Pas encore assez de séances enregistrées pour un même exercice — reviens après quelques séances.
              </div>
          }
        </div>
      </div>

    </div>
  )
}
