import { supabase } from '../lib/supabase'

// Veille produit 2026-08-11, proposition n°4 : bibliothèque de programmes
// réutilisables. Module partagé coach/membre, même esprit que
// coachStats.js/streak.js/habits.js — un seul endroit pour cette logique.

// Bibliothèque d'un coach — RLS ("Coaches can view same-gym programmes")
// scope déjà à sa salle, pas besoin de filtrer côté client.
export async function fetchProgramLibrary() {
  const { data, error } = await supabase
    .from('programmes')
    .select('id, titre, exercices, created_at, coach_id')
    .order('created_at', { ascending: false })
  if (error) { console.error('[programs] fetchProgramLibrary failed', error); return [] }
  return data || []
}

// Qui a déjà reçu quel programme — pour ne pas re-proposer un membre déjà
// assigné dans le sélecteur d'assignation.
export async function fetchAssignationsForPrograms(programmeIds) {
  if (!programmeIds || programmeIds.length === 0) return {}
  const { data, error } = await supabase
    .from('programme_assignations')
    .select('programme_id, user_id')
    .in('programme_id', programmeIds)
  if (error) { console.error('[programs] fetchAssignationsForPrograms failed', error); return {} }
  const byProgramme = {}
  for (const row of data || []) {
    if (!byProgramme[row.programme_id]) byProgramme[row.programme_id] = new Set()
    byProgramme[row.programme_id].add(row.user_id)
  }
  return byProgramme
}

// exercices attendu au format [{name, sets, reps, kg, rest}] — même shape
// que le JSON généré par "PROGRAMME IA" (Workout.jsx) et
// AppContext.addExercisesToSession, pour rester branchable directement.
export async function createProgram(coachId, titre, exercices) {
  if (!coachId || !titre?.trim() || !Array.isArray(exercices) || exercices.length === 0) return { success: false }
  const { error } = await supabase
    .from('programmes')
    .insert({ coach_id: coachId, titre: titre.trim(), exercices })
  if (error) { console.error('[programs] createProgram failed', error); return { success: false } }
  return { success: true }
}

export async function deleteProgram(programmeId) {
  if (!programmeId) return { success: false }
  const { error } = await supabase.from('programmes').delete().eq('id', programmeId)
  if (error) { console.error('[programs] deleteProgram failed', error); return { success: false } }
  return { success: true }
}

// Assigne un programme à plusieurs membres d'un coup — insert multiple, la
// contrainte unique(programme_id, user_id) rend un doublon inoffensif
// (23505, ignoré : le membre a déjà ce programme, pas une vraie erreur).
export async function assignProgram(coachId, programmeId, memberUserIds) {
  if (!coachId || !programmeId || !memberUserIds?.length) return { success: false }
  const rows = memberUserIds.map(userId => ({ programme_id: programmeId, user_id: userId, coach_id: coachId }))
  const { error } = await supabase.from('programme_assignations').insert(rows)
  if (error && error.code !== '23505') { console.error('[programs] assignProgram failed', error); return { success: false } }
  return { success: true }
}

export async function unassignProgram(programmeId, memberUserId) {
  if (!programmeId || !memberUserId) return { success: false }
  const { error } = await supabase
    .from('programme_assignations')
    .delete()
    .eq('programme_id', programmeId)
    .eq('user_id', memberUserId)
  if (error) { console.error('[programs] unassignProgram failed', error); return { success: false } }
  return { success: true }
}

// Programmes assignés à un membre — Workout.jsx, "Mes programmes".
export async function fetchMemberPrograms(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('programme_assignations')
    .select('programmes(id, titre, exercices)')
    .eq('user_id', userId)
  if (error) { console.error('[programs] fetchMemberPrograms failed', error); return [] }
  return (data || []).map(row => row.programmes).filter(Boolean)
}
