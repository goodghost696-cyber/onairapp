import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import '../styles/Workout.css'

const AIProgramCard = () => {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { addExercisesToSession } = useApp()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const response = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 800,
            messages: [{
              role: 'user',
              content: `Tu es coach sportif expert. Génère un programme d'entraînement pour aujourd'hui.

Utilisateur: ${user?.name}
Objectif: ${user?.goal || 'Prise de masse'}
Dernières séances: Push Day (lundi), Pull Day (mercredi), Leg Day (vendredi)
Jour: ${new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}

Génère un programme adapté. Réponds UNIQUEMENT en JSON valide:
{
  "session_type": "PUSH DAY",
  "tagline": "Court message motivant max 8 mots",
  "exercises": [
    {
      "name": "Bench Press",
      "sets": 4,
      "reps": "8-10",
      "kg": 80,
      "rest": 90,
      "category": "salle"
    }
  ]
}

Donne exactement 4-5 exercices. Adapte selon l'objectif. Réponds en ${lang === 'fr' ? 'français' : lang === 'en' ? 'anglais' : 'espagnol'}.`
            }]
          })
        })
        const data = await response.json()
        const raw = data.content?.[0]?.text || ''
        const clean = raw.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        setProgram(parsed)
      } catch {
        setProgram(null)
      }
      setLoading(false)
    }
    fetchProgram()
  }, [])

  if (loading) return (
    <div className="ai-program-card loading">
      <div className="ai-program-spinner" />
      <p className="ai-program-loading-text">Ton programme se prépare...</p>
    </div>
  )

  if (!program) return null

  const handleAddAll = () => {
    addExercisesToSession(program.exercises)
    navigate('/workout/session')
  }

  return (
    <div className="ai-program-card">
      <div className="ai-program-header">
        <div>
          <p className="ai-program-type">{program.session_type}</p>
          <p className="ai-program-tagline">{program.tagline}</p>
        </div>
        <span className="ai-program-badge">IA</span>
      </div>
      <div className="ai-program-exercises">
        {program.exercises.map((ex, i) => (
          <div key={i} className="ai-program-ex-row">
            <span className="ai-program-ex-name">{ex.name}</span>
            <span className="ai-program-ex-detail">{ex.sets}×{ex.reps} · {ex.kg}kg</span>
          </div>
        ))}
      </div>
      <button className="ai-program-start-btn" onClick={handleAddAll}>
        COMMENCER CETTE SÉANCE →
      </button>
    </div>
  )
}

export default function Workout() {
  const navigate = useNavigate()
  const { appData, updateData } = useApp()
  const { t } = useLanguage()
  const sessionHistory = appData.sessionHistory || []

  const sections = [
    { key: 'maison', name: t('home_exercises'), sub: t('bodyweight') },
    { key: 'salle', name: t('gym_exercises'), sub: t('machines') },
    { key: 'dehors', name: t('outdoor_exercises'), sub: t('outdoor') },
  ]

  function handleNewSession() {
    updateData('activeSession', [])
    navigate('/workout/session')
  }

  const sectionIcons = {
    maison: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    salle: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11M6.5 17.5h11M6.5 12h11M3 6.5h.01M3 12h.01M3 17.5h.01M21 6.5h-.01M21 12h-.01M21 17.5h-.01"/></svg>,
    dehors: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="M8 21l2-8-2-3h8l-2 3 2 8"/><path d="M6 12l-2 2M18 12l2 2"/></svg>,
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">WORKOUT</span>
          <span className="text-sm text-muted">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>

        <div style={{ marginBottom: 8 }}>
          <h1 className="text-xl bold">{t('workout')}</h1>
        </div>

        <div className="card card-animated" style={{ '--delay': '0ms', marginBottom: 16 }}>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">{t('sessions_week')}</span>
            <span className="text-lg bold text-accent">{appData.weeklyWorkouts}/{appData.weeklyGoal}</span>
          </div>
          <div className="progress-bar" style={{ height: 4, marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${appData.weeklyWorkouts/appData.weeklyGoal*100}%` }} />
          </div>
        </div>

        <AIProgramCard />

        <button className="new-session-btn" onClick={handleNewSession}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          NOUVELLE SÉANCE
        </button>

        <div className="section-label">{t('library')}</div>
        {sections.map((s, i) => (
          <div key={s.key} className="card card-animated" style={{ '--delay': `${i*80}ms`, cursor: 'pointer', marginBottom: 8 }} onClick={() => navigate(`/workout/${s.key}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, background: 'var(--surface-2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {sectionIcons[s.key]}
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-base bold">{s.name}</div>
                <div className="text-sm text-muted">{s.sub}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        ))}

        {sessionHistory.length > 0 && (
          <div className="history-section">
            <p className="section-label">DERNIÈRES SÉANCES</p>
            {sessionHistory.map(session => (
              <div className="history-card" key={session.id}>
                <div className="history-card-left">
                  <p className="history-date">{session.date}</p>
                  <p className="history-type">{session.type}</p>
                </div>
                <div className="history-exercises">
                  {session.exercises.map((ex, i) => (
                    <span key={i} className="history-ex-badge">{ex}</span>
                  ))}
                </div>
                <div className="history-stats">
                  <span>{session.duration}</span>
                  <span>{session.totalSets} séries</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
