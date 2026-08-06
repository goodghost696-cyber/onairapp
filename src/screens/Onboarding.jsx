import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BOUNDS, inBounds } from '../utils/validation'
import { calculateCalorieGoal } from '../utils/metabolism'
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
    // Was "Ton objectif principal ?" / single_choice — a member can want
    // several of these at once (e.g. perdre du poids AND mieux manger),
    // forcing one hid that reality. Now multi-select; the calorie target
    // averages the multipliers of every goal picked (utils/metabolism.js).
    title: 'Tes objectifs ?',
    subtitle: 'Tu peux en choisir plusieurs à la fois.',
    type: 'multi_choice',
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
    subtitle: 'Pour calculer précisément ton métabolisme de base.',
    type: 'double_input',
    key: 'body',
    // "double_input" is a misnomer now (was always just field.map()
    // underneath, never actually limited to 2) — a 3rd field, Âge, was
    // added here so the calorie calculation stops assuming everyone's 25
    // (utils/metabolism.js's BMR formula needs a real age to mean anything).
    fields: [
      { label: 'Poids',  unit: 'kg', key: 'weight', placeholder: '75' },
      { label: 'Taille', unit: 'cm', key: 'height', placeholder: '178' },
      { label: 'Âge',    unit: 'ans', key: 'age', placeholder: '25' },
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
  const { user, updateUserProfile } = useAuth()
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
    if (step.type === 'double_input') {
      return inBounds(v?.weight, BOUNDS.weightKg) && inBounds(v?.height, BOUNDS.heightCm) && inBounds(v?.age, BOUNDS.age)
    }
    if (step.type === 'multi_choice') return Array.isArray(v) && v.length > 0
    return !!v
  }

  // Only shown once all fields are filled in, so it doesn't nag mid-typing.
  function bodyError() {
    const v = getValue()
    if (step.type !== 'double_input' || !v?.weight || !v?.height || !v?.age) return null
    if (!inBounds(v.weight, BOUNDS.weightKg)) return `Poids réaliste entre ${BOUNDS.weightKg.min} et ${BOUNDS.weightKg.max} kg.`
    if (!inBounds(v.height, BOUNDS.heightCm)) return `Taille réaliste entre ${BOUNDS.heightCm.min} et ${BOUNDS.heightCm.max} cm.`
    if (!inBounds(v.age, BOUNDS.age)) return `Âge réaliste entre ${BOUNDS.age.min} et ${BOUNDS.age.max} ans.`
    return null
  }

  function handleNext() {
    if (!canProceed()) return
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      handleComplete()
    }
  }

  // Was inlined here with a hard-coded age of 25 for everyone — moved to
  // utils/metabolism.js (same Mifflin-St Jeor formula, now fed the real
  // age just added to the "body" step) so the live daily calorie budget
  // (AppContext/Dashboard/Nutrition) can share the exact same math instead
  // of drifting from whatever this function does.
  function calculateTargets(p) {
    const weight = parseFloat(p.body?.weight) || 75
    const { calorieGoal, tdee } = calculateCalorieGoal({
      weightKg: weight,
      heightCm: parseFloat(p.body?.height) || 175,
      age: parseFloat(p.body?.age) || 25,
      goals: p.goal,
      frequency: p.frequency,
    })
    const proteinGoal = Math.round(weight * 2)
    const carbGoal = Math.round((calorieGoal * 0.45) / 4)
    const fatGoal = Math.round((calorieGoal * 0.25) / 9)
    return { calorieGoal, proteinGoal, carbGoal, fatGoal, tdee }
  }

  function handleComplete() {
    const targets = calculateTargets(answers)
    const profile = {
      id: user.id,
      name: answers.name,
      email: user.email,
      role: 'member',
      // profiles.objectif is a plain text column — multiple goals get
      // joined into one readable string ("Perte de poids, Nutrition")
      // rather than needing a schema change to store an actual array.
      goal: Array.isArray(answers.goal) ? answers.goal.join(', ') : answers.goal,
      level: answers.level,
      weight: answers.body?.weight,
      height: answers.body?.height,
      age: answers.body?.age,
      frequency: answers.frequency,
      equipment: answers.equipment,
      ...targets,
    }
    localStorage.setItem('onair_onboarded', 'true')
    localStorage.removeItem('onair_just_registered')
    localStorage.setItem('onair_profile', JSON.stringify(profile))
    localStorage.setItem('onair_user', JSON.stringify(profile))
    localStorage.setItem('onair_calorieGoal', profile.calorieGoal)
    if (updateUserProfile) updateUserProfile(profile)
    // Straight to a short app tour instead of Dashboard directly — a brand
    // new member otherwise lands there with zero explanation of what
    // anything does. Consumed once (see AppTour.jsx), same one-shot
    // pattern as onair_just_registered above.
    localStorage.setItem('onair_show_tour', 'true')
    navigate('/welcome')
  }

  function setAnswer(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-progress">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`onboarding-progress-segment${i <= currentStep ? ' filled' : ''}`} />
        ))}
      </div>

      <div className="onboarding-content">
        <p className="onboarding-step-count">ON AIR — {currentStep + 1} / {STEPS.length}</p>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step.type === 'multi_choice' && (
          <div className="onboarding-options">
            {step.options.map(opt => {
              const current = Array.isArray(answers[step.key]) ? answers[step.key] : []
              const selected = current.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  className={`onboarding-option${selected ? ' selected' : ''}`}
                  onClick={() => setAnswer(step.key, selected ? current.filter(v => v !== opt.value) : [...current, opt.value])}
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round">
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
                    type="text"
                    inputMode="decimal"
                    placeholder={field.placeholder}
                    value={answers[step.key]?.[field.key] || ''}
                    onChange={e => setAnswer(step.key, { ...answers[step.key], [field.key]: e.target.value })}
                    className="onboarding-number-input"
                  />
                  <span className="onboarding-field-unit">{field.unit}</span>
                </div>
              </div>
            ))}
            {bodyError() && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>{bodyError()}</p>
            )}
          </div>
        )}

        <div className="onboarding-actions">
          <button
            className="onboarding-next-btn"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentStep === STEPS.length - 1 ? 'COMMENCER →' : 'CONTINUER →'}
          </button>
          {currentStep > 0 && (
            <button className="onboarding-back-btn" onClick={() => setCurrentStep(s => s - 1)}>
              RETOUR
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
