import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'

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

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-xs text-accent bold">BILAN SEMAINE</span>
        </div>

        <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>CALORIES / JOUR</span>
          <span style={{ color: 'var(--text-muted)' }}>Objectif : 2 400 kcal</span>
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

        <div className="section-label">RÉSUMÉ</div>
        {[
          { label: 'Séances réalisées', val: `${appData.weeklyWorkouts}/${appData.weeklyGoal}` },
          { label: 'Moy. calories', val: `${Math.round(appData.weeklyData.filter(d=>d.calories>0).reduce((s,d)=>s+d.calories,0)/appData.weeklyData.filter(d=>d.calories>0).length)} kcal` },
          { label: 'Total km courus', val: `${appData.kmRun} km` },
          { label: 'Moy. pas/jour', val: appData.steps.toLocaleString() },
        ].map((r, idx) => (
          <div key={r.label} className="card flex justify-between items-center card-animated" style={{ padding: '14px 16px', '--delay': `${100 + idx * 60}ms` }}>
            <span className="text-sm text-secondary">{r.label}</span>
            <span className="text-base bold">{r.val}</span>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
