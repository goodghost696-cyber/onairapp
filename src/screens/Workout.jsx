import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'

const sections = [
  { key: 'maison', name: 'Exercices Maison', sub: 'Bodyweight · Sans équipement' },
  { key: 'salle', name: 'Exercices Salle', sub: 'Machines · Charges libres' },
  { key: 'dehors', name: 'Exercices Dehors', sub: 'Running · Calisthenics · HIIT' },
]

function SetRow({ set, index, onUpdate, onCheck }) {
  const [checked, setChecked] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 0',
      background: checked ? 'rgba(31,214,107,0.06)' : 'transparent',
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
      <button onClick={() => {
        setChecked(true)
        navigator.vibrate && navigator.vibrate(8)
        onCheck(index)
      }} style={{
        marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%',
        background: checked ? 'rgba(31,214,107,0.2)' : 'var(--surface-2)',
        border: `1px solid ${checked ? 'var(--success)' : 'var(--border)'}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms ease',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={checked ? 'var(--success)' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </div>
  )
}

function ExerciseCard({ exercise, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(true)

  function addSet() {
    onUpdate({ ...exercise, sets: [...exercise.sets, { reps: '', kg: '' }] })
  }
  function updateSet(i, field, val) {
    const sets = exercise.sets.map((s, idx) => idx === i ? { ...s, [field]: val } : s)
    onUpdate({ ...exercise, sets })
  }

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="text-base bold">{exercise.name}</span>
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
            <SetRow key={i} set={set} index={i} onUpdate={updateSet} onCheck={() => {}} />
          ))}
          <button onClick={addSet} style={{
            background: 'none', border: '0.5px dashed var(--border)',
            color: 'var(--text-muted)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', width: '100%', marginTop: 8,
          }}>+ AJOUTER UNE SÉRIE</button>
        </div>
      )}
    </div>
  )
}

export default function Workout() {
  const navigate = useNavigate()
  const { appData, updateData } = useApp()
  const activeSession = appData.activeSession || []

  function updateExercise(updated) {
    updateData('activeSession', activeSession.map(e => e.id === updated.id ? updated : e))
  }
  function removeExercise(id) {
    updateData('activeSession', activeSession.filter(e => e.id !== id))
  }
  function finishSession() {
    updateData('sessionHistory', [...(appData.sessionHistory || []), { date: new Date().toISOString(), exercises: activeSession }])
    updateData('activeSession', [])
    updateData('weeklyWorkouts', appData.weeklyWorkouts + 1)
    navigate('/weekly')
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
          <h1 className="text-xl bold">Workout</h1>
        </div>

        <div className="card card-animated" style={{ '--delay': '0ms', marginBottom: 16 }}>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Séances cette semaine</span>
            <span className="text-lg bold text-accent">{appData.weeklyWorkouts}/{appData.weeklyGoal}</span>
          </div>
          <div className="progress-bar" style={{ height: 4, marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${appData.weeklyWorkouts/appData.weeklyGoal*100}%` }} />
          </div>
        </div>

        {activeSession.length > 0 && (
          <>
            <div className="section-label">SÉANCE EN COURS</div>
            {activeSession.map(ex => (
              <ExerciseCard key={ex.id} exercise={ex} onUpdate={updateExercise} onRemove={() => removeExercise(ex.id)} />
            ))}
            <button className="btn-accent" onClick={finishSession} style={{ marginTop: 8, marginBottom: 16 }}>
              TERMINER LA SÉANCE
            </button>
          </>
        )}

        <div className="section-label">BIBLIOTHÈQUE</div>
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
      </div>
      <BottomNav />
    </div>
  )
}
