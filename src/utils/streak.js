import { supabase } from '../lib/supabase'

// Same "today" definition as the rest of the app (AppContext.jsx's
// todayStr(), and every `date` column's `default current_date`) — UTC
// calendar date, not device-local. Deliberately not introducing a second
// notion of "today" just for streaks.
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

// How far back a streak can realistically reach right now — 120 days is
// generous headroom for the app's actual age; a query, not a maintained
// column, so widening this later needs no migration.
const LOOKBACK_DAYS = 120

function addDaysStr(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

// Absolute distance in days — the walk always compares a cursor further in
// the past against an earlier-recorded (more recent) freeze date, so the
// raw subtraction is always negative; without abs() the `< 7` check below
// was always true regardless of actual distance, silently blocking every
// freeze after the first one (caught by a direct test, not by inspection).
function daysBetween(a, b) {
  return Math.abs(Math.round((new Date(`${a}T00:00:00Z`) - new Date(`${b}T00:00:00Z`)) / 86400000))
}

// Pure, testable core: given the set of 'YYYY-MM-DD' days the user was
// active on, how many consecutive days count as the current streak?
//
// - A day counts as active if it's in `activeDates` (caller decides what
//   "active" means — here, at least one seance OR one repas that day).
// - If `today` itself has no activity yet, that's not a broken day (it
//   isn't over) — the walk starts from yesterday instead.
// - Tolerance: 1 inactive day per rolling 7-day window is "frozen"
//   (doesn't break the chain, doesn't add to the count either) rather than
//   needing to be manually activated. Two freezes must be >=7 days apart,
//   which is exactly "at most 1 per rolling week" and also naturally
//   allows an indefinite streak with one fixed rest day every week.
// - `maxDays` is a hard stop, not a real limit in practice (any real
//   streak breaks long before this) — just a defensive bound.
export function calculateStreak(activeDates, today = todayStr(), maxDays = 400) {
  return calculateStreakDetails(activeDates, today, maxDays).streak
}

// Same walk as calculateStreak, but also answers "if I log nothing else
// today, will my streak still survive?" — the freeze tolerance already
// existed but was completely invisible, reported directly ("rendre le
// jour de repos toléré visible"). `restDayAvailable` is true when no
// freeze has been used in the last 6 days (i.e. one is still available
// for today, per the same ">=7 days apart" rule the walk itself uses).
// Only meaningful when there's an actual streak to protect.
export function calculateStreakDetails(activeDates, today = todayStr(), maxDays = 400) {
  let cursor = activeDates.has(today) ? today : addDaysStr(today, -1)
  let streak = 0
  const freezeDates = []

  for (let i = 0; i < maxDays; i++) {
    if (activeDates.has(cursor)) {
      streak++
      cursor = addDaysStr(cursor, -1)
      continue
    }
    const canFreeze = !freezeDates.some(fd => daysBetween(cursor, fd) < 7)
    if (canFreeze) {
      freezeDates.push(cursor)
      cursor = addDaysStr(cursor, -1)
      continue
    }
    break
  }

  const restDayAvailable = streak > 0 && !freezeDates.some(fd => daysBetween(today, fd) < 7)
  return { streak, freezeDates, restDayAvailable }
}

// Shared by fetchStreak/fetchStreakDetails below — 2 queries (seances +
// repas), just the `date` column, OR'd together into one active-dates set.
async function fetchActiveDates(userId) {
  const since = isoDaysAgo(LOOKBACK_DAYS)

  const [{ data: seances, error: e1 }, { data: repas, error: e2 }] = await Promise.all([
    supabase.from('seances').select('date').eq('user_id', userId).gte('date', since),
    supabase.from('repas').select('date').eq('user_id', userId).gte('date', since),
  ])
  if (e1) console.error('[streak] seances fetch failed', e1)
  if (e2) console.error('[streak] repas fetch failed', e2)

  const activeDates = new Set()
  for (const r of seances || []) activeDates.add(r.date)
  for (const r of repas || []) activeDates.add(r.date)
  return activeDates
}

export async function fetchStreak(userId) {
  if (!userId) return 0
  const activeDates = await fetchActiveDates(userId)
  return calculateStreak(activeDates, todayStr())
}

// Dashboard's streak card needs more than the number now — the rest-day
// tolerance ("jour de repos toléré") to make visible.
export async function fetchStreakDetails(userId) {
  if (!userId) return { streak: 0, freezeDates: [], restDayAvailable: false }
  const activeDates = await fetchActiveDates(userId)
  return calculateStreakDetails(activeDates, todayStr())
}

// Batch version for a coach's client list — 2 queries total regardless of
// roster size, same shape as fetchMemberActivitySummaries in
// coachStats.js, not one query pair per member.
export async function fetchStreaksForUsers(userIds) {
  const streaks = {}
  for (const id of userIds) streaks[id] = 0
  if (userIds.length === 0) return streaks

  const since = isoDaysAgo(LOOKBACK_DAYS)
  const [{ data: seances, error: e1 }, { data: repas, error: e2 }] = await Promise.all([
    supabase.from('seances').select('user_id, date').in('user_id', userIds).gte('date', since),
    supabase.from('repas').select('user_id, date').in('user_id', userIds).gte('date', since),
  ])
  if (e1) console.error('[streak] seances batch fetch failed', e1)
  if (e2) console.error('[streak] repas batch fetch failed', e2)

  const activeDatesByUser = {}
  for (const id of userIds) activeDatesByUser[id] = new Set()
  for (const r of seances || []) activeDatesByUser[r.user_id]?.add(r.date)
  for (const r of repas || []) activeDatesByUser[r.user_id]?.add(r.date)

  const today = todayStr()
  for (const id of userIds) streaks[id] = calculateStreak(activeDatesByUser[id], today)
  return streaks
}
