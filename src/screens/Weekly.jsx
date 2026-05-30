import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'

export default function Weekly() {
  const { appData } = useApp()

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">BILAN SEMAINE</span>
        </div>

        <div className="section-label">CALORIES / JOUR</div>
        <div className="card card-animated" style={{ '--delay': '50ms' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {appData.weeklyData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: `${d.calories / appData.calorieGoal * 100}%`,
                  background: d.workout ? 'var(--accent)' : 'var(--border)',
                  minHeight: d.calories > 0 ? 4 : 2,
                  borderRadius: 2,
                }} />
                <span className="text-xs text-muted">{d.day}</span>
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
