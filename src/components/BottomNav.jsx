import { useNavigate, useLocation } from 'react-router-dom'
import { House, ForkKnife, Sparkle, ChartBar, Barbell } from '@phosphor-icons/react'
import '../styles/nav.css'

// Switched from lucide-react to Phosphor for this bar specifically — asked
// for directly ("t'as pas autre que lucide react") — Phosphor's "regular"
// weight is the closer match to the reference screenshot's icon style, and
// its weight prop (regular -> fill on the active tab) gives a proper
// active-state distinction for free instead of just a color change.
const tabs = [
  { path: '/dashboard', label: 'Accueil', Icon: House },
  { path: '/nutrition', label: 'Nutrition', Icon: ForkKnife },
  { path: '/ai-coach', label: 'Coach IA', Icon: Sparkle },
  { path: '/weekly', label: 'Bilan', Icon: ChartBar },
  { path: '/workout', label: 'Entraînement', Icon: Barbell },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  function isActive(tab) {
    if (tab.path === '/workout') return location.pathname.startsWith('/workout')
    return location.pathname === tab.path
  }

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const active = isActive(tab)
        return (
          <button
            key={tab.path}
            className={`nav-btn${active ? ' active' : ''}`}
            onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate(tab.path) }}
          >
            <tab.Icon size={22} weight={active ? 'fill' : 'regular'} />
            <span className="nav-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
