import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'

const sections = [
  {
    key: 'maison',
    name: 'Exercices Maison',
    sub: 'Bodyweight · Sans équipement',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--accent)">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    ),
  },
  {
    key: 'salle',
    name: 'Exercices Salle',
    sub: 'Machines · Charges libres',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--accent)">
        <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
      </svg>
    ),
  },
  {
    key: 'dehors',
    name: 'Exercices Dehors',
    sub: 'Running · Calisthenics · HIIT',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--accent)">
        <circle cx="13.49" cy="3.01" r="2"/>
        <path d="M6.28 23.65L8 22l5-5 2 2 2.07-2.07C15.17 15.96 14 14.11 14 12c0-.68.12-1.32.32-1.93L11 13H8l-3 7.65L6.28 23.65z"/>
      </svg>
    ),
  },
]

export default function Workout() {
  const navigate = useNavigate()
  const { appData } = useApp()

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">WORKOUT</span>
          <span className="text-sm text-muted">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>

        <h1 className="text-xl bold" style={{ marginBottom: 8 }}>Workout</h1>

        <div className="card card-animated" style={{ '--delay': '0ms', marginBottom: 16 }}>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Séances cette semaine</span>
            <span className="text-lg bold text-accent">{appData.weeklyWorkouts}/{appData.weeklyGoal}</span>
          </div>
          <div className="progress-bar" style={{ height: 4, marginTop: 12 }}>
            <div className="progress-fill" style={{ width: `${appData.weeklyWorkouts/appData.weeklyGoal*100}%` }} />
          </div>
        </div>

        <div className="section-label">BIBLIOTHÈQUE</div>
        {sections.map((s, i) => (
          <div
            key={s.key}
            className="card card-animated"
            style={{ '--delay': `${i * 80}ms`, cursor: 'pointer', marginBottom: 8 }}
            onClick={() => navigate(`/workout/${s.key}`)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, background: 'var(--surface-2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-lg bold">{s.name}</div>
                <div className="text-sm text-muted">{s.sub}</div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </div>
          </div>
        ))}

        <div className="section-label" style={{ marginTop: 24 }}>SÉANCE DU JOUR</div>
        {appData.todayWorkouts.map((ex, i) => (
          <div key={i} className="card card-animated" style={{ '--delay': `${(i + sections.length) * 80}ms`, marginBottom: 8 }}>
            <div className="flex justify-between items-center">
              <span className="text-base bold">{ex.name}</span>
              <span className="text-sm bold text-accent">{ex.weight}kg</span>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
              <div><div className="text-xs text-muted">SÉRIES</div><div className="text-lg bold">{ex.sets}</div></div>
              <div><div className="text-xs text-muted">REPS</div><div className="text-lg bold">{ex.reps}</div></div>
              <div><div className="text-xs text-muted">VOLUME</div><div className="text-lg bold">{ex.sets * ex.reps * ex.weight}kg</div></div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
