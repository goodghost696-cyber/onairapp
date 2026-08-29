import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import NutriscoreBadge from '../components/NutriscoreBadge'
import Icon from '../components/Icon'
import { authHeader } from '../lib/supabase'
import { BOUNDS, clamp } from '../utils/validation'
import { resizeImage } from '../utils/image'
import { lookupOFF, computeItemsTotal } from '../utils/foodEstimate'
import { mapApiError } from '../utils/apiErrors'
import '../styles/Scan-redesign.css'

const LANG_NAMES = { fr: 'français', en: 'English', es: 'español' }

export default function Scan() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addMeal } = useApp()
  const { lang, t } = useLanguage()
  // Fichier déjà choisi depuis le sheet de Nutrition.jsx (caméra ou
  // pellicule) — passé via location.state plutôt qu'un nouvel écran
  // intermédiaire ("directement accessible depuis la page Nutrition
  // plutôt que sur un écran séparé"). Cet écran garde son propre choix
  // caméra/galerie + toggle Repas/Code-barres comme repli si on y arrive
  // sans fichier déjà choisi (ex: lien direct vers le mode Code-barres,
  // resté hors du sheet rapide — voir JOURNAL.md).
  const preselected = location.state?.file
  // loading initialisé directement à true quand un fichier est déjà là :
  // évite un flash d'une frame de l'écran de choix avant que l'effet
  // ci-dessous ne déclenche l'analyse (les effects ne courent qu'après le
  // premier rendu).
  const [loading, setLoading] = useState(!!preselected)
  const [currentMode, setCurrentMode] = useState(null)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [selectedMeal, setSelectedMeal] = useState('Déjeuner')
  // Same class of bug as Nutrition.jsx's add buttons — the button wasn't
  // disabled while addMeal() was in flight, so a double-tap before the
  // first insert resolved (and before the navigate('/nutrition') below)
  // could insert the same meal twice.
  const [adding, setAdding] = useState(false)
  // Photo et Code-barres restent 2 modes du même bouton caméra (pas un
  // vrai toggle DANS la caméra : <input capture> est l'UI native de l'OS,
  // aucun overlay custom n'est injectable dedans) — pré-sélectionné sur
  // 'barcode' si on arrive ici via le lien "Scanner un code-barres" du
  // sheet Nutrition (state.mode), sinon 'food' par défaut.
  const [scanMode, setScanMode] = useState(location.state?.mode === 'barcode' ? 'barcode' : 'food')

  // Fond crème derrière .app-wrapper (overscroll iOS compris) — même
  // mécanisme que les autres écrans restylés (auth-redesign.css etc.).
  useEffect(() => {
    document.body.classList.add('scan-body-bg')
    return () => document.body.classList.remove('scan-body-bg')
  }, [])

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
          const off = await lookupOFF(item.name, item.kcal_100g)
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
      setError(mapApiError(err))
    }
    setLoading(false)
  }

  // Fichier déjà choisi (sheet Nutrition) : lance l'analyse directement au
  // montage, sans repasser par l'écran de choix caméra/galerie. L'état de
  // navigation est nettoyé juste après (replace) pour qu'un retour arrière
  // n'essaie pas de relancer l'analyse avec le même File.
  useEffect(() => {
    if (preselected) {
      handleImage(preselected, location.state?.mode || 'food')
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateItemGrams(index, grams) {
    setResult(prev => {
      const items = [...prev.data.items]
      // 0g is allowed here (lets the user exclude a detected item from the total).
      items[index] = { ...items[index], grams: clamp(grams, { min: 0, max: BOUNDS.grams.max }, 0) }
      return { ...prev, data: { ...prev.data, items } }
    })
  }

  // Zeroing the grams (above) kept the item visible with a strikethrough-
  // free "0 kcal" row — not an obvious way to actually remove a
  // mis-detected item (reported directly: "je veux enlever la pêche mais
  // je ne peux pas"). Removes it from the list outright.
  function removeItem(index) {
    setResult(prev => {
      const items = prev.data.items.filter((_, i) => i !== index)
      return { ...prev, data: { ...prev.data, items } }
    })
  }

  async function handleAddToMeal() {
    if (!result || adding) return
    setAdding(true)
    try {
      const t2 = computeItemsTotal(result.data.items)
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
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="app-wrapper scan-redesign">
      <div className="screen scan-screen">
        {/* Header */}
        <div className="sc-header">
          <button className="sc-back" onClick={() => navigate('/nutrition')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="sc-title">{t('recognize_food')}</h1>
        </div>

        {/* Input buttons — repli si on arrive ici sans fichier déjà choisi
            (lien direct mode Code-barres, ou retour arrière). "Décrire un
            repas" (multi-ingrédient texte) déplacé sur Nutrition.jsx,
            pas dupliqué ici. */}
        {!loading && !result && (
          <div>
            {/* Toggle Repas/Code-barres pour le bouton caméra ci-dessous.
                Choisi AVANT d'ouvrir la caméra (plutôt que dedans) : <input
                capture> est l'UI native de l'OS, aucun overlay custom
                injectable dedans. */}
            <div className="sc-mode-toggle">
              <button type="button" className={`sc-chip${scanMode === 'food' ? ' active' : ''}`} onClick={() => setScanMode('food')}>
                Repas
              </button>
              <button type="button" className={`sc-chip${scanMode === 'barcode' ? ' active' : ''}`} onClick={() => setScanMode('barcode')}>
                Code-barres
              </button>
            </div>

            {/* Caméra — ouvre directement dans le mode choisi ci-dessus */}
            <label htmlFor="camera-input" className="sc-option">
              <span className="sc-option-icon camera">
                <Icon name={scanMode === 'barcode' ? 'barcode' : 'camera'} size={22} />
              </span>
              <span className="sc-option-body">
                <span className="sc-option-title">
                  {scanMode === 'barcode' ? t('scan_barcode') : t('take_photo')}
                </span>
                <span className="sc-option-sub">
                  {scanMode === 'barcode' ? "Photo du code-barres d'un produit" : 'Appareil photo · Repas ou produit'}
                </span>
              </span>
            </label>
            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleImage(e.target.files[0], scanMode)}
              style={{ display: 'none' }}
            />

            {/* Galerie — pas concernée par le toggle ci-dessus, toujours mode Repas */}
            <label htmlFor="gallery-input" className="sc-option">
              <span className="sc-option-icon gallery">
                <Icon name="gallery" size={22} />
              </span>
              <span className="sc-option-body">
                <span className="sc-option-title">{t('gallery')}</span>
                <span className="sc-option-sub">Sélectionner une photo existante</span>
              </span>
            </label>
            <input
              id="gallery-input"
              type="file"
              accept="image/*"
              onChange={(e) => handleImage(e.target.files[0], 'food')}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="sc-loading">
            <div className="sc-loading-ring" />
            <p className="sc-loading-text">
              {currentMode === 'barcode' ? t('identifying') : t('analyzing')}
            </p>
            <p className="sc-loading-sub">{t('few_seconds')}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="sc-error">
            <p className="sc-error-text">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (() => {
          const total = computeItemsTotal(result.data.items)
          return (
          <div className="sc-result">
            <p className="sc-result-name">{result.data.meal_name}</p>
            {result.data.brand && (
              <p className="sc-result-brand">{result.data.brand}</p>
            )}
            {result.data.nutriscore && result.data.nutriscore !== '?' && (
              <div style={{ marginBottom: 16 }}>
                <NutriscoreBadge score={result.data.nutriscore} size={32} />
              </div>
            )}
            <div className="sc-macros">
              <div className="sc-macro">
                <span className="sc-macro-val">{Math.round(total.kcal)}</span>
                <span className="sc-macro-label">kcal</span>
              </div>
              <div className="sc-macro">
                <span className="sc-macro-val">{Math.round(total.proteins)}g</span>
                <span className="sc-macro-label">Prot.</span>
              </div>
              <div className="sc-macro">
                <span className="sc-macro-val">{Math.round(total.carbs)}g</span>
                <span className="sc-macro-label">Gluc.</span>
              </div>
              <div className="sc-macro">
                <span className="sc-macro-val">{Math.round(total.fats)}g</span>
                <span className="sc-macro-label">Lip.</span>
              </div>
            </div>
            <div className="sc-items">
              {result.data.items.map((item, i) => (
                <div key={i} className="sc-item">
                  <div className="sc-item-top">
                    <span>
                      {item.name}
                      <span
                        title={item.verified ? 'Valeurs vérifiées (Open Food Facts)' : 'Estimation IA — non vérifiée'}
                        className={`sc-verified ${item.verified ? 'yes' : 'no'}`}
                      >
                        {item.verified ? '✓' : '≈'}
                      </span>
                    </span>
                    <span>{Math.round(item.kcal100 * item.grams / 100)} kcal</span>
                  </div>
                  <div className="sc-item-controls">
                    <input
                      type="number"
                      min="0"
                      value={item.grams}
                      onChange={e => updateItemGrams(i, parseInt(e.target.value, 10) || 0)}
                      className="sc-grams-input"
                    />
                    <span className="sc-grams-unit">g</span>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label="Supprimer cet aliment"
                      className="sc-remove"
                    >✕</button>
                  </div>
                </div>
              ))}
              {result.data.items.length === 0 && (
                <p className="sc-empty-note">Tous les aliments ont été supprimés.</p>
              )}
            </div>
            <div className="sc-meal-selector">
              {mealOptions.map(meal => (
                <button
                  key={meal}
                  className={`sc-chip ${selectedMeal === meal ? 'active' : ''}`}
                  onClick={() => setSelectedMeal(meal)}
                >
                  {meal}
                </button>
              ))}
            </div>
            <button className="sc-add-btn" onClick={handleAddToMeal} disabled={result.data.items.length === 0 || adding}>
              {adding ? 'Ajout...' : t('add_to_meal')}
            </button>
            <button className="sc-retry-btn" onClick={() => { setResult(null); setError(null) }}>
              {t('retry')}
            </button>
          </div>
          )
        })()}

        {/* Retry after error */}
        {error && !result && (
          <button className="sc-retry-btn" onClick={() => { setError(null); setLoading(false) }}>
            {t('retry')}
          </button>
        )}
      </div>

    </div>
  )
}
