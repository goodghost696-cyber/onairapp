import { authHeader } from '../lib/supabase'

const LANG_NAMES = { fr: 'français', en: 'English', es: 'español' }

// Look up real per-100g nutrition for a food name via Open Food Facts.
// Returns null if no usable match is found (caller falls back to the AI
// estimate). Moved here from Scan.jsx so Nutrition.jsx's own multi-food
// text description entry point can reuse it without duplicating the logic.
export async function lookupOFF(name) {
  try {
    // Server-side proxy (api/food-search.js) calls the fast search-a-licious
    // API on our behalf — that endpoint has no CORS support for browsers,
    // so we can't call it directly from here.
    const res = await fetch(
      `/api/food-search?q=${encodeURIComponent(name)}&page_size=1&fields=product_name,nutriments`,
      { headers: await authHeader() }
    )
    const data = await res.json()
    const p = data.hits?.[0]
    const kcal = p?.nutriments?.['energy-kcal_100g']
    if (!p || !kcal) return null
    return {
      kcal100: Math.round(kcal),
      prot100: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
      carb100: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
      fat100: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
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
    }
  }))
  return { meal_name: parsed.meal_name, items }
}
