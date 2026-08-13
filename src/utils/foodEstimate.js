import { authHeader } from '../lib/supabase'

const LANG_NAMES = { fr: 'français', en: 'English', es: 'español' }

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
function pickBestMatch(hits, query) {
  const candidates = (hits || []).filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'])
  if (candidates.length === 0) return null
  let best = null
  let bestScore = -Infinity
  for (const p of candidates) {
    const score = (hasCompleteMacros(p) ? 10 : 0) + nameSimilarity(query, p.product_name)
    if (score > bestScore) { bestScore = score; best = p }
  }
  return best
}

// Look up real per-100g nutrition for a food name via Open Food Facts.
// Returns null if no usable match is found (caller falls back to the AI
// estimate). Moved here from Scan.jsx so Nutrition.jsx's own multi-food
// text description entry point can reuse it without duplicating the logic.
export async function lookupOFF(name) {
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
    const p = pickBestMatch(data.hits, name)
    const kcal = p?.nutriments?.['energy-kcal_100g']
    if (!p || !kcal) return null
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
    const err = await response.json()
    throw new Error(err.error || `HTTP ${response.status}`)
  }
  const data = await response.json()
  const raw = data.content?.[0]?.text || ''
  const clean = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  const items = await Promise.all((parsed.items || []).map(async (item) => {
    const off = await lookupOFF(item.name)
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
