import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPrimaryCoach, fetchConversationSummaries } from '../utils/messages'
import { activable } from '../utils/a11y'
import '../styles/messages-redesign.css'

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

  // Même fix que les écrans membre restylés précédemment (voir
  // dashboard.css/JOURNAL.md) : couvre le rubber-band iOS. Classe active
  // seulement tant que ce screen est monté.
  useEffect(() => {
    document.body.classList.add('messages-body-bg')
    return () => document.body.classList.remove('messages-body-bg')
  }, [])

  return (
    <div className="app-wrapper messages-redesign">
      <div className="screen messages-screen">
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '22px 0 18px' }}>
          <button className="msg-back-btn" onClick={() => navigate('/dashboard')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--msg-ink)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="msg-title">Messages</h1>
        </div>

        {loading && <p className="msg-empty">Chargement...</p>}
        {!loading && !coach && <p className="msg-empty">Aucun coach disponible pour l'instant.</p>}
        {!loading && coach && (
          <div className="card msg-conversation-card card-animated" style={{ cursor: 'pointer', '--delay': '0ms' }} {...activable(() => navigate('/messages/coach'), { label: `Conversation avec ${coach.prenom || 'ton coach'}${summary?.unreadCount > 0 ? ' — messages non lus' : ''}` })}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="msg-avatar">
                {(coach.prenom?.[0] || 'C').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="msg-coach-name">{coach.prenom || 'Coach'} · Coach VOLTA</div>
                <div className="msg-last-message">
                  {summary?.lastMessage ? summary.lastMessage.content : "Aucune conversation pour l'instant"}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {summary?.lastMessage && <span className="msg-time">{formatTime(summary.lastMessage.created_at)}</span>}
                {summary?.unreadCount > 0 && <div className="msg-unread-dot" />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
