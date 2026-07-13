import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import NutriscoreBadge from '../components/NutriscoreBadge'
import { authHeader } from '../lib/supabase'

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

// Look up real per-100g nutrition for a food name via Open Food Facts.
// Returns null if no usable match is found (caller falls back to the AI estimate).
async function lookupOFF(name) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=1&fields=product_name,nutriments`
    )
    const data = await res.json()
    const p = data.products?.[0]
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

const resizeImage = (file, maxWidth = 800) => {
  return new Promise((resolve) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = URL.createObjectURL(file)
  })
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

  function updateItemGrams(index, grams) {
    setResult(prev => {
      const items = [...prev.data.items]
      items[index] = { ...items[index], grams: Math.max(0, grams) }
      return { ...prev, data: { ...prev.data, items } }
    })
  }

  async function handleAddToMeal() {
    if (!result) return
    const t2 = computeTotal(result.data.items)
    const { success, error: addError } = await addMeal({
      name: result.data.meal_name,
      calories: Math.round(t2.kcal),
      protein: Math.round(t2.proteins),
      carbs: Math.round(t2.carbs),
      fat: Math.round(t2.fats),
      nutriscore: result.data.nutriscore || 'B',
      mealType: selectedMeal,
    })
    if (!success) {
      setError(`Erreur : ${addError}`)
      return
    }
    navigate('/nutrition')
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 24px' }}>
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
        {!loading && !result && (
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
                        width: 64, background: 'var(--glass)', border: '1px solid var(--glass-border)',
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
