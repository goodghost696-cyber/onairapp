import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/nav.css'

const tabs = [
  {
    path: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )
  },
  {
    path: '/nutrition',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    )
  },
  {
    path: '/workout',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5h11M6.5 17.5h11M6.5 12h11M3 6.5h.01M3 12h.01M3 17.5h.01M21 6.5h-.01M21 12h-.01M21 17.5h-.01"/>
      </svg>
    )
  },
  {
    path: '/run',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/>
        <path d="M8 21l2-8-2-3h8l-2 3 2 8"/>
        <path d="M6 12l-2 2M18 12l2 2"/>
      </svg>
    )
  },
  {
    path: '/ai-coach',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    )
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const active = location.pathname === tab.path || (tab.path === '/workout' && location.pathname.startsWith('/workout'))
        return (
          <div key={tab.path} className={`nav-btn${active ? ' active' : ''}`}
            onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate(tab.path) }}>
            {tab.icon}
          </div>
        )
      })}
    </nav>
  )
}
