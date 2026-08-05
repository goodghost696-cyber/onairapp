import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CoachNav from '../components/CoachNav'
import { supabase } from '../lib/supabase'
import { fetchMemberActivitySummaries, lastSeenLabel } from '../utils/coachStats'

const STATUS_COLORS = { 'ON TRACK': 'var(--success)', 'AT RISK': 'var(--warning)', 'INACTIVE': 'var(--danger)' }
// Keys match the exact values Onboarding.jsx's goal step writes to
// profiles.objectif — see STEPS[1].options there.
const GOAL_COLORS = {
  'Prise de masse': 'var(--accent)',
  'Perte de poids': 'var(--warning)',
  'Performance': 'var(--success)',
  'Nutrition': '#2EA8FF',
}
const FILTERS = ['TOUS', 'ON TRACK', 'AT RISK', 'INACTIVE']

export default function ClientsList() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('TOUS')
  const [search, setSearch] = useState('')
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
      // Same pattern as CoachDashboard.jsx — this screen was pulling only
      // profiles.* and never merging real activity, so every card silently
      // showed "Vu — · — séances" and the status filter chips never matched
      // anything (m.status was always undefined).
      const summaries = await fetchMemberActivitySummaries(data.map(m => m.user_id))
      if (cancelled) return
      setMembers(data.map(m => ({ ...m, ...summaries[m.user_id] })))
      setLoading(false)
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  const filtered = members.filter(m => {
    const matchFilter = filter === 'TOUS' || m.status === filter
    const matchSearch = (m.prenom || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 8px' }}>
          <h1 className="text-xl bold">Mes Clients</h1>
          <span className="text-xs text-muted">{loading ? '...' : `${members.length} membres`}</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..." style={{ paddingLeft: 40 }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              color: filter === f ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: filter === f ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '4px 8px', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{f}</button>
          ))}
        </div>

        {loading && <p className="text-sm text-muted">Chargement des clients...</p>}

        <div className="coach-grid">
          {!loading && filtered.map((m, i) => (
            <div key={m.id} className="card card-animated" style={{ '--delay': `${i*40}ms`, cursor: 'pointer', marginBottom: 8 }} onClick={() => navigate(`/coach/member/${m.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)', border: `1.5px solid ${STATUS_COLORS[m.status] || 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: STATUS_COLORS[m.status] || 'var(--text-muted)', flexShrink: 0 }}>
                  {m.prenom?.[0] || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 2 }}>
                    <span className="text-base bold">{m.prenom}</span>
                    <span style={{ fontSize: 9, border: `1px solid ${GOAL_COLORS[m.objectif] || 'var(--border)'}`, color: GOAL_COLORS[m.objectif] || 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>{m.objectif || '-'}</span>
                  </div>
                  <div className="text-xs text-muted">Vu {lastSeenLabel(m.lastActiveDate).toLowerCase()} · {m.sessionsThisWeek ?? 0} séance{m.sessionsThisWeek > 1 ? 's' : ''}</div>
                  <div className="progress-bar" style={{ marginTop: 6 }}>
                    <div className="progress-fill" style={{ width: `${Math.min((m.sessionsThisWeek || 0)/8*100,100)}%` }} />
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
      <CoachNav />
    </div>
  )
}
