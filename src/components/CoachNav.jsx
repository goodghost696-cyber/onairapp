import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchUnreadCount } from '../utils/messages'
import { SquaresFour, Users, ChatCircle, Gear } from '@phosphor-icons/react'
import '../styles/nav.css'

// Same fixed glass bar as the member nav (BottomNav.jsx) — "ça concerne
// les deux" — icons switched from hand-drawn inline SVGs to Phosphor
// (same reasoning as BottomNav.jsx: matches the reference style, and
// weight-swap on active gives a real active state instead of just color).
const tabs = [
  { path: '/coach', label: 'Board', Icon: SquaresFour },
  { path: '/coach/clients', label: 'Clients', Icon: Users },
  { path: '/coach/messages', label: 'Messages', Icon: ChatCircle },
  { path: '/coach/settings', label: 'Réglages', Icon: Gear },
]

export default function CoachNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  // Nav is remounted on every coach-screen navigation (each screen renders
  // its own <CoachNav />), so a fetch-on-mount here naturally stays fresh
  // without extra subscription logic.
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

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const active = isActive(tab)
        const showBadge = tab.path === '/coach/messages' && unread > 0
        return (
          <button
            key={tab.path}
            className={`nav-btn${active ? ' active' : ''}`}
            aria-label={tab.label}
            style={{ position: 'relative' }}
            onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate(tab.path) }}
          >
            <tab.Icon size={22} weight={active ? 'fill' : 'regular'} />
            {showBadge && (
              <span style={{ position: 'absolute', top: 4, right: '24%', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid var(--surface)' }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
