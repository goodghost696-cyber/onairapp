import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CoachNav from '../components/CoachNav'
import { authHeader } from '../lib/supabase'

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, background: on ? 'var(--accent)' : 'var(--border)', borderRadius: 13, position: 'relative', cursor: 'pointer', transition: 'background 200ms ease', flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: 20, height: 20, background: 'white', borderRadius: '50%', top: 3, left: 3, transform: on ? 'translateX(18px)' : 'none', transition: 'transform 200ms ease' }} />
    </div>
  )
}

export default function CoachSettings() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [notifs, setNotifs] = useState({ alerts: true, messages: true })
  const [inviteCode, setInviteCode] = useState('...')

  useEffect(() => {
    let cancelled = false
    authHeader().then(headers =>
      fetch('/api/invite-code', { headers }).then(r => r.json())
    ).then(data => {
      if (!cancelled) setInviteCode(data.code || '—')
    }).catch(() => {
      if (!cancelled) setInviteCode('—')
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 12px' }}>
          <h1 className="text-xl bold">Paramètres</h1>
        </div>

        <div className="section-label">PROFIL COACH</div>
        <div className="card">
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sm text-secondary">Nom</span><span className="text-sm">{user?.name}</span>
          </div>
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sm text-secondary">Email</span><span className="text-sm">{user?.email}</span>
          </div>
        </div>

        <div className="section-label">SALLE</div>
        <div className="card">
          <div style={{ padding: '14px 0', borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sm text-secondary">Salle</span><span className="text-sm">ON AIR Clichy</span>
          </div>
          <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sm text-secondary">Code accès</span><span className="text-sm text-accent bold">{inviteCode}</span>
          </div>
        </div>

        <div className="section-label">NOTIFICATIONS</div>
        <div className="card">
          {[{ key: 'alerts', label: 'Alertes membres' }, { key: 'messages', label: 'Nouveaux messages' }].map(n => (
            <div key={n.key} className="flex justify-between items-center" style={{ padding: '14px 0', borderBottom: '2px solid var(--border)' }}>
              <span className="text-sm text-secondary">{n.label}</span>
              <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({...p, [n.key]: !p[n.key]}))} />
            </div>
          ))}
        </div>

        <div className="section-label">COMPTE</div>
        <button onClick={() => { logout(); navigate('/') }} style={{ width: '100%', padding: 16, background: 'transparent', border: '2px solid var(--danger)', color: 'var(--danger)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 12, cursor: 'pointer', marginBottom: 16 }}>
          SE DÉCONNECTER
        </button>
      </div>
      <CoachNav />
    </div>
  )
}
