import { useNavigate } from 'react-router-dom'

export default function Messages() {
  const navigate = useNavigate()
  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 className="text-xl bold">Messages</h1>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-ink)', fontSize: 14 }}>TH</div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/messages/coach')}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-ink)', flexShrink: 0 }}>TH</div>
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

    </div>
  )
}
