import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/nav.css'

const leftTabs = [
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
]

const rightTabs = [
  {
    path: '/weekly',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="10" width="4" height="10" rx="1"/>
        <rect x="10" y="4" width="4" height="16" rx="1"/>
        <rect x="16" y="12" width="4" height="8" rx="1"/>
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
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    // #root is the app's single real scroll container (see global.css) —
    // was 'oa-scroll', an id nothing in the app ever set, so this always
    // silently fell back to `window`. Harmless while the document itself
    // scrolled, but window stopped scrolling entirely once #root became
    // the dedicated scroll owner, which would have made the nav-hide-on-
    // scroll behavior below permanently inert.
    const scrollEl = document.getElementById('root') || window
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

  function renderTab(tab) {
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
  }

  // Coach IA now lives in the elevated center slot instead of a "+" that
  // opened a quick-add menu (Nouveau repas / Nouvel exercice) — the AI
  // floating button on the side was taking up too much visual space on top
  // of content, per user feedback. Not a functional loss: "Nouveau repas"
  // is still one tap away from Nutrition's own FAB, and a quick exercise can
  // now be logged by just telling the AI Coach directly (log_quick_exercise
  // tool) instead of filling a separate form.
  const aiActive = location.pathname.startsWith('/ai-coach')

  return (
    <nav className={`bottom-nav${hidden ? ' hidden' : ''}`}>
      <div className="nav-pill">
        {leftTabs.map(renderTab)}

        {/* No icon on purpose — the sphere itself is the AI indicator,
            same language as VoiceMode's orb (see nav.css .nav-btn-elevated). */}
        <button
          className={`nav-btn nav-btn-elevated${aiActive ? ' active' : ''}`}
          onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate('/ai-coach') }}
          aria-label="Coach IA"
        />

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  )
}
