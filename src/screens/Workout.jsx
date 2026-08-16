import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { fetchMemberPrograms } from '../utils/programs'
import '../styles/Workout.css'
import '../styles/workout-redesign.css'
import { authHeader } from '../lib/supabase'
import { activable } from '../utils/a11y'

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
  // Voir handleStartSession plus bas — sheet de choix quand une séance est
  // déjà en cours, au lieu de l'effacer sans prévenir.
  const [askRestart, setAskRestart] = useState(false)
  // Programmes assignés par le coach — veille produit 2026-08-11, prop. 4.
  const [coachPrograms, setCoachPrograms] = useState([])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchMemberPrograms(user.id).then(p => { if (!cancelled) setCoachPrograms(p) })
    return () => { cancelled = true }
  }, [user?.id])

  // Même fix que Dashboard.jsx/Nutrition.jsx/Weekly.jsx/WorkoutSession.jsx
  // (voir dashboard.css/JOURNAL.md) : couvre le rubber-band iOS, où le
  // fond de <body> (dégradé corail partagé) reste visible au-delà des
  // limites du wrapper interne. Classe active seulement tant que ce
  // screen est monté.
  useEffect(() => {
    document.body.classList.add('workout-body-bg')
    return () => document.body.classList.remove('workout-body-bg')
  }, [])

  function startCoachProgram(programme) {
    addExercisesToSession(programme.exercices, programme.titre)
    navigate('/workout/session')
  }

  const sections = [
    { key: 'maison', name: t('home_exercises'), sub: t('bodyweight') },
    { key: 'salle', name: t('gym_exercises'), sub: t('machines') },
    { key: 'dehors', name: t('outdoor_exercises'), sub: t('outdoor') },
  ]

  // Ce bouton appelait clearActiveSession() inconditionnellement : un membre
  // en pleine séance qui tapait "Ma séance du jour" — juste sous la bannière
  // "SÉANCE EN COURS", donc le geste naturel pour la rejoindre — perdait
  // d'un coup tous ses exercices, séries, reps et kg, sans confirmation ni
  // message (confirmé en test réel, audit 2026-08-16). C'était aussi le seul
  // moyen d'abandonner une séance dans l'app (WorkoutSession n'a que
  // "TERMINER LA SÉANCE"), d'où un choix explicite plutôt qu'un simple
  // garde-fou : les deux intentions restent accessibles, aucune n'est
  // déclenchée par accident.
  function handleStartSession() {
    if (activeSession.exercises.length > 0) { setAskRestart(true); return }
    clearActiveSession()
    navigate('/workout/session')
  }

  function restartSession() {
    setAskRestart(false)
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
    if (program) addExercisesToSession(program.exercises, program.session_type)
    navigate('/workout/session')
  }

  const sectionIcons = {
    maison: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wh-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    // Was an abstract "checklist" glyph (rows of dashes + dots) that read as
    // noise at this size — reported as "c'est quoi ça??" on a real screenshot.
    // A dumbbell silhouette (end caps + plates + bar) is unambiguous for
    // "Salle" at a glance, unlike Maison's house/Dehors' running figure.
    salle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wh-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9.5" width="2.5" height="5" rx="1"/><rect x="19.5" y="9.5" width="2.5" height="5" rx="1"/><rect x="6" y="7" width="3" height="10" rx="1.2"/><rect x="15" y="7" width="3" height="10" rx="1.2"/><line x1="9" y1="12" x2="15" y2="12"/></svg>,
    dehors: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wh-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="M8 21l2-8-2-3h8l-2 3 2 8"/><path d="M6 12l-2 2M18 12l2 2"/></svg>,
  }

  // Restyle "pastel chaud" (2026-08-14, handoff dédié) — cercles pleins
  // olive/lavande/rose au lieu des fonds translucides dorés hérités.
  const sectionIconBg = {
    maison: 'var(--wh-olive)',
    salle: 'var(--wh-lavender)',
    dehors: 'var(--wh-pink)',
  }
  // Cycle d'accent pour le 1er badge de chaque carte "Dernières séances"
  // (voir workout-redesign.css, .history-ex-badge:first-child) — même
  // esprit que le cycle de couleur des badges-lettre de Nutrition.jsx.
  const HISTORY_ACCENTS = [
    { bg: 'var(--wh-olive)', ink: 'var(--wh-olive-ink)' },
    { bg: 'var(--wh-lavender)', ink: 'var(--wh-lavender-ink)' },
    { bg: 'var(--wh-pink)', ink: 'var(--wh-pink-ink)' },
  ]

  return (
    <div className="app-wrapper workout-redesign">
      <div className="screen workout-screen">
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingBottom: 22 }}>
          <div>
            <p className="wh-eyebrow">WORKOUT</p>
            <h1 className="wh-title">{t('workout')}</h1>
          </div>
          <span className="wh-date">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>

        <div className="card card-hero card-animated" style={{ '--delay': '0ms', marginBottom: 14 }}>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">{t('sessions_week')}</span>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>{appData.weeklyWorkouts}<span style={{ fontSize: 13, color: 'var(--wh-olive-ink)', fontWeight: 500 }}>/{appData.weeklyGoal}</span></span>
          </div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${appData.weeklyWorkouts/appData.weeklyGoal*100}%` }} />
          </div>
        </div>

        {activeSession.exercises.length > 0 && (
          <div className="active-session-banner" {...activable(() => navigate('/workout/session'), { label: 'Reprendre la séance en cours' })}>
            <div className="active-session-left">
              <div className="active-session-dot" />
              <div>
                <p className="active-session-label">SÉANCE EN COURS</p>
                <p className="active-session-count">
                  {activeSession.exercises.length} exercice{activeSession.exercises.length > 1 ? 's' : ''} · démarrée à {activeSession.startTime}
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
            Ma séance<br />du jour
          </button>
          <button className="generate-program-btn" onClick={generateProgram} disabled={loading}>
            {loading ? (
              <><div className="btn-spinner" /> Génération...</>
            ) : (
              <>✦ Programme<br />IA</>
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
              <div key={p.id} className="card card-animated" style={{ '--delay': `${i * 60}ms`, cursor: 'pointer', marginBottom: 10 }} {...activable(() => startCoachProgram(p), { label: `Démarrer le programme ${p.titre}` })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="text-base bold">{p.titre}</div>
                    <div className="text-sm text-muted">{p.exercices.length} exercice{p.exercices.length > 1 ? 's' : ''}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wh-text-muted)" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
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
          <div key={s.key} className="card card-animated" style={{ '--delay': `${i*80}ms`, cursor: 'pointer', marginBottom: 10 }} {...activable(() => navigate(`/workout/${s.key}`), { label: s.name })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, background: sectionIconBg[s.key], borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {sectionIcons[s.key]}
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-base bold">{s.name}</div>
                <div className="text-sm text-muted">{s.sub}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wh-text-muted)" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
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
          {sessionHistory.length > 0 && sessionHistory.map((session, i) => {
            // Cycle d'accent olive/lavande/rose pour le 1er badge — voir
            // HISTORY_ACCENTS plus haut et .history-ex-badge:first-child
            // dans workout-redesign.css.
            const accent = HISTORY_ACCENTS[i % HISTORY_ACCENTS.length]
            return (
              <div
                className="history-card"
                key={session.id}
                {...activable(() => navigate(`/workout/history/${session.id}`), { label: `Séance du ${session.date} — voir le détail` })}
                style={{ cursor: 'pointer', '--wh-history-accent': accent.bg, '--wh-history-accent-ink': accent.ink }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <div className="history-card-left">
                    <p className="history-date">{session.date}</p>
                    <p className="history-type">{session.type}</p>
                  </div>
                  <div className="history-stats">
                    <span style={{ display: 'block' }}>{session.duration}</span>
                    <span style={{ display: 'block' }}>{session.totalSets} séries</span>
                  </div>
                </div>
                <div className="history-exercises">
                  {session.exercises.map((ex, i) => (
                    <span key={i} className="history-ex-badge">{ex}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Même forme de sheet que DeleteAccountButton.jsx (overlay + panneau
          bas, styles inline) — seule convention de confirmation existante
          dans l'app, l'app n'utilise nulle part window.confirm. */}
      {askRestart && (
        <>
          <div onClick={() => setAskRestart(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480, background: 'var(--surface-solid)',
            borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--glass-border)',
            padding: '24px 20px 40px', zIndex: 200,
          }}>
            <h2 className="text-lg bold" style={{ marginBottom: 8 }}>Une séance est déjà en cours</h2>
            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
              {activeSession.exercises.length} exercice{activeSession.exercises.length > 1 ? 's' : ''}, démarrée à {activeSession.startTime}. En démarrer une nouvelle effacera tout ce que tu y as noté.
            </p>
            <button
              onClick={() => { setAskRestart(false); navigate('/workout/session') }}
              style={{
                width: '100%', padding: 16, marginBottom: 10, background: 'var(--accent)',
                color: 'var(--accent-ink)', border: 'none', borderRadius: 12, fontSize: 13,
                fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              Reprendre la séance
            </button>
            <button
              onClick={restartSession}
              style={{
                width: '100%', padding: 16, marginBottom: 10, background: 'transparent',
                border: '2px solid var(--danger)', color: 'var(--danger)', borderRadius: 12,
                fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              Démarrer une nouvelle séance
            </button>
            <button className="btn-ghost" onClick={() => setAskRestart(false)}>Annuler</button>
          </div>
        </>
      )}
    </div>
  )
}
