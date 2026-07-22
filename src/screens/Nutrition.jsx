import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { FOOD_DATABASE } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { authHeader } from '../lib/supabase'
import { BOUNDS, clamp } from '../utils/validation'
import NutriscoreBadge from '../components/NutriscoreBadge'
import SwipeableRow from '../components/SwipeableRow'

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
  const [grams, setGrams] = useState(100)
  const [mealType, setMealType] = useState('Déjeuner')
  const [toast, setToast] = useState('')

  const [recipeSheetOpen, setRecipeSheetOpen] = useState(false)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipe, setRecipe] = useState(null)
  const [recipeError, setRecipeError] = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [])

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

  function openSheet() {
    setSheetOpen(true); setStep(1); setFoodSearch(''); setSelectedFood(null); setGrams(100)
  }

  function selectFood(f) { setSelectedFood(f); setStep(2) }

  async function generateRecipe() {
    setRecipeSheetOpen(true)
    setRecipeLoading(true)
    setRecipeError('')
    setRecipe(null)

    // Bounded to a single-meal-sized range so a bad/unrealistic daily goal
    // (e.g. leftover test data) can't push the AI into proposing an absurd recipe.
    const remainingKcal = Math.min(1000, Math.max(300, Math.round(appData.calorieGoal - appData.calories) || 500))
    const remainingProtein = Math.min(60, Math.max(15, Math.round(appData.proteinGoal - appData.protein) || 25))
    const remainingCarbs = Math.min(100, Math.max(20, Math.round(appData.carbsGoal - appData.carbs) || 40))
    const remainingFat = Math.min(40, Math.max(5, Math.round(appData.fatGoal - appData.fat) || 15))

    const prompt = `Tu es un nutritionniste expert. Propose UNE recette de repas adaptée à ces besoins nutritionnels restants pour aujourd'hui :
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

  async function addRecipeAsMeal() {
    if (!recipe) return
    await addMeal({
      name: recipe.recipe_name,
      calories: recipe.kcal,
      protein: recipe.proteins,
      carbs: recipe.carbs,
      fat: recipe.fats,
      nutriscore: 'B',
      mealType,
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
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-secondary)', marginBottom: 7 }}>NUTRITION</p>
            <span className="text-sm text-secondary" style={{ textTransform: 'capitalize' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          </div>
          <button
            onClick={() => navigate('/scan')}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', color: 'var(--accent)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 14v4h4v-4z" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{appData.calories}</span>
              <span className="text-sm text-muted" style={{ marginLeft: 6 }}>kcal</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-xs text-muted">Restant</div>
              <div className="text-base bold" style={{ color: 'var(--success)' }}>{appData.calorieGoal - appData.calories}</div>
            </div>
          </div>
          <div style={{ position: 'relative', height: 8, background: 'var(--surface-2)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(appData.calories/appData.calorieGoal*100,100)}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 500ms ease-out' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal, color: '#4FC3F7', delay: '0ms' },
              { label: 'Glucides',  val: appData.carbs,   goal: appData.carbsGoal,   color: '#FFA726', delay: '80ms' },
              { label: 'Lipides',   val: appData.fat,     goal: appData.fatGoal,     color: '#A78BFA', delay: '160ms' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <span className="text-xs text-muted">{m.label}</span>
                  <span className="text-xs bold">{m.val}g <span className="text-muted">/ {m.goal}g</span></span>
                </div>
                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(m.val/m.goal*100,100)}%`, background: m.color, borderRadius: 2, transition: `width 500ms ease-out ${m.delay}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={generateRecipe}
          className="card"
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            marginBottom: 16, cursor: 'pointer', border: '2px solid rgba(212,255,0,0.3)',
            background: 'rgba(212,255,0,0.08)', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 22 }}>💡</span>
          <div>
            <div className="text-sm bold">Idée recette</div>
            <div className="text-xs text-muted">Suggestion IA basée sur ce qu'il te reste aujourd'hui</div>
          </div>
        </button>

        <div className="section-label">{t('today_meals')}</div>
        <p className="text-xs text-muted" style={{ marginTop: -4, marginBottom: 10 }}>Glisse un repas vers la gauche pour le modifier ou le supprimer.</p>
        {appData.meals.map(meal => (
          <SwipeableRow
            key={meal.id}
            actions={[
              { label: 'Modifier', color: 'var(--warning)', onClick: () => openEditMeal(meal) },
              { label: 'Supprimer', color: 'var(--danger)', onClick: () => deleteMeal(meal.id) },
            ]}
          >
            <div className="card" style={{ marginBottom: 0 }}>
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
            width: '100%', maxWidth: 390, background: 'var(--surface-solid)',
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

      {/* FAB */}
      <button onClick={openSheet} style={{
        position: 'fixed', bottom: 90, right: 16, zIndex: 95,
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--accent)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(212,255,0,0.4)',
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
        width: '100%', maxWidth: 390,
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
              value={foodSearch}
              onChange={e => setFoodSearch(e.target.value)}
              placeholder="Rechercher un aliment..."
              style={{ marginBottom: 8 }}
              autoFocus
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
              <input type="number" value={grams} onChange={e => setGrams(clamp(parseInt(e.target.value), BOUNDS.grams, 1))} style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} />
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
        width: '100%', maxWidth: 390,
        background: 'var(--surface-solid)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        borderRadius: '20px 20px 0 0',
        borderTop: '1px solid var(--glass-border)',
        padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 200, maxHeight: '80vh', overflowY: 'auto',
      }}>
        <h2 className="text-lg bold" style={{ marginBottom: 16 }}>💡 Idée recette</h2>

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
            <h3 className="text-base bold" style={{ marginBottom: 12 }}>{recipe.recipe_name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16, padding: '14px', background: 'var(--surface-2)', borderRadius: 12 }}>
              {[
                { label: 'kcal', val: recipe.kcal },
                { label: 'P', val: `${recipe.proteins}g` },
                { label: 'G', val: `${recipe.carbs}g` },
                { label: 'L', val: `${recipe.fats}g` },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div className="text-base bold">{m.val}</div>
                  <div className="text-xs text-muted">{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div className="text-xs text-muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ingrédients</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(recipe.ingredients || []).map((ing, i) => (
                  <li key={i} className="text-sm" style={{ marginBottom: 4 }}>{ing}</li>
                ))}
              </ul>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="text-xs text-muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Préparation</div>
              <p className="text-sm" style={{ margin: 0, lineHeight: 1.5 }}>{recipe.instructions}</p>
            </div>
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
            <button className="btn-accent" onClick={addRecipeAsMeal} style={{ marginBottom: 8 }}>Ajouter ce repas</button>
            <button className="scan-retry-btn" onClick={generateRecipe}>Une autre idée</button>
          </>
        )}
      </div>
    </div>
  )
}
