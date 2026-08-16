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
import { estimateFoodsFromText, computeItemsTotal } from '../utils/foodEstimate'
import NutriscoreBadge from '../components/NutriscoreBadge'
import SwipeableRow from '../components/SwipeableRow'
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss'
import '../styles/nutrition.css'
import '../styles/nutrition-redesign.css'

const RECIPE_LOADING_MESSAGES = [
  'Analyse en cours...',
  'Calcul des quantités...',
  'Presque prêt...',
]

// Shown instead of whatever the API/proxy actually said (rate limit, quota,
// a validation error like "max_tokens must be between 1 and 1500"...) — none
// of that is meaningful to a member, and surfacing it raw reads as the app
// being broken. The real message is still console.error'd at each call site
// for debugging.
const GENERIC_AI_ERROR = 'Une erreur est survenue, réessaie.'

// Left with nothing but a calorie/macro budget and a meal type, the model
// converges on the same "safe" answer every time (protéiné + léger →
// systématiquement œufs/épinards) — nutritionally fine, but it reads as
// generic rather than tailored, which is exactly what got reported.
// Rotating a style hint through the prompt is a cheap fix that doesn't
// need a schema change: it forces real variety without touching what the
// budget math actually optimizes for.
const RECIPE_STYLE_HINTS = [
  'inspiration méditerranéenne',
  'inspiration asiatique',
  'classique français simple',
  'healthy à l\'américaine (façon bowl ou brunch)',
  'rapide et minimaliste, peu d\'ingrédients',
  'réconfortant type "comfort food" allégé',
  'sans féculent, très riche en légumes',
]

