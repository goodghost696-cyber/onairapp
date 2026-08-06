import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
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

function QuickExerciseSheet({ onClose }) {
  const { logQuickExercise } = useApp()
  const [name, setName] = useState('')
  const [setsCount, setSetsCount] = useState('3')
  const [reps, setReps] = useState('10')
  const [kg, setKg] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await logQuickExercise({
      name: name.trim(),
      setsCount: Math.max(1, parseInt(setsCount) || 1),
      reps: parseInt(reps) || 0,
      kg: parseFloat(kg) || 0,
    })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: 'var(--surface-solid)',
        borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--border)',
        padding: '24px 20px 40px', zIndex: 200,
      }}>
        <h2 className="text-lg bold" style={{ marginBottom: 16 }}>Ajouter un exercice</h2>
        <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>NOM DE L'EXERCICE</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex. Développé couché"
          autoFocus
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>SÉRIES</label>
            <input type="number" inputMode="numeric" value={setsCount} onChange={e => setSetsCount(e.target.value)} style={{ textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>RÉPS</label>
            <input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} style={{ textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>KG</label>
            <input type="number" inputMode="decimal" value={kg} onChange={e => setKg(e.target.value)} placeholder="0" style={{ textAlign: 'center' }} />
          </div>
        </div>
        <button className="btn-accent" onClick={handleSave} disabled={saving || !name.trim()} style={{ opacity: saving || !name.trim() ? 0.6 : 1 }}>
          {saving ? '...' : 'ENREGISTRER'}
        </button>
      </div>
    </>
  )
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false)
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

  return (
    <>
      <nav className={`bottom-nav${hidden ? ' hidden' : ''}`}>
        {menuOpen && <div className="nav-add-overlay" onClick={() => setMenuOpen(false)} />}

        {menuOpen && (
          <div className="nav-add-menu">
            <button
              className="nav-add-menu-item"
              onClick={() => { setMenuOpen(false); navigate('/nutrition', { state: { openAddMeal: true } }) }}
            >
              🍽️ Nouveau repas
            </button>
            <button
              className="nav-add-menu-item"
              onClick={() => { setMenuOpen(false); setExerciseSheetOpen(true) }}
            >
              🏋️ Nouvel exercice
            </button>
          </div>
        )}

        <div className="nav-pill">
          {leftTabs.map(renderTab)}

          <button
            className={`nav-btn nav-btn-elevated${menuOpen ? ' active' : ''}`}
            onClick={() => { navigator.vibrate && navigator.vibrate(6); setMenuOpen(o => !o) }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {rightTabs.map(renderTab)}
        </div>
      </nav>

      {exerciseSheetOpen && <QuickExerciseSheet onClose={() => setExerciseSheetOpen(false)} />}
    </>
  )
}
