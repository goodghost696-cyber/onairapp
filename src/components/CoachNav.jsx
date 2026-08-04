import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchUnreadCount } from '../utils/messages'
import '../styles/nav.css'

// "Board" (CoachDashboard) is rendered separately, elevated in the middle
// of the bar — same treatment as the member nav's raised lime circle —
// per the user's request to match the member nav bar's look.
const boardTab = {
  path: '/coach',
  label: 'Board',
  icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

const leftTabs = [
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
]

const rightTabs = [
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

  function isActive(path) {
    if (path === '/coach') return location.pathname === '/coach'
    if (path === '/coach/clients') return location.pathname === '/coach/clients'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  function renderTab(tab) {
    const active = isActive(tab.path)
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
  }

  return (
    <nav className="bottom-nav">
      <div className="nav-pill">
        {/* Explicit flex:1 side groups (see .nav-pill-side in nav.css) so
            the elevated button sits at the bar's true visual center
            regardless of how many icons are on each side — with only
            justify-content:space-between across 4 flat items (2 left, 1
            elevated, 1 right), it landed 3rd-of-4, visibly off-center. */}
        <div className="nav-pill-side left">{leftTabs.map(renderTab)}</div>

        <div
          className={`nav-btn nav-btn-elevated${isActive(boardTab.path) ? ' nav-tab-active' : ''}`}
          onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate(boardTab.path) }}
        >
          {boardTab.icon}
        </div>

        <div className="nav-pill-side right">{rightTabs.map(renderTab)}</div>
      </div>
    </nav>
  )
}
