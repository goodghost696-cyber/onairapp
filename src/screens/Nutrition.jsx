import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { FOOD_DATABASE } from '../context/AppContext'
import BottomNav from '../components/BottomNav'
import NutriscoreBadge from '../components/NutriscoreBadge'

const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snack']

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
  const { appData, updateData } = useApp()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState(null)
  const [grams, setGrams] = useState(100)
  const [mealType, setMealType] = useState('Déjeuner')
  const [toast, setToast] = useState('')

  const filtered = FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
  const preview = selectedFood ? calcNutrition(selectedFood, grams) : null

  function openSheet() { setSheetOpen(true); setStep(1); setSearch(''); setSelectedFood(null); setGrams(100) }
  function selectFood(f) { setSelectedFood(f); setStep(2) }
  function addFood() {
    if (!selectedFood || !preview) return
    const newMeal = {
      id: Date.now(),
      name: `${selectedFood.name} (${grams}g)`,
      calories: preview.kcal,
      protein: preview.proteins,
      carbs: preview.carbs,
      fat: preview.fats,
      nutriscore: 'B',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
    updateData('meals', [...appData.meals, newMeal])
    updateData('calories', appData.calories + preview.kcal)
    updateData('protein', appData.protein + preview.proteins)
    updateData('carbs', appData.carbs + preview.carbs)
    updateData('fat', appData.fat + preview.fats)
    setSheetOpen(false)
    setToast(`Ajouté au ${mealType}`)
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
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">NUTRITION</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="text-sm text-muted">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <button onClick={() => navigate('/scan')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 14v4h4v-4z" strokeLinejoin="round"/></svg>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>SCANNER</span>
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
            <div><span className="text-2xl bold">{appData.calories}</span><span className="text-sm text-muted"> / {appData.calorieGoal} kcal</span></div>
            <span className="text-sm text-muted">{appData.calorieGoal - appData.calories} restantes</span>
          </div>
          <div className="progress-bar" style={{ height: 5 }}>
            <div className="progress-fill" style={{ width: `${Math.min(appData.calories/appData.calorieGoal*100,100)}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 14 }}>
            {[
              { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal },
              { label: 'Glucides', val: appData.carbs, goal: appData.carbsGoal },
              { label: 'Lipides', val: appData.fat, goal: appData.fatGoal },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div className="text-sm bold">{m.val}g</div>
                <div className="text-xs text-muted">{m.label}</div>
                <div className="text-xs text-muted">{m.goal}g</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-label">REPAS D'AUJOURD'HUI</div>
        {appData.meals.map(meal => (
          <div key={meal.id} className="card" style={{ marginBottom: 8 }}>
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
        ))}
      </div>

      {/* FAB */}
      <button onClick={openSheet} style={{
        position: 'fixed', bottom: 90, right: 16, zIndex: 95,
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--accent)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(224,0,0,0.4)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
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
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        borderTop: '0.5px solid var(--border)',
        padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 200, maxHeight: '80vh', overflowY: 'auto',
      }}>
        {step === 1 ? (
          <>
            <h2 className="text-lg bold" style={{ marginBottom: 16 }}>Ajouter un aliment</h2>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un aliment..." style={{ marginBottom: 12 }} autoFocus />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.map(f => (
                <div key={f.id} onClick={() => selectFood(f)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer',
                }}>
                  <span className="text-base">{f.name}</span>
                  <span className="text-xs text-muted">{f.per100g.kcal} kcal/100g</span>
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
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>QUANTITÉ (g)</label>
              <input type="number" value={grams} onChange={e => setGrams(Math.max(1, parseInt(e.target.value) || 1))} style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} />
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
              {MEAL_TYPES.map(t => (
                <button key={t} onClick={() => setMealType(t)} style={{
                  background: mealType === t ? 'var(--accent)' : 'var(--surface-2)',
                  border: '0.5px solid var(--border)',
                  color: mealType === t ? '#000' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 700, padding: '8px 14px', borderRadius: 50,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                }}>{t}</button>
              ))}
            </div>
            <button className="btn-accent" onClick={addFood}>AJOUTER</button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
