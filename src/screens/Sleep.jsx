import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'

export default function Sleep() {
  const { appData } = useApp()
  const maxH = 10

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">SOMMEIL</span>
        </div>

        <div className="card card-animated" style={{ textAlign: 'center', padding: 32, '--delay': '50ms' }}>
          <div className="text-2xl bold" style={{ fontSize: 48, lineHeight: 1 }}>
            {appData.sleep.hours}h{String(appData.sleep.minutes).padStart(2,'0')}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>CETTE NUIT</div>
          <div className="text-sm text-muted" style={{ marginTop: 12 }}>{appData.sleep.quality}</div>
        </div>

        <div className="section-label">CETTE SEMAINE</div>
        <div className="card card-animated" style={{ '--delay': '150ms' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {appData.sleepData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: `${d.hours / maxH * 100}%`,
                  background: d.hours > 7 ? 'var(--success)' : d.hours > 5 ? 'var(--warning)' : d.hours > 0 ? 'var(--danger)' : 'var(--border)',
                  minHeight: d.hours > 0 ? 4 : 2,
                  borderRadius: 2,
                }} />
                <span className="text-xs text-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
