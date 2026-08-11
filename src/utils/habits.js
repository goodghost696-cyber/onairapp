import { supabase } from '../lib/supabase'
import { writeWithQueue } from './writeQueue'

// Veille produit 2026-08-11, proposition n°3 : le coach assigne une
// habitude/un défi à un membre, le membre coche au quotidien. Même shape
// utilisée côté coach (MemberDetail.jsx, lecture + assignation) et côté
// membre (Dashboard.jsx, lecture + coche du jour) — c'est le même module,
// pas deux copies, comme coachStats.js/streak.js pour le reste de l'app.

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

// 7 derniers jours, le plus ancien en premier — assez pour une bande de
// points façon "streak" sans reconstruire tout l'historique à chaque coche.
const PROGRESS_WINDOW_DAYS = 7

// Habitudes actives d'un membre, chacune enrichie de sa progression sur
// les 7 derniers jours. userId est le membre concerné, qu'on soit appelé
// par le membre lui-même (sa propre fiche) ou par son coach (RLS scope
// chaque cas différemment mais la forme du résultat ne change pas).
export async function fetchHabitsWithProgress(userId) {
  if (!userId) return []
  const since = isoDaysAgo(PROGRESS_WINDOW_DAYS - 1)
  const today = todayStr()

  const { data: habitudes, error: hErr } = await supabase
    .from('habitudes')
    .select('id, titre, frequence_par_semaine, created_at')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true })
  if (hErr) { console.error('[habits] fetch habitudes failed', hErr); return [] }
  if (!habitudes || habitudes.length === 0) return []

  const { data: logs, error: lErr } = await supabase
    .from('habitude_logs')
    .select('habitude_id, date')
    .in('habitude_id', habitudes.map(h => h.id))
    .gte('date', since)
  if (lErr) console.error('[habits] fetch logs failed', lErr)

  const datesByHabitude = {}
  for (const row of logs || []) {
    if (!datesByHabitude[row.habitude_id]) datesByHabitude[row.habitude_id] = new Set()
    datesByHabitude[row.habitude_id].add(row.date)
  }

  const last7 = []
  for (let i = PROGRESS_WINDOW_DAYS - 1; i >= 0; i--) {
    last7.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10))
  }

  return habitudes.map(h => {
    const dates = datesByHabitude[h.id] || new Set()
    return {
      id: h.id,
      titre: h.titre,
      frequenceParSemaine: h.frequence_par_semaine,
      doneToday: dates.has(today),
      last7Days: last7.map(d => dates.has(d)),
      countThisWeek: last7.map(d => dates.has(d)).filter(Boolean).length,
    }
  })
}

// Coche l'habitude du jour pour le membre appelant. Passe par la file
// d'attente hors-ligne (writeQueue) — même raison que pour repas/séances :
// une salle de sport, c'est souvent un sous-sol avec du mauvais réseau.
export async function checkHabitToday(habitudeId, userId) {
  if (!habitudeId || !userId) return { success: false }
  const { error, queued } = await writeWithQueue({
    table: 'habitude_logs',
    op: 'insert',
    payload: { habitude_id: habitudeId, user_id: userId, date: todayStr() },
  })
  if (error && !queued) { console.error('[habits] checkHabitToday failed', error); return { success: false } }
  return { success: true, queued: !!queued }
}

// Décoche — plus rare (coché par erreur), pas besoin de file d'attente
// (une suppression ratée par manque de réseau n'a pas les mêmes
// conséquences qu'une écriture perdue : au pire l'utilisateur réessaie).
export async function uncheckHabitToday(habitudeId, userId) {
  if (!habitudeId || !userId) return { success: false }
  const { error } = await supabase
    .from('habitude_logs')
    .delete()
    .eq('habitude_id', habitudeId)
    .eq('user_id', userId)
    .eq('date', todayStr())
  if (error) { console.error('[habits] uncheckHabitToday failed', error); return { success: false } }
  return { success: true }
}

// Assigne une nouvelle habitude à un membre — appelé depuis la fiche
// membre côté coach. RLS ("Coaches can assign same-gym habitudes") fait le
// vrai travail : échoue tout seul si le membre n'est pas dans la salle du
// coach.
export async function assignHabit(coachId, memberUserId, titre, frequenceParSemaine) {
  if (!coachId || !memberUserId || !titre?.trim()) return { success: false }
  const { error } = await supabase
    .from('habitudes')
    .insert({ user_id: memberUserId, coach_id: coachId, titre: titre.trim(), frequence_par_semaine: frequenceParSemaine || 7 })
  if (error) { console.error('[habits] assignHabit failed', error); return { success: false } }
  return { success: true }
}

// Archive (ne supprime pas — l'historique de logs reste utile) une
// habitude assignée. Toujours côté coach.
export async function archiveHabit(habitudeId) {
  if (!habitudeId) return { success: false }
  const { error } = await supabase
    .from('habitudes')
    .update({ active: false })
    .eq('id', habitudeId)
  if (error) { console.error('[habits] archiveHabit failed', error); return { success: false } }
  return { success: true }
}
