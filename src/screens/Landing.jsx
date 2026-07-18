import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGymConfig } from '../hooks/useGymConfig'
import '../styles/landing.css'

function Arrow({ className }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 18 L18 6 M18 6 H9 M18 6 V15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const gym = useGymConfig()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="landing">
      <div className="landing-topbar">
        <span className="landing-brand">{gym.name}</span>
        {gym.city && <span className="landing-city">{gym.city}</span>}
      </div>

      <div className="landing-hero">
        <span className="landing-bg-text" aria-hidden="true">ON AIR</span>

        <div className={`landing-content${visible ? ' visible' : ''}`}>
          <span className="landing-kicker">// REPOUSSE</span>
          <h1 className="landing-title">
            Tes limites.<br />
            <span className="landing-title-accent">Chaque jour.</span>
          </h1>
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
          Rejoindre la salle
          <Arrow className="landing-btn-arrow" />
        </button>
        <button
          className="landing-btn landing-btn-secondary"
          onClick={() => navigate('/login', { state: { tab: 'login' } })}
        >
          Accès coach
          <Arrow className="landing-btn-arrow" />
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
