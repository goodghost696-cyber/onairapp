import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchUnreadCount } from '../utils/messages'
import Icon from './Icon'
import '../styles/coach-nav-redesign.css'

// Nav coach du restyle (handoff "Redesign interface VOLTA (8)") — nouveau
// composant, indépendant de CoachNav.jsx (voir ce fichier : encore utilisé
// tel quel par CoachMessages/CoachPrograms/CoachSettings, pas migrés cette
// session). Les deux coexistent le temps de la migration écran par écran ;
// CoachNav.jsx sera retiré une fois les 6 écrans coach passés au nouveau
// design.
//
// Mécanisme de la pastille : EXACTEMENT celui de la nav membre
// (BottomNav.jsx/nav.css, --nav-active-index / --nav-tab-count, transform
// + transition 240ms cubic-bezier(0.4,0,0.2,1)) — demandé explicitement
// pour ne pas réimplémenter une deuxième version différente. Seul l'habillage
// visuel change (voir coach-nav-redesign.css) : fond encre opaque plutôt que
// le glass clair de la nav membre, le handoff design ne demandant pas de
// frost ici.
const TABS = [
  { path: '/coach', label: 'Board', icon: 'clipboard' },
  { path: '/coach/clients', label: 'Clients', icon: 'users' },
  { path: '/coach/messages', label: 'Messages', icon: 'message-circle' },
  { path: '/coach/settings', label: 'Réglages', icon: 'settings' },
]

export default function CoachNavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchUnreadCount(user.id).then(count => { if (!cancelled) setUnread(count) })
    return () => { cancelled = true }
  }, [user?.id, location.pathname])

  function isActive(tab) {
    if (tab.path === '/coach') return location.pathname === '/coach'
    if (tab.path === '/coach/clients') return location.pathname === '/coach/clients'
    return location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
  }

  const rawIndex = TABS.findIndex(isActive)
  const activeIndex = rawIndex < 0 ? 0 : rawIndex

  return (
    <nav className="coach-nav" style={{ '--nav-tab-count': TABS.length, '--nav-active-index': activeIndex }}>
      <span className="coach-nav-indicator" aria-hidden="true" />
      {TABS.map(tab => {
        const active = isActive(tab)
        const showBadge = tab.path === '/coach/messages' && unread > 0
        return (
          <button
            key={tab.path}
            className={`coach-nav-item${active ? ' active' : ''}`}
            aria-label={tab.label}
            onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate(tab.path) }}
          >
            <Icon name={tab.icon} size={17} strokeWidth={2} />
            {active && <span className="coach-nav-label">{tab.label}</span>}
            {showBadge && <span className="coach-nav-badge" />}
          </button>
        )
      })}
    </nav>
  )
}
