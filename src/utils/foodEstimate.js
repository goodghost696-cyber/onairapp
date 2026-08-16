import { authHeader } from '../lib/supabase'

const LANG_NAMES = { fr: 'français', en: 'English', es: 'español' }

// Same reasoning as Nutrition.jsx's own GENERIC_AI_ERROR — a raw proxy/API
// error (rate limit, quota, validation...) isn't meaningful to a member.
const GENERIC_AI_ERROR = 'Une erreur est survenue, réessaie.'

// Strips accents/case so "Oeuf" and "œuf" (or an OFF entry in a slightly
// different form) compare equal — no need for a real i18n string library
// for this one comparison.
function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// Basic word-overlap similarity, not real NLP/fuzzy matching — good enough
// to give a slight edge to a product name that actually resembles the
// searched term over one that only matched OFF's own text search loosely.
function nameSimilarity(query, candidateName) {
  const q = normalize(query)
  const c = normalize(candidateName)
  if (!q || !c) return 0
  if (c === q) return 1
  if (c.includes(q) || q.includes(c)) return 0.7
  const qWords = q.split(/\s+/).filter(Boolean)
  if (qWords.length === 0) return 0
  const cWords = new Set(c.split(/\s+/).filter(Boolean))
  const overlap = qWords.filter(w => cWords.has(w)).length
  return (overlap / qWords.length) * 0.5
}

function hasCompleteMacros(p) {
  const n = p.nutriments || {}
  return n['energy-kcal_100g'] != null && n.proteins_100g != null && n.carbohydrates_100g != null && n.fat_100g != null
}

// Picks the best candidate among several OFF hits instead of trusting
// whichever came back first from search-a-licious's own relevance ranking
// (which optimizes for text match, not data completeness). A hit with all
// 4 macros filled in is preferred outright over one merely matching the
// name better but missing proteins/carbs/fat (those would silently read as
// 0 downstream) — name similarity only breaks ties within the same
// completeness tier.
function usableRef(refKcal100) {
  return Number.isFinite(refKcal100) && refKcal100 > 0
}

// Proximité entre le kcal/100g d'un candidat OFF et l'estimation que le
// modèle a lui-même donnée pour cet aliment : 1 = identique, 0 = écart
// d'au moins 100%. Sert de départage quand plusieurs candidats sont à
// égalité sur la complétude ET sur le nom (cas fréquent : OFF renvoie
// plusieurs produits génériques portant exactement le même libellé).
function kcalProximity(refKcal100, kcal) {
  if (!usableRef(refKcal100) || !Number.isFinite(kcal)) return 0
  return 1 - Math.min(1, Math.abs(kcal - refKcal100) / refKcal100)
}

// Poids volontairement < 0.3 (l'écart entre deux paliers de
// nameSimilarity) : un produit dont le nom correspond mieux gagne
// toujours, la proximité calorique ne fait que départager à nom égal.
const KCAL_PROXIMITY_WEIGHT = 0.25

// Au-delà de ce facteur d'écart avec l'estimation du modèle, le produit
// OFF retenu n'est très probablement pas le bon aliment — on préfère
// alors ne rien renvoyer (l'appelant retombe sur l'estimation IA et
// n'affiche pas le badge « vérifié »).
const MAX_KCAL_RATIO = 2

function pickBestMatch(hits, query, refKcal100) {
  const candidates = (hits || []).filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'])
  if (candidates.length === 0) return null
  let best = null
  let bestScore = -Infinity
  for (const p of candidates) {
    const score = (hasCompleteMacros(p) ? 10 : 0)
      + nameSimilarity(query, p.product_name)
      + KCAL_PROXIMITY_WEIGHT * kcalProximity(refKcal100, p.nutriments['energy-kcal_100g'])
    if (score > bestScore) { bestScore = score; best = p }
  }
  return best
}

