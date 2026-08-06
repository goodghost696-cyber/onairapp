import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPrimaryCoach, fetchConversationSummaries } from '../utils/messages'

function formatTime(iso) {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function Messages() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [coach, setCoach] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      const coachData = await fetchPrimaryCoach()
      if (cancelled) return
      setCoach(coachData)
      if (coachData) {
        const summaries = await fetchConversationSummaries(user.id)
        if (!cancelled) setSummary(summaries[coachData.user_id] || null)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

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
        </div>

        {loading && <p className="text-sm text-muted">Chargement...</p>}
        {!loading && !coach && <p className="text-sm text-muted">Aucun coach disponible pour l'instant.</p>}
        {!loading && coach && (
          <div className="card card-animated" style={{ cursor: 'pointer', '--delay': '0ms' }} onClick={() => navigate('/messages/coach')}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-ink)', flexShrink: 0 }}>
                {(coach.prenom?.[0] || 'C').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-base bold">{coach.prenom || 'Coach'} · Coach ON AIR</div>
                <div className="text-sm text-muted" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {summary?.lastMessage ? summary.lastMessage.content : "Aucune conversation pour l'instant"}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {summary?.lastMessage && <span className="text-xs text-muted">{formatTime(summary.lastMessage.created_at)}</span>}
                {summary?.unreadCount > 0 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
