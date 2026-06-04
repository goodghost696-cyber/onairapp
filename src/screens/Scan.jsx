import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import NutriscoreBadge from '../components/NutriscoreBadge'

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
  const { appData, updateData } = useApp()
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
           Estimate quantities in grams and calculate macronutrients.
           Reply ONLY in valid JSON, no text before or after:
           {
             "meal_name": "Assiette de poulet riz",
             "items": [
               {
                 "name": "Blanc de poulet",
                 "grams": 150,
                 "kcal": 165,
                 "proteins": 31,
                 "carbs": 0,
                 "fats": 4
               }
             ],
             "total": {
               "kcal": 450,
               "proteins": 38,
               "carbs": 45,
               "fats": 12
             }
           }
           Réponds en ${langName}. Les noms des aliments doivent être en ${langName}.`

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        try {
          const offRes = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${parsed.barcode}.json`
          )
          const offData = await offRes.json()
          if (offData.status === 1) {
            const p = offData.product
            setResult({
              type: 'barcode',
              data: {
                meal_name: p.product_name || parsed.product_name,
                brand: p.brands || parsed.brand,
                nutriscore: p.nutrition_grades?.toUpperCase() || '?',
                items: [{
                  name: p.product_name || parsed.product_name,
                  grams: 100,
                  kcal: Math.round(p.nutriments?.['energy-kcal_100g'] || parsed.kcal_100g || 0),
                  proteins: Math.round(p.nutriments?.proteins_100g || parsed.proteins_100g || 0),
                  carbs: Math.round(p.nutriments?.carbohydrates_100g || parsed.carbs_100g || 0),
                  fats: Math.round(p.nutriments?.fat_100g || parsed.fats_100g || 0),
                }],
                total: {
                  kcal: Math.round(p.nutriments?.['energy-kcal_100g'] || parsed.kcal_100g || 0),
                  proteins: Math.round(p.nutriments?.proteins_100g || parsed.proteins_100g || 0),
                  carbs: Math.round(p.nutriments?.carbohydrates_100g || parsed.carbs_100g || 0),
                  fats: Math.round(p.nutriments?.fat_100g || parsed.fats_100g || 0),
                }
              }
            })
            setLoading(false)
            return
          }
        } catch { /* fallback to Claude result */ }
        setResult({
          type: 'barcode',
          data: {
            meal_name: parsed.product_name || 'Produit inconnu',
            brand: parsed.brand || '',
            nutriscore: '?',
            items: [{
              name: parsed.product_name || 'Produit inconnu',
              grams: 100,
              kcal: parsed.kcal_100g || 0,
              proteins: parsed.proteins_100g || 0,
              carbs: parsed.carbs_100g || 0,
              fats: parsed.fats_100g || 0,
            }],
            total: {
              kcal: parsed.kcal_100g || 0,
              proteins: parsed.proteins_100g || 0,
              carbs: parsed.carbs_100g || 0,
              fats: parsed.fats_100g || 0,
            }
          }
        })
      } else {
        setResult({ type: mode, data: parsed })
      }
    } catch (err) {
      setError(`Erreur : ${err.message}`)
    }
    setLoading(false)
  }

  function handleAddToMeal() {
    if (!result) return
    const t2 = result.data.total
    const newMeal = {
      id: Date.now(),
      name: result.data.meal_name,
      calories: t2.kcal,
      protein: t2.proteins,
      carbs: t2.carbs,
      fat: t2.fats,
      nutriscore: result.data.nutriscore || 'B',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      mealType: selectedMeal,
    }
    updateData('meals', [...appData.meals, newMeal])
    updateData('calories', appData.calories + t2.kcal)
    updateData('protein', (appData.protein || 0) + t2.proteins)
    updateData('carbs', (appData.carbs || 0) + t2.carbs)
    updateData('fat', (appData.fat || 0) + t2.fats)
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
        {result && (
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
                <span className="scan-macro-val">{result.data.total.kcal}</span>
                <span className="scan-macro-label">kcal</span>
              </div>
              <div className="scan-macro">
                <span className="scan-macro-val">{result.data.total.proteins}g</span>
                <span className="scan-macro-label">Prot.</span>
              </div>
              <div className="scan-macro">
                <span className="scan-macro-val">{result.data.total.carbs}g</span>
                <span className="scan-macro-label">Gluc.</span>
              </div>
              <div className="scan-macro">
                <span className="scan-macro-val">{result.data.total.fats}g</span>
                <span className="scan-macro-label">Lip.</span>
              </div>
            </div>
            <div className="scan-items-list">
              {result.data.items.map((item, i) => (
                <div key={i} className="scan-item-row">
                  <span>{item.name} — {item.grams}g</span>
                  <span>{item.kcal} kcal</span>
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
        )}

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
