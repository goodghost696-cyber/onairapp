import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchConversationSummaries } from '../utils/messages'
import { fetchCoachRoster } from '../utils/coachStats'
import CoachNav from '../components/CoachNav'
import Icon from '../components/Icon'
import { activable } from '../utils/a11y'

function formatTime(iso) {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function CoachMessages() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      // Roster d'identité : ne pas partager ses données de suivi n'a rien à
      // voir avec le fait de pouvoir échanger avec son coach. Avec un
      // `profiles.select('*')` (gaté), ces membres disparaissaient de la
      // messagerie — un effet de bord que le consentement n'a jamais visé.
      const [membersData, summariesData] = await Promise.all([
        fetchCoachRoster(),
        fetchConversationSummaries(user.id),
      ])
      if (cancelled) return
      setMembers(membersData)
      setSummaries(summariesData)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  // Members with a real conversation first (most recent message first),
  // then the rest alphabetically — a coach cares most about who's waiting
  // on a reply.
  const sorted = [...members].sort((a, b) => {
    const sa = summaries[a.user_id]?.lastMessage?.created_at
    const sb = summaries[b.user_id]?.lastMessage?.created_at
    if (sa && sb) return sa < sb ? 1 : -1
    if (sa) return -1
    if (sb) return 1
    return (a.prenom || '').localeCompare(b.prenom || '')
  })

  return (
    <div className="app-wrapper">
      <div className="screen">
        <div className="screen-header" style={{ padding: '20px 0 12px' }}>
          <h1 className="text-xl bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="message-circle" size={20} /> Messages</h1>
        </div>
        {loading && <p className="text-sm text-muted">Chargement...</p>}
        {!loading && sorted.length === 0 && <p className="text-sm text-muted">Aucun client pour l'instant.</p>}
        <div className="coach-grid">
          {sorted.map((m, i) => {
            const summary = summaries[m.user_id]
            const unread = summary?.unreadCount > 0
            return (
              <div key={m.id} className="card card-animated" style={{ cursor: 'pointer', marginBottom: 8, '--delay': `${Math.min(i, 6) * 40}ms` }} {...activable(() => navigate(`/coach/messages/${m.id}`), { label: `Conversation avec ${m.prenom}${unread ? ' — messages non lus' : ''}` })}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-ink)', flexShrink: 0 }}>{m.prenom?.[0] || '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-base bold">{m.prenom}</div>
                    {/* Email always shown, not just when names collide — several
                        members can share a first name (two "Arnaud" caused a
                        coach to message the wrong one on 2026-08-04), and this
                        is the one unambiguous identifier available client-side. */}
                    <div className="text-xs text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    <div className="text-sm text-muted" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {summary?.lastMessage ? summary.lastMessage.content : "Aucune conversation pour l'instant"}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {summary?.lastMessage && <span className="text-xs text-muted">{formatTime(summary.lastMessage.created_at)}</span>}
                    {unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <CoachNav />
    </div>
  )
}
