import { useNavigate } from 'react-router-dom'
import CoachNav from '../components/CoachNav'
import { MOCK_MEMBERS } from './CoachDashboard'

const STATUS_COLORS = { 'ON TRACK': 'var(--success)', 'AT RISK': 'var(--warning)', 'INACTIVE': 'var(--danger)' }
const mockLastMessages = {
  1: { text: "Merci Thomas ! Je me suis vraiment donné", time: '09:18' },
  2: { text: 'Okay pour demain', time: 'Hier' },
  3: { text: 'Je reviens la semaine prochaine', time: 'Lun' },
  4: { text: "Super séance aujourd'hui !", time: '08:45' },
}

export default function CoachMessages() {
  const navigate = useNavigate()
  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 12px' }}>
          <h1 className="text-xl bold">Messages</h1>
        </div>
        {MOCK_MEMBERS.slice(0,8).map(m => {
          const last = mockLastMessages[m.id] || { text: '...', time: '' }
          return (
            <div key={m.id} className="card" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => navigate(`/coach/messages/${m.id}`)}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)', border: `1.5px solid ${STATUS_COLORS[m.status]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: STATUS_COLORS[m.status], flexShrink: 0 }}>{m.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div className="text-base bold">{m.name}</div>
                  <div className="text-sm text-muted" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last.text}</div>
                </div>
                <span className="text-xs text-muted">{last.time}</span>
              </div>
            </div>
          )
        })}
      </div>
      <CoachNav />
    </div>
  )
}
