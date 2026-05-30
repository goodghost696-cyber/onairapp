import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/landing.css'

export default function Landing() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 50)
  }, [])

  return (
    <div className="app-wrapper">
      <div className="landing">
        <div className="landing-topbar">
          <span className="text-xs text-muted">ON AIR FITNESS</span>
          <span className="text-xs text-muted">Clichy</span>
        </div>

        <div className="landing-hero">
          <div className="landing-bg-text">ON AIR</div>
          <div className={`landing-content ${visible ? 'visible' : ''}`}>
            <span className="text-xs text-muted" style={{ marginBottom: 8, display: 'block' }}>REPOUSSE</span>
            <div className="text-xl bold text-primary" style={{ marginBottom: 4 }}>Tes limites.</div>
            <div className="text-xl bold text-accent" style={{ marginBottom: 20 }}>Chaque jour.</div>
            <p className="text-base text-secondary" style={{ maxWidth: 300 }}>
              Suis ta nutrition, tes séances, ta progression. Ton coach dans ta poche.
            </p>
          </div>
        </div>

        <div className={`landing-ctas ${visible ? 'visible' : ''}`}>
          <button className="btn-accent" onClick={() => navigate('/login')}>
            REJOINDRE LA SALLE
          </button>
          <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => navigate('/login')}>
            ACCÈS COACH
          </button>
        </div>

        <div className="landing-footer">
          <span className="text-xs text-muted">ON AIR FITNESS · Clichy · 75 rue Henri Barbusse</span>
        </div>
      </div>
    </div>
  )
}
