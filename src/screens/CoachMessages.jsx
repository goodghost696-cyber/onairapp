import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchConversationSummaries } from '../utils/messages'
import { fetchCoachRoster } from '../utils/coachStats'
import CoachNavBar from '../components/CoachNavBar'
import Icon from '../components/Icon'
import { activable } from '../utils/a11y'
import '../styles/CoachMessages-redesign.css'

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

  // Même raison que CoachDashboard/ClientsList-redesign.css : évite que le
  // rubber-band iOS au-delà des limites du wrapper ne retombe sur le
  // dégradé corail partagé de <body>.
  useEffect(() => {
    document.body.classList.add('coachmessages-body-bg')
    return () => document.body.classList.remove('coachmessages-body-bg')
  }, [])

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
    <div className="app-wrapper coachmessages-redesign">
      <div className="coachmessages-screen">
        <h1 className="cm-title"><Icon name="message-circle" size={20} /> Messages</h1>

        {loading && <p className="cm-loading">Chargement...</p>}
        {!loading && sorted.length === 0 && <p className="cm-empty">Aucun client pour l'instant.</p>}

        <div className="cm-list">
          {sorted.map(m => {
            const summary = summaries[m.user_id]
            const unread = summary?.unreadCount > 0
            return (
              <button key={m.id} className="cm-row" {...activable(() => navigate(`/coach/messages/${m.id}`), { label: `Conversation avec ${m.prenom}${unread ? ' — messages non lus' : ''}` })}>
                <div className="cm-avatar">{m.prenom?.[0] || '?'}</div>
                <div className="cm-body">
                  <div className="cm-name">{m.prenom}</div>
                  {/* Un membre qui ne partage pas ses données de suivi n'a pas
                      d'email dans le roster (coach_member_identity ne porte
                      pas cette colonne, exprès — voir JOURNAL.md) : rangée
                      omise plutôt que d'afficher un vide. */}
                  {m.email && <div className="cm-email">{m.email}</div>}
                  <div className={`cm-preview${summary?.lastMessage ? '' : ' empty'}`}>
                    {summary?.lastMessage ? summary.lastMessage.content : "Aucune conversation pour l'instant"}
                  </div>
                </div>
                <div className="cm-meta">
                  {summary?.lastMessage && <span className="cm-time">{formatTime(summary.lastMessage.created_at)}</span>}
                  {unread && <div className="cm-unread-dot" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <CoachNavBar />
    </div>
  )
}
