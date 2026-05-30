import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'
import '../styles/workout.css'

export default function Workout() {
  const { appData } = useApp()

  return (
    <div className="app-wrapper">
      <div className="screen">
        <div style={{ padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">WORKOUT</span>
        </div>

        <h1 className="text-xl bold" style={{ marginBottom: 24 }}>Séance du jour</h1>

        <div className="card" style={{ marginBottom: 8 }}>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Séances cette semaine</span>
            <span className="text-lg bold text-accent">{appData.weeklyWorkouts}/{appData.weeklyGoal}</span>
          </div>
          <div className="progress-bar" style={{ height: 4, marginTop: 12 }}>
            <div className="progress-fill" style={{ width: `${appData.weeklyWorkouts/appData.weeklyGoal*100}%` }} />
          </div>
        </div>

        <div className="section-label">EXERCICES</div>
        {appData.todayWorkouts.map((ex, i) => (
          <div key={i} className="card exercise-card">
            <div className="flex justify-between items-center">
              <span className="text-base bold">{ex.name}</span>
              <span className="text-sm bold text-accent">{ex.weight}kg</span>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
              <div>
                <div className="text-xs text-muted">SÉRIES</div>
                <div className="text-lg bold">{ex.sets}</div>
              </div>
              <div>
                <div className="text-xs text-muted">REPS</div>
                <div className="text-lg bold">{ex.reps}</div>
              </div>
              <div>
                <div className="text-xs text-muted">VOLUME</div>
                <div className="text-lg bold">{ex.sets * ex.reps * ex.weight}kg</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
