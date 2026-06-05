import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { ExerciseModal } from '../components/ExerciseModal'

const EXERCISES = {
  maison: [
    { name: 'Push-up', muscles: 'Pectoraux · Triceps · Épaules', id: 'm1' },
    { name: 'Squat Bodyweight', muscles: 'Quadriceps · Fessiers', id: 'm2' },
    { name: 'Planche', muscles: 'Core · Abdos · Épaules', id: 'm3' },
    { name: 'Burpee', muscles: 'Full body · Cardio', id: 'm4' },
    { name: 'Fentes', muscles: 'Quadriceps · Fessiers · Ischio', id: 'm5' },
    { name: 'Dips Chaise', muscles: 'Triceps · Épaules', id: 'm6' },
    { name: 'Mountain Climber', muscles: 'Core · Cardio', id: 'm7' },
    { name: 'Glute Bridge', muscles: 'Fessiers · Ischio · Core', id: 'm8' },
  ],
  salle: [
    { name: 'Bench Press', muscles: 'Pectoraux · Triceps · Épaules', id: 's1' },
    { name: 'Back Squat', muscles: 'Quadriceps · Fessiers · Ischio', id: 's2' },
    { name: 'Deadlift', muscles: 'Ischio · Dos · Fessiers', id: 's3' },
    { name: 'Pull-up', muscles: 'Dos · Biceps · Core', id: 's4' },
    { name: 'Overhead Press', muscles: 'Épaules · Triceps', id: 's5' },
    { name: 'Romanian Deadlift', muscles: 'Ischio · Fessiers · Dos', id: 's6' },
    { name: 'Incline Dumbbell Press', muscles: 'Pectoraux haut · Triceps', id: 's7' },
    { name: 'Cable Row', muscles: 'Dos · Biceps · Core', id: 's8' },
  ],
  dehors: [
    { name: 'Sprint 100m', muscles: 'Full body · Cardio intense', id: 'd1' },
    { name: 'Traction Barre', muscles: 'Dos · Biceps · Core', id: 'd2' },
    { name: 'Box Jump', muscles: 'Quadriceps · Fessiers · Explosivité', id: 'd3' },
    { name: 'Jump Rope', muscles: 'Cardio · Mollets · Coordination', id: 'd4' },
    { name: 'Bear Crawl', muscles: 'Full body · Core · Épaules', id: 'd5' },
    { name: 'Pistol Squat', muscles: 'Quadriceps · Équilibre', id: 'd6' },
    { name: 'Hill Sprint', muscles: 'Cardio · Fessiers · Ischio', id: 'd7' },
    { name: 'Muscle-up', muscles: 'Dos · Pectoraux · Triceps', id: 'd8' },
  ],
}

const SECTION_NAMES = { maison: 'Maison', salle: 'Salle', dehors: 'Dehors' }

export default function WorkoutLibrary({ section }) {
  const navigate = useNavigate()
  const { addExerciseToSession } = useApp()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [added, setAdded] = useState({})
  const [toast, setToast] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)

  const exercises = EXERCISES[section] || []
  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscles.toLowerCase().includes(search.toLowerCase())
  )

  function addExercise(ex) {
    addExerciseToSession(ex)
    setAdded(prev => ({ ...prev, [ex.id]: true }))
    setToast(true)
    setTimeout(() => setAdded(prev => ({ ...prev, [ex.id]: false })), 1500)
    setTimeout(() => setToast(false), 2000)
    setTimeout(() => navigate('/workout'), 800)
  }

  return (
    <div className="app-wrapper">
      {/* Toast */}
      <div style={{
        position: 'fixed', top: toast ? 16 : -60, left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--success)', color: '#000',
        padding: '10px 20px', borderRadius: 50,
        fontSize: 12, fontWeight: 700, letterSpacing: 1,
        zIndex: 300,
        transition: 'top 300ms cubic-bezier(0.34,1.56,0.64,1)',
        whiteSpace: 'nowrap',
      }}>
        Ajouté à ta séance
      </div>

      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => navigate('/workout')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="text-xl bold">{SECTION_NAMES[section]}</h1>
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search_exercise')}
            style={{ paddingLeft: 40 }}
          />
        </div>

        {filtered.map((ex, i) => (
          <div
            key={ex.id}
            className="card card-animated"
            style={{ '--delay': `${i * 60}ms`, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '14px 16px', cursor: 'pointer' }}
            onClick={() => setSelectedExercise(ex)}
          >
            <div style={{ flex: 1 }}>
              <div className="text-base bold">{ex.name}</div>
              <div className="text-sm text-muted">{ex.muscles}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); addExercise(ex) }}
              style={{
                background: 'transparent',
                border: `1px solid ${added[ex.id] ? 'var(--success)' : 'var(--accent)'}`,
                color: added[ex.id] ? 'var(--success)' : 'var(--accent)',
                fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                padding: '6px 12px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                transition: 'all 200ms ease',
              }}
            >
              {added[ex.id] ? t('added') : t('add_btn')}
            </button>
          </div>
        ))}
      </div>

      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          onAdd={addExercise}
        />
      )}


    </div>
  )
}
