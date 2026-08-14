import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RestTimer } from '../components/RestTimer'
import { useApp } from '../context/AppContext'
import '../styles/WorkoutSession.css'
import '../styles/workoutsession-redesign.css'

export default function WorkoutSession() {
  const navigate = useNavigate()
  const { appData, addSetToExercise, toggleSetDone, updateSet, removeSetFromExercise, clearActiveSession, addSessionToHistory } = useApp()
  const [showRestTimer, setShowRestTimer] = useState(false)
  const activeSession = appData.activeSession || { exercises: [], startTime: null }

  // Même fix que Dashboard.jsx/Nutrition.jsx/Weekly.jsx (voir
  // dashboard.css/JOURNAL.md) : couvre le rubber-band iOS, où le fond de
  // <body> (dégradé corail partagé) reste visible au-delà des limites du
  // wrapper interne. Classe active seulement tant que ce screen est monté.
  useEffect(() => {
    document.body.classList.add('workoutsession-body-bg')
    return () => document.body.classList.remove('workoutsession-body-bg')
  }, [])

  async function finishSession() {
    const exercises = activeSession.exercises
    const durationMs = activeSession.startTimestamp ? Date.now() - activeSession.startTimestamp : 0
    const durationMin = Math.max(1, Math.floor(durationMs / 60000))
    await addSessionToHistory({
      id: Date.now(),
      date: new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
      type: activeSession.type || 'SÉANCE',
      exercises: exercises.map(e => e.name),
      duration: `${durationMin} min`,
      durationMin,
      totalSets: exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.done).length, 0),
      exerciseDetails: exercises
        .map(ex => ({
          name: ex.name,
          sets: ex.sets.filter(s => s.done).map(s => ({ reps: parseInt(s.reps) || 0, kg: parseFloat(s.kg) || 0 }))
        }))
        // Un exercice ajouté puis jamais validé (aucune série cochée) ne doit
        // pas apparaître dans la séance enregistrée — voir audit JOURNAL.md
        // du 2026-08-13 (cas réel : séance 16/07, Push-up, 0 séries).
        .filter(ex => ex.sets.length > 0)
    })
    clearActiveSession()
    navigate('/weekly')
  }

  if (!activeSession.exercises.length) {
    return (
      <div className="app-wrapper workoutsession-redesign">
        <div className="screen workoutsession-screen">
          <div className="ws-header-row">
            <button className="ws-back-btn" onClick={() => navigate('/workout')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ws-ink)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 className="ws-title">Séance</h1>
          </div>
          <div className="empty-session">
            <p className="empty-session-text">Aucun exercice ajouté.</p>
            {/* Root cause (debugging, 2026-08-14) : renvoyait vers /workout
                (le hub), qui n'ajoute rien à la séance active — juste 3
                cartes "Exercices Maison/Salle/Dehors" à re-taper. Aucune
                route "bibliothèque générique" n'existe (WorkoutLibrary.jsx
                a toujours besoin d'une section — maison/salle/dehors, voir
                App.jsx). "Maison" choisie comme entrée directe par défaut
                (zéro équipement, le moins de friction) plutôt que de
                renvoyer au choix — WorkoutLibrary.jsx ajoute déjà
                correctement à la séance active quel que soit le point
                d'entrée (addExercise -> addExerciseToSession ->
                navigate('/workout/session'), AppContext.jsx), donc ce seul
                changement de route suffit. */}
            <button className="empty-session-btn" onClick={() => navigate('/workout/maison')}>+ Ajouter des exercices</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-wrapper workoutsession-redesign">
      <div className="screen workoutsession-screen">
        <div className="ws-header-row">
          <button className="ws-back-btn" onClick={() => navigate('/workout')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ws-ink)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <p className="ws-eyebrow">SÉANCE EN COURS · {activeSession.startTime}</p>
            <h1 className="ws-title">Entraînement</h1>
          </div>
        </div>

        <div className="ws-section-label">{activeSession.exercises.length} exercice{activeSession.exercises.length > 1 ? 's' : ''}</div>

        {activeSession.exercises.map((exercise, exIdx) => (
          <div key={exercise.id} className="session-exercise-card">
            <p className="session-exercise-name">{exercise.name}</p>
            {exercise.muscles && <p className="session-exercise-muscles">{exercise.muscles}</p>}

            <div className="session-sets">
              <div className="session-sets-header">
                <span>Sér.</span>
                <span>Reps</span>
                <span>Kg</span>
                <span></span>
                <span></span>
              </div>
              {exercise.sets.map((set, setIdx) => (
                <div key={setIdx} className={`session-set-row${set.done ? ' done' : ''}`}>
                  <span className="set-number">{setIdx + 1}</span>
                  <input
                    className="set-input"
                    type="number" min="1" max="99"
                    placeholder={exercise.suggested?.reps != null ? String(exercise.suggested.reps) : '12'}
                    value={set.reps}
                    onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                  />
                  <input
                    className="set-input"
                    type="number" min="0" max="999" step="0.5"
                    placeholder={exercise.suggested?.kg != null ? String(exercise.suggested.kg) : '80'}
                    value={set.kg}
                    onChange={e => updateSet(exIdx, setIdx, 'kg', e.target.value)}
                  />
                  <button
                    className={`set-check-btn${set.done ? ' checked' : ''}`}
                    onClick={() => {
                      toggleSetDone(exIdx, setIdx)
                      if (!set.done) { setShowRestTimer(true); navigator.vibrate && navigator.vibrate(8) }
                    }}
                  >✓</button>
                  <button
                    type="button"
                    className="set-remove-btn"
                    onClick={() => removeSetFromExercise(exIdx, setIdx)}
                    disabled={exercise.sets.length <= 1}
                    aria-label="Supprimer cette série"
                  >✕</button>
                </div>
              ))}
              <button className="add-set-btn" onClick={() => addSetToExercise(exIdx)}>+ SÉRIE</button>
            </div>
          </div>
        ))}

        <button className="finish-session-btn" onClick={finishSession}>TERMINER LA SÉANCE</button>
      </div>

      {showRestTimer && <RestTimer onDismiss={() => setShowRestTimer(false)} />}
    </div>
  )
}