// Look up real per-100g nutrition for a food name via Open Food Facts.
// Returns null if no usable match is found (caller falls back to the AI
// estimate). Moved here from Scan.jsx so Nutrition.jsx's own multi-food
// text description entry point can reuse it without duplicating the logic.
// `refKcal100` = l'estimation par 100g que le modèle a lui-même donnée
// pour cet aliment (déjà présente chez les deux appelants, où elle sert
// de repli). Utilisée ici pour départager des candidats OFF à égalité et
// pour rejeter un match manifestement hors-sujet — voir le bug mesuré en
// test réel le 2026-08-16 : « Pâte à tartiner Nutella » renvoyait 5
// produits OFF tous nommés exactement « Pâte à tartiner » (78, 59, 555 et
// 571 kcal/100g). Tous à égalité de score, le premier de la liste
// gagnait : 400g de Nutella étaient comptés 312 kcal au lieu de ~2200,
// avec un badge « ✓ vérifié » qui rendait l'erreur crédible.
export async function lookupOFF(name, refKcal100) {
  try {
    // Server-side proxy (api/food-search.js) calls the fast search-a-licious
    // API on our behalf — that endpoint has no CORS support for browsers,
    // so we can't call it directly from here. page_size raised from 1 to 5
    // so pickBestMatch above has real candidates to score instead of
    // blindly trusting whatever OFF's own ranking put first.
    const res = await fetch(
      `/api/food-search?q=${encodeURIComponent(name)}&page_size=5&fields=product_name,nutriments`,
      { headers: await authHeader() }
    )
    const data = await res.json()
    const p = pickBestMatch(data.hits, name, refKcal100)
    const kcal = p?.nutriments?.['energy-kcal_100g']
    if (!p || !kcal) return null
    // Garde-fou : même le meilleur candidat peut rester un tout autre
    // aliment. Sans repère du modèle, on garde le comportement d'avant.
    if (usableRef(refKcal100) && (kcal > refKcal100 * MAX_KCAL_RATIO || kcal < refKcal100 / MAX_KCAL_RATIO)) {
      return null
    }
    return {
      kcal100: Math.round(kcal),
      prot100: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
      carb100: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
      fat100: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
      // Exposed so callers can show the user which OFF product was actually
      // matched (see Nutrition.jsx's "Décrire un repas" item list) — the
      // old single-hit lookup never surfaced this, so a wrong auto-match
      // was invisible until the calories looked off.
      productName: p.product_name,
    }
  } catch {
    return null
  }
}

// Items carry per-100g values + an editable gram amount, so adjusting the
// portion recomputes calories/macros live without another network call.
export function computeItemsTotal(items) {
  return items.reduce((acc, it) => {
    const factor = (it.grams || 0) / 100
    acc.kcal += it.kcal100 * factor
    acc.proteins += it.prot100 * factor
    acc.carbs += it.carb100 * factor
    acc.fats += it.fat100 * factor
    return acc
  }, { kcal: 0, proteins: 0, carbs: 0, fats: 0 })
}

// "3 oeufs, 4 c. à soupe de skyr" -> { meal_name, items[] }, same shape as
// Scan.jsx's photo-based 'food' result. Moved out of Scan.jsx and now used
// directly on Nutrition.jsx's main screen (no separate screen/navigation —
// explicitly requested: "je ne veux pas un nouveau chemin").
export async function estimateFoodsFromText(description, lang) {
  const langName = LANG_NAMES[lang] || LANG_NAMES.fr
  const prompt = `Un utilisateur décrit ce qu'il a mangé en unités courantes plutôt qu'en grammes (ex: "3 oeufs", "4 cuillères à soupe de skyr", "2 tranches de pain"). Identifie chaque aliment et sa quantité, puis CONVERTIS cette quantité en grammes en te basant sur des poids de référence standards et réalistes pour cette unité (ex: un oeuf moyen ≈ 50-55g, une cuillère à soupe de yaourt/skyr ≈ 15-18g, une tranche de pain ≈ 30g, une poignée ≈ 30g, une portion standard selon l'aliment). Reste raisonnable et réaliste, ne sur-estime ni sous-estime pas grossièrement.
Description : "${description}"
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, avec exactement cette structure :
{
  "meal_name": "Description courte du repas",
  "items": [
    {
      "name": "Oeuf",
      "grams": 150,
      "kcal_100g": 155,
      "proteins_100g": 13,
      "carbs_100g": 1.1,
      "fats_100g": 11
    }
  ]
}
"grams" est le poids TOTAL estimé pour la quantité décrite (ex: 3 oeufs ≈ 150g au total, pas 50g). kcal_100g/proteins_100g/carbs_100g/fats_100g restent des valeurs pour 100g de cet aliment (pas pour la portion) — utilisées seulement si une recherche en base de données réelle échoue ensuite pour ce nom.
Réponds en ${langName}. Les noms des aliments doivent être en ${langName}.`

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('[foodEstimate] estimateFoodsFromText: /api/claude request failed', response.status, err.error)
    throw new Error(GENERIC_AI_ERROR)
  }
  const data = await response.json()
  const raw = data.content?.[0]?.text || ''
  const clean = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  const items = await Promise.all((parsed.items || []).map(async (item) => {
    const off = await lookupOFF(item.name, item.kcal_100g)
    return {
      name: item.name,
      grams: item.grams || 100,
      kcal100: off?.kcal100 ?? item.kcal_100g ?? 0,
      prot100: off?.prot100 ?? item.proteins_100g ?? 0,
      carb100: off?.carb100 ?? item.carbs_100g ?? 0,
      fat100: off?.fat100 ?? item.fats_100g ?? 0,
      verified: !!off,
      // Which OFF product lookupOFF actually matched — shown next to the
      // "✓ vérifié" badge in Nutrition.jsx so a bad auto-match is visible
      // before the meal is saved, instead of only showing "vérifié" without
      // saying against what.
      offName: off?.productName || null,
    }
  }))
  return { meal_name: parsed.meal_name, items }
}
