import { useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import OnboardingTour from '../components/OnboardingTour'
import '../styles/fab.css'
import '../styles/member.css'

const MemberLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Scopes the desktop-responsive rules in member.css to member routes only
  // — same "toggle a class while mounted" mechanism as CoachLayout.jsx.
  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('member-shell')
    return () => root?.classList.remove('member-shell')
  }, [])

  // Used to open a 2-item menu (Coach IA / Mon Coach) — now a single direct
  // shortcut to messages, since Coach IA moved into the bottom nav itself
  // (replacing the "+" — see BottomNav.jsx) and no longer needs this floating
  // button at all. Still hidden on /messages: its position (bottom:96px,
  // right:16px, z-index:95) sits on top of that screen's own send button,
  // and it's redundant there anyway — you're already in the conversation it opens.
  const hideFAB = location.pathname.startsWith('/messages')

  return (
    <div className="member-layout">
      <Outlet />
      <BottomNav />
      <OnboardingTour variant="member" />

      {!hideFAB && (
        <div className="fab-container">
          <button className="fab-btn" onClick={() => navigate('/messages')} aria-label="Mon Coach">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 3V5a1 1 0 011-1z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default MemberLayout
