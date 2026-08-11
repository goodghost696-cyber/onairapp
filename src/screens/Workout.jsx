import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { fetchMemberPrograms } from '../utils/programs'
import '../styles/Workout.css'
import { authHeader } from '../lib/supabase'

export default function Workout() {
  const navigate = useNavigate()
  const { appData, updateData, addExercisesToSession, clearActiveSession } = useApp()
  const { user } = useAuth()
  const { t, lang } = useLanguage()
  const sessionHistory = appData.sessionHistory || []
  const activeSession = appData.activeSession || { exercises: [], startTime: null }

  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  // Programmes assignés par le coach — veille produit 2026-08-11, prop. 4.
  const [coachPrograms, setCoachPrograms] = useState([])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchMemberPrograms(user.id).then(p => { if (!cancelled) setCoachPrograms(p) })
    return () => { cancelled = true }
  }, [user?.id])

  function startCoachProgram(programme) {
    addExercisesToSession(programme.exercices)
    navigate('/workout/session')
  }

  const sections = [
    { key: 'maison', name: t('home_exercises'), sub: t('bodyweight') },
    { key: 'salle', name: t('gym_exercises'), sub: t('machines') },
    { key: 'dehors', name: t('outdoor_exercises'), sub: t('outdoor') },
  ]

  function handleStartSession() {
    clearActiveSession()
    navigate('/workout/session')
  }

  const generateProgram = async () => {
    setLoading(true)
    try {
      // Était "Push Day (lundi), Pull Day (mercredi), Leg Day (vendredi)" en
      // dur, quel que soit ce que le membre a réellement fait — l'IA se
      // basait donc sur un faux historique pour proposer le programme du
      // jour. Repéré en relisant l'app comme un utilisateur (2026-08-10),
      // même famille que les séances d'exemple retirées d'AppContext.jsx.
      // Construit maintenant à partir des vraies séances récentes.
      const recentSessionsLine = sessionHistory.length > 0
        ? sessionHistory.slice(0, 3).map(s => `${s.type} (${s.date})`).join(', ')
        : 'Aucune séance récente enregistrée'
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Tu es coach sportif expert. Génère un programme d'entraînement pour aujourd'hui.
Utilisateur: ${user?.name}
Objectif: ${user?.goal || 'Prise de masse'}
Dernières séances: ${recentSessionsLine}
Jour: ${new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}
Réponds UNIQUEMENT en JSON valide:
{
  "session_type": "PUSH DAY",
  "tagline": "Court message motivant max 8 mots",
  "exercises": [
    { "name": "Bench Press", "sets": 4, "reps": "8-10", "kg": 80, "rest": 90 }
  ]
}
Donne exactement 4-5 exercices adaptés à l'objectif.`
          }]
        })
      })
      const data = await response.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      setProgram(JSON.parse(clean))
      setGenerated(true)
    } catch {
      setProgram(null)
    }
    setLoading(false)
  }

  const handleAddAll = () => {
    if (program) addExercisesToSession(program.exercises)
    navigate('/workout/session')
  }

  const sectionIcons = {
    maison: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    // Was an abstract "checklist" glyph (rows of dashes + dots) that read as
    // noise at this size — reported as "c'est quoi ça??" on a real screenshot.
    // A dumbbell silhouette (end caps + plates + bar) is unambiguous for
    // "Salle" at a glance, unlike Maison's house/Dehors' running figure.
    salle: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9.5" width="2.5" height="5" rx="1"/><rect x="19.5" y="9.5" width="2.5" height="5" rx="1"/><rect x="6" y="7" width="3" height="10" rx="1.2"/><rect x="15" y="7" width="3" height="10" rx="1.2"/><line x1="9" y1="12" x2="15" y2="12"/></svg>,
    dehors: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="M8 21l2-8-2-3h8l-2 3 2 8"/><path d="M6 12l-2 2M18 12l2 2"/></svg>,
  }

  const sectionIconBg = {
    maison: 'rgba(240,193,75,0.12)',
    salle: 'rgba(139,147,232,0.15)',
    dehors: 'rgba(240,193,75,0.12)',
  }

  return (
    <div className="app-wrapper">
      <div className="screen">
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>🏋️ WORKOUT</p>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }}>{t('workout')}</h1>

        <div className="card card-hero card-animated" style={{ '--delay': '0ms', marginBottom: 14 }}>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">{t('sessions_week')}</span>
            {/* var(--accent) is gold now — invisible on this card's own gold
                gradient background. var(--text-secondary) has the same
                problem (translucent white on a light card). Dark ink instead,
                inherited color for the big number, explicit translucent-ink
                for the smaller "/goal" part. */}
            <span style={{ fontSize: 22, fontWeight: 800 }}>{appData.weeklyWorkouts}<span style={{ fontSize: 14, color: 'rgba(26,22,8,0.6)', fontWeight: 400 }}>/{appData.weeklyGoal}</span></span>
          </div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${appData.weeklyWorkouts/appData.weeklyGoal*100}%` }} />
          </div>
        </div>

        {activeSession.exercises.length > 0 && (
          <div className="active-session-banner" onClick={() => navigate('/workout/session')}>
            <div className="active-session-left">
              <div className="active-session-dot" />
              <div>
                <p className="active-session-label">SÉANCE EN COURS</p>
                <p className="active-session-count">
                  {activeSession.exercises.length} exercice{activeSession.exercises.length > 1 ? 's' : ''} · Démarrée à {activeSession.startTime}
                </p>
              </div>
            </div>
            <div className="active-session-badges">
              {activeSession.exercises.slice(0, 3).map((ex, i) => (
                <span key={i} className="active-session-ex-badge">{ex.name.split(' ')[0]}</span>
              ))}
            </div>
            <span className="active-session-arrow">→</span>
          </div>
        )}

        <div className="workout-cta-row">
          <button className="today-session-btn" onClick={handleStartSession}>
            MA SÉANCE DU JOUR
          </button>
          <button className="generate-program-btn" onClick={generateProgram} disabled={loading}>
            {loading ? (
              <><div className="btn-spinner" /> Génération...</>
            ) : (
              '✦ PROGRAMME IA'
            )}
          </button>
        </div>

        {/* Programmes assignés par le coach — veille produit 2026-08-11,
            prop. 4. Un tap charge le programme dans la séance du jour,
            même flux que "COMMENCER CETTE SÉANCE" ci-dessous pour le
            programme IA (addExercisesToSession, même shape d'exercice). */}
        {coachPrograms.length > 0 && (
          <>
            <div className="section-label">MES PROGRAMMES</div>
            {coachPrograms.map((p, i) => (
              <div key={p.id} className="card card-animated" style={{ '--delay': `${i * 60}ms`, cursor: 'pointer', marginBottom: 8 }} onClick={() => startCoachProgram(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="text-base bold">{p.titre}</div>
                    <div className="text-sm text-muted">{p.exercices.length} exercice{p.exercices.length > 1 ? 's' : ''}</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            ))}
          </>
        )}

        {generated && program && (
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
        )}

        <div className="section-label">{t('library')}</div>
        {sections.map((s, i) => (
          <div key={s.key} className="card card-animated" style={{ '--delay': `${i*80}ms`, cursor: 'pointer', marginBottom: 8 }} onClick={() => navigate(`/workout/${s.key}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, background: sectionIconBg[s.key], borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

        <div className="history-section">
          <p className="section-label">DERNIÈRES SÉANCES</p>
          {sessionHistory.length === 0 && (
            <p className="text-sm text-muted" style={{ padding: '4px 0 8px' }}>
              Pas encore de séance enregistrée — lance-toi juste au-dessus.
            </p>
          )}
          {sessionHistory.length > 0 && sessionHistory.map(session => (
              <div
                className="history-card"
                key={session.id}
                onClick={() => navigate(`/workout/history/${session.id}`)}
                style={{ cursor: 'pointer' }}
              >
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
      </div>

    </div>
  )
}
