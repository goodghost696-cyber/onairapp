import { supabase } from '../lib/supabase'

const ACTIVITY_WINDOW_DAYS = 14

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(`${dateStr}T00:00:00`).getTime()) / 86400000)
}

// ON TRACK / AT RISK / INACTIVE from real recency + volume rather than the
// mock fields the coach screens used before — no activity in 5+ days reads
// as inactive, recent + at least 3 sessions this week reads as on track,
// anything in between is "at risk" (the ambiguous middle ground).
function computeStatus(lastActiveDate, sessionsThisWeek) {
  if (!lastActiveDate) return 'INACTIVE'
  const age = daysSince(lastActiveDate)
  if (age > 5) return 'INACTIVE'
  if (age <= 2 && sessionsThisWeek >= 3) return 'ON TRACK'
  return 'AT RISK'
}

// Aggregates recent activity for a list of member user_ids in 2 queries
// total (not one per member — this is meant to back a coach's full client
// list, not just a single member page).
export async function fetchMemberActivitySummaries(userIds) {
  const summaries = {}
  for (const id of userIds) summaries[id] = { lastActiveDate: null, sessionsThisWeek: 0, status: 'INACTIVE' }
  if (userIds.length === 0) return summaries

  const since = isoDaysAgo(ACTIVITY_WINDOW_DAYS)
  const weekAgo = isoDaysAgo(7)

  const [{ data: seances, error: e1 }, { data: activite, error: e2 }] = await Promise.all([
    supabase.from('seances').select('user_id, date').in('user_id', userIds).gte('date', since),
    supabase.from('activite_jour').select('user_id, date').in('user_id', userIds).gte('date', since),
  ])
  if (e1) console.error('[coachStats] seances fetch failed', e1)
  if (e2) console.error('[coachStats] activite fetch failed', e2)

  for (const row of seances || []) {
    const s = summaries[row.user_id]
    if (!s) continue
    if (!s.lastActiveDate || row.date > s.lastActiveDate) s.lastActiveDate = row.date
    if (row.date >= weekAgo) s.sessionsThisWeek += 1
  }
  for (const row of activite || []) {
    const s = summaries[row.user_id]
    if (!s) continue
    if (!s.lastActiveDate || row.date > s.lastActiveDate) s.lastActiveDate = row.date
  }
  for (const id of userIds) {
    const s = summaries[id]
    s.status = computeStatus(s.lastActiveDate, s.sessionsThisWeek)
  }
  return summaries
}

// Gym-wide day-by-day trend for CoachDashboard's activity chart — distinct
// from fetchMemberActivitySummaries above, which only returns one rolled-up
// number per member (no day breakdown). 2 queries total regardless of
// roster size, same batching approach as that function.
export async function fetchGymWeeklyActivity(userIds) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10))
  }
  const skeleton = days.map(date => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
    sessions: 0,
    activeMembers: 0,
  }))
  if (userIds.length === 0) return skeleton

  const [{ data: seances, error: e1 }, { data: activite, error: e2 }] = await Promise.all([
    supabase.from('seances').select('user_id, date').in('user_id', userIds).gte('date', days[0]),
    supabase.from('activite_jour').select('user_id, date').in('user_id', userIds).gte('date', days[0]),
  ])
  if (e1) console.error('[coachStats] fetchGymWeeklyActivity: seances fetch failed', e1)
  if (e2) console.error('[coachStats] fetchGymWeeklyActivity: activite fetch failed', e2)

  const byDate = {}
  for (const d of days) byDate[d] = { sessions: 0, activeUsers: new Set() }
  for (const row of seances || []) {
    if (!byDate[row.date]) continue
    byDate[row.date].sessions += 1
    byDate[row.date].activeUsers.add(row.user_id)
  }
  for (const row of activite || []) {
    if (byDate[row.date]) byDate[row.date].activeUsers.add(row.user_id)
  }

  return skeleton.map(d => ({
    ...d,
    sessions: byDate[d.date].sessions,
    activeMembers: byDate[d.date].activeUsers.size,
  }))
}

export function lastSeenLabel(lastActiveDate) {
  if (!lastActiveDate) return 'Jamais actif'
  const age = daysSince(lastActiveDate)
  if (age <= 0) return "Aujourd'hui"
  if (age === 1) return 'Hier'
  return `Il y a ${age}j`
}

