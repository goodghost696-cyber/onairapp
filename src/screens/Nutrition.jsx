import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { FOOD_DATABASE } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { authHeader } from '../lib/supabase'
import { BOUNDS, clamp } from '../utils/validation'
import { dailyRemainingCalories } from '../utils/metabolism'
import { resizeImage } from '../utils/image'
import NutriscoreBadge from '../components/NutriscoreBadge'
import SwipeableRow from '../components/SwipeableRow'
import '../styles/nutrition.css'

// Manual food-search entries encode their grams in the name ("Skyr (100g)")
// — extracted so "Modifier" can rescale calories/macros proportionally.
// Meals without it (scan results, AI recipes) aren't gram-based, so editing
// them isn't offered — delete + re-add is still available.
function extractGrams(name) {
  const m = name.match(/\((\d+)g\)$/)
  return m ? parseInt(m[1], 10) : null
}

function calcNutrition(food, grams) {
  return {
    kcal: Math.round(food.per100g.kcal * grams / 100),
    proteins: Math.round(food.per100g.proteins * grams / 100 * 10) / 10,
    carbs: Math.round(food.per100g.carbs * grams / 100 * 10) / 10,
    fats: Math.round(food.per100g.fats * grams / 100 * 10) / 10,
  }
}

export default function Nutrition() {
  const navigate = useNavigate()
  const location = useLocation()
  const { appData, addMeal, deleteMeal } = useApp()
  const [editingMeal, setEditingMeal] = useState(null)
  const [editGrams, setEditGrams] = useState('')
  const { user } = useAuth()
  const { t } = useLanguage()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [foodSearch, setFoodSearch] = useState('')
  const [foodResults, setFoodResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState(null)
  // Raw text, not a clamped number — clamping this on every keystroke (the
  // old behaviour) meant clearing the field to retype (e.g. "100" -> "200")
  // snapped straight back to 1 on the empty intermediate state, so typing a
  // custom value was effectively impossible. Clamp is only applied where the
  // number is actually used below (preview/addFood) and on blur to normalize
  // what's displayed — same pattern already used for editGrams.
  const [gramsInput, setGramsInput] = useState('100')
  const grams = clamp(parseInt(gramsInput), BOUNDS.grams, 100)
  const [mealType, setMealType] = useState('Déjeuner')
  const [toast, setToast] = useState('')

  const [recipeSheetOpen, setRecipeSheetOpen] = useState(false)
  // 1 = choix du repas, 2 = choix de la source (auto / photo / lien), 3 = résultat.
  const [recipeStep, setRecipeStep] = useState(1)
  const [recipeMealType, setRecipeMealType] = useState('')
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipe, setRecipe] = useState(null)
  const [recipeError, setRecipeError] = useState('')
  const [recipeLinkOpen, setRecipeLinkOpen] = useState(false)
  const [recipeLinkInput, setRecipeLinkInput] = useState('')
  const [recipeSourceLabel, setRecipeSourceLabel] = useState('')
  const foodSearchInputRef = useRef(null)
  const recipePhotoInputRef = useRef(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // The "add meal" sheet below stays mounted at all times (only slid
  // off-screen via CSS transform) so its opening animation can play — it's
  // never conditionally rendered. That means an `autoFocus` on its input
  // used to fire the instant Nutrition.jsx mounted, i.e. right when the tab
  // was tapped, before the sheet was even open. The browser then tried to
  // scroll that "off-screen" fixed-position input into view, which is what
  // caused the page to auto-scroll every single time the tab was opened.
  // Fix: focus manually, only once the sheet has actually finished sliding in.
  useEffect(() => {
    if (sheetOpen && step === 1) {
      const timer = setTimeout(() => foodSearchInputRef.current?.focus(), 340)
      return () => clearTimeout(timer)
    }
  }, [sheetOpen, step])

  // Opened from the bottom nav's "+" menu ("Nouveau repas") — consume the
  // nav state once so it doesn't reopen on a later back-navigation/refresh.
  useEffect(() => {
    if (location.state?.openAddMeal) {
      openSheet()
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const MEAL_TYPES = [t('breakfast'), t('lunch'), t('dinner'), t('snack')]

  // Live search via Open Food Facts
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (foodSearch.length < 2) {
        // Show local database when no query
        setFoodResults(FOOD_DATABASE.map(f => ({ ...f, brand: '' })))
        return
      }
      setSearching(true)
      try {
        // Server-side proxy (api/food-search.js) calls the fast search-a-licious
        // API on our behalf — that endpoint has no CORS support for browsers,
        // so we can't call it directly from here.
        const res = await fetch(
          `/api/food-search?q=${encodeURIComponent(foodSearch)}&page_size=12&fields=product_name,brands,nutriments,nutrition_grades,code`,
          { headers: await authHeader() }
        )
        const data = await res.json()
        const results = (data.hits || [])
          .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'])
          .map(p => ({
            id: p.code || String(Math.random()),
            name: p.product_name,
            brand: Array.isArray(p.brands) ? p.brands.join(', ') : (p.brands || ''),
            per100g: {
              kcal: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
              proteins: Math.round((p.nutriments?.proteins_100g || 0) * 10) / 10,
              carbs: Math.round((p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
              fats: Math.round((p.nutriments?.fat_100g || 0) * 10) / 10,
            },
            nutriscore: p.nutrition_grades?.toUpperCase() || '?',
          }))
        setFoodResults(results.length > 0 ? results : FOOD_DATABASE.filter(f =>
          f.name.toLowerCase().includes(foodSearch.toLowerCase())
        ).map(f => ({ ...f, brand: '' })))
      } catch {
        setFoodResults(FOOD_DATABASE.filter(f =>
          f.name.toLowerCase().includes(foodSearch.toLowerCase())
        ).map(f => ({ ...f, brand: '' })))
      }
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [foodSearch])

  // Init with local database
  useEffect(() => {
    setFoodResults(FOOD_DATABASE.map(f => ({ ...f, brand: '' })))
  }, [])

  const preview = selectedFood ? calcNutrition(selectedFood, grams) : null

  // "Restant" used to be a flat calorieGoal - calories, so a member who'd
  // walked for 2h saw no reflection of that in what they could still eat —
  // reported directly ("s'il a marché 2h, il a perdu 600 kcal et c'est
  // affiché dans son reste"). Now folds in today's logged steps/course.
  const { remaining: caloriesRemaining, activityBurn } = dailyRemainingCalories({
    calorieGoal: appData.calorieGoal,
    calories: appData.calories,
    steps: appData.steps,
    kmRun: appData.kmRun,
    weightKg: appData.weightKg,
  })

  function openSheet(presetMealType) {
    setSheetOpen(true); setStep(1); setFoodSearch(''); setSelectedFood(null); setGramsInput('100')
    if (presetMealType) setMealType(presetMealType)
  }

  function selectFood(f) { setSelectedFood(f); setStep(2) }

  function openRecipeSheet() {
    setRecipeSheetOpen(true)
    setRecipeStep(1)
    setRecipeMealType('')
    setRecipe(null)
    setRecipeError('')
    setRecipeSourceLabel('')
    setRecipeLinkOpen(false)
    setRecipeLinkInput('')
  }

  // Was a single 300-1000 kcal range applied identically no matter which
  // meal type was picked — a snack (by definition low-calorie) got
  // proposed at ~1000 kcal just as often as a full meal, reported by a
  // real member. Two fixes combined, shared by both recipe sources below:
  // 1. A per-meal-type cap/floor (a snack tops out far below a full meal).
  // 2. The actual remaining budget now accounts for today's logged
  //    activity (steps/course), not just calorieGoal - calories eaten —
  //    see utils/metabolism.js.
  function getMealBudget(type) {
    const mealIndex = MEAL_TYPES.indexOf(type)
    const mealCap = [500, 700, 700, 300][mealIndex] ?? 700
    const mealFloor = [250, 350, 350, 100][mealIndex] ?? 250
    const mealScale = mealCap / 700

    const { remaining } = dailyRemainingCalories({
      calorieGoal: appData.calorieGoal,
      calories: appData.calories,
      steps: appData.steps,
      kmRun: appData.kmRun,
      weightKg: appData.weightKg,
    })
    return {
      remainingKcal: Math.min(mealCap, Math.max(mealFloor, remaining || mealFloor)),
      remainingProtein: Math.min(Math.round(60 * mealScale), Math.max(Math.round(15 * mealScale), Math.round(appData.proteinGoal - appData.protein) || Math.round(25 * mealScale))),
      remainingCarbs: Math.min(Math.round(100 * mealScale), Math.max(Math.round(20 * mealScale), Math.round(appData.carbsGoal - appData.carbs) || Math.round(40 * mealScale))),
      remainingFat: Math.min(Math.round(40 * mealScale), Math.max(Math.round(5 * mealScale), Math.round(appData.fatGoal - appData.fat) || Math.round(15 * mealScale))),
    }
  }

  // Picking a meal type used to jump straight into generating a recipe —
  // now it just records the type and moves to a source choice (auto vs
  // photo vs link), added below.
  function chooseMealType(type) {
    setRecipeMealType(type)
    setRecipeStep(2)
    setRecipeLinkOpen(false)
    setRecipeLinkInput('')
  }

  async function generateRecipe() {
    const type = recipeMealType
    setRecipeStep(3)
    setRecipeLoading(true)
    setRecipeError('')
    setRecipe(null)
    setRecipeSourceLabel('')

    const { remainingKcal, remainingProtein, remainingCarbs, remainingFat } = getMealBudget(type)

    const prompt = `Tu es un nutritionniste expert. Propose UNE recette adaptée à ces besoins nutritionnels restants pour aujourd'hui :
- Repas concerné : ${type} — la recette doit être typique et adaptée à ce moment du repas (pas un plat de dîner proposé pour un petit-déjeuner, par exemple).
- Calories restantes : ${remainingKcal} kcal
- Protéines restantes : ${remainingProtein}g
- Glucides restants : ${remainingCarbs}g
- Lipides restants : ${remainingFat}g
- Objectif de la personne : ${user?.goal || 'forme générale'}

La recette doit se rapprocher au mieux de ces valeurs sans les dépasser significativement. Donne une recette réaliste, simple à préparer, avec des ingrédients courants.
Reply ONLY in valid JSON, no text before or after:
{
  "recipe_name": "...",
  "ingredients": ["...", "..."],
  "instructions": "...",
  "kcal": 0,
  "proteins": 0,
  "carbs": 0,
  "fats": 0
}
Réponds en français.`

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      try {
        setRecipe(JSON.parse(clean))
      } catch (parseErr) {
        console.error('[Nutrition] generateRecipe: failed to parse recipe JSON', parseErr, raw)
        throw new Error('Réponse incomplète, réessaie')
      }
    } catch (err) {
      setRecipeError(`Erreur : ${err.message}`)
    }
    setRecipeLoading(false)
  }

  // Same budget/prompt logic as generateRecipe, but grounded in whatever
  // the member actually has on hand (a photo of their fridge/counter)
  // instead of a free-form AI suggestion — avoids proposing recipes that
  // need a grocery run first.
  async function generateRecipeFromPhoto(file) {
    if (!file) return
    setRecipeSourceLabel('à partir de ta photo')
    const type = recipeMealType
    setRecipeStep(3)
    setRecipeLoading(true)
    setRecipeError('')
    setRecipe(null)

    const { remainingKcal, remainingProtein, remainingCarbs, remainingFat } = getMealBudget(type)

    try {
      const resized = await resizeImage(file)
      const base64 = resized.split(',')[1]

      const prompt = `Tu es un nutritionniste expert. Cette photo montre des ingrédients disponibles (frigo, placard, plan de travail).
Identifie les ingrédients visibles et propose UNE recette réalisable UNIQUEMENT avec ce que tu vois sur la photo (+ des basiques courants comme sel, poivre, huile si besoin) — n'ajoute pas d'ingrédient qui nécessiterait d'aller faire des courses.
La recette doit viser ces besoins nutritionnels restants pour aujourd'hui, sans les dépasser significativement :
- Repas concerné : ${type}
- Calories restantes : ${remainingKcal} kcal
- Protéines restantes : ${remainingProtein}g
- Glucides restants : ${remainingCarbs}g
- Lipides restants : ${remainingFat}g
- Objectif de la personne : ${user?.goal || 'forme générale'}

Si la photo ne montre pas assez d'ingrédients exploitables pour un repas cohérent, utilise le champ "error" pour l'expliquer plutôt que d'inventer une recette avec des ingrédients absents de la photo.
Reply ONLY in valid JSON, no text before or after:
{
  "recipe_name": "...",
  "ingredients": ["...", "..."],
  "instructions": "...",
  "kcal": 0,
  "proteins": 0,
  "carbs": 0,
  "fats": 0,
  "error": null
}
Réponds en français.`

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1200,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      let parsed
      try {
        parsed = JSON.parse(clean)
      } catch (parseErr) {
        console.error('[Nutrition] generateRecipeFromPhoto: failed to parse recipe JSON', parseErr, raw)
        throw new Error('Réponse incomplète, réessaie')
      }
      if (parsed.error) throw new Error(parsed.error)
      setRecipe(parsed)
    } catch (err) {
      setRecipeError(`Erreur : ${err.message}`)
    }
    setRecipeLoading(false)
  }

  // Same idea as the photo path, grounded in a TikTok/Reel link instead —
  // but with a real limitation: there's no video/audio transcription here,
  // so this only works when the recipe is actually written in the post's
  // caption (api/recipe-from-link.js extracts that, nothing more). Common
  // for food content, not guaranteed — a video-only recipe with nothing in
  // the caption will surface as the honest "impossible de lire" error from
  // that endpoint rather than a fabricated recipe.
  async function generateRecipeFromLink() {
    const url = recipeLinkInput.trim()
    if (!url) return
    setRecipeSourceLabel('à partir du lien')
    const type = recipeMealType
    setRecipeStep(3)
    setRecipeLoading(true)
    setRecipeError('')
    setRecipe(null)

    const { remainingKcal, remainingProtein, remainingCarbs, remainingFat } = getMealBudget(type)

    try {
      const linkRes = await fetch('/api/recipe-from-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ url }),
      })
      const linkData = await linkRes.json()
      if (!linkRes.ok) throw new Error(linkData.error || `HTTP ${linkRes.status}`)

      const prompt = `Tu es un nutritionniste expert. Voici la légende d'une vidéo de recette (TikTok/Instagram) :
"""
${linkData.caption}
"""
Si cette légende contient assez d'information pour identifier une recette réelle (ingrédients, plat), propose-la avec des quantités adaptées à ces besoins nutritionnels restants pour aujourd'hui, sans les dépasser significativement :
- Repas concerné : ${type}
- Calories restantes : ${remainingKcal} kcal
- Protéines restantes : ${remainingProtein}g
- Glucides restants : ${remainingCarbs}g
- Lipides restants : ${remainingFat}g
- Objectif de la personne : ${user?.goal || 'forme générale'}

Si la légende ne contient pas assez d'info pour identifier une vraie recette (pas d'ingrédients, texte générique...), utilise le champ "error" pour l'expliquer plutôt que d'inventer une recette.
Reply ONLY in valid JSON, no text before or after:
{
  "recipe_name": "...",
  "ingredients": ["...", "..."],
  "instructions": "...",
  "kcal": 0,
  "proteins": 0,
  "carbs": 0,
  "fats": 0,
  "error": null
}
Réponds en français.`

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      let parsed
      try {
        parsed = JSON.parse(clean)
      } catch (parseErr) {
        console.error('[Nutrition] generateRecipeFromLink: failed to parse recipe JSON', parseErr, raw)
        throw new Error('Réponse incomplète, réessaie')
      }
      if (parsed.error) throw new Error(parsed.error)
      setRecipe(parsed)
    } catch (err) {
      setRecipeError(`Erreur : ${err.message}`)
    }
    setRecipeLoading(false)
  }

  async function addRecipeAsMeal() {
    if (!recipe) return
    await addMeal({
      name: recipe.recipe_name,
      calories: recipe.kcal,
      protein: recipe.proteins,
      carbs: recipe.carbs,
      fat: recipe.fats,
      nutriscore: 'B',
      mealType: recipeMealType,
    })
    setRecipeSheetOpen(false)
    setToast('Recette ajoutée à ton journal')
    setTimeout(() => setToast(''), 2000)
  }

  async function addFood() {
    if (!selectedFood || !preview) return
    await addMeal({
      name: `${selectedFood.name} (${grams}g)`,
      calories: preview.kcal,
      protein: preview.proteins,
      carbs: preview.carbs,
      fat: preview.fats,
      nutriscore: selectedFood.nutriscore || 'B',
      mealType,
    })
    setSheetOpen(false)
    setToast(`Ajouté au ${mealType}`)
    setTimeout(() => setToast(''), 2000)
  }

  function openEditMeal(meal) {
    const grams = extractGrams(meal.name)
    if (grams == null) {
      setToast('Repas non modifiable — supprime-le et rajoute-le')
      setTimeout(() => setToast(''), 2500)
      return
    }
    setEditingMeal(meal)
    setEditGrams(String(grams))
  }

  // repas has no update policy — "editing" is delete the old row, then
  // re-add with calories/macros rescaled proportionally to the new grams.
  async function saveMealEdit() {
    const newGrams = clamp(parseInt(editGrams), BOUNDS.grams, 1)
    const oldGrams = extractGrams(editingMeal.name)
    const factor = newGrams / oldGrams
    const baseName = editingMeal.name.replace(/\s*\(\d+g\)$/, '')

    await deleteMeal(editingMeal.id)
    await addMeal({
      name: `${baseName} (${newGrams}g)`,
      calories: Math.round(editingMeal.calories * factor),
      protein: Math.round(editingMeal.protein * factor * 10) / 10,
      carbs: Math.round(editingMeal.carbs * factor * 10) / 10,
      fat: Math.round(editingMeal.fat * factor * 10) / 10,
      nutriscore: editingMeal.nutriscore,
      mealType: editingMeal.mealType,
    })
    setEditingMeal(null)
    setToast('Repas modifié')
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div className="app-wrapper">
      {/* Toast */}
      <div style={{
        position: 'fixed', top: toast ? 16 : -60, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--success)', color: '#000', padding: '10px 20px', borderRadius: 50,
        fontSize: 12, fontWeight: 700, letterSpacing: 1, zIndex: 300, whiteSpace: 'nowrap',
        transition: 'top 300ms cubic-bezier(0.34,1.56,0.64,1)',
      }}>{toast}</div>

      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-secondary)', marginBottom: 7 }}>🍽️ NUTRITION</p>
            <span className="text-sm text-secondary" style={{ textTransform: 'capitalize' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          </div>
          <button
            onClick={() => navigate('/scan')}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', color: 'var(--accent)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 14v4h4v-4z" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="card card-hero card-animated" style={{ marginBottom: 16, '--delay': '0ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-1.5px' }}>{appData.calories}</span>
              <span className="text-sm text-muted" style={{ marginLeft: 6 }}>kcal</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-xs text-muted">Restant</div>
              {/* Was var(--success) — a bright green on the new light gold
                  gradient card has ~1.1:1 contrast, essentially invisible
                  (checked the luminance numbers). The mockup itself doesn't
                  use a colored highlight here either — plain dark ink,
                  inherited from .card-hero's own color, matches it exactly. */}
              <div className="text-base bold">{caloriesRemaining}</div>
              {activityBurn > 0 && (
                <div className="text-xs" style={{ opacity: 0.65 }}>dont +{activityBurn} activité</div>
              )}
            </div>
          </div>
          {/* Track/fill colors below were var(--surface-2)/var(--accent) —
              both assume a dark card background. var(--surface-2) (translucent
              white) is invisible on the new light gold card; var(--accent) is
              gold-on-gold, same problem. Dark, translucent-ink track (matches
              the mockup's own calorie card exactly) + solid ink fill instead. */}
          <div style={{ position: 'relative', height: 8, background: 'rgba(26,22,8,0.15)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
            {/* Denominator now includes activityBurn too, matching "Restant"
                above — otherwise the bar could read as nearly full while
                Restant still shows plenty of room left (earned by activity). */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(appData.calories/(appData.calorieGoal+activityBurn)*100,100)}%`, background: '#1A1608', borderRadius: 4, transition: 'width 500ms ease-out' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              // Darkened versions of the macro-identity colors — the original
              // (light blue/orange/purple) were picked for a dark card and
              // some (orange especially, ~1.15:1) nearly disappear against
              // the new light gold gradient. Same hues, just dark enough to
              // read as a graphical element (~4:1+) on a light background.
              { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal, color: '#0B5AA8', delay: '0ms' },
              { label: 'Glucides',  val: appData.carbs,   goal: appData.carbsGoal,   color: '#8A4600', delay: '80ms' },
              { label: 'Lipides',   val: appData.fat,     goal: appData.fatGoal,     color: '#5B3FA8', delay: '160ms' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <span className="text-xs text-muted">{m.label}</span>
                  <span className="text-xs bold">{m.val}g <span className="text-muted">/ {m.goal}g</span></span>
                </div>
                <div style={{ height: 4, background: 'rgba(26,22,8,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(m.val/m.goal*100,100)}%`, background: m.color, borderRadius: 2, transition: `width 500ms ease-out ${m.delay}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={openRecipeSheet}
          className="card card-violet nutrition-recipe-card card-animated"
          style={{
            display: 'flex', alignItems: 'center', gap: 14, width: '100%',
            marginBottom: 16, cursor: 'pointer', textAlign: 'left', '--delay': '60ms',
          }}
        >
          <span className="nutrition-recipe-icon">💡</span>
          <div>
            {/* Explicit .text-primary rather than relying on inherited
                color — .card.card-violet .text-primary is the only rule
                that guarantees dark-navy-on-light-violet here; without it
                this depends on whatever color happens to cascade down,
                which is exactly the kind of thing that broke silently
                once already on this card type (see .card-hero/.card-violet
                comments above). Reported as unreadable ("noir sur noir")
                by a real member. */}
            <div className="text-base bold text-primary">Idée recette</div>
            <div className="text-xs text-muted">Suggestion IA basée sur ce qu'il te reste aujourd'hui</div>
          </div>
        </button>

        {/* New — the mockup shows a meal-type icon row here (Matin/Midi/Soir/
            Snack) that didn't exist in the app before. Wired to something
            real rather than purely decorative: tapping one opens "Ajouter
            un repas" with that type pre-selected instead of the default. */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[
            { type: MEAL_TYPES[0], icon: '🍳', label: 'Matin' },
            { type: MEAL_TYPES[1], icon: '🥗', label: 'Midi' },
            { type: MEAL_TYPES[2], icon: '🍽️', label: 'Soir' },
            { type: MEAL_TYPES[3], icon: '🍎', label: 'Snack' },
          ].map((m, i) => (
            <button
              key={m.label}
              onClick={() => openSheet(m.type)}
              className="card-animated"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', flex: 1, '--delay': `${120 + i * 40}ms` }}
            >
              <span style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.icon}</span>
              <span className="text-xs text-muted" style={{ letterSpacing: 0 }}>{m.label}</span>
            </button>
          ))}
        </div>

        <div className="section-label">{t('today_meals')}</div>
        <p className="text-xs text-muted" style={{ marginTop: -4, marginBottom: 10 }}>Glisse un repas vers la gauche pour le modifier ou le supprimer.</p>
        {appData.meals.map((meal, i) => (
          <SwipeableRow
            key={meal.id}
            actions={[
              { label: 'Modifier', color: 'var(--warning)', onClick: () => openEditMeal(meal) },
              { label: 'Supprimer', color: 'var(--danger)', onClick: () => deleteMeal(meal.id) },
            ]}
          >
            <div className="card card-animated" style={{ marginBottom: 0, '--delay': `${160 + Math.min(i, 6) * 40}ms` }}>
              <div className="flex justify-between items-center">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
                    <span className="text-base bold">{meal.name}</span>
                    <NutriscoreBadge score={meal.nutriscore} />
                  </div>
                  <span className="text-xs text-muted">{meal.time}</span>
                </div>
                <span className="text-sm bold" style={{ marginLeft: 12 }}>{meal.calories} kcal</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                <span className="text-xs text-muted">P: {meal.protein}g</span>
                <span className="text-xs text-muted">G: {meal.carbs}g</span>
                <span className="text-xs text-muted">L: {meal.fat}g</span>
              </div>
            </div>
          </SwipeableRow>
        ))}
      </div>

      {/* Edit meal (grams) overlay */}
      {editingMeal && (
        <>
          <div onClick={() => setEditingMeal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480, background: 'var(--surface-solid)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--glass-border)',
            padding: '24px 20px 40px', zIndex: 200,
          }}>
            <h2 className="text-lg bold" style={{ marginBottom: 16 }}>{editingMeal.name}</h2>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>GRAMMAGE</label>
            <input
              type="number"
              value={editGrams}
              onChange={e => setEditGrams(e.target.value)}
              autoFocus
              style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums', marginBottom: 20 }}
            />
            <button className="btn-accent" onClick={saveMealEdit}>ENREGISTRER</button>
          </div>
        </>
      )}

      {/* FAB — left side, not right: MemberLayout's global "Coach IA / Mon
          Coach" FAB (fab.css .fab-container) sits at bottom:96px,
          right:16px, z-index:95 on every member screen — this button used
          to sit almost exactly on top of it (bottom:90, right:16, same
          z-index), making the two indistinguishable/impossible to tap
          reliably. Same class of bug already fixed once on the
          Conversation screen's send button. */}
      <button onClick={openSheet} style={{
        position: 'fixed', bottom: 90, left: 16, zIndex: 95,
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--accent)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(240,193,75,0.4)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Overlay */}
      {sheetOpen && <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}

      {/* Bottom Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: `translateX(-50%) translateY(${sheetOpen ? '0' : '100%'})`,
        width: '100%', maxWidth: 480,
        background: 'var(--surface-solid)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        borderRadius: '20px 20px 0 0',
        borderTop: '1px solid var(--glass-border)',
        padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 200, maxHeight: '80vh', overflowY: 'auto',
      }}>
        {step === 1 ? (
          <>
            <h2 className="text-lg bold" style={{ marginBottom: 16 }}>{t('add_food_title')}</h2>
            <input
              ref={foodSearchInputRef}
              value={foodSearch}
              onChange={e => setFoodSearch(e.target.value)}
              placeholder="Rechercher un aliment..."
              style={{ marginBottom: 8 }}
            />
            {searching && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', marginBottom: 4 }}>Recherche en cours...</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {foodResults.map(f => (
                <div key={f.id} onClick={() => selectFood(f)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer',
                }}>
                  <div>
                    <div className="text-base">{f.name}</div>
                    {f.brand && <div className="text-xs text-muted">{f.brand}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div className="text-sm bold">{f.per100g.kcal} kcal</div>
                    <div className="text-xs text-muted">/ 100g</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="text-lg bold">{selectedFood?.name}</h2>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>{t('quantity').toUpperCase()}</label>
              <input
                type="number"
                value={gramsInput}
                onChange={e => setGramsInput(e.target.value)}
                onBlur={() => setGramsInput(String(grams))}
                style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            {preview && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20, padding: '14px', background: 'var(--surface-2)', borderRadius: 12 }}>
                {[
                  { label: 'kcal', val: preview.kcal },
                  { label: 'P', val: `${preview.proteins}g` },
                  { label: 'G', val: `${preview.carbs}g` },
                  { label: 'L', val: `${preview.fats}g` },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center' }}>
                    <div className="text-base bold">{m.val}</div>
                    <div className="text-xs text-muted">{m.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
              {MEAL_TYPES.map(mt => (
                <button key={mt} onClick={() => setMealType(mt)} style={{
                  background: mealType === mt ? 'var(--accent)' : 'var(--surface-2)',
                  border: '0.5px solid var(--border)',
                  color: mealType === mt ? 'var(--accent-ink)' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 700, padding: '8px 14px', borderRadius: 50,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                }}>{mt}</button>
              ))}
            </div>
            <button className="btn-accent" onClick={addFood}>{t('add')}</button>
          </>
        )}
      </div>

      {/* Recipe overlay + sheet */}
      {recipeSheetOpen && <div onClick={() => setRecipeSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: `translateX(-50%) translateY(${recipeSheetOpen ? '0' : '100%'})`,
        width: '100%', maxWidth: 480,
        background: 'var(--surface-solid)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        borderRadius: '20px 20px 0 0',
        borderTop: '1px solid var(--glass-border)',
        padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 200, maxHeight: '80vh', overflowY: 'auto',
      }}>
        <h2 className="text-lg bold" style={{ marginBottom: 16 }}>💡 Idée recette</h2>

        {recipeStep === 1 && (
          <>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Pour quel repas ?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MEAL_TYPES.map((mt, i) => (
                <button key={mt} onClick={() => chooseMealType(mt)} className="card card-animated" style={{
                  textAlign: 'left', cursor: 'pointer', padding: '16px', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center', '--delay': `${i * 40}ms`,
                }}>
                  <span className="text-base bold text-primary">{mt}</span>
                  <span style={{ color: 'var(--accent)' }}>→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {recipeStep === 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => setRecipeStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <p className="text-sm text-muted" style={{ margin: 0 }}>{recipeMealType} — comment veux-tu la recette ?</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={generateRecipe} className="card" style={{
                textAlign: 'left', cursor: 'pointer', padding: '16px', display: 'flex',
                alignItems: 'center', gap: 14,
              }}>
                <span style={{ fontSize: 22 }}>✨</span>
                <div>
                  <div className="text-base bold text-primary">Suggestion automatique</div>
                  <div className="text-xs text-muted">L'IA propose une recette adaptée à tes objectifs</div>
                </div>
              </button>
              <button onClick={() => recipePhotoInputRef.current?.click()} className="card" style={{
                textAlign: 'left', cursor: 'pointer', padding: '16px', display: 'flex',
                alignItems: 'center', gap: 14,
              }}>
                <span style={{ fontSize: 22 }}>📸</span>
                <div>
                  <div className="text-base bold text-primary">Depuis une photo</div>
                  <div className="text-xs text-muted">Prends en photo ton frigo ou tes ingrédients disponibles</div>
                </div>
              </button>
              <input
                ref={recipePhotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) generateRecipeFromPhoto(f) }}
              />

              {!recipeLinkOpen ? (
                <button onClick={() => setRecipeLinkOpen(true)} className="card" style={{
                  textAlign: 'left', cursor: 'pointer', padding: '16px', display: 'flex',
                  alignItems: 'center', gap: 14,
                }}>
                  <span style={{ fontSize: 22 }}>🔗</span>
                  <div>
                    <div className="text-base bold text-primary">Depuis un lien</div>
                    <div className="text-xs text-muted">Colle un lien TikTok ou Reel Instagram</div>
                  </div>
                </button>
              ) : (
                <div className="card" style={{ padding: '16px' }}>
                  <div className="text-xs text-muted" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Lien TikTok / Instagram
                  </div>
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="https://www.tiktok.com/..."
                    value={recipeLinkInput}
                    onChange={e => setRecipeLinkInput(e.target.value)}
                    autoFocus
                    style={{ marginBottom: 8 }}
                  />
                  {/* Honest expectation-setting up front rather than a
                      surprise error after a wait — there's no real video
                      transcription here, only the post's caption text. */}
                  <p className="text-xs text-muted" style={{ marginBottom: 12, lineHeight: 1.4 }}>
                    Fonctionne seulement si la recette est écrite dans la légende de la vidéo (pas d'analyse de la vidéo elle-même).
                  </p>
                  <button className="btn-accent" onClick={generateRecipeFromLink} disabled={!recipeLinkInput.trim()} style={{ opacity: recipeLinkInput.trim() ? 1 : 0.5 }}>
                    Générer
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {recipeStep === 3 && (
          <>
            {recipeLoading && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>Génération en cours...</p>
            )}

            {recipeError && (
              <div style={{ padding: 16, background: 'rgba(255,59,59,0.1)', border: '0.5px solid var(--danger)', borderRadius: 12, marginBottom: 16 }}>
                <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{recipeError}</p>
              </div>
            )}

            {recipe && !recipeLoading && (
              <>
                <p className="text-xs text-muted" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {recipeMealType}{recipeSourceLabel ? ` · ${recipeSourceLabel}` : ''}
                </p>
                <h3 className="text-base bold text-primary" style={{ marginBottom: 12 }}>{recipe.recipe_name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16, padding: '14px', background: 'var(--surface-2)', borderRadius: 12 }}>
                  {[
                    { label: 'kcal', val: recipe.kcal },
                    { label: 'P', val: `${recipe.proteins}g` },
                    { label: 'G', val: `${recipe.carbs}g` },
                    { label: 'L', val: `${recipe.fats}g` },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: 'center' }}>
                      <div className="text-base bold text-primary">{m.val}</div>
                      <div className="text-xs text-muted">{m.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="text-xs text-muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ingrédients</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {(recipe.ingredients || []).map((ing, i) => (
                      <li key={i} className="text-sm text-primary" style={{ marginBottom: 4 }}>{ing}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div className="text-xs text-muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Préparation</div>
                  <p className="text-sm text-primary" style={{ margin: 0, lineHeight: 1.5 }}>{recipe.instructions}</p>
                </div>
                <button className="btn-accent" onClick={addRecipeAsMeal} style={{ marginBottom: 8 }}>Ajouter ce repas</button>
                <button className="scan-retry-btn" onClick={() => generateRecipe()}>Une autre idée</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
