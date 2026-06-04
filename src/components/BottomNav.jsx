import { useState } from 'react'
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
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/>
        <path d="M7 2v20"/>
        <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
      </svg>
    )
  },
  {
    path: '/workout',
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="11" x2="15" y2="11"/>
        <rect x="1" y="8.5" width="3.5" height="5" rx="1.5"/>
        <rect x="17.5" y="8.5" width="3.5" height="5" rx="1.5"/>
        <rect x="4.5" y="7" width="2.5" height="8" rx="1"/>
        <rect x="15" y="7" width="2.5" height="8" rx="1"/>
      </svg>
    )
  },
  {
    path: '/weekly',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )
  },
  {
    path: '/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    )
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <>
      {showMenu && (
        <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
      )}
      {showMenu && (
        <div style={{ position: 'fixed', bottom: 88, right: 16, zIndex: 99, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {[
            { label: 'Coach IA', path: '/ai-coach' },
            { label: 'Mon Coach', path: '/messages' },
          ].map((item, i) => (
            <button key={item.path} onClick={() => { setShowMenu(false); navigate(item.path) }} style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              color: 'var(--text-primary)', padding: '10px 16px', borderRadius: 50,
              fontSize: 12, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              transform: showMenu ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
              transition: `transform 200ms cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms, opacity 200ms ease ${i * 40}ms`,
              opacity: showMenu ? 1 : 0,
            }}>{item.label}</button>
          ))}
        </div>
      )}
      <button onClick={() => setShowMenu(m => !m)} style={{
        position: 'fixed', bottom: 88, right: 16, zIndex: 100,
        width: 44, height: 44, borderRadius: '50%',
        background: showMenu ? 'var(--surface-2)' : 'var(--accent)',
        border: showMenu ? '0.5px solid var(--border)' : 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: showMenu ? 'none' : '0 4px 16px rgba(224,0,0,0.35)',
        transition: 'all 200ms ease',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showMenu ? 'var(--text-primary)' : '#000'} strokeWidth="2.5" strokeLinecap="round" style={{ transform: showMenu ? 'rotate(45deg)' : 'none', transition: 'transform 200ms ease' }}>
          {showMenu ? (
            <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
          ) : (
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          )}
        </svg>
      </button>
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
    </>
  )
}
