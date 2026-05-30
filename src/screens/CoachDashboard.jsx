import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CoachNav from '../components/CoachNav'

export const MOCK_MEMBERS = [
  { id:1,  name:'Léo',     lastSeen:'Aujourd\'hui', sessions:5, status:'ON TRACK', calories:1847, sleep:'7h23', steps:8247,  weight:78,  goal:'Prise de masse' },
  { id:2,  name:'Sarah',   lastSeen:'Hier',         sessions:3, status:'AT RISK',  calories:1200, sleep:'4h50', steps:4200,  weight:62,  goal:'Perte de poids' },
  { id:3,  name:'Marcus',  lastSeen:'Il y a 5j',    sessions:1, status:'INACTIVE', calories:900,  sleep:'6h10', steps:2100,  weight:85,  goal:'Prise de masse' },
  { id:4,  name:'Amina',   lastSeen:'Aujourd\'hui', sessions:6, status:'ON TRACK', calories:2100, sleep:'8h05', steps:11000, weight:58,  goal:'Performance' },
  { id:5,  name:'Jordan',  lastSeen:'Aujourd\'hui', sessions:4, status:'ON TRACK', calories:2300, sleep:'7h45', steps:9500,  weight:82,  goal:'Sèche' },
  { id:6,  name:'Yasmine', lastSeen:'Il y a 2j',    sessions:2, status:'AT RISK',  calories:1400, sleep:'5h30', steps:5100,  weight:55,  goal:'Tonicité' },
  { id:7,  name:'Kevin',   lastSeen:'Hier',         sessions:4, status:'ON TRACK', calories:2600, sleep:'7h00', steps:7800,  weight:90,  goal:'Prise de masse' },
  { id:8,  name:'Inès',    lastSeen:'Il y a 3j',    sessions:2, status:'AT RISK',  calories:1600, sleep:'6h20', steps:6200,  weight:60,  goal:'Perte de poids' },
  { id:9,  name:'Thomas',  lastSeen:'Aujourd\'hui', sessions:5, status:'ON TRACK', calories:2200, sleep:'8h00', steps:10200, weight:76,  goal:'Performance' },
  { id:10, name:'Camille', lastSeen:'Il y a 7j',    sessions:0, status:'INACTIVE', calories:800,  sleep:'5h00', steps:1800,  weight:65,  goal:'Remise en forme' },
  { id:11, name:'Rayan',   lastSeen:'Hier',         sessions:3, status:'ON TRACK', calories:2400, sleep:'7h30', steps:8900,  weight:73,  goal:'Sèche' },
  { id:12, name:'Lucie',   lastSeen:'Il y a 4j',    sessions:1, status:'INACTIVE', calories:1100, sleep:'5h45', steps:3200,  weight:57,  goal:'Tonicité' },
  { id:13, name:'Axel',    lastSeen:'Aujourd\'hui', sessions:6, status:'ON TRACK', calories:2800, sleep:'7h50', steps:12000, weight:88,  goal:'Prise de masse' },
  { id:14, name:'Nadia',   lastSeen:'Il y a 2j',    sessions:2, status:'AT RISK',  calories:1350, sleep:'6h00', steps:4800,  weight:61,  goal:'Perte de poids' },
  { id:15, name:'Ethan',   lastSeen:'Hier',         sessions:3, status:'ON TRACK', calories:1950, sleep:'7h15', steps:7500,  weight:71,  goal:'Performance' },
]

const STATUS_COLORS = { 'ON TRACK': 'var(--success)', 'AT RISK': 'var(--warning)', 'INACTIVE': 'var(--danger)' }

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
            <span className="text-xs text-muted" style={{ marginLeft: 10 }}>Coach · {user?.name}</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { logout(); navigate('/') }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        <h1 className="text-xl bold" style={{ marginBottom: 20 }}>Tableau de bord</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
          {[
            { label: 'Clients', val: 15 },
            { label: 'Séances', val: 47 },
            { label: 'Alertes', val: alerts.length, danger: true },
            { label: 'Progression', val: '+12%' },
          ].map(m => (
            <div key={m.label} className="card" style={{ textAlign: 'center', padding: '12px 6px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: m.danger ? 'var(--danger)' : 'var(--text-primary)' }}>{m.val}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <button className="btn-ghost" onClick={() => navigate('/coach/clients')} style={{ marginBottom: 20 }}>
          VOIR TOUS MES CLIENTS →
        </button>

        {alerts.length > 0 && (
          <>
            <div className="section-label" style={{ color: 'var(--danger)' }}>NÉCESSITE ATTENTION</div>
            {alerts.map(m => (
              <div key={m.id} className="card" style={{ borderLeft: '2px solid var(--danger)', marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate(`/coach/member/${m.id}`)}>
                <div className="flex justify-between items-center">
                  <span className="text-base bold">{m.name}</span>
                  <span className="text-xs text-accent">VOIR →</span>
                </div>
                <div className="text-sm text-secondary" style={{ marginTop: 4 }}>
                  {m.status === 'INACTIVE' ? `Absent ${m.lastSeen.toLowerCase()} · Calories en chute` : `Sommeil perturbé · Fatigue détectée`}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="section-label">ACTIFS AUJOURD'HUI</div>
        {MOCK_MEMBERS.filter(m => m.lastSeen === 'Aujourd\'hui').map(m => (
          <div key={m.id} className="card" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => navigate(`/coach/member/${m.id}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', border: `1.5px solid ${STATUS_COLORS[m.status]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: STATUS_COLORS[m.status], flexShrink: 0 }}>
                {m.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex justify-between items-center">
                  <span className="text-base bold">{m.name}</span>
                  <span style={{ fontSize: 10, color: STATUS_COLORS[m.status], border: `1px solid ${STATUS_COLORS[m.status]}`, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>{m.status}</span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>{m.goal} · {m.sessions} séances</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CoachNav />
    </div>
  )
}
