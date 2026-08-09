import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import NutriscoreBadge from '../components/NutriscoreBadge'
import { authHeader } from '../lib/supabase'
import { BOUNDS, clamp } from '../utils/validation'
import { resizeImage } from '../utils/image'

const LANG_NAMES = { fr: 'français', en: 'English', es: 'español' }

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="6" width="18" height="14" rx="2"/>
      <circle cx="12" cy="13" r="3"/>
      <path d="M8 6V4h8v2"/>
    </svg>
  )
}

function GalleryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

function BarcodeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <path d="M3 5v3M3 16v3M8 5v14M12 5v14M16 5v14M21 5v3M21 16v3"/>
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

// Look up real per-100g nutrition for a food name via Open Food Facts.
// Returns null if no usable match is found (caller falls back to the AI estimate).
async function lookupOFF(name) {
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
function computeTotal(items) {
  return items.reduce((acc, it) => {
    const factor = (it.grams || 0) / 100
    acc.kcal += it.kcal100 * factor
    acc.proteins += it.prot100 * factor
    acc.carbs += it.carb100 * factor
    acc.fats += it.fat100 * factor
    return acc
  }, { kcal: 0, proteins: 0, carbs: 0, fats: 0 })
}

export default function Scan() {
  const navigate = useNavigate()
  const { addMeal } = useApp()
  const { lang, t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [currentMode, setCurrentMode] = useState(null)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [selectedMeal, setSelectedMeal] = useState('Déjeuner')
  // Text-description mode ("3 oeufs, 4 c. à soupe de skyr") — same
  // estimation pattern as the photo/barcode modes below (Claude → items[]
  // with per-100g values → same review/edit UI), just no image involved.
  // Requested directly: search-by-name in Nutrition.jsx's add-food sheet
  // requires knowing the weight in grams, which nobody actually knows for
  // "3 eggs" or "4 tablespoons of skyr".
  const [textMode, setTextMode] = useState(false)
  const [textInput, setTextInput] = useState('')

  const mealOptions = [t('breakfast'), t('lunch'), t('dinner'), t('snack')]

  const handleImage = async (file, mode) => {
    if (!file) return
    setLoading(true)
    setCurrentMode(mode)
    setError(null)
    setResult(null)

    try {
      const resized = await resizeImage(file)
      const base64 = resized.split(',')[1]
      const langName = LANG_NAMES[lang]

      const prompt = mode === 'barcode'
        ? `This image contains a product barcode or packaging.
           If you can see a barcode number, extract it and return it.
           Also identify the product name and any nutritional info visible on the packaging.
           Reply ONLY in valid JSON, no text before or after:
           {
             "type": "barcode",
             "barcode": "3017620422003",
             "product_name": "Nutella",
             "brand": "Ferrero",
             "kcal_100g": 530,
             "proteins_100g": 6,
             "carbs_100g": 57,
             "fats_100g": 31
           }
           If no barcode visible, still try to identify the product from packaging.
           Réponds en ${langName}. Les noms des aliments doivent être en ${langName}.`
        : `Analyse this food image and identify every visible food item.
           Estimate the portion size in grams for each item.
           Reply ONLY in valid JSON, no text before or after:
           {
             "meal_name": "Assiette de poulet riz",
             "items": [
               {
                 "name": "Blanc de poulet",
                 "grams": 150,
                 "kcal_100g": 110,
                 "proteins_100g": 21,
                 "carbs_100g": 0,
                 "fats_100g": 3
               }
             ]
           }
           kcal_100g/proteins_100g/carbs_100g/fats_100g are per-100g values for that
           food (not for the estimated portion) — used only as a fallback if a real
           database lookup for that food name fails.
           Réponds en ${langName}. Les noms des aliments doivent être en ${langName}.`

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: prompt }
            ]
          }]
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      if (mode === 'barcode' && parsed.barcode) {
        let offProduct = null
        try {
          const offRes = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${parsed.barcode}.json`
          )
          const offData = await offRes.json()
          if (offData.status === 1) offProduct = offData.product
        } catch { /* fallback to Claude result below */ }

        const verified = !!offProduct?.nutriments?.['energy-kcal_100g']
        setResult({
          type: 'barcode',
          data: {
            meal_name: offProduct?.product_name || parsed.product_name || 'Produit inconnu',
            brand: offProduct?.brands || parsed.brand || '',
            nutriscore: offProduct?.nutrition_grades?.toUpperCase() || '?',
            items: [{
              name: offProduct?.product_name || parsed.product_name || 'Produit inconnu',
              grams: 100,
              kcal100: Math.round(offProduct?.nutriments?.['energy-kcal_100g'] ?? parsed.kcal_100g ?? 0),
              prot100: Math.round((offProduct?.nutriments?.proteins_100g ?? parsed.proteins_100g ?? 0) * 10) / 10,
              carb100: Math.round((offProduct?.nutriments?.carbohydrates_100g ?? parsed.carbs_100g ?? 0) * 10) / 10,
              fat100: Math.round((offProduct?.nutriments?.fat_100g ?? parsed.fats_100g ?? 0) * 10) / 10,
              verified,
            }],
          }
        })
      } else if (mode === 'food') {
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
        setResult({ type: 'food', data: { meal_name: parsed.meal_name, items } })
      } else {
        setResult({ type: mode, data: parsed })
      }
    } catch (err) {
      setError(`Erreur : ${err.message}`)
    }
    setLoading(false)
  }

  // Text description ("3 oeufs, 4 c. à soupe de skyr") — same shape of
  // result as handleImage's 'food' branch (items[] with per-100g values,
  // OFF-verified where possible), just no image in the Claude request.
  const handleTextDescription = async () => {
    const description = textInput.trim()
    if (!description) return
    setLoading(true)
    setCurrentMode('text')
    setError(null)
    setResult(null)

    try {
      const langName = LANG_NAMES[lang]
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
      setResult({ type: 'food', data: { meal_name: parsed.meal_name, items } })
      setTextMode(false)
    } catch (err) {
      setError(`Erreur : ${err.message}`)
    }
    setLoading(false)
  }

  function updateItemGrams(index, grams) {
    setResult(prev => {
      const items = [...prev.data.items]
      // 0g is allowed here (lets the user exclude a detected item from the total).
      items[index] = { ...items[index], grams: clamp(grams, { min: 0, max: BOUNDS.grams.max }, 0) }
      return { ...prev, data: { ...prev.data, items } }
    })
  }

  async function handleAddToMeal() {
    if (!result) return
    const t2 = computeTotal(result.data.items)
    await addMeal({
      name: result.data.meal_name,
      calories: Math.round(t2.kcal),
      protein: Math.round(t2.proteins),
      carbs: Math.round(t2.carbs),
      fat: Math.round(t2.fats),
      nutriscore: result.data.nutriscore || 'B',
      mealType: selectedMeal,
    })
    navigate('/nutrition')
  }

  return (
    <div className="app-wrapper">
      <div className="screen">
        {/* Header */}
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 24px' }}>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => navigate('/nutrition')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t('recognize_food')}</h1>
        </div>

        {/* Input buttons — always visible */}
        {!loading && !result && !textMode && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Camera */}
            <label htmlFor="camera-input" className="scan-btn primary">
              <CameraIcon />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{t('take_photo')}</span>
                <span className="scan-btn-sub">Appareil photo · Repas ou produit</span>
              </div>
            </label>
            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleImage(e.target.files[0], 'food')}
              style={{ display: 'none' }}
            />

            {/* Gallery */}
            <label htmlFor="gallery-input" className="scan-btn secondary">
              <GalleryIcon />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{t('gallery')}</span>
                <span className="scan-btn-sub">Sélectionner une photo existante</span>
              </div>
            </label>
            <input
              id="gallery-input"
              type="file"
              accept="image/*"
              onChange={(e) => handleImage(e.target.files[0], 'food')}
              style={{ display: 'none' }}
            />

            {/* Barcode */}
            <label htmlFor="barcode-input" className="scan-btn tertiary">
              <BarcodeIcon />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{t('scan_barcode')}</span>
                <span className="scan-btn-sub">Photo du code-barres d'un produit</span>
              </div>
            </label>
            <input
              id="barcode-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleImage(e.target.files[0], 'barcode')}
              style={{ display: 'none' }}
            />

            {/* Text description — for when you know what you ate but not
                the weight ("3 oeufs, 4 c. à soupe de skyr"). Requested
                directly: the search-by-name flow in Nutrition.jsx requires
                grams, which nobody actually knows off-hand. */}
            <button type="button" className="scan-btn tertiary" onClick={() => setTextMode(true)}>
              <PencilIcon />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Décrire un repas</span>
                <span className="scan-btn-sub">"3 oeufs, 4 c. à soupe de skyr..." — pas besoin de connaître le poids</span>
              </div>
            </button>
          </div>
        )}

        {/* Text description input */}
        {!loading && !result && textMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              autoFocus
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="Ex : 3 oeufs, 4 cuillères à soupe de skyr, une tranche de pain..."
              rows={4}
              style={{
                width: '100%', resize: 'vertical', padding: '14px 16px', borderRadius: 12,
                background: 'var(--surface)', border: '2px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 15, fontFamily: 'inherit', lineHeight: 1.5,
              }}
            />
            <button type="button" className="scan-btn primary" style={{ justifyContent: 'center' }} onClick={handleTextDescription} disabled={!textInput.trim()}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Analyser</span>
            </button>
            <button type="button" className="scan-retry-btn" onClick={() => { setTextMode(false); setTextInput('') }}>
              Annuler
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="scan-loading">
            <div className="scan-loading-ring" />
            <p className="scan-loading-text">
              {currentMode === 'barcode' ? t('identifying') : t('analyzing')}
            </p>
            <p className="scan-loading-sub">{t('few_seconds')}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: 16, background: 'rgba(255,59,59,0.1)', border: '0.5px solid var(--danger)', borderRadius: 12, marginBottom: 16 }}>
            <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (() => {
          const total = computeTotal(result.data.items)
          return (
          <div className="scan-result">
            <p className="scan-result-name">{result.data.meal_name}</p>
            {result.data.brand && (
              <p className="scan-result-brand">{result.data.brand}</p>
            )}
            {result.data.nutriscore && result.data.nutriscore !== '?' && (
              <div style={{ marginBottom: 16 }}>
                <NutriscoreBadge score={result.data.nutriscore} size={32} />
              </div>
            )}
            <div className="scan-macros-row">
              <div className="scan-macro">
                <span className="scan-macro-val">{Math.round(total.kcal)}</span>
                <span className="scan-macro-label">kcal</span>
              </div>
              <div className="scan-macro">
                <span className="scan-macro-val">{Math.round(total.proteins)}g</span>
                <span className="scan-macro-label">Prot.</span>
              </div>
              <div className="scan-macro">
                <span className="scan-macro-val">{Math.round(total.carbs)}g</span>
                <span className="scan-macro-label">Gluc.</span>
              </div>
              <div className="scan-macro">
                <span className="scan-macro-val">{Math.round(total.fats)}g</span>
                <span className="scan-macro-label">Lip.</span>
              </div>
            </div>
            <div className="scan-items-list">
              {result.data.items.map((item, i) => (
                <div key={i} className="scan-item-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {item.name}
                      <span
                        title={item.verified ? 'Valeurs vérifiées (Open Food Facts)' : 'Estimation IA — non vérifiée'}
                        style={{ marginLeft: 6, fontSize: 11, color: item.verified ? 'var(--success)' : 'var(--text-secondary)' }}
                      >
                        {item.verified ? '✓' : '≈'}
                      </span>
                    </span>
                    <span>{Math.round(item.kcal100 * item.grams / 100)} kcal</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      min="0"
                      value={item.grams}
                      onChange={e => updateItemGrams(i, parseInt(e.target.value, 10) || 0)}
                      style={{
                        width: 64, background: 'var(--surface-2)', border: '2px solid var(--border)',
                        borderRadius: 8, color: 'var(--text-primary)', padding: '4px 8px', fontSize: 13, fontFamily: 'inherit',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>g</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="scan-meal-selector">
              {mealOptions.map(meal => (
                <button
                  key={meal}
                  className={`meal-chip ${selectedMeal === meal ? 'active' : ''}`}
                  onClick={() => setSelectedMeal(meal)}
                >
                  {meal}
                </button>
              ))}
            </div>
            <button className="scan-add-btn" onClick={handleAddToMeal}>
              {t('add_to_meal')}
            </button>
            <button className="scan-retry-btn" onClick={() => { setResult(null); setError(null) }}>
              {t('retry')}
            </button>
          </div>
          )
        })()}

        {/* Retry after error */}
        {error && !result && (
          <button className="scan-retry-btn" onClick={() => { setError(null); setLoading(false) }}>
            {t('retry')}
          </button>
        )}
      </div>

    </div>
  )
}
