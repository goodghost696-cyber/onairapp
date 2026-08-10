import { supabase } from '../lib/supabase'

// File d'attente d'écritures, persistée dans localStorage.
//
// Corrige le point 02 de l'audit du 2026-08-10 : jusqu'ici, une écriture
// ratée (réseau coupé, session expirée, souci serveur) était juste
// console.error'ée et l'app affichait quand même la donnée comme
// enregistrée. Le membre rafraîchissait, tout avait disparu, et le coach
// n'avait jamais rien vu. Une salle de sport, c'est souvent un sous-sol
// avec du mauvais réseau : c'est le pire endroit possible pour ce
// comportement.
//
// Principe : on tente l'écriture directe. Si elle échoue, l'opération est
// mise en file et rejouée automatiquement — au retour du réseau, au
// prochain lancement de l'app, ou après n'importe quelle écriture réussie.
// L'interface ne bloque toujours pas (c'était le bon réflexe d'origine),
// mais elle ne ment plus : SyncIndicator affiche ce qui reste en attente.

const KEY = 'onair_write_queue'
const MAX_ENTRIES = 200
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

let flushing = false
const listeners = new Set()

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(raw)) return []
    const cutoff = Date.now() - MAX_AGE_MS
    // Une entrée très ancienne n'est plus rejouable de façon crédible (le
    // membre a probablement ressaisi entre-temps). On la laisse tomber
    // plutôt que d'écrire une valeur périmée par-dessus une valeur fraîche.
    return raw.filter(e => e && typeof e === 'object' && (e.queuedAt || 0) > cutoff)
  } catch {
    return []
  }
}

function write(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch (err) {
    console.error('[writeQueue] persist failed', err)
  }
  for (const fn of listeners) fn(entries.length)
}

export function pendingCount() {
  return read().length
}

// S'abonner au nombre d'écritures en attente (SyncIndicator).
export function subscribe(fn) {
  listeners.add(fn)
  fn(pendingCount())
  return () => listeners.delete(fn)
}

// Deux upserts qui visent la même ligne ET les mêmes colonnes sont
// redondants : seul le dernier compte (eau/pas/km/sommeil sont écrits en
// valeur ABSOLUE, pas en delta — c'est ce qui rend le rejeu sûr). On
// écrase l'ancien pour que la file ne gonfle pas pendant une coupure.
function sameTarget(a, b) {
  if (a.table !== b.table || a.op !== b.op || a.op !== 'upsert') return false
  if (a.onConflict !== b.onConflict) return false
  const keys = (a.onConflict || '').split(',').map(k => k.trim())
  if (!keys.every(k => a.payload?.[k] === b.payload?.[k])) return false
  const ca = Object.keys(a.payload || {}).sort().join()
  const cb = Object.keys(b.payload || {}).sort().join()
  return ca === cb
}

function enqueue(entry) {
  const entries = read().filter(e => !sameTarget(e, entry))
  entries.push(entry)
  write(entries)
}

async function runOne(entry) {
  const q = supabase.from(entry.table)
  if (entry.op === 'upsert') {
    return q.upsert(entry.payload, entry.onConflict ? { onConflict: entry.onConflict } : undefined)
  }
  if (entry.op === 'delete') {
    let del = q.delete()
    for (const [k, v] of Object.entries(entry.match || {})) del = del.eq(k, v)
    return del
  }
  return q.insert(entry.payload)
}

// Rejoue la file dans l'ordre. Séquentiel volontairement : plusieurs
// upserts peuvent viser la même ligne, seul l'ordre garantit la bonne
// valeur finale. S'arrête au premier échec — si le réseau est encore
// coupé, inutile de marteler.
export async function flush() {
  if (flushing) return
  const entries = read()
  if (!entries.length) return
  flushing = true
  try {
    let remaining = [...entries]
    for (const entry of entries) {
      const { error } = await runOne(entry)
      if (error) {
        console.error('[writeQueue] replay failed, keeping in queue', entry.table, error)
        break
      }
      remaining = remaining.slice(1)
    }
    write(remaining)
  } finally {
    flushing = false
  }
}

// Point d'entrée unique. Tente l'écriture ; en cas d'échec, met en file et
// le signale à l'appelant via `queued: true` (l'appelant garde la main sur
// ce qu'il fait de son état local).
export async function writeWithQueue({ table, op = 'insert', payload, onConflict, match, returning }) {
  const entry = { table, op, payload, onConflict, match, queuedAt: Date.now() }

  // Hors ligne connu d'avance : on ne tente même pas, ça évite une erreur
  // réseau bruyante pour rien.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueue(entry)
    return { data: null, error: null, queued: true }
  }

  try {
    let query = supabase.from(table)
    if (op === 'upsert') {
      query = query.upsert(payload, onConflict ? { onConflict } : undefined)
    } else if (op === 'delete') {
      query = query.delete()
      for (const [k, v] of Object.entries(match || {})) query = query.eq(k, v)
    } else {
      query = query.insert(payload)
    }
    if (returning) query = query.select().single()

    const { data, error } = await query
    if (error) {
      // Une erreur de permission (RLS) ou de validation ne se répare pas en
      // réessayant — la rejouer indéfiniment ne ferait qu'encombrer la file.
      // Seules les pannes réseau/serveur valent un rejeu.
      if (isPermanent(error)) {
        console.error('[writeQueue] permanent error, not queued', table, error)
        return { data: null, error, queued: false }
      }
      console.error('[writeQueue] write failed, queued for retry', table, error)
      enqueue(entry)
      return { data: null, error, queued: true }
    }
    // Une écriture qui passe = le réseau est revenu : bon moment pour
    // rejouer ce qui traîne.
    if (pendingCount()) flush()
    return { data, error: null, queued: false }
  } catch (err) {
    console.error('[writeQueue] write threw, queued for retry', table, err)
    enqueue(entry)
    return { data: null, error: err, queued: true }
  }
}

// PostgREST renvoie un `code` PostgreSQL sur les erreurs applicatives
// (42501 = permission refusée / RLS, 23xxx = violation de contrainte,
// 22xxx = donnée invalide). Une panne réseau, elle, n'a pas de code.
function isPermanent(error) {
  const code = error?.code || ''
  return code === '42501' || /^(22|23)/.test(code)
}

// Rejeu automatique : au retour du réseau et au lancement de l'app.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flush())
  setTimeout(() => flush(), 2000)
}
