import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/nav.css'

const tabs = [
  { path: '/coach', label: 'Dashboard', icon: (active) => (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'}>
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
    </svg>
  )},
  { path: '/coach/members', label: 'Membres', icon: (active) => (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'}>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  )},
  { path: '/coach/settings', label: 'Paramètres', icon: (active) => (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'}>
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  )},
]

export default function CoachNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const active = location.pathname === tab.path || (tab.path === '/coach' && location.pathname === '/coach')
        return (
          <div
            key={tab.path}
            className={`nav-item${active ? ' active' : ''}`}
            onClick={() => {
              navigator.vibrate && navigator.vibrate(6)
              navigate(tab.path)
            }}
          >
            {tab.icon(active)}
            <span className="nav-label">{tab.label}</span>
          </div>
        )
      })}
    </nav>
  )
}
