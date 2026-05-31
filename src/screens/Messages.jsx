import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function Messages() {
  const navigate = useNavigate()
  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
          <h1 className="text-xl bold">Messages</h1>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', fontSize: 14 }}>TH</div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/messages/coach')}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', flexShrink: 0 }}>TH</div>
            <div style={{ flex: 1 }}>
              <div className="text-base bold">Thomas · Coach ON AIR</div>
              <div className="text-sm text-muted" style={{ marginTop: 2 }}>Pull day demain. Je te prépare le programme...</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span className="text-xs text-muted">09:22</span>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
