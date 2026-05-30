import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/global.css'
import '../styles/nav.css'

const tabs = [
  { path: '/dashboard', label: 'Home', icon: (active) => (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  )},
  { path: '/nutrition', label: 'Nutrition', icon: (active) => (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'}>
      <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-1.96-.96-3.37-2.34-4.73-1.13-1.09-2.83-1.95-4.69-2.15V5.99H7v2.12C4.17 8.46 1 10.08 1 14.99v1h15.03v-1z"/>
    </svg>
  )},
  { path: '/workout', label: 'Workout', icon: (active) => (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'}>
      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
    </svg>
  )},
  { path: '/run', label: 'Run', icon: (active) => (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'}>
      <circle cx="13.49" cy="3.01" r="2"/>
      <path d="M6.28 23.65L8 22l5-5 2 2 2.07-2.07C15.17 15.96 14 14.11 14 12c0-.68.12-1.32.32-1.93L11 13H8l-3 7.65L6.28 23.65zm14.12-4.9L19 17.5l-3.5 3.5 1.41 1.41L19 19.83l1.41 1.41.41-.41.41-.41-.41-2.67zM9.5 11.5c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm2-6.5c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1z"/>
    </svg>
  )},
  { path: '/ai-coach', label: 'AI Coach', icon: (active) => (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'} strokeWidth="2">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
      <path d="M12 6v6l4 2"/>
      <circle cx="12" cy="12" r="3" fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.35)'} stroke="none"/>
    </svg>
  )},
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const active = location.pathname === tab.path
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