// Full detail for a single member's page — weekly session chart + rolling
// averages for calories/sleep/steps, computed from real logged rows.
export async function fetchMemberDetailStats(userId) {
  const since7 = isoDaysAgo(7)
  const since30 = isoDaysAgo(30)

  const [
    { data: objectifs },
    { data: seances, error: e1 },
    { data: activite, error: e2 },
    { data: repas, error: e3 },
  ] = await Promise.all([
    supabase.from('objectifs').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('seances').select('date').eq('user_id', userId).gte('date', since7),
    supabase.from('activite_jour').select('date, pas, sommeil_h').eq('user_id', userId).gte('date', since30),
    supabase.from('repas').select('date, calories').eq('user_id', userId).gte('date', since30),
  ])
  if (e1) console.error('[coachStats] seances detail fetch failed', e1)
  if (e2) console.error('[coachStats] activite detail fetch failed', e2)
  if (e3) console.error('[coachStats] repas detail fetch failed', e3)

  const sessionDates = new Set((seances || []).map(s => s.date))
  const sessionsThisWeek = sessionDates.size

  const activiteRows = activite || []
  const avgSteps = activiteRows.length
    ? Math.round(activiteRows.reduce((sum, r) => sum + (r.pas || 0), 0) / activiteRows.length)
    : 0
  const sleepRows = activiteRows.filter(r => r.sommeil_h > 0)
  const avgSleepH = sleepRows.length
    ? Math.round((sleepRows.reduce((sum, r) => sum + r.sommeil_h, 0) / sleepRows.length) * 10) / 10
    : 0

  // Calories are logged per-meal, several rows per day — sum per day first,
  // then average across days that actually have at least one meal logged.
  const caloriesByDay = {}
  for (const r of repas || []) {
    caloriesByDay[r.date] = (caloriesByDay[r.date] || 0) + (r.calories || 0)
  }
  const dayTotals = Object.values(caloriesByDay)
  const avgCalories = dayTotals.length
    ? Math.round(dayTotals.reduce((sum, v) => sum + v, 0) / dayTotals.length)
    : 0

  const lastActiveDate = [...sessionDates, ...activiteRows.map(r => r.date)].sort().pop() || null

  return {
    objectifs,
    sessionsThisWeek,
    avgSteps,
    avgSleepH,
    avgCalories,
    lastActiveDate,
    status: computeStatus(lastActiveDate, sessionsThisWeek),
    weekSessionDates: sessionDates,
  }
}

// A coach's private note on one member — one evolving note per pair, not
// a dated feed. RLS restricts this to the authoring coach only (not even
// other coaches, never the member themselves).
export async function fetchCoachNote(coachId, memberId) {
  if (!coachId || !memberId) return ''
  const { data, error } = await supabase
    .from('coach_notes')
    .select('content')
    .eq('coach_id', coachId)
    .eq('member_id', memberId)
    .maybeSingle()
  if (error) { console.error('[coachStats] fetchCoachNote failed', error); return '' }
  return data?.content || ''
}

export async function saveCoachNote(coachId, memberId, content) {
  const { error } = await supabase
    .from('coach_notes')
    .upsert({ coach_id: coachId, member_id: memberId, content, updated_at: new Date().toISOString() }, { onConflict: 'coach_id,member_id' })
  if (error) { console.error('[coachStats] saveCoachNote failed', error); return { success: false } }
  return { success: true }
}

// Raw recent rows for a member's page — the averages above are good for a
// trend, but a coach spotting a specific problem (a bad meal, a skipped
// session) needs to see the actual entries, not just a number.
export async function fetchMemberRecentActivity(userId) {
  const [{ data: repas, error: e1 }, { data: seances, error: e2 }] = await Promise.all([
    supabase.from('repas').select('nom, calories, date, type_repas').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(8),
    supabase.from('seances').select('nom, date, duree_min, exercices').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(8),
  ])
  if (e1) console.error('[coachStats] recent repas fetch failed', e1)
  if (e2) console.error('[coachStats] recent seances fetch failed', e2)
  return { recentMeals: repas || [], recentSessions: seances || [] }
}
