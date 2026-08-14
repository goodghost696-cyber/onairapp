import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGymConfig } from '../hooks/useGymConfig'
import Logo from '../components/Logo'
import SplashIntro from '../components/SplashIntro'
import '../styles/landing.css'
import '../styles/landing-redesign.css'

export default function Landing() {
  const navigate = useNavigate()
  const gym = useGymConfig()
  const [visible, setVisible] = useState(false)
  // Plays every time someone lands here (not a one-time-ever flag) — the
  // real Landing content below mounts and starts its own entrance timers
  // immediately too, it's just sitting under an opaque overlay until this
  // resolves, so there's no extra wait once the splash clears.
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  // Landing is deliberately always dark (the neon splash), independent of
  // the in-app theme toggle — but that toggle persists globally via
  // data-theme on <html>, so body/#root's margins outside the 390px column
  // would otherwise pick up the light theme's background while this
  // screen's own content stays hardcoded dark (white borders bleeding in
  // around the splash on any viewport wider than 390px). Force dark chrome
  // while this screen is mounted, restore whatever was there before on
  // unmount so the real app theme resumes correctly after login.
  useEffect(() => {
    const html = document.documentElement
    const prev = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'dark')
    return () => { html.setAttribute('data-theme', prev || 'dark') }
  }, [])

  // Même fix que les 7 écrans restylés précédents (voir dashboard.css/
  // JOURNAL.md) : sans ça, la zone de padding-top de #root (safe-area/
  // notch iOS) laisse transparaître le dégradé corail de <body> (toujours
  // peint, indépendamment du data-theme forcé ci-dessus) plutôt que le
  // crème de ce restyle — même bug de seam que sur Dashboard/
  // WorkoutSession, prévenu ici directement.
  useEffect(() => {
    document.body.classList.add('landing-body-bg')
    return () => document.body.classList.remove('landing-body-bg')
  }, [])

  return (
    <div className="landing landing-redesign">
      {showSplash && <SplashIntro onDone={() => setShowSplash(false)} />}
      <div className="landing-topbar">
        <span className="landing-brand">{gym.name}</span>
        {gym.city && <span className="landing-city">{gym.city}</span>}
      </div>

      <div className="landing-hero">
        <div className={`landing-content${visible ? ' visible' : ''}`}>
          <span className="landing-kicker">REPOUSSE TES LIMITES</span>
          <Logo variant="lockup" orientation="row" size={44} className="landing-logo" />
          <p className="landing-subtitle">
            Suis ta nutrition, tes séances, ta progression. Ton coach dans ta poche.
          </p>
        </div>
      </div>

      <div className={`landing-ctas${visible ? ' visible' : ''}`}>
        <button
          className="landing-btn landing-btn-primary"
          onClick={() => navigate('/login', { state: { tab: 'signup' } })}
        >
          Rejoindre la salle →
        </button>
        <button
          className="landing-btn landing-btn-secondary"
          onClick={() => navigate('/login', { state: { tab: 'login' } })}
        >
          Accès coach →
        </button>
      </div>

      {gym.address && (
        <div className="landing-footer">
          {gym.name} · {gym.address}
        </div>
      )}
    </div>
  )
}
