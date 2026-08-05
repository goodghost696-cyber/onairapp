import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Onboarding.css'
import '../styles/AppTour.css'

// Shown once, right after Onboarding finishes (before the first Dashboard
// visit) — a new member currently lands on Dashboard with zero explanation
// of what any of the screens/buttons do. Deliberately static slides, not a
// spotlight/tooltip overlay pointing at live UI elements: positioning that
// precisely against every screen size, with no way to visually verify it in
// this sandbox, is exactly the kind of thing that went wrong with the coach
// desktop layout earlier today — a self-contained screen has none of that
// risk. Reuses Onboarding.css's classes so it looks like a natural
// continuation of the flow the member was just in, not a different UI.
const SLIDES = [
  {
    icon: '👋',
    title: 'Bienvenue sur ON AIR.',
    subtitle: "Un tour rapide en 5 écrans pour savoir où trouver quoi. Tu peux passer à tout moment.",
  },
  {
    icon: '🏠',
    title: 'Ton tableau de bord',
    subtitle: "Pas, eau, sommeil, calories du jour — tape sur une carte pour la mettre à jour. C'est ton point de départ à chaque connexion.",
  },
  {
    icon: '🍽️',
    title: 'Nutrition',
    subtitle: "Ajoute un repas en le cherchant, en le scannant, ou laisse l'IA te proposer une recette selon ce qu'il te reste pour la journée.",
  },
  {
    icon: '🏋️',
    title: 'Entraînement',
    subtitle: "Des bibliothèques d'exercices (maison, salle, dehors) pour construire ta séance, avec un minuteur de repos intégré.",
  },
  {
    icon: '💬',
    title: 'Ton coach à portée de main',
    subtitle: "Le bouton en bas à droite ouvre le Coach IA (des questions, 24/7) ou la messagerie avec ton vrai coach.",
  },
]

export default function AppTour() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const slide = SLIDES[step]

  function finish() {
    localStorage.removeItem('onair_show_tour')
    navigate('/dashboard')
  }

  function next() {
    if (step < SLIDES.length - 1) setStep(s => s + 1)
    else finish()
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-progress">
        {SLIDES.map((s, i) => (
          <div key={i} className={`onboarding-progress-segment${i <= step ? ' filled' : ''}`} />
        ))}
      </div>

      <div className="onboarding-content">
        <p className="onboarding-step-count">DÉCOUVERTE — {step + 1} / {SLIDES.length}</p>
        <div className="tour-icon">{slide.icon}</div>
        <h1 className="onboarding-title">{slide.title}</h1>
        <p className="onboarding-subtitle">{slide.subtitle}</p>

        <div className="onboarding-actions">
          <button className="onboarding-next-btn" onClick={next}>
            {step === SLIDES.length - 1 ? "C'EST PARTI →" : 'SUIVANT →'}
          </button>
          <button className="onboarding-back-btn" onClick={finish}>
            PASSER
          </button>
        </div>
      </div>
    </div>
  )
}
