import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import OnboardingTour from '../components/OnboardingTour'
import '../styles/fab.css'
import '../styles/member.css'

// TEMPORARY — added to verify (not guess) whether env(safe-area-inset-
// bottom) actually reports an inflated value in standalone/home-screen
// mode vs a Safari tab, per a direct report of the nav pill floating with
// far too much gap underneath it specifically in standalone mode. env()
// isn't directly readable via getComputedStyle — the standard trick is to
// assign it to a real CSS property (padding-bottom here, on an invisible
// 0-height probe) and read THAT back, since custom properties alone can
// preserve the unresolved env() token instead of a computed px value in
// some WebKit versions. Screenshot this in both Safari and the installed
// app, then this whole component + its render call below get removed —
// it's not meant to ship long-term.
function SafeAreaDebug() {
  const [info, setInfo] = useState('mesure...')
  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;bottom:0;left:0;height:0;width:0;padding-bottom:env(safe-area-inset-bottom);pointer-events:none;visibility:hidden'
    document.body.appendChild(probe)
    const sab = getComputedStyle(probe).paddingBottom
    document.body.removeChild(probe)
    const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
    setInfo(`SAB: ${sab} · ${standalone ? 'standalone (PWA)' : 'safari (onglet)'}`)
  }, [])
  return (
    <div style={{
      position: 'fixed', top: 'calc(8px + env(safe-area-inset-top))', right: 8, zIndex: 9999,
      background: 'rgba(0,0,0,0.78)', color: '#7CFC9A', fontSize: 10, fontFamily: 'monospace',
      padding: '4px 8px', borderRadius: 8, pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      {info}
    </div>
  )
}

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
  // button at all. Still hidden on /messages AND /ai-coach: this is a pure
  // position collision, not about relevance — its fixed spot (bottom:96px,
  // right:16px, z-index:95) sits directly on top of both screens' own
  // input row (mic/send buttons), regardless of what the FAB itself links
  // to. Confirmed by a real screenshot after dropping /ai-coach from this
  // list on the assumption it "wasn't needed anymore" — it still visually
  // overlapped the mic button there.
  const hideFAB = location.pathname.startsWith('/messages') || location.pathname.startsWith('/ai-coach')

  return (
    <div className="member-layout">
      <SafeAreaDebug />
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
