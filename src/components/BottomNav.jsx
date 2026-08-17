import { useNavigate, useLocation } from 'react-router-dom'
import { House, ForkKnife, Sparkle, ChartBar, Barbell } from '@phosphor-icons/react'
import '../styles/nav.css'

// Icons-only (option B, chosen directly over icon+label) — label kept here
// only for aria-label/accessibility, not rendered visually. Phosphor's
// weight prop (regular -> fill on the active tab) gives a proper
// active-state distinction on top of the coral glow (nav.css).
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

  // Jusqu'ici l'état actif n'était qu'un swap de couleur (+ weight
  // regular->fill, deux tracés SVG Phosphor différents, non interpolables)
  // directement sur l'icône : rien ne se déplaçait, donc rien ne pouvait
  // glisser. La pastille ci-dessous est un élément à part, positionné en
  // absolu ; seul son transform change d'un onglet à l'autre, ce qui laisse
  // la transition CSS (nav.css) faire le glissement.
  const activeIndex = tabs.findIndex(isActive)

  return (
    <nav className="bottom-nav">
      <span
        className="nav-indicator"
        style={{ '--nav-tab-count': tabs.length, '--nav-active-index': activeIndex }}
        aria-hidden="true"
      />
      {tabs.map(tab => {
        const active = isActive(tab)
        return (
          <button
            key={tab.path}
            className={`nav-btn${active ? ' active' : ''}`}
            aria-label={tab.label}
            onClick={() => { navigator.vibrate && navigator.vibrate(6); navigate(tab.path) }}
          >
            <tab.Icon size={22} weight={active ? 'fill' : 'regular'} />
          </button>
        )
      })}
    </nav>
  )
}
