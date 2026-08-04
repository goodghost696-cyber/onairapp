import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchMemberActivitySummaries, lastSeenLabel } from '../utils/coachStats'
import CoachNav from '../components/CoachNav'

const STATUS_COLORS = { 'ON TRACK': 'var(--success)', 'AT RISK': 'var(--warning)', 'INACTIVE': 'var(--danger)' }

export default function CoachDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchMembers() {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
      if (cancelled) return
      if (error || !data) { setLoading(false); return }

      const summaries = await fetchMemberActivitySummaries(data.map(m => m.user_id))
      if (cancelled) return
      setMembers(data.map(m => ({ ...m, ...summaries[m.user_id] })))
      setLoading(false)
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  const alerts = members.filter(m => m.status && m.status !== 'ON TRACK')
  const activeToday = members.filter(m => m.lastActiveDate && lastSeenLabel(m.lastActiveDate) === "Aujourd'hui")
  const sessionsThisWeekTotal = members.reduce((sum, m) => sum + (m.sessionsThisWeek || 0), 0)

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <div>
            <span className="text-xs bold" style={{ color: 'var(--accent-secondary)' }}>ON AIR</span>
            <span className="text-xs text-muted" style={{ marginLeft: 10 }}>Coach · {user?.name}</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { logout(); navigate('/') }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        <h1 className="text-xl bold" style={{ marginBottom: 20 }}>Tableau de bord</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
          {[
            { label: 'Clients', val: loading ? '-' : members.length },
            { label: 'Séances (7j)', val: loading ? '-' : sessionsThisWeekTotal },
            { label: 'Alertes', val: loading ? '-' : alerts.length, danger: true },
            { label: 'Actifs', val: loading ? '-' : activeToday.length },
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
                  <span className="text-base bold">{m.prenom}</span>
                  <span className="text-xs text-accent">VOIR →</span>
                </div>
                <div className="text-sm text-secondary" style={{ marginTop: 4 }}>
                  {m.status === 'INACTIVE'
                    ? `Dernière activité : ${lastSeenLabel(m.lastActiveDate).toLowerCase()}`
                    : `${m.sessionsThisWeek || 0} séance${m.sessionsThisWeek > 1 ? 's' : ''} cette semaine · dernière activité ${lastSeenLabel(m.lastActiveDate).toLowerCase()}`}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="section-label">ACTIFS AUJOURD'HUI</div>
        {loading && <p className="text-sm text-muted">Chargement des clients...</p>}
        {!loading && activeToday.length === 0 && <p className="text-sm text-muted">Personne d'actif aujourd'hui pour l'instant.</p>}
        {!loading && activeToday.map(m => (
          <div key={m.id} className="card" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => navigate(`/coach/member/${m.id}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', border: `1.5px solid ${STATUS_COLORS[m.status] || 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: STATUS_COLORS[m.status] || 'var(--text-muted)', flexShrink: 0 }}>
                {m.prenom?.[0] || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex justify-between items-center">
                  <span className="text-base bold">{m.prenom}</span>
                  <span style={{ fontSize: 10, color: STATUS_COLORS[m.status] || 'var(--text-muted)', border: `1px solid ${STATUS_COLORS[m.status] || 'var(--border)'}`, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>{m.status || '-'}</span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>{m.sessionsThisWeek || 0} séance{m.sessionsThisWeek > 1 ? 's' : ''} cette semaine</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CoachNav />
    </div>
  )
}
