import { supabase } from '../lib/supabase'

// Date#getDay(): 0=Sun..6=Sat
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function lastNDays(n) {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  return days
}

// Aggregates the last 7 days of repas/activite_jour/seances into the shape
// Weekly.jsx and Sleep.jsx display (one entry per day, oldest first).
export async function fetchWeeklyStats(userId) {
  const days = lastNDays(7)
  const dateStrs = days.map(d => d.toISOString().slice(0, 10))
  const fromDate = dateStrs[0]

  const [repasRes, activiteRes, seancesRes] = await Promise.all([
    supabase.from('repas').select('date, calories').eq('user_id', userId).gte('date', fromDate),
    supabase.from('activite_jour').select('date, pas, sommeil_h').eq('user_id', userId).gte('date', fromDate),
    supabase.from('seances').select('date').eq('user_id', userId).gte('date', fromDate),
  ])

  if (repasRes.error) console.error('[weeklyStats] repas fetch failed', repasRes.error)
  if (activiteRes.error) console.error('[weeklyStats] activite_jour fetch failed', activiteRes.error)
  if (seancesRes.error) console.error('[weeklyStats] seances fetch failed', seancesRes.error)

  const caloriesByDate = {}
  ;(repasRes.data || []).forEach(r => {
    caloriesByDate[r.date] = (caloriesByDate[r.date] || 0) + (r.calories || 0)
  })

  const stepsByDate = {}
  const sleepByDate = {}
  ;(activiteRes.data || []).forEach(r => {
    stepsByDate[r.date] = r.pas || 0
    sleepByDate[r.date] = r.sommeil_h != null ? Number(r.sommeil_h) : 0
  })

  const workoutDates = new Set((seancesRes.data || []).map(s => s.date))

  const weeklyData = days.map(d => {
    const ds = d.toISOString().slice(0, 10)
    return {
      day: DAY_LETTERS[d.getDay()],
      calories: caloriesByDate[ds] || 0,
      steps: stepsByDate[ds] || 0,
      workout: workoutDates.has(ds),
    }
  })

  const sleepData = days.map(d => {
    const ds = d.toISOString().slice(0, 10)
    return { day: DAY_LETTERS[d.getDay()], hours: sleepByDate[ds] || 0 }
  })

  return { weeklyData, sleepData }
}
