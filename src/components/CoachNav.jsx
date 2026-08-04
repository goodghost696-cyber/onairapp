import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchUnreadCount } from '../utils/messages'
import '../styles/nav.css'

// Flat, evenly-spaced bar — reverted from the elevated-middle-button
// treatment (matching the member nav's 5-item layout) after it proved
// unfixably lopsided with only 4 tabs: 2+1+1 has no way to center the
// elevated button without leaving uneven gaps on either side. The user
// asked for the simpler version back rather than keep chasing it.
const tabs = [
  {
    path: '/coach',
    label: 'Board',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    )
  },
  {
    path: '/coach/clients',
    label: 'Clients',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    )
  },
  {
    path: '/coach/messages',
    label: 'Messages',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    )
  },
  {
    path: '/coach/settings',
    label: 'Réglages',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    )
  },
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

  return (
    <nav className="bottom-nav">
      <div className="nav-pill">
        {tabs.map(tab => {
          let active
          if (tab.path === '/coach') {
            active = location.pathname === '/coach'
          } else if (tab.path === '/coach/clients') {
            active = location.pathname === '/coach/clients'
          } else {
            active = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
          }
          const showBadge = tab.path === '/coach/messages' && unread > 0
          return (
            <div key={tab.path} className={`nav-btn${active ? ' active' : ''}`} style={{ position: 'relative' }}
              onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate(tab.path) }}>
              {tab.icon}
              {showBadge && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid var(--bg)' }} />
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
