import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'
import '../styles/run.css'

export default function Run() {
  const { appData } = useApp()

  return (
    <div className="app-wrapper">
      <div className="screen">
        <div style={{ padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">RUN</span>
        </div>

        <div className="run-hero card" style={{ textAlign: 'center', padding: 32, marginBottom: 16 }}>
          <div className="text-2xl bold" style={{ fontSize: 48, lineHeight: 1 }}>{appData.kmRun}</div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>KM AUJOURD'HUI</div>
        </div>

        <div className="section-label">SESSIONS</div>
        {appData.runSessions.map((s, i) => (
          <div key={i} className="card" style={{ marginBottom: 8 }}>
            <div className="flex justify-between items-center">
              <span className="text-base bold">{s.km} km</span>
              <span className="text-sm text-muted">{s.date}</span>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
              <div>
                <div className="text-xs text-muted">TEMPS</div>
                <div className="text-sm bold">{s.time}</div>
              </div>
              <div>
                <div className="text-xs text-muted">ALLURE</div>
                <div className="text-sm bold">{s.pace}</div>
              </div>
              <div>
                <div className="text-xs text-muted">CALORIES</div>
                <div className="text-sm bold">{s.calories}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
