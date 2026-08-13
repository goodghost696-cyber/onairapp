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

// Aggregates the last 7 days of repas/activite_jour into the shape
// Weekly.jsx displays (one entry per day, oldest first), plus weekly totals
// for pas/km_courus — these must be a 7-day sum, not appData.steps/kmRun
// (those are today-only counters shared with the Dashboard, see JOURNAL.md
// audit du 2026-08-13).
export async function fetchWeeklyStats(userId) {
  const days = lastNDays(7)
  const dateStrs = days.map(d => d.toISOString().slice(0, 10))
  const fromDate = dateStrs[0]

  const [repasRes, activiteRes] = await Promise.all([
    supabase.from('repas').select('date, calories').eq('user_id', userId).gte('date', fromDate),
    supabase.from('activite_jour').select('date, pas, km_courus, sommeil_h').eq('user_id', userId).gte('date', fromDate),
  ])

  if (repasRes.error) console.error('[weeklyStats] repas fetch failed', repasRes.error)
  if (activiteRes.error) console.error('[weeklyStats] activite_jour fetch failed', activiteRes.error)

  const caloriesByDate = {}
  ;(repasRes.data || []).forEach(r => {
    caloriesByDate[r.date] = (caloriesByDate[r.date] || 0) + (r.calories || 0)
  })

  const sleepByDate = {}
  let weeklySteps = 0
  let weeklyKmRun = 0
  ;(activiteRes.data || []).forEach(r => {
    sleepByDate[r.date] = r.sommeil_h != null ? Number(r.sommeil_h) : 0
    weeklySteps += r.pas || 0
    weeklyKmRun += r.km_courus != null ? Number(r.km_courus) : 0
  })

  const weeklyData = days.map(d => {
    const ds = d.toISOString().slice(0, 10)
    return {
      day: DAY_LETTERS[d.getDay()],
      calories: caloriesByDate[ds] || 0,
    }
  })

  const sleepData = days.map(d => {
    const ds = d.toISOString().slice(0, 10)
    return { day: DAY_LETTERS[d.getDay()], hours: sleepByDate[ds] || 0 }
  })

  return { weeklyData, sleepData, weeklySteps, weeklyKmRun }
}
