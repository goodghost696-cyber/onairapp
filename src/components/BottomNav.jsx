import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/nav.css'

const tabs = [
  {
    path: '/dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )
  },
  {
    path: '/nutrition',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20"/>
        <path d="M21 15V2s-5 2-5 8v5M17 22v-5M21 22v-5"/>
      </svg>
    )
  },
  {
    path: '/workout',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
        <line x1="6" y1="5" x2="6" y2="19"/>
        <line x1="18" y1="5" x2="18" y2="19"/>
        <line x1="2" y1="9" x2="6" y2="9"/>
        <line x1="18" y1="9" x2="22" y2="9"/>
        <line x1="2" y1="15" x2="6" y2="15"/>
        <line x1="18" y1="15" x2="22" y2="15"/>
        <line x1="6" y1="12" x2="18" y2="12"/>
      </svg>
    )
  },
  {
    path: '/weekly',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )
  },
  {
    path: '/settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    )
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const scrollEl = document.getElementById('oa-scroll') || window
    const handleScroll = () => {
      const y = scrollEl === window ? scrollEl.scrollY : scrollEl.scrollTop
      if (y > lastScrollY.current + 8) {
        setHidden(true)
      } else if (y < lastScrollY.current - 8) {
        setHidden(false)
      }
      lastScrollY.current = y
    }
    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  return (
    <nav className={`bottom-nav${hidden ? ' hidden' : ''}`}>
      <div className="nav-pill">
        {tabs.map(tab => {
          const active = location.pathname === tab.path || (tab.path === '/workout' && location.pathname.startsWith('/workout'))
          return (
            <button
              key={tab.path}
              className={`nav-btn${active ? ' active' : ''}`}
              onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate(tab.path) }}
            >
              {tab.icon}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
