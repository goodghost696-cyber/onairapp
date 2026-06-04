import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RestTimer } from '../components/RestTimer'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'

function SetRow({ set, index, onUpdate, onComplete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 0',
      background: set.done ? 'rgba(31,214,107,0.06)' : 'transparent',
      borderRadius: 8, transition: 'background 200ms ease',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 24, textAlign: 'center' }}>{index + 1}</span>
      <input
        type="number" min={1} max={99} placeholder="12"
        value={set.reps}
        onChange={e => onUpdate(index, 'reps', e.target.value)}
        style={{ width: 56, padding: '8px 4px', background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 15, fontFamily: 'monospace', textAlign: 'center' }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>×</span>
      <input
        type="number" min={0} max={999} step={0.5} placeholder="80"
        value={set.kg}
        onChange={e => onUpdate(index, 'kg', e.target.value)}
        style={{ width: 56, padding: '8px 4px', background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 15, fontFamily: 'monospace', textAlign: 'center' }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>kg</span>
      <button
        onClick={() => onComplete(index)}
        style={{
          marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%',
          background: set.done ? 'rgba(31,214,107,0.2)' : 'var(--surface-2)',
          border: `1px solid ${set.done ? 'var(--success)' : 'var(--border)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms ease',
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={set.done ? 'var(--success)' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </div>
  )
}

function ExerciseCard({ exercise, onUpdate, onRemove, onSetComplete, addSetLabel }) {
  const [expanded, setExpanded] = useState(true)

  function addSet() {
    onUpdate({ ...exercise, sets: [...exercise.sets, { reps: '', kg: '', done: false }] })
  }
  function updateSet(i, field, val) {
    const sets = exercise.sets.map((s, idx) => idx === i ? { ...s, [field]: val } : s)
    onUpdate({ ...exercise, sets })
  }
  function handleComplete(i) {
    const wasDone = exercise.sets[i]?.done
    const sets = exercise.sets.map((s, idx) => idx === i ? { ...s, done: !s.done } : s)
    onUpdate({ ...exercise, sets })
    if (!wasDone) onSetComplete()
  }

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="text-base bold">{exercise.name}</span>
          {exercise.suggested && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
              {exercise.suggested.reps} · {exercise.suggested.kg}kg
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 8, borderTop: '0.5px solid var(--border)', paddingTop: 8 }}>
          {exercise.sets.map((set, i) => (
            <SetRow key={i} set={set} index={i} onUpdate={updateSet} onComplete={handleComplete} />
          ))}
          <button onClick={addSet} style={{
            background: 'none', border: '0.5px dashed var(--border)',
            color: 'var(--text-muted)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', width: '100%', marginTop: 8,
          }}>{addSetLabel}</button>
        </div>
      )}
    </div>
  )
}

export default function WorkoutSession() {
  const navigate = useNavigate()
  const { appData, updateData } = useApp()
  const { t } = useLanguage()
  const [showRestTimer, setShowRestTimer] = useState(false)
  const activeSession = appData.activeSession || []

  function updateExercise(updated) {
    updateData('activeSession', activeSession.map(e => e.id === updated.id ? updated : e))
  }
  function removeExercise(id) {
    updateData('activeSession', activeSession.filter(e => e.id !== id))
  }
  function handleSetComplete() {
    setShowRestTimer(true)
    navigator.vibrate && navigator.vibrate(8)
  }
  function finishSession() {
    updateData('sessionHistory', [
      {
        id: Date.now(),
        date: new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }),
        type: 'SÉANCE',
        exercises: activeSession.map(e => e.name),
        duration: '—',
        totalSets: activeSession.reduce((acc, e) => acc + e.sets.length, 0)
      },
      ...(appData.sessionHistory || [])
    ])
    updateData('activeSession', [])
    updateData('weeklyWorkouts', (appData.weeklyWorkouts || 0) + 1)
    navigate('/workout')
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => navigate('/workout')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="text-xl bold">{t('active_session')}</h1>
        </div>

        {activeSession.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Aucun exercice dans la séance</p>
            <button className="btn-accent" onClick={() => navigate('/workout')}>
              Ajouter des exercices
            </button>
          </div>
        ) : (
          <>
            <div className="section-label">{activeSession.length} exercice{activeSession.length > 1 ? 's' : ''}</div>
            {activeSession.map(ex => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onUpdate={updateExercise}
                onRemove={() => removeExercise(ex.id)}
                onSetComplete={handleSetComplete}
                addSetLabel={t('add_set')}
              />
            ))}
            <button className="btn-accent" onClick={finishSession} style={{ marginTop: 8 }}>
              {t('finish_workout')}
            </button>
          </>
        )}
      </div>

      {showRestTimer && <RestTimer onDismiss={() => setShowRestTimer(false)} />}

    </div>
  )
}
