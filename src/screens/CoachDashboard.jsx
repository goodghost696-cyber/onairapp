import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CoachNav from '../components/CoachNav'
import '../styles/coach.css'

const MOCK_MEMBERS = [
  { id: 2, name: 'Léo', lastSeen: 'Aujourd\'hui', sessions: 5, status: 'ON TRACK', calories: 1847, sleep: '7h23', steps: 8247 },
  { id: 3, name: 'Sarah', lastSeen: 'Hier', sessions: 3, status: 'AT RISK', calories: 1200, sleep: '4h50', steps: 4200 },
  { id: 4, name: 'Marcus', lastSeen: 'Il y a 5 jours', sessions: 1, status: 'INACTIVE', calories: 900, sleep: '6h10', steps: 2100 },
  { id: 5, name: 'Amina', lastSeen: 'Aujourd\'hui', sessions: 6, status: 'ON TRACK', calories: 2100, sleep: '8h05', steps: 11000 },
]

const STATUS_COLORS = {
  'ON TRACK': 'var(--success)',
  'AT RISK': 'var(--warning)',
  'INACTIVE': 'var(--danger)',
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'var(--text-muted)'
  return (
    <span style={{
      border: `1px solid ${color}`,
      color,
      fontSize: 10,
      padding: '3px 8px',
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontWeight: 700,
    }}>{status}</span>
  )
}

function Avatar({ name }) {
  return (
    <div style={{
      width: 44, height: 44,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 16, color: 'var(--accent)',
      flexShrink: 0,
    }}>
      {name[0]}
    </div>
  )
}

export default function CoachDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const alerts = MOCK_MEMBERS.filter(m => m.status !== 'ON TRACK')

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <div>
            <span className="text-xs text-accent bold">ON AIR</span>
            <span className="text-xs text-muted" style={{ marginLeft: 12 }}>Coach · {user?.name}</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { logout(); navigate('/') }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>

        <h1 className="text-xl bold" style={{ marginBottom: 24 }}>Tableau de bord</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
          {[
            { label: 'Adhérents', val: 4 },
            { label: 'Séances ce mois', val: 23 },
            { label: 'Alertes', val: alerts.length },
          ].map((m, idx) => (
            <div key={m.label} className="card card-animated" style={{ textAlign: 'center', padding: 16, '--delay': `${50 + idx * 60}ms` }}>
              <div className="text-2xl bold" style={{ color: m.label === 'Alertes' ? 'var(--danger)' : 'var(--text-primary)' }}>{m.val}</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {alerts.length > 0 && (
          <>
            <div className="section-label" style={{ color: 'var(--danger)' }}>NÉCESSITE ATTENTION</div>
            {alerts.map(m => (
              <div key={m.id} className="card" style={{ borderLeft: '2px solid var(--danger)', marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate(`/coach/member/${m.id}`)}>
                <div className="flex justify-between items-center">
                  <span className="text-lg bold">{m.name}</span>
                  <span className="text-xs text-accent" style={{ letterSpacing: 1 }}>VOIR PROFIL →</span>
                </div>
                <div className="text-sm text-secondary" style={{ marginTop: 4 }}>
                  {m.status === 'INACTIVE' ? `Absent depuis 5 jours · Calories en chute` : `Sommeil < 5h cette semaine · Fatigue détectée`}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="section-label">MES ADHÉRENTS</div>
        {MOCK_MEMBERS.map(m => (
          <div key={m.id} className="card" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => navigate(`/coach/member/${m.id}`)}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar name={m.name} />
              <div style={{ flex: 1 }}>
                <div className="flex justify-between items-center">
                  <span className="text-lg bold">{m.name}</span>
                  <StatusBadge status={m.status} />
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>Vu {m.lastSeen.toLowerCase()}</div>
                <div className="progress-bar" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${m.sessions / 8 * 100}%` }} />
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>{m.sessions} séances ce mois</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CoachNav />
    </div>
  )
}
