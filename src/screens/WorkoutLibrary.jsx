import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { ExerciseModal } from '../components/ExerciseModal'
import { useExercises } from '../hooks/useExercises'

// Doubled from 8 to 16 per section (was too thin — "pas assez d'exercices
// proposés") and used as the guaranteed baseline regardless of whether
// api/exercises.js (API Ninjas, third-party, can be slow/rate-limited/down)
// returns anything for a given session.
const LOCAL_EXERCISES = {
  maison: [
    { id: 'm1', name: 'Push-up',          muscles: 'Pectoraux · Triceps · Épaules' },
    { id: 'm2', name: 'Squat Bodyweight', muscles: 'Quadriceps · Fessiers' },
    { id: 'm3', name: 'Planche',           muscles: 'Core · Abdos · Épaules' },
    { id: 'm4', name: 'Burpee',            muscles: 'Full body · Cardio' },
    { id: 'm5', name: 'Fentes',            muscles: 'Quadriceps · Fessiers · Ischio' },
    { id: 'm6', name: 'Dips Chaise',       muscles: 'Triceps · Épaules' },
    { id: 'm7', name: 'Mountain Climber', muscles: 'Core · Cardio' },
    { id: 'm8', name: 'Glute Bridge',     muscles: 'Fessiers · Ischio · Core' },
    { id: 'm9', name: 'Pompes Diamant',   muscles: 'Triceps · Pectoraux' },
    { id: 'm10', name: 'Superman',         muscles: 'Dos bas · Fessiers' },
    { id: 'm11', name: 'Chaise Murale',    muscles: 'Quadriceps · Endurance' },
    { id: 'm12', name: 'Crunchs',          muscles: 'Abdos' },
    { id: 'm13', name: 'Jumping Jacks',    muscles: 'Cardio · Full body' },
    { id: 'm14', name: 'Squat Sauté',      muscles: 'Quadriceps · Fessiers · Explosivité' },
    { id: 'm15', name: 'Gainage Latéral',  muscles: 'Obliques · Core' },
    { id: 'm16', name: 'Pompes Pike',      muscles: 'Épaules · Triceps' },
  ],
  salle: [
    { id: 's1', name: 'Bench Press',              muscles: 'Pectoraux · Triceps · Épaules' },
    { id: 's2', name: 'Back Squat',               muscles: 'Quadriceps · Fessiers · Ischio' },
    { id: 's3', name: 'Deadlift',                 muscles: 'Ischio · Dos · Fessiers' },
    { id: 's4', name: 'Pull-up',                  muscles: 'Dos · Biceps · Core' },
    { id: 's5', name: 'Overhead Press',           muscles: 'Épaules · Triceps' },
    { id: 's6', name: 'Romanian Deadlift',        muscles: 'Ischio · Fessiers · Dos' },
    { id: 's7', name: 'Incline Dumbbell Press',   muscles: 'Pectoraux haut · Triceps' },
    { id: 's8', name: 'Cable Row',                muscles: 'Dos · Biceps · Core' },
    { id: 's9', name: 'Leg Press',                muscles: 'Quadriceps · Fessiers' },
    { id: 's10', name: 'Lat Pulldown',             muscles: 'Dos · Biceps' },
    { id: 's11', name: 'Leg Curl',                 muscles: 'Ischio-jambiers' },
    { id: 's12', name: 'Élévations Latérales',     muscles: 'Épaules' },
    { id: 's13', name: 'Curl Biceps Barre',        muscles: 'Biceps' },
    { id: 's14', name: 'Extension Triceps Poulie', muscles: 'Triceps' },
    { id: 's15', name: 'Hip Thrust',               muscles: 'Fessiers · Ischio' },
    { id: 's16', name: 'Front Squat',              muscles: 'Quadriceps · Core' },
  ],
  dehors: [
    { id: 'd1', name: 'Sprint 100m',   muscles: 'Full body · Cardio intense' },
    { id: 'd2', name: 'Traction Barre', muscles: 'Dos · Biceps · Core' },
    { id: 'd3', name: 'Box Jump',      muscles: 'Quadriceps · Fessiers · Explosivité' },
    { id: 'd4', name: 'Jump Rope',     muscles: 'Cardio · Mollets · Coordination' },
    { id: 'd5', name: 'Bear Crawl',    muscles: 'Full body · Core · Épaules' },
    { id: 'd6', name: 'Pistol Squat',  muscles: 'Quadriceps · Équilibre' },
    { id: 'd7', name: 'Hill Sprint',   muscles: 'Cardio · Fessiers · Ischio' },
    { id: 'd8', name: 'Muscle-up',     muscles: 'Dos · Pectoraux · Triceps' },
    { id: 'd9', name: 'Fartlek',       muscles: 'Cardio · Endurance' },
    { id: 'd10', name: 'Broad Jump',    muscles: 'Explosivité · Quadriceps' },
    { id: 'd11', name: "Farmer's Walk", muscles: 'Full body · Grip' },
    { id: 'd12', name: 'Step-up Banc',  muscles: 'Quadriceps · Fessiers' },
    { id: 'd13', name: 'Battle Ropes',  muscles: 'Full body · Cardio' },
    { id: 'd14', name: 'Sprint Escaliers', muscles: 'Cardio · Quadriceps' },
    { id: 'd15', name: 'Trail Run',     muscles: 'Cardio · Endurance' },
    { id: 'd16', name: 'Sac de Sable Clean', muscles: 'Full body · Explosivité' },
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

  const { exercises: apiExercises, loading, error } = useExercises(section)

  // Use API exercises when available, fall back to local
  const baseList = (!loading && !error && apiExercises.length > 0)
    ? apiExercises
    : LOCAL_EXERCISES[section] || []

  const filtered = baseList.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.muscles || '').toLowerCase().includes(search.toLowerCase())
  )

  function addExercise(ex) {
    addExerciseToSession(ex)
    setAdded(prev => ({ ...prev, [ex.id]: true }))
    setToast(true)
    setTimeout(() => setAdded(prev => ({ ...prev, [ex.id]: false })), 1500)
    setTimeout(() => setToast(false), 2000)
    setTimeout(() => navigate('/workout/session'), 800)
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
          {loading && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>Chargement...</span>}
        </div>

        {error && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{error}</p>
        )}

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

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
          {filtered.length} exercice{filtered.length !== 1 ? 's' : ''}
        </p>

        {filtered.map((ex, i) => (
          <div
            key={ex.id}
            className="card card-animated"
            style={{ '--delay': `${i * 40}ms`, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '14px 16px', cursor: 'pointer' }}
            onClick={() => setSelectedExercise(ex)}
          >
            <div style={{ flex: 1 }}>
              <div className="text-base bold">{ex.name}</div>
              <div className="text-sm text-muted">{ex.muscles || ex.type}</div>
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
