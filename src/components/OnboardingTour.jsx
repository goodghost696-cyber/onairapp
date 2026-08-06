import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

// Deliberately NOT prefixed "onair_" — AuthContext.logout() wipes every
// localStorage key starting with that prefix, which would make the tour
// reappear on every single login instead of just the first one ever, for
// every account that shares this device.
// Exported so Settings.jsx / CoachSettings.jsx's "Revoir le didacticiel"
// can clear the exact same key rather than duplicating the format and
// risking it drifting out of sync.
export function storageKey(userId, variant) {
  return `ob_seen_${variant}_${userId}`
}

const SLIDES = {
  member: [
    { icon: 'home', title: 'Bienvenue sur VOLTA', text: "Ton tableau de bord réunit calories, eau, pas, sommeil et séances — tout en un coup d'œil, chaque jour." },
    { icon: 'utensils', title: 'Nutrition', text: "Ajoute un repas en cherchant un aliment, en scannant une photo, ou laisse l'IA te proposer une recette adaptée à ce qu'il te reste aujourd'hui." },
    { icon: 'dumbbell', title: 'Entraînement', text: 'Lance une séance, ajoute tes exercices et séries, et retrouve tout ton historique.' },
    { icon: 'mic', title: 'Coach IA', text: "La sphère dorée au centre de la barre du bas t'ouvre ton coach IA — pose tes questions à l'écrit ou à l'oral avec la dictée." },
    { icon: 'message-circle', title: 'Ton coach', text: 'Le bouton en bas à droite ouvre la messagerie avec ton vrai coach, qui voit ta progression en temps réel.' },
  ],
  coach: [
    { icon: 'users', title: 'Bienvenue', text: "Retrouve tous tes membres et l'activité de chacun en un coup d'œil." },
    { icon: 'clipboard', title: 'Mes clients', text: 'Suis la progression, les séances et la nutrition de chaque membre individuellement.' },
    { icon: 'message-circle', title: 'Messages', text: 'Communique directement avec tes membres depuis l\'app.' },
    { icon: 'key', title: "Code d'accès", text: "Partage ton code d'invitation (dans Réglages) pour qu'un nouveau membre rejoigne ta salle." },
  ],
}

// variant: 'member' | 'coach' — shown once per real account on this device
// (see storageKey), not once globally, so a shared gym tablet still greets
// every new member correctly.
export default function OnboardingTour({ variant }) {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const seen = localStorage.getItem(storageKey(user.id, variant))
    if (!seen) {
      setStep(0)
      setVisible(true)
    }
  }, [user?.id, variant])

  function finish() {
    if (user?.id) localStorage.setItem(storageKey(user.id, variant), '1')
    setVisible(false)
  }

  if (!visible) return null

  const slides = SLIDES[variant] || SLIDES.member
  const slide = slides[step]
  const isLast = step === slides.length - 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 480, background: 'var(--surface-solid)',
        borderRadius: '24px 24px 0 0', border: '1px solid var(--glass-border)',
        borderBottom: 'none', padding: '32px 24px 40px',
        animation: 'slideUp 320ms cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <button
          onClick={finish}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 8 }}
        >
          Passer
        </button>

        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', margin: '0 auto 20px',
        }}>
          <Icon name={slide.icon} size={28} />
        </div>

        <h2 className="text-lg bold" style={{ textAlign: 'center', marginBottom: 10 }}>{slide.title}</h2>
        <p className="text-sm text-secondary" style={{ textAlign: 'center', lineHeight: 1.5, marginBottom: 28, minHeight: 44 }}>{slide.text}</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? 'var(--accent)' : 'var(--border)',
              transition: 'width 200ms ease, background 200ms ease',
            }} />
          ))}
        </div>

        <button
          className="btn-accent"
          onClick={() => isLast ? finish() : setStep(s => s + 1)}
        >
          {isLast ? 'Commencer' : 'Suivant'}
        </button>
      </div>
    </div>
  )
}
