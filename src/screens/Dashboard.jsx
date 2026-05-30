import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'
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

  function handleLogout() {
    logout()
    navigate('/')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'

  return (
    <div className="app-wrapper">
      <div className="screen dashboard-screen">
        <div className="dash-header">
          <span className="text-xs text-accent bold">ON AIR</span>
          <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }} onClick={handleLogout}>
            <LogoutIcon />
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 className="text-xl bold">{greeting}, {user?.name}.</h1>
          <p className="text-sm text-secondary">Voyons où tu en es.</p>
        </div>

        <div className="dash-ring-row">
          <CalorieRing current={appData.calories} goal={appData.calorieGoal} />
          <div className="dash-macros">
            {[
              { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal, unit: 'g' },
              { label: 'Glucides', val: appData.carbs, goal: appData.carbsGoal, unit: 'g' },
              { label: 'Lipides', val: appData.fat, goal: appData.fatGoal, unit: 'g' },
            ].map(m => (
              <div key={m.label} className="macro-item">
                <span className="text-xs text-muted">{m.label}</span>
                <span className="text-sm bold">{m.val}<span className="text-muted">/{m.goal}{m.unit}</span></span>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(m.val/m.goal*100,100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-label">ACTIVITÉ</div>
        <div className="dash-metrics-grid">
          {[
            { label: 'Pas', val: appData.steps.toLocaleString(), sub: `/${appData.stepsGoal.toLocaleString()}` },
            { label: 'Course', val: `${appData.kmRun}km`, sub: 'aujourd\'hui' },
            { label: 'Hydration', val: `${appData.water}ml`, sub: `/${appData.waterGoal}ml` },
            { label: 'Sommeil', val: `${appData.sleep.hours}h${appData.sleep.minutes}`, sub: appData.sleep.quality },
          ].map(m => (
            <div key={m.label} className="metric-card card">
              <span className="text-xs text-muted">{m.label}</span>
              <span className="text-lg bold" style={{ display: 'block', marginTop: 4 }}>{m.val}</span>
              <span className="text-xs text-muted">{m.sub}</span>
            </div>
          ))}
        </div>

        <div className="section-label">SÉANCES CETTE SEMAINE</div>
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
            <span className="text-lg bold">{appData.weeklyWorkouts}/{appData.weeklyGoal}</span>
            <span className="text-xs text-muted">séances</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${appData.weeklyWorkouts/appData.weeklyGoal*100}%` }} />
          </div>
        </div>

        <div className="section-label">RACCOURCIS</div>
        <div className="dash-shortcuts">
          {[
            { label: 'Nutrition', path: '/nutrition' },
            { label: 'Workout', path: '/workout' },
            { label: 'Run', path: '/run' },
            { label: 'AI Coach', path: '/ai-coach' },
            { label: 'Bilan', path: '/weekly' },
          ].map(s => (
            <button key={s.path} className="shortcut-btn" onClick={() => navigate(s.path)}>
              <span className="text-xs">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
