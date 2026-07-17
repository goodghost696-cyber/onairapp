import { supabase } from '../lib/supabase'

// The heaviest set logged for one exercise in a single seance (falls back to
// the set with the most reps if nothing has weight — bodyweight moves).
function bestSet(sets) {
  if (!sets || !sets.length) return null
  return sets.reduce((best, s) => {
    if (!best) return s
    if ((s.kg || 0) !== (best.kg || 0)) return (s.kg || 0) > (best.kg || 0) ? s : best
    return (s.reps || 0) > (best.reps || 0) ? s : best
  }, null)
}

// Builds a per-exercise progression from real seances, for the "MES
// CHARGES" section of Weekly.jsx. Each entry is the last `limit` seances an
// exercise appeared in. Exercises never logged with weight (bodyweight
// moves, e.g. pull-ups) track reps instead of kg.
export async function fetchLiftProgress(userId, limit = 4) {
  const { data, error } = await supabase
    .from('seances')
    .select('date, exercices')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .limit(60)

  if (error) {
    console.error('[liftProgress] seances fetch failed', error)
    return []
  }

  const byExercise = {}
  ;(data || []).forEach(row => {
    ;(row.exercices || []).forEach(ex => {
      const set = bestSet(ex.sets)
      if (!set || !ex.name) return
      if (!byExercise[ex.name]) byExercise[ex.name] = []
      byExercise[ex.name].push({ date: row.date, kg: set.kg || 0, reps: set.reps || 0 })
    })
  })

  return Object.entries(byExercise)
    .map(([name, entries]) => {
      const recent = entries.slice(-limit)
      const usesWeight = recent.some(e => e.kg > 0)
      return {
        name,
        unit: usesWeight ? 'kg' : 'reps',
        sessions: recent.map(e => (usesWeight ? e.kg : e.reps)),
        dates: recent.map(e => new Date(`${e.date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })),
      }
    })
    // A curve needs at least 2 points — skip exercises only done once.
    .filter(l => l.sessions.length >= 2)
    .sort((a, b) => b.sessions.length - a.sessions.length)
    .slice(0, 4)
}
