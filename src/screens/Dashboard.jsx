import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
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
  const { appData } = useApp()
  const { t } = useLanguage()

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

        <div style={{ marginBottom: 24 }}>
          <h1 className="text-xl bold">{greeting}, {user?.name}.</h1>
          <p className="text-sm text-secondary">{t('see_progress')}</p>
        </div>

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

        <div className="section-label">{t('activity')}</div>
        <div className="dash-metrics-grid">
          {[
            { label: t('steps'), val: appData.steps.toLocaleString(), sub: `/${appData.stepsGoal.toLocaleString()}` },
            { label: 'Course', val: `${appData.kmRun}km`, sub: "aujourd'hui" },
            { label: t('water'), val: `${appData.water}ml`, sub: `/${appData.waterGoal}ml` },
            { label: 'Sommeil', val: `${appData.sleep.hours}h${appData.sleep.minutes}`, sub: appData.sleep.quality },
          ].map((m, idx) => (
            <div key={m.label} className="metric-card card card-animated" style={{ '--delay': `${100 + idx * 60}ms` }}>
              <span className="text-xs text-muted">{m.label}</span>
              <span className="text-lg bold" style={{ display: 'block', marginTop: 4 }}>{m.val}</span>
              <span className="text-xs text-muted">{m.sub}</span>
            </div>
          ))}
        </div>

        <div className="card card-animated" style={{ '--delay': '200ms', marginBottom: 8 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
            <span className="text-xs text-muted">{t('water')}</span>
            <span className="text-xs text-accent">{appData.water}ml / {appData.waterGoal}ml</span>
          </div>
          <div className="progress-bar" style={{ height: 6, borderRadius: 4 }}>
            <div className="progress-fill" style={{ width: `${Math.min(appData.water/appData.waterGoal*100,100)}%`, background: '#4FC3F7', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            {[250, 500, 750, 1000, 1250, 1500, 1750, 2000].map(ml => (
              <div key={ml} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 20, height: 28, borderRadius: 4, background: appData.water >= ml ? '#4FC3F7' : 'var(--surface-2)', transition: 'background 200ms ease' }} />
                <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{ml >= 1000 ? `${ml/1000}L` : ''}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section-label">{t('my_goals')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
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

        <div className="section-label">{t('shortcuts')}</div>
        <div className="dash-shortcuts">
          {[
            { label: t('nutrition'), path: '/nutrition' },
            { label: t('workout'), path: '/workout' },
            { label: 'Course', path: '/workout' },
            { label: 'Bilan', path: '/weekly' },
          ].map(s => (
            <button key={s.path} className="shortcut-btn" onClick={() => navigate(s.path)}>
              <span className="text-xs">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="card" style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(224,0,0,0.15), rgba(224,0,0,0.05))', border: '0.5px solid rgba(224,0,0,0.3)', marginTop: 8 }} onClick={() => navigate('/ai-coach')}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-base bold">{t('ai_coach_card')}</div>
              <div className="text-sm text-muted">{t('ai_coach_sub')}</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>

    </div>
  )
}
