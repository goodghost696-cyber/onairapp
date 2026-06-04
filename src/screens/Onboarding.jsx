import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/Onboarding.css'

const STEPS = [
  {
    id: 'name',
    title: "Comment tu t'appelles ?",
    subtitle: 'On personnalise tout pour toi.',
    type: 'text_input',
    placeholder: 'Ton prénom',
    key: 'name',
  },
  {
    id: 'goal',
    title: 'Ton objectif principal ?',
    subtitle: 'On adapte ton programme en conséquence.',
    type: 'single_choice',
    key: 'goal',
    options: [
      { label: 'Perdre du poids',   icon: '⚡', value: 'Perte de poids' },
      { label: 'Prendre du muscle', icon: '💪', value: 'Prise de masse' },
      { label: 'Mieux manger',      icon: '🥗', value: 'Nutrition' },
      { label: 'Performance',       icon: '🏆', value: 'Performance' },
    ],
  },
  {
    id: 'level',
    title: 'Ton niveau ?',
    subtitle: 'Pas de jugement — juste pour calibrer.',
    type: 'single_choice',
    key: 'level',
    options: [
      { label: 'Débutant',      subtitle: 'Moins de 1 an', value: 'Débutant' },
      { label: 'Intermédiaire', subtitle: '1 à 3 ans',     value: 'Intermédiaire' },
      { label: 'Avancé',        subtitle: '3 ans et plus', value: 'Avancé' },
    ],
  },
  {
    id: 'body',
    title: "Ton corps aujourd'hui",
    subtitle: 'Pour calculer tes objectifs caloriques.',
    type: 'double_input',
    key: 'body',
    fields: [
      { label: 'Poids',  unit: 'kg', key: 'weight', placeholder: '75' },
      { label: 'Taille', unit: 'cm', key: 'height', placeholder: '178' },
    ],
  },
  {
    id: 'frequency',
    title: "Tu t'entraînes combien de fois par semaine ?",
    subtitle: 'Pour calibrer tes objectifs hebdo.',
    type: 'single_choice',
    key: 'frequency',
    options: [
      { label: '2 à 3 fois', value: '2-3' },
      { label: '4 à 5 fois', value: '4-5' },
      { label: '6 à 7 fois', value: '6-7' },
    ],
  },
  {
    id: 'equipment',
    title: "Où tu t'entraînes ?",
    subtitle: 'Pour te suggérer les bons exercices.',
    type: 'single_choice',
    key: 'equipment',
    options: [
      { label: 'À la maison', value: 'Maison' },
      { label: 'En salle',    value: 'Salle' },
      { label: 'Les deux',    value: 'Les deux' },
    ],
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { updateUserProfile, login } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})

  const step = STEPS[currentStep]

  function getValue() {
    return answers[step.key]
  }

  function canProceed() {
    const v = getValue()
    if (!v) return false
    if (step.type === 'text_input') return v.trim().length > 0
    if (step.type === 'double_input') return v?.weight && v?.height
    return !!v
  }

  function handleNext() {
    if (!canProceed()) return
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      handleComplete()
    }
  }

  function handleComplete() {
    const profile = {
      id: Date.now(),
      name: answers.name,
      email: `${answers.name.toLowerCase()}@onair.fr`,
      role: 'member',
      goal: answers.goal,
      level: answers.level,
      weight: answers.body?.weight,
      height: answers.body?.height,
      frequency: answers.frequency,
      equipment: answers.equipment,
    }
    localStorage.setItem('onair_onboarded', 'true')
    localStorage.setItem('onair_profile', JSON.stringify(profile))
    localStorage.setItem('onair_user', JSON.stringify(profile))
    if (updateUserProfile) updateUserProfile(profile)
    navigate('/dashboard')
  }

  function setAnswer(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-progress">
        <div
          className="onboarding-progress-fill"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="onboarding-content">
        <p className="onboarding-step-count">{currentStep + 1} / {STEPS.length}</p>
        <h1 className="onboarding-title">{step.title}</h1>
        <p className="onboarding-subtitle">{step.subtitle}</p>

        {step.type === 'text_input' && (
          <input
            className="onboarding-text-input"
            placeholder={step.placeholder}
            value={answers[step.key] || ''}
            onChange={e => setAnswer(step.key, e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()}
            autoFocus
          />
        )}

        {step.type === 'single_choice' && (
          <div className="onboarding-options">
            {step.options.map(opt => {
              const selected = answers[step.key] === opt.value
              return (
                <button
                  key={opt.value}
                  className={`onboarding-option${selected ? ' selected' : ''}`}
                  onClick={() => setAnswer(step.key, opt.value)}
                >
                  <div className="onboarding-option-left">
                    {opt.icon && <span className="onboarding-option-icon">{opt.icon}</span>}
                    <div>
                      <p className="onboarding-option-label">{opt.label}</p>
                      {opt.subtitle && <p className="onboarding-option-sub">{opt.subtitle}</p>}
                    </div>
                  </div>
                  <div className="onboarding-option-check">
                    {selected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step.type === 'double_input' && (
          <div className="onboarding-double-inputs">
            {step.fields.map(field => (
              <div key={field.key} className="onboarding-field">
                <label className="onboarding-field-label">{field.label}</label>
                <div className="onboarding-field-wrap">
                  <input
                    type="number"
                    placeholder={field.placeholder}
                    value={answers[step.key]?.[field.key] || ''}
                    onChange={e => setAnswer(step.key, { ...answers[step.key], [field.key]: e.target.value })}
                    className="onboarding-number-input"
                  />
                  <span className="onboarding-field-unit">{field.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          className="onboarding-next-btn"
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {currentStep === STEPS.length - 1 ? 'COMMENCER →' : 'CONTINUER →'}
        </button>
      </div>
    </div>
  )
}
