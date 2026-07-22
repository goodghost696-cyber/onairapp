import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CoachNav from '../components/CoachNav'

export default function CoachMessages() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchMembers() {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'member')
      if (!cancelled) {
        if (!error && data) setMembers(data)
        setLoading(false)
      }
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 12px' }}>
          <h1 className="text-xl bold">Messages</h1>
        </div>
        {/* No messages table exists yet — this lists real clients so a coach
            can reach a member's conversation screen, but there's no real
            chat history to preview here until messaging is persisted as
            its own piece of work. */}
        {loading && <p className="text-sm text-muted">Chargement...</p>}
        {!loading && members.length === 0 && <p className="text-sm text-muted">Aucun client pour l'instant.</p>}
        {members.map(m => (
          <div key={m.id} className="card" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => navigate(`/coach/messages/${m.id}`)}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-ink)', flexShrink: 0 }}>{m.prenom?.[0] || '?'}</div>
              <div style={{ flex: 1 }}>
                <div className="text-base bold">{m.prenom}</div>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>Aucune conversation pour l'instant</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CoachNav />
    </div>
  )
}