function pickStyleHints(n) {
  const shuffled = [...RECIPE_STYLE_HINTS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

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
  const { t, lang } = useLanguage()
  const [sheetOpen, setSheetOpen] = useState(false)
  // "Ajouter un aliment" avait 0 moyen de la fermer — ni bouton, ni swipe.
  // Ce n'est pas le même composant de base que ExerciseModal/Dashboard
  // (qui utilisent déjà useSwipeToDismiss + .modal-handle) : cette feuille
  // est un bottom sheet écrit à la main ici, sans jamais avoir eu ce
  // mécanisme. Même hook réutilisé plutôt que d'en recoder un nouveau —
  // audit JOURNAL.md.
  const foodSheetSwipe = useSwipeToDismiss(() => setSheetOpen(false))
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
  // Inline quantity-to-grams helper, right on the quantity step — not a
  // separate screen/flow (explicitly rejected: "je ne veux pas un nouveau
  // chemin"). "3 oeufs", "4 c. à soupe" → estimated total grams for the
  // food already selected, filled straight into gramsInput above.
  const [qtyHelperOpen, setQtyHelperOpen] = useState(false)
  const [qtyHelperInput, setQtyHelperInput] = useState('')
  const [qtyHelperLoading, setQtyHelperLoading] = useState(false)
  const [qtyHelperError, setQtyHelperError] = useState('')

  // "Décrire plusieurs aliments" — whole compound meal in one description
  // ("3 c. à soupe de skyr, 2 c. à soupe de confiture"), moved from
  // Scan.jsx onto this screen directly and promoted above Idée recette
  // (explicit request: same reasoning as the single-item helper above —
  // no separate screen for something this central to the flow).
  const [describeSheetOpen, setDescribeSheetOpen] = useState(false)
  const [describeInput, setDescribeInput] = useState('')
  const [describeLoading, setDescribeLoading] = useState(false)
  const [describeError, setDescribeError] = useState('')
  const [describeResult, setDescribeResult] = useState(null)
  const [describeMealType, setDescribeMealType] = useState('Déjeuner')
  // "Corriger l'aliment" — lookupOFF() (foodEstimate.js) picks its best
  // guess automatically, but a wrong auto-match (ex: "Riz cuit" matched to
  // "Craquelins de riz cuits au four") had no way to be fixed short of
  // deleting the item and re-describing the whole meal. correctingIndex is
  // the describeResult.items index currently showing its search field (null
  // = none open — only one item's correction UI is shown at a time).
  const [correctingIndex, setCorrectingIndex] = useState(null)
  const [correctionQuery, setCorrectionQuery] = useState('')
  const [correctionResults, setCorrectionResults] = useState([])
  const [correctionLoading, setCorrectionLoading] = useState(false)
  const [mealType, setMealType] = useState('Déjeuner')
  const [toast, setToast] = useState('')
  // Guards every "add this meal" button (recherche manuelle, décrire un
  // repas, recette IA) — none of them disabled themselves while addMeal()
  // was in flight, so several taps/clicks before the first insert resolved
  // fired one addMeal() call each, landing the same meal 2-3x in `repas`.
  // One shared flag is enough: only one of these sheets is ever open/usable
  // at a time.
  const [isAddingMeal, setIsAddingMeal] = useState(false)
  // "REPAS D'AUJOURD'HUI" showed every meal unconditionally — fine early
  // in the day, becomes an endless scroll by evening. Show the 3 most
  // recent directly (still visible at a glance, no tap needed) with a
  // "Voir tout" link to expand the rest inline — not a full collapse
  // (which would hide today's log entirely) and not a separate screen.
  const [showAllMeals, setShowAllMeals] = useState(false)

  const [recipeSheetOpen, setRecipeSheetOpen] = useState(false)
  // Was "1 = choix du repas, 2 = choix de la source, 3 = résultat" — la
  // source (auto/photo/lien) est maintenant choisie EN AMONT, directement
  // en tapant l'une des cartes dédiées sur l'écran principal (plus de
  // menu à 3 options caché derrière "Idée recette"). 1 = choix du repas
  // (seule étape encore nécessaire avant de générer — le budget
  // nutritionnel dépend réellement du repas choisi, voir getMealBudget),
  // 2 = lien (seule source qui a encore besoin d'une saisie derrière le
  // choix du repas), 3 = résultat.
  const [recipeStep, setRecipeStep] = useState(1)
  const [recipeSource, setRecipeSource] = useState('auto')
  const [recipeMealType, setRecipeMealType] = useState('')
  const [recipeLoading, setRecipeLoading] = useState(false)
  // `recipe` = la recette choisie (vue détail). `recipeOptions` = les 2-3
  // propositions parmi lesquelles choisir (auto/photo uniquement — le lien
  // reste une recette unique, celle réellement trouvée dans la vidéo, pas
  // question d'en inventer des alternatives pour "faire du choix").
  const [recipe, setRecipe] = useState(null)
  const [recipeOptions, setRecipeOptions] = useState([])
  const [recipeError, setRecipeError] = useState('')
  const [recipeLinkInput, setRecipeLinkInput] = useState('')
  const [recipeSourceLabel, setRecipeSourceLabel] = useState('')
  const [recipeLoadingMsgIndex, setRecipeLoadingMsgIndex] = useState(0)
  const foodSearchInputRef = useRef(null)
  const foodSheetRef = useRef(null)
  const recipePhotoInputRef = useRef(null)
  // Captures whichever generator produced the current recipeOptions (auto
  // or photo, closed over its own args — e.g. the same File for photo) so
  // "voir d'autres idées" can re-run the right one without the UI needing
  // to know which source is active.
  const recipeRegenerateRef = useRef(null)

  // window no longer scrolls — #root is the app's real scroll container
  // (see global.css) since the standalone-iOS scroll-stuck fix.
  useEffect(() => { document.getElementById('root')?.scrollTo(0, 0) }, [])

  // Même fix que Dashboard.jsx (voir dashboard.css/JOURNAL.md) : couvre le
  // rubber-band iOS, où le fond de <body> (dégradé corail partagé) reste
  // visible au-delà des limites du wrapper interne. Classe active
  // seulement tant que ce screen est monté.
  useEffect(() => {
    document.body.classList.add('nutrition-body-bg')
    return () => document.body.classList.remove('nutrition-body-bg')
  }, [])

  // Rotates the loading caption while a recipe is generating — the link
  // path in particular does two sequential network calls (fetch transcript,
  // then generate the recipe) and can take a while; a single static
  // "Génération en cours..." read as frozen/broken during that wait.
  useEffect(() => {
    if (!recipeLoading) { setRecipeLoadingMsgIndex(0); return }
    const interval = setInterval(() => {
      setRecipeLoadingMsgIndex(i => (i + 1) % RECIPE_LOADING_MESSAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [recipeLoading])

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

  // Ce sheet reste monté en permanence (voir commentaire ci-dessus) — sa
  // propre zone de scroll (overflowY:auto) garde donc son scrollTop d'une
  // ouverture à l'autre au lieu d'être recréée à zéro. Repro concrète :
  // scroller dans les résultats de recherche, fermer/rouvrir (ou juste
  // relancer une recherche qui raccourcit la liste) — le sheet peut
  // rouvrir déjà scrollé, le titre et le champ de recherche hors-champ
  // tant qu'on n'a pas remonté à la main. Reset explicite à l'ouverture et
  // à chaque changement d'étape (recherche -> quantité), plutôt que de
  // compter sur un remount qui n'arrive jamais.
  useEffect(() => {
    if (sheetOpen && foodSheetRef.current) foodSheetRef.current.scrollTop = 0
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
    setQtyHelperOpen(false); setQtyHelperInput(''); setQtyHelperError('')
    if (presetMealType) setMealType(presetMealType)
  }

  function selectFood(f) { setSelectedFood(f); setStep(2); setQtyHelperOpen(false); setQtyHelperInput(''); setQtyHelperError('') }

  // "3 oeufs", "4 c. à soupe" → poids total estimé en grammes pour
  // l'aliment déjà sélectionné (selectedFood.name) — beaucoup plus simple
  // que le prompt multi-aliments de Scan.jsx puisque l'aliment est déjà
  // connu, seule la quantité doit être convertie.
  async function estimateGramsFromQuantity() {
    const description = qtyHelperInput.trim()
    if (!description || !selectedFood) return
    setQtyHelperLoading(true)
    setQtyHelperError('')
    try {
      const prompt = `Aliment : "${selectedFood.name}". Quantité décrite par l'utilisateur : "${description}".
Convertis cette quantité en un poids total en grammes, en te basant sur des poids de référence standards et réalistes pour cet aliment et cette unité (ex: un oeuf moyen ≈ 50-55g, une cuillère à soupe de yaourt/skyr ≈ 15-18g, une tranche de pain ≈ 30g, une poignée ≈ 30g). Reste réaliste, ne sur-estime ni sous-estime pas grossièrement.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, avec exactement cette structure :
{ "grams": 150 }`

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
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
      const estimated = clamp(parseInt(parsed.grams, 10), BOUNDS.grams, 100)
      setGramsInput(String(estimated))
      setQtyHelperOpen(false)
      setQtyHelperInput('')
    } catch (err) {
      setQtyHelperError('Estimation impossible, réessaie ou entre le poids directement.')
    }
    setQtyHelperLoading(false)
  }

  function openDescribeSheet() {
    setDescribeSheetOpen(true)
    setDescribeInput('')
    setDescribeError('')
    setDescribeResult(null)
    setDescribeMealType('Déjeuner')
    closeItemCorrection()
  }

  async function estimateMultipleFoods() {
    const description = describeInput.trim()
    if (!description) return
    setDescribeLoading(true)
    setDescribeError('')
    setDescribeResult(null)
    try {
      const result = await estimateFoodsFromText(description, lang)
      setDescribeResult(result)
    } catch (err) {
      setDescribeError(`Erreur : ${err.message}`)
    }
    setDescribeLoading(false)
  }

  function updateDescribeItemGrams(index, grams) {
    setDescribeResult(prev => {
      const items = [...prev.items]
      items[index] = { ...items[index], grams: clamp(grams, { min: 0, max: BOUNDS.grams.max }, 0) }
      return { ...prev, items }
    })
  }

  // Same list, same problem as Scan.jsx's photo-result screen: no way to
  // remove a wrongly-detected item, only to zero it out (still visible,
  // still counted as "there"). Reported directly ("je veux enlever la
  // pêche mais je ne peux pas") — fixed here and mirrored in Scan.jsx.
  function removeDescribeItem(index) {
    setDescribeResult(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
    // Indices shift after a removal — closing rather than risking a stale
    // correctingIndex silently correcting the wrong (now shifted) item.
    closeItemCorrection()
  }

  function openItemCorrection(index) {
    setCorrectingIndex(index)
    setCorrectionQuery('')
    setCorrectionResults([])
  }

  function closeItemCorrection() {
    setCorrectingIndex(null)
    setCorrectionQuery('')
    setCorrectionResults([])
  }

  // Applies a manually-picked OFF product to describeResult.items[correctingIndex]
  // — grams stays exactly as already entered (not re-asked, per the fix
  // request), only the per-100g values + displayed name change. The item's
  // total (grams * kcal100/100, rendered inline) and the sheet's overall
  // total (computeItemsTotal(describeResult.items), recomputed at render
  // time from the same array) both pick up the correction automatically.
  function applyItemCorrection(candidate) {
    setDescribeResult(prev => {
      const items = [...prev.items]
      items[correctingIndex] = {
        ...items[correctingIndex],
        offName: candidate.name,
        kcal100: candidate.kcal100,
        prot100: candidate.prot100,
        carb100: candidate.carb100,
        fat100: candidate.fat100,
        verified: true,
      }
      return { ...prev, items }
    })
    closeItemCorrection()
  }

  // Same debounce/proxy pattern as the manual food search above (api/food-search.js)
  // — reuses the exact endpoint lookupOFF() itself calls, just with more
  // results (5) shown so the member can pick in full knowledge (name +
  // kcal/100g) instead of trusting a single auto-picked match.
  useEffect(() => {
    if (correctingIndex === null) return
    const q = correctionQuery.trim()
    if (q.length < 2) { setCorrectionResults([]); return }
    const timer = setTimeout(async () => {
      setCorrectionLoading(true)
      try {
        const res = await fetch(
          `/api/food-search?q=${encodeURIComponent(q)}&page_size=5&fields=product_name,nutriments`,
          { headers: await authHeader() }
        )
        const data = await res.json()
        const results = (data.hits || [])
          .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'])
          .map(p => ({
            name: p.product_name,
            kcal100: Math.round(p.nutriments['energy-kcal_100g']),
            prot100: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
            carb100: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
            fat100: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
          }))
        setCorrectionResults(results)
      } catch {
        setCorrectionResults([])
      }
      setCorrectionLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [correctionQuery, correctingIndex])

  async function addDescribedMeal() {
    if (!describeResult || isAddingMeal) return
    setIsAddingMeal(true)
    try {
      const total = computeItemsTotal(describeResult.items)
      await addMeal({
        name: describeResult.meal_name,
        calories: Math.round(total.kcal),
        protein: Math.round(total.proteins),
        carbs: Math.round(total.carbs),
        fat: Math.round(total.fats),
        nutriscore: 'B',
        mealType: describeMealType,
      })
      setDescribeSheetOpen(false)
      setToast(`Ajouté au ${describeMealType}`)
      setTimeout(() => setToast(''), 2000)
    } finally {
      setIsAddingMeal(false)
    }
  }

  function openRecipeSheet(source) {
    setRecipeSheetOpen(true)
    setRecipeStep(1)
    setRecipeSource(source)
    setRecipeMealType('')
    setRecipe(null)
    setRecipeOptions([])
    setRecipeError('')
    setRecipeSourceLabel('')
    setRecipeLinkInput('')
    recipeRegenerateRef.current = null
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

  // Was "record the type, then show a 3-option source picker" — the
  // source is now already known (recipeSource, set by which card was
  // tapped on the main screen), so picking a meal type goes straight into
  // the actual action for that source instead of one more menu screen.
  // Explicit request: "enlève les longs chemins inutiles, que tout soit
  // simple d'accès".
  function chooseMealType(type) {
    setRecipeMealType(type)
    setRecipe(null)
    setRecipeOptions([])
    if (recipeSource === 'photo') {
      recipePhotoInputRef.current?.click()
    } else if (recipeSource === 'link') {
      setRecipeLinkInput('')
      setRecipeStep(2)
    } else {
      // `type` passé explicitement, PAS lu depuis recipeMealType : le
      // setRecipeMealType ci-dessus ne prend effet qu'au prochain rendu,
      // alors que generateRecipe() part immédiatement dans le même
      // gestionnaire d'événement. Sans ça, elle lisait la valeur d'AVANT
      // (chaîne vide, remise par openRecipeSheet) — bug réel mesuré en
      // test le 2026-08-16 : prompt envoyé avec « Repas concerné :  »
      // vide, et getMealBudget('') retombant sur le plafond générique de
      // 700 kcal parce que MEAL_TYPES.indexOf('') vaut -1. Le plafond par
      // type de repas (500/700/700/300) n'a donc JAMAIS été appliqué sur
      // ce chemin : un Snack était proposé à ~700 kcal, exactement le
      // symptôme que ce plafond avait été ajouté pour corriger.
      // Les chemins photo/lien ne sont pas concernés : leur génération
      // part d'un événement ultérieur (onChange du fichier, bouton), donc
      // après re-rendu.
      generateRecipe(type)
    }
  }

  async function generateRecipe(mealTypeArg) {
    const type = mealTypeArg ?? recipeMealType
    // Le régénérateur ("Voir d'autres idées") reçoit le même type explicite,
    // pour ne pas réintroduire la lecture d'état au coup suivant.
    recipeRegenerateRef.current = () => generateRecipe(type)
    setRecipeStep(3)
    setRecipeLoading(true)
    setRecipeError('')
    setRecipe(null)
    setRecipeOptions([])
    setRecipeSourceLabel('')

    const { remainingKcal, remainingProtein, remainingCarbs, remainingFat } = getMealBudget(type)
    const styleHints = pickStyleHints(3)

    // Asking for one recipe made the model converge on the same "safe"
    // answer every time (protéiné + léger → toujours œufs/épinards) —
    // nutritionally fine but reads as arbitrary since there's no real
    // choice involved. Asking for 3 genuinely different options at once
    // and letting the member pick fixes both: real variety, and the
    // person decides instead of the AI deciding alone for them.
    const prompt = `Tu es un nutritionniste expert. Propose 3 recettes DIFFÉRENTES adaptées à ces besoins nutritionnels restants pour aujourd'hui, pour que la personne choisisse celle qui lui plaît :
- Repas concerné : ${type} — chaque recette doit être typique et adaptée à ce moment du repas (pas un plat de dîner proposé pour un petit-déjeuner, par exemple).
- Calories restantes : ${remainingKcal} kcal
- Protéines restantes : ${remainingProtein}g
- Glucides restants : ${remainingCarbs}g
- Lipides restants : ${remainingFat}g
- Objectif de la personne : ${user?.goal || 'forme générale'}
- Styles suggérés, un par option (garde une vraie cohérence culinaire) : ${styleHints.join(' / ')}

Chaque recette doit se rapprocher au mieux de ces valeurs sans les dépasser significativement, et rester réaliste avec des ingrédients courants et des quantités précises — pas d'approximation sur les valeurs nutritionnelles. Les 3 recettes doivent être vraiment différentes entre elles (pas 3 variations du même plat).
Reply ONLY in valid JSON, no text before or after:
{
  "options": [
    {
      "recipe_name": "...",
      "ingredients": ["...", "..."],
      "instructions": "...",
      "kcal": 0,
      "proteins": 0,
      "carbs": 0,
      "fats": 0,
      "why": "Une phrase courte expliquant en quoi cette recette précise colle aux besoins ci-dessus (ex: pourquoi ces macros, pourquoi ce style à ce moment de la journée)."
    }
  ]
}
Réponds en français.`

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          // Was 2200 — above the proxy's own MAX_TOKENS_CAP (api/claude.js,
          // 1500), so every call here failed its server-side validation and
          // surfaced the raw "max_tokens must be between 1 and 1500" error
          // straight to the member. 3 concise JSON recipes fit comfortably
          // under 1500.
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[Nutrition] generateRecipe: /api/claude request failed', res.status, err.error)
        throw new Error(GENERIC_AI_ERROR)
      }
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      let parsed
      try {
        parsed = JSON.parse(clean)
      } catch (parseErr) {
        console.error('[Nutrition] generateRecipe: failed to parse recipe JSON', parseErr, raw)
        throw new Error('Réponse incomplète, réessaie')
      }
      const opts = Array.isArray(parsed?.options) ? parsed.options : []
      if (!opts.length) throw new Error('Aucune recette valide générée, réessaie')
      setRecipeOptions(opts)
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
    recipeRegenerateRef.current = () => generateRecipeFromPhoto(file)
    setRecipeSourceLabel('à partir de ta photo')
    const type = recipeMealType
    setRecipeStep(3)
    setRecipeLoading(true)
    setRecipeError('')
    setRecipe(null)
    setRecipeOptions([])

    const { remainingKcal, remainingProtein, remainingCarbs, remainingFat } = getMealBudget(type)

    try {
      const resized = await resizeImage(file)
      const base64 = resized.split(',')[1]

      const prompt = `Tu es un nutritionniste expert. Cette photo montre des ingrédients disponibles (frigo, placard, plan de travail).
Identifie les ingrédients visibles et propose jusqu'à 3 recettes DIFFÉRENTES réalisables UNIQUEMENT avec ce que tu vois sur la photo (+ des basiques courants comme sel, poivre, huile si besoin) — n'ajoute pas d'ingrédient qui nécessiterait d'aller faire des courses. Si les ingrédients visibles ne permettent raisonnablement qu'une seule recette cohérente, ne propose qu'une seule option plutôt que d'en inventer une deuxième artificielle — pas d'approximation.
Chaque recette doit viser ces besoins nutritionnels restants pour aujourd'hui, sans les dépasser significativement :
- Repas concerné : ${type}
- Calories restantes : ${remainingKcal} kcal
- Protéines restantes : ${remainingProtein}g
- Glucides restants : ${remainingCarbs}g
- Lipides restants : ${remainingFat}g
- Objectif de la personne : ${user?.goal || 'forme générale'}

Si la photo ne montre pas assez d'ingrédients exploitables pour un repas cohérent, utilise le champ "error" pour l'expliquer plutôt que d'inventer une recette avec des ingrédients absents de la photo.
Reply ONLY in valid JSON, no text before or after:
{
  "options": [
    {
      "recipe_name": "...",
      "ingredients": ["...", "..."],
      "instructions": "...",
      "kcal": 0,
      "proteins": 0,
      "carbs": 0,
      "fats": 0,
      "why": "Une phrase courte expliquant pourquoi cette recette précise, avec ces ingrédients de la photo, colle aux besoins ci-dessus."
    }
  ],
  "error": null
}
Réponds en français.`

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          // Same fix as generateRecipe above — was 2200, over the proxy's
          // 1500 cap (api/claude.js).
          max_tokens: 1500,
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
        const err = await res.json().catch(() => ({}))
        console.error('[Nutrition] generateRecipeFromPhoto: /api/claude request failed', res.status, err.error)
        throw new Error(GENERIC_AI_ERROR)
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
      const opts = Array.isArray(parsed.options) ? parsed.options : []
      if (!opts.length) throw new Error('Aucune recette exploitable trouvée sur cette photo')
      setRecipeOptions(opts)
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
  // Deliberately NOT multi-option like the other two paths: there's exactly
  // one real recipe in that specific video/caption. Offering "3 options"
  // here would mean fabricating 2 recipes that were never actually in the
  // source — the opposite of what was asked (no approximate info).
  async function generateRecipeFromLink() {
    const url = recipeLinkInput.trim()
    if (!url) return
    recipeRegenerateRef.current = null
    setRecipeSourceLabel('à partir du lien')
    const type = recipeMealType
    setRecipeStep(3)
    setRecipeLoading(true)
    setRecipeError('')
    setRecipe(null)
    setRecipeOptions([])

    const { remainingKcal, remainingProtein, remainingCarbs, remainingFat } = getMealBudget(type)

    try {
      const linkRes = await fetch('/api/recipe-from-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ url }),
      })
      const linkData = await linkRes.json()
      if (!linkRes.ok) throw new Error(linkData.error || `HTTP ${linkRes.status}`)

      // `source` is "transcript" (ce qui est vraiment dit dans la vidéo, via
      // Supadata si configuré côté serveur) ou "caption" (repli sur la
      // légende du post si le transcript n'a pas pu être récupéré).
      const prompt = `Tu es un nutritionniste expert. Voici le ${linkData.source === 'transcript' ? 'transcript (ce qui est dit)' : 'texte de la légende'} d'une vidéo de recette (TikTok/Instagram) :
"""
${linkData.transcript}
"""
Si ce contenu contient assez d'information pour identifier une recette réelle (ingrédients, plat), propose-la avec des quantités adaptées à ces besoins nutritionnels restants pour aujourd'hui, sans les dépasser significativement :
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
  "why": "Une phrase courte expliquant comment cette recette a été adaptée (quantités) à ces besoins.",
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
        const err = await res.json().catch(() => ({}))
        console.error('[Nutrition] generateRecipeFromLink: /api/claude request failed', res.status, err.error)
        throw new Error(GENERIC_AI_ERROR)
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
    if (!recipe || isAddingMeal) return
    setIsAddingMeal(true)
    try {
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
    } finally {
      setIsAddingMeal(false)
    }
  }

  async function addFood() {
    if (!selectedFood || !preview || isAddingMeal) return
    setIsAddingMeal(true)
    try {
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
    } finally {
      setIsAddingMeal(false)
    }
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
    <div className="app-wrapper nutrition-redesign">
      {/* Toast */}
      <div style={{
        position: 'fixed', top: toast ? 16 : -60, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--success)', color: '#000', padding: '10px 20px', borderRadius: 50,
        fontSize: 12, fontWeight: 700, letterSpacing: 1, zIndex: 300, whiteSpace: 'nowrap',
        transition: 'top 300ms cubic-bezier(0.34,1.56,0.64,1)',
      }}>{toast}</div>

      <div className="screen nutrition-screen">
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingBottom: 22 }}>
          <div>
            <p className="nu-eyebrow">NUTRITION</p>
            <h1 className="nu-title">Ton assiette<br />du jour.</h1>
            <p className="nu-subtitle">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          </div>
          <button onClick={() => navigate('/scan')} className="nu-scan-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 14v4h4v-4z" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="nu-calorie-card card-animated" style={{ '--delay': '0ms' }}>
          <div className="nu-calorie-top">
            <div>
              <p className="nu-calorie-label">Consommé</p>
              <span className="nu-calorie-value">{appData.calories}</span>
              <span className="nu-calorie-unit">kcal</span>
            </div>
            <div className="nu-calorie-restant">
              <p className="nu-calorie-restant-label">Restant</p>
              <p className="nu-calorie-restant-value">{caloriesRemaining}</p>
              {activityBurn > 0 && (
                <p className="nu-calorie-restant-extra">+{activityBurn} activité</p>
              )}
            </div>
          </div>
          <div className="nu-calorie-bar-wrap">
            {/* Denominator inclut activityBurn, comme "Restant" ci-dessus —
                sinon la barre pourrait sembler presque pleine alors que
                Restant montre encore de la marge (gagnée par l'activité). */}
            <div className="nu-calorie-bar-fill" style={{ width: `${Math.min(appData.calories/(appData.calorieGoal+activityBurn)*100,100)}%` }} />
          </div>
          <div className="nu-macro-grid">
            {[
              { label: 'Prot.', val: appData.protein, goal: appData.proteinGoal, color: 'var(--nu-lavender)' },
              { label: 'Gluc.', val: appData.carbs,   goal: appData.carbsGoal,   color: 'var(--nu-carb)' },
              { label: 'Lip.',  val: appData.fat,     goal: appData.fatGoal,     color: 'var(--nu-pink)' },
            ].map(m => (
              <div key={m.label} className="nu-macro-card">
                <p className="nu-macro-label">{m.label}</p>
                <p className="nu-macro-value">{m.val}<span className="nu-macro-goal">/{m.goal}</span></p>
                <div className="nu-macro-bar-wrap">
                  <div className="nu-macro-bar-fill" style={{ width: `${Math.min(m.val/m.goal*100,100)}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* "Décrire plusieurs aliments" — promoted above Idée recette on
            request ("on doit mettre ça au-dessus d'idée recette"). Handles
            a whole compound meal in one description ("3 c. à soupe de
            skyr, 2 c. à soupe de confiture"), unlike the single-item helper
            on the quantity step below, which only knows the one food
            already selected in the search. */}
        <button onClick={openDescribeSheet} className="nu-action-card card-animated" style={{ '--delay': '40ms' }}>
          <span className="nu-action-icon" style={{ background: 'var(--nu-olive)' }}>✏️</span>
          <div>
            <p className="nu-action-title">Décrire un repas</p>
            <p className="nu-action-sub">"3 c. à soupe de skyr, 2 c. à soupe de confiture..." — pas besoin des grammes</p>
          </div>
        </button>

        {/* "Une recette depuis mon frigo" — was buried 2 taps deep behind
            "Idée recette" (choisir le repas, PUIS choisir "photo" parmi 3
            options). Aussi forte que "Décrire un repas" côté utilité
            (l'IA propose une recette avec ce qu'il y a vraiment sous la
            main), promue au même niveau. */}
        <button onClick={() => openRecipeSheet('photo')} className="nu-action-card card-animated" style={{ '--delay': '50ms' }}>
          <span className="nu-action-icon" style={{ background: 'var(--nu-pink)' }}>📸</span>
          <div>
            <p className="nu-action-title">Une recette depuis mon frigo</p>
            <p className="nu-action-sub">Prends en photo ce que tu as sous la main, l'IA propose une recette avec</p>
          </div>
        </button>

        <button onClick={() => openRecipeSheet('auto')} className="nu-action-card nu-action-accent card-animated" style={{ marginBottom: 0, '--delay': '60ms' }}>
          <span className="nu-action-icon" style={{ background: 'var(--nu-cream)' }}>💡</span>
          <div>
            <p className="nu-action-title">Idée recette</p>
            <p className="nu-action-sub">Suggestion IA basée sur ce qu'il te reste aujourd'hui</p>
          </div>
        </button>
        {/* Moins utilisée que les deux au-dessus (photo/texte) — reste
            accessible en un seul tap plutôt que dans un sous-menu, mais
            sans carte pleine largeur dédiée pour ne pas surcharger l'écran
            de 3 cartes qui se ressemblent. */}
        <button onClick={() => openRecipeSheet('link')} className="nu-link-row">
          🔗 ou depuis un lien TikTok / Reel →
        </button>

        {/* Raccourcis "ajouter au [moment du repas]" — traduits en pills
            plates (maquette) plutôt qu'en icônes rondes ; même comportement
            qu'avant (ouvre "Ajouter un repas" avec ce type pré-sélectionné),
            aucune n'est "active" dans les données donc pas de distinction
            de couleur entre elles. */}
        <div className="nu-filter-row" style={{ marginBottom: 20 }}>
          {MEAL_TYPES.map((mt, i) => (
            <button key={mt} onClick={() => openSheet(mt)} className="nu-filter-chip card-animated" style={{ '--delay': `${120 + i * 40}ms` }}>
              {mt}
            </button>
          ))}
        </div>

        <div className="nu-section-label">{t('today_meals')}</div>
        <p className="nu-section-hint">Glisse un repas vers la gauche pour le modifier ou le supprimer.</p>
        {(() => {
          // Was a flat chronological list with no visual grouping and a
          // silent slice(0,3) — a member with several repas logged across
          // different types (petit-déj/déjeuner/dîner/collation) saw them
          // interleaved with no indication of which type each belonged to,
          // and no signal that some were hidden below the fold. Sectioned
          // by mealType (== repas.type_repas, see AppContext.jsx's
          // mealFromRow) instead, same MEAL_TYPES order as the chip picker
          // used everywhere else on this screen.
          const visibleMeals = showAllMeals ? appData.meals : appData.meals.slice(0, 3)
          const hiddenCount = appData.meals.length - visibleMeals.length
          const groups = MEAL_TYPES.map(mt => ({ type: mt, meals: visibleMeals.filter(m => m.mealType === mt) }))
          // Repas sans mealType reconnu (données antérieures à l'ajout de
          // type_repas, ou valeur inattendue) — rangés à part plutôt que
          // silencieusement exclus de l'affichage.
          const otherMeals = visibleMeals.filter(m => !MEAL_TYPES.includes(m.mealType))
          if (otherMeals.length > 0) groups.push({ type: 'Autre', meals: otherMeals })
          const visibleGroups = groups.filter(g => g.meals.length > 0)

          if (appData.meals.length === 0) {
            return <p className="nu-empty-meals">Aucun repas enregistré aujourd'hui.</p>
          }

          // Cycle de couleurs des badges-lettre, même logique que la
          // maquette (A olive / B jaune-gluc. / C rose, en boucle).
          const BADGE_COLORS = ['var(--nu-olive)', 'var(--nu-carb)', 'var(--nu-pink)']

          return (
            <>
              {visibleGroups.map(group => (
                <div key={group.type} className="nu-meal-group">
                  <div className="nu-meal-group-top">
                    <span className="nu-meal-group-title">{group.type}</span>
                    <span className="nu-meal-group-total">{group.meals.reduce((s, m) => s + m.calories, 0)} kcal</span>
                  </div>
                  <div className="nu-meal-list">
                    {group.meals.map((meal, i) => (
                      <SwipeableRow
                        key={meal.id}
                        actions={[
                          { label: 'Modifier', color: 'var(--warning)', onClick: () => openEditMeal(meal) },
                          { label: 'Supprimer', color: 'var(--danger)', onClick: () => deleteMeal(meal.id) },
                        ]}
                      >
                        <div className="nu-meal-row card-animated" style={{ '--delay': `${160 + Math.min(i, 6) * 40}ms` }}>
                          <span className="nu-meal-badge" style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }}>
                            {String.fromCharCode(65 + (i % 26))}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-8" style={{ marginBottom: 2 }}>
                              <span className="nu-meal-name">{meal.name}</span>
                              <NutriscoreBadge score={meal.nutriscore} />
                            </div>
                            {/* mealType affiché explicitement sur la carte
                                elle-même — jusqu'ici capturé à l'ajout
                                (type_repas) mais jamais montré nulle part
                                dans cette liste. */}
                            <span className="nu-meal-meta">{meal.time}{meal.mealType ? ` · ${meal.mealType}` : ''} · P {meal.protein}g · G {meal.carbs}g · L {meal.fat}g</span>
                          </div>
                          <span className="nu-meal-kcal">{meal.calories}</span>
                        </div>
                      </SwipeableRow>
                    ))}
                  </div>
                </div>
              ))}
              {/* Remplace l'ancien lien texte discret en bas de liste — le
                  troncage à 3 repas restait invisible tant qu'on ne
                  scrollait pas jusqu'en bas. Badge visible, au même niveau
                  que les sections plutôt qu'enterré dessous. */}
              {!showAllMeals && hiddenCount > 0 && (
                <button type="button" onClick={() => setShowAllMeals(true)} className="nu-show-more-btn">
                  +{hiddenCount} repas non affiché{hiddenCount > 1 ? 's' : ''} — voir tout →
                </button>
              )}
            </>
          )
        })()}
      </div>

      {/* Edit meal (grams) overlay */}
      {editingMeal && (
        <>
          <div onClick={() => setEditingMeal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />
          <div className="nu-sheet" style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480,
            borderRadius: '20px 20px 0 0',
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
            {/* Was grammage-only — pas moyen de corriger "cliqué sur petit
                déjeuner au lieu de déjeuner" sans supprimer et retout
                ressaisir. Même sélecteur de chips que la sheet d'ajout. */}
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>REPAS</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
              {MEAL_TYPES.map(mt => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setEditingMeal(prev => ({ ...prev, mealType: mt }))}
                  style={{
                    background: editingMeal.mealType === mt ? 'var(--nu-olive)' : 'var(--nu-card)',
                    border: 'none',
                    color: 'var(--nu-ink)',
                    fontSize: 11, fontWeight: 700, padding: '8px 14px', borderRadius: 50,
                    whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  }}
                >{mt}</button>
              ))}
            </div>
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
      <button onClick={openSheet} className="nu-fab" style={{
        // Was a flat bottom:90 — the message FAB it needs to align with
        // (fab.css's .fab-container) uses calc(76px + env(safe-area-inset-
        // bottom)), safe-area-aware since suite 55/56. The two only lined
        // up by coincidence when the safe area happened to equal 14px;
        // anywhere else (Safari tab: SAB=0, so 76px vs this button's flat
        // 90px; standalone: SAB=34, so 110px vs 90px) they visibly
        // diverged — reported directly on a real screenshot. Same formula
        // now, so they can't drift apart again.
        position: 'fixed', bottom: 'calc(76px + env(safe-area-inset-bottom))', left: 16, zIndex: 95,
        width: 52, height: 52, borderRadius: '50%',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--nu-cream)" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Overlay */}
      {sheetOpen && <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}

      {/* Bottom Sheet — jusqu'ici aucun moyen de la fermer : ni bouton, ni
          swipe (contrairement à ExerciseModal.jsx/Dashboard.jsx, qui ont
          déjà .modal-handle + useSwipeToDismiss). Pas le même composant de
          base sans le mécanisme activé — un sheet écrit à la main ici, qui
          ne l'a jamais eu. Même hook réutilisé (foodSheetSwipe) plutôt que
          d'en recoder un, croix ajoutée à côté du titre pour la fermeture
          au clic. Audit JOURNAL.md. */}
      <div
        ref={foodSheetRef}
        className="nu-sheet"
        style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: foodSheetSwipe.dragY > 0
            ? `translateX(-50%) translateY(${foodSheetSwipe.dragY}px)`
            : `translateX(-50%) translateY(${sheetOpen ? '0' : '100%'})`,
          width: '100%', maxWidth: 480,
          borderRadius: '20px 20px 0 0',
          padding: '0 20px 40px',
          transition: foodSheetSwipe.dragging ? 'none' : 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
          zIndex: 200, maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div className="sheet-drag-zone" {...foodSheetSwipe.handlers}>
          <div className="modal-handle" />
        </div>
        {step === 1 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="text-lg bold" style={{ margin: 0 }}>{t('add_food_title')}</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Fermer"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 4 }}
              >✕</button>
            </div>
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
              <h2 className="text-lg bold" style={{ flex: 1 }}>{selectedFood?.name}</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Fermer"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 4 }}
              >✕</button>
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
              {/* Inline, sur cet écran — pas un nouveau chemin/écran séparé.
                  "3 oeufs", "4 c. à soupe de skyr" -> l'IA remplit le champ
                  grammes ci-dessus directement. */}
              {!qtyHelperOpen ? (
                <button
                  type="button"
                  onClick={() => setQtyHelperOpen(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--nu-magenta)', fontSize: 12, fontWeight: 600, padding: '8px 0 0', cursor: 'pointer', display: 'block', margin: '0 auto' }}
                >
                  Je ne connais pas le poids →
                </button>
              ) : (
                <div style={{ marginTop: 10, padding: 12, background: 'var(--nu-cream)', borderRadius: 12 }}>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 6 }}>DÉCRIS LA QUANTITÉ</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      value={qtyHelperInput}
                      onChange={e => setQtyHelperInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && estimateGramsFromQuantity()}
                      placeholder="ex : 3 oeufs, 4 c. à soupe..."
                      style={{ flex: 1 }}
                      disabled={qtyHelperLoading}
                    />
                    <button
                      type="button"
                      className="btn-accent"
                      onClick={estimateGramsFromQuantity}
                      disabled={qtyHelperLoading || !qtyHelperInput.trim()}
                      style={{ width: 'auto', padding: '0 16px', flexShrink: 0 }}
                    >
                      {qtyHelperLoading ? '...' : 'Estimer'}
                    </button>
                  </div>
                  {qtyHelperError && <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 6 }}>{qtyHelperError}</p>}
                </div>
              )}
            </div>
            {preview && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20, padding: '14px', background: 'var(--nu-cream)', borderRadius: 12 }}>
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
                  background: mealType === mt ? 'var(--nu-olive)' : 'var(--nu-card)',
                  border: 'none',
                  color: 'var(--nu-ink)',
                  fontSize: 11, fontWeight: 700, padding: '8px 14px', borderRadius: 50,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                }}>{mt}</button>
              ))}
            </div>
            <button className="btn-accent" onClick={addFood} disabled={isAddingMeal}>{isAddingMeal ? 'Ajout...' : t('add')}</button>
          </>
        )}
      </div>

      {/* "Décrire plusieurs aliments" overlay + sheet */}
      {describeSheetOpen && <div onClick={() => setDescribeSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}
      {describeSheetOpen && (
        <div className="nu-sheet" style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480,
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 40px', zIndex: 200, maxHeight: '80vh', overflowY: 'auto',
        }}>
          {!describeResult ? (
            <>
              <h2 className="text-lg bold" style={{ marginBottom: 16 }}>Décrire un repas</h2>
              <textarea
                autoFocus
                value={describeInput}
                onChange={e => setDescribeInput(e.target.value)}
                placeholder="Ex : 3 c. à soupe de skyr, 2 c. à soupe de confiture..."
                rows={4}
                disabled={describeLoading}
                style={{
                  width: '100%', resize: 'vertical', padding: '14px 16px', borderRadius: 12,
                  fontSize: 15, fontFamily: 'inherit', lineHeight: 1.5,
                  marginBottom: 16,
                }}
              />
              {describeError && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{describeError}</p>}
              <button className="btn-accent" onClick={estimateMultipleFoods} disabled={describeLoading || !describeInput.trim()}>
                {describeLoading ? 'Analyse en cours...' : 'Analyser'}
              </button>
            </>
          ) : (
            (() => {
              const total = computeItemsTotal(describeResult.items)
              return (
                <>
                  <h2 className="text-lg bold" style={{ marginBottom: 16 }}>{describeResult.meal_name}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20, padding: '14px', background: 'var(--surface-2)', borderRadius: 12 }}>
                    {[
                      { label: 'kcal', val: Math.round(total.kcal) },
                      { label: 'P', val: `${Math.round(total.proteins)}g` },
                      { label: 'G', val: `${Math.round(total.carbs)}g` },
                      { label: 'L', val: `${Math.round(total.fats)}g` },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign: 'center' }}>
                        <div className="text-base bold">{m.val}</div>
                        <div className="text-xs text-muted">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
                    {describeResult.items.map((item, i) => (
                      <div key={i} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div>
                            <span>
                              {item.name}
                              <span
                                title={item.verified ? 'Valeurs vérifiées (Open Food Facts)' : 'Estimation IA — non vérifiée'}
                                style={{ marginLeft: 6, fontSize: 11, color: item.verified ? 'var(--success)' : 'var(--text-secondary)' }}
                              >
                                {item.verified ? '✓' : '≈'}
                              </span>
                            </span>
                            {/* Jusqu'ici le badge "✓ vérifié" ne disait pas
                                QUEL produit OFF avait été retenu — impossible
                                de repérer un mauvais matching avant d'ajouter
                                le repas. lookupOFF() (foodEstimate.js)
                                renvoie maintenant le nom du produit
                                effectivement sélectionné parmi les
                                candidats. */}
                            {item.verified && item.offName && (
                              <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                                Correspondance OFF : {item.offName}
                              </div>
                            )}
                            {/* Discret par défaut — un lien texte, pas un
                                champ toujours visible, pour ne pas alourdir
                                une liste déjà dense. Révèle la recherche
                                seulement au clic, pour CET item précis. */}
                            {correctingIndex !== i ? (
                              <button
                                type="button"
                                onClick={() => openItemCorrection(i)}
                                style={{ background: 'none', border: 'none', color: 'var(--nu-magenta)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 4, display: 'block' }}
                              >
                                Corriger l'aliment
                              </button>
                            ) : (
                              <div style={{ marginTop: 6 }}>
                                <input
                                  autoFocus
                                  type="text"
                                  value={correctionQuery}
                                  onChange={e => setCorrectionQuery(e.target.value)}
                                  placeholder="Chercher un autre produit..."
                                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, marginBottom: 6 }}
                                />
                                {correctionLoading && <p className="text-xs text-muted" style={{ margin: '0 0 6px' }}>Recherche...</p>}
                                {!correctionLoading && correctionResults.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
                                    {correctionResults.map((c, ci) => (
                                      <button
                                        key={ci}
                                        type="button"
                                        onClick={() => applyItemCorrection(c)}
                                        style={{
                                          textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 8,
                                          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
                                          padding: '6px 10px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 12,
                                        }}
                                      >
                                        <span>{c.name}</span>
                                        <span className="text-muted" style={{ flexShrink: 0 }}>{c.kcal100} kcal/100g</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {!correctionLoading && correctionQuery.trim().length >= 2 && correctionResults.length === 0 && (
                                  <p className="text-xs text-muted" style={{ margin: '0 0 6px' }}>Aucun résultat.</p>
                                )}
                                <button
                                  type="button"
                                  onClick={closeItemCorrection}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: 0 }}
                                >
                                  Annuler
                                </button>
                              </div>
                            )}
                          </div>
                          <span>{Math.round(item.kcal100 * item.grams / 100)} kcal</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            min="0"
                            value={item.grams}
                            onChange={e => updateDescribeItemGrams(i, parseInt(e.target.value, 10) || 0)}
                            style={{
                              width: 64, background: 'var(--surface-2)', border: '2px solid var(--border)',
                              borderRadius: 8, color: 'var(--text-primary)', padding: '4px 8px', fontSize: 13, fontFamily: 'inherit',
                            }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>g</span>
                          <button
                            type="button"
                            onClick={() => removeDescribeItem(i)}
                            aria-label="Supprimer cet aliment"
                            style={{
                              marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)',
                              fontSize: 18, lineHeight: 1, padding: 4, cursor: 'pointer',
                            }}
                          >✕</button>
                        </div>
                      </div>
                    ))}
                    {describeResult.items.length === 0 && (
                      <p className="text-xs text-muted" style={{ padding: '8px 0' }}>Tous les aliments ont été supprimés.</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
                    {MEAL_TYPES.map(mt => (
                      <button key={mt} onClick={() => setDescribeMealType(mt)} style={{
                        background: describeMealType === mt ? 'var(--nu-olive)' : 'var(--nu-card)',
                        border: 'none',
                        color: 'var(--nu-ink)',
                        fontSize: 11, fontWeight: 700, padding: '8px 14px', borderRadius: 50,
                        whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                      }}>{mt}</button>
                    ))}
                  </div>
                  <button className="btn-accent" onClick={addDescribedMeal} disabled={describeResult.items.length === 0 || isAddingMeal}>{isAddingMeal ? 'Ajout...' : t('add')}</button>
                </>
              )
            })()
          )}
        </div>
      )}

      {/* Recipe overlay + sheet */}
      {recipeSheetOpen && <div onClick={() => setRecipeSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}
      <div className="nu-sheet" style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: `translateX(-50%) translateY(${recipeSheetOpen ? '0' : '100%'})`,
        width: '100%', maxWidth: 480,
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 200, maxHeight: '80vh', overflowY: 'auto',
      }}>
        <h2 className="text-lg bold" style={{ marginBottom: 16 }}>
          {recipeSource === 'photo' ? '📸 Recette depuis ton frigo' : recipeSource === 'link' ? '🔗 Recette depuis un lien' : '💡 Idée recette'}
        </h2>

        {/* Toujours monté (juste caché) — le clic déclenché depuis
            chooseMealType (étape 1) a besoin de la ref disponible
            immédiatement, l'input ne peut pas être imbriqué dans un bloc
            conditionnel qui ne s'affiche plus pour la source photo. */}
        <input
          ref={recipePhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) generateRecipeFromPhoto(f) }}
        />

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
                  <span style={{ color: 'var(--nu-magenta)' }}>→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Seule la source "lien" a encore besoin d'une saisie après le
            choix du repas — auto génère directement, photo ouvre la
            caméra directement (chooseMealType). */}
        {recipeStep === 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => setRecipeStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <p className="text-sm text-muted" style={{ margin: 0 }}>{recipeMealType} — lien TikTok / Instagram</p>
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
            {/* Honest expectation-setting up front rather than a surprise
                error after a wait. Stays accurate whether or not
                SUPADATA_API_KEY is configured server-side: with it, this
                reads what's actually said in the video (real transcript);
                without it, only the post's own caption/description — the
                client has no way to know which one it'll get in advance. */}
            <p className="text-xs text-muted" style={{ marginBottom: 12, lineHeight: 1.4 }}>
              On essaie de lire ce qui est dit dans la vidéo ; si ce n'est pas possible, on se base sur la légende du post.
            </p>
            <button className="btn-accent" onClick={generateRecipeFromLink} disabled={!recipeLinkInput.trim()} style={{ opacity: recipeLinkInput.trim() ? 1 : 0.5 }}>
              Générer
            </button>
          </>
        )}

        {recipeStep === 3 && (
          <>
            {recipeLoading && (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div className="recipe-loading-orb" />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>{RECIPE_LOADING_MESSAGES[recipeLoadingMsgIndex]}</p>
              </div>
            )}

            {recipeError && (
              <div style={{ padding: 16, background: 'rgba(255,59,59,0.1)', border: '0.5px solid var(--danger)', borderRadius: 12, marginBottom: 16 }}>
                <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{recipeError}</p>
              </div>
            )}

            {/* 2-3 options to pick from (auto/photo) instead of the AI
                deciding alone — picking one below moves it into `recipe`
                and this list gets replaced by the full detail view. */}
            {!recipeLoading && !recipe && recipeOptions.length > 0 && (
              <>
                <p className="text-xs text-muted" style={{ marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {recipeMealType}{recipeSourceLabel ? ` · ${recipeSourceLabel}` : ''} — choisis une option
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {recipeOptions.map((opt, i) => (
                    <button key={i} onClick={() => setRecipe(opt)} className="card card-animated" style={{
                      textAlign: 'left', cursor: 'pointer', padding: '16px', '--delay': `${i * 60}ms`,
                    }}>
                      <div className="text-base bold text-primary" style={{ marginBottom: 4 }}>{opt.recipe_name}</div>
                      {opt.why && (
                        <div className="text-xs text-secondary" style={{ marginBottom: 8, lineHeight: 1.4, fontStyle: 'italic' }}>{opt.why}</div>
                      )}
                      <div style={{ display: 'flex', gap: 14 }}>
                        <span className="text-xs text-muted">{opt.kcal} kcal</span>
                        <span className="text-xs text-muted">P {opt.proteins}g</span>
                        <span className="text-xs text-muted">G {opt.carbs}g</span>
                        <span className="text-xs text-muted">L {opt.fats}g</span>
                      </div>
                    </button>
                  ))}
                </div>
                {recipeRegenerateRef.current && (
                  <button className="scan-retry-btn" onClick={() => recipeRegenerateRef.current?.()}>Voir d'autres idées</button>
                )}
              </>
            )}

            {recipe && !recipeLoading && (
              <>
                <p className="text-xs text-muted" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {recipeMealType}{recipeSourceLabel ? ` · ${recipeSourceLabel}` : ''}
                </p>
                <h3 className="text-base bold text-primary" style={{ marginBottom: recipe.why ? 6 : 12 }}>{recipe.recipe_name}</h3>
                {recipe.why && (
                  <p className="text-xs text-secondary" style={{ marginBottom: 14, lineHeight: 1.5, fontStyle: 'italic' }}>{recipe.why}</p>
                )}
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
                <button className="btn-accent" onClick={addRecipeAsMeal} disabled={isAddingMeal} style={{ marginBottom: 8 }}>{isAddingMeal ? 'Ajout...' : 'Ajouter ce repas'}</button>
                {recipeOptions.length > 1 && (
                  <button className="scan-retry-btn" style={{ marginBottom: 8 }} onClick={() => setRecipe(null)}>← Revoir les autres options</button>
                )}
                {recipeRegenerateRef.current ? (
                  <button className="scan-retry-btn" onClick={() => recipeRegenerateRef.current?.()}>Une autre idée</button>
                ) : (
                  // Lien : une seule vraie recette existe dans cette vidéo,
                  // pas de "regénère" qui aurait du sens — on propose plutôt
                  // de repartir sur un autre repas/source.
                  <button className="scan-retry-btn" onClick={() => setRecipeStep(1)}>Changer de repas</button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
