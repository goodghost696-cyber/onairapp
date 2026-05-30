import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function Scan() {
  const navigate = useNavigate()

  return (
    <div className="app-wrapper">
      <div className="screen">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">SCANNER</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/nutrition')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{
            width: 240, height: 240,
            border: '2px solid var(--accent)',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ position: 'absolute', top: -1, left: -1, width: 24, height: 24, borderTop: '3px solid var(--accent)', borderLeft: '3px solid var(--accent)' }} />
            <div style={{ position: 'absolute', top: -1, right: -1, width: 24, height: 24, borderTop: '3px solid var(--accent)', borderRight: '3px solid var(--accent)' }} />
            <div style={{ position: 'absolute', bottom: -1, left: -1, width: 24, height: 24, borderBottom: '3px solid var(--accent)', borderLeft: '3px solid var(--accent)' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 24, height: 24, borderBottom: '3px solid var(--accent)', borderRight: '3px solid var(--accent)' }} />
            <span className="text-sm text-muted" style={{ textAlign: 'center' }}>Scanner un code-barres</span>
          </div>
          <p className="text-sm text-muted" style={{ marginTop: 24, textAlign: 'center' }}>
            Fonctionnalité disponible via l'app native
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
