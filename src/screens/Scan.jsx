import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import NutriscoreBadge from '../components/NutriscoreBadge'
import BottomNav from '../components/BottomNav'

const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snack']

export default function Scan() {
  const navigate = useNavigate()
  const { appData, updateData } = useApp()
  const [mode, setMode] = useState('photo') // 'photo' | 'barcode'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mealResult, setMealResult] = useState(null) // { meal_name, items, total }
  const [barcodeResult, setBarcodeResult] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mealType, setMealType] = useState('Déjeuner')

  const resizeImage = (file, maxWidth = 800) => {
    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const reader = new FileReader()
      reader.onload = (e) => {
        img.onload = () => {
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const resized = canvas.toDataURL('image/jpeg', 0.8)
          resolve(resized)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  // --- Mode 1: Food photo via Anthropic Vision ---
  async function handleFoodPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setMealResult(null)
    try {
      const resizedDataUrl = await resizeImage(file)
      const base64 = resizedDataUrl.split(',')[1]
      const mediaType = 'image/jpeg'
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `Analyse ce repas et identifie chaque aliment visible.\nPour chaque aliment, estime la quantité en grammes et calcule les macronutriments.\nRéponds UNIQUEMENT en JSON valide, sans texte avant ou après, dans ce format exact:\n{\n  "meal_name": "nom du repas",\n  "items": [\n    {\n      "name": "nom aliment",\n      "grams": 150,\n      "kcal": 200,\n      "proteins": 20,\n      "carbs": 15,\n      "fats": 8\n    }\n  ],\n  "total": {\n    "kcal": 400,\n    "proteins": 35,\n    "carbs": 30,\n    "fats": 12\n  }\n}` }
            ]
          }]
        })
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const text = data.content[0].text
      const cleaned = text.replace(/```json|```/g, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON')
      const parsed = JSON.parse(jsonMatch[0])
      setMealResult(parsed)
      setSheetOpen(true)
    } catch {
      setError('Reconnaissance impossible. Réessaie avec une meilleure photo.')
    }
    setLoading(false)
  }

  // --- Mode 2: Barcode via Quagga ---
  async function handleBarcode(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setBarcodeResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof window.Quagga === 'undefined') {
        setError('Scanner non disponible.')
        setLoading(false)
        return
      }
      window.Quagga.decodeSingle({
        src: reader.result,
        numOfWorkers: 0,
        decoder: { readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader'] },
        locate: true,
      }, async (res) => {
        if (res?.codeResult?.code) {
          try {
            const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${res.codeResult.code}.json`)
            const data = await r.json()
            if (data.status === 1) {
              const p = data.product
              setBarcodeResult({
                name: p.product_name || 'Produit inconnu',
                brand: p.brands || '',
                kcal: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
                proteins: Math.round(p.nutriments?.proteins_100g || 0),
                carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
                fats: Math.round(p.nutriments?.fat_100g || 0),
                nutriscore: p.nutrition_grades?.toUpperCase() || '?',
              })
              setSheetOpen(true)
            } else {
              setError('Produit non trouvé.')
            }
          } catch {
            setError('Erreur de connexion.')
          }
        } else {
          setError('Code-barres non reconnu. Reprends la photo plus près.')
        }
        setLoading(false)
      })
    }
    reader.readAsDataURL(file)
  }

  function addMealItems() {
    if (!mealResult) return
    const t = mealResult.total
    const newMeal = {
      id: Date.now(),
      name: mealResult.meal_name,
      calories: t.kcal,
      protein: t.proteins,
      carbs: t.carbs,
      fat: t.fats,
      nutriscore: 'B',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
    updateData('meals', [...appData.meals, newMeal])
    updateData('calories', appData.calories + t.kcal)
    updateData('protein', (appData.protein || 0) + t.proteins)
    updateData('carbs', (appData.carbs || 0) + t.carbs)
    updateData('fat', (appData.fat || 0) + t.fats)
    setSheetOpen(false)
    navigate('/nutrition')
  }

  function addBarcodeItem() {
    if (!barcodeResult) return
    const newMeal = {
      id: Date.now(),
      name: barcodeResult.name,
      calories: barcodeResult.kcal,
      protein: barcodeResult.proteins,
      carbs: barcodeResult.carbs,
      fat: barcodeResult.fats,
      nutriscore: barcodeResult.nutriscore,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
    updateData('meals', [...appData.meals, newMeal])
    updateData('calories', appData.calories + barcodeResult.kcal)
    setSheetOpen(false)
    navigate('/nutrition')
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        {/* Header */}
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 12px', borderBottom: '1px solid var(--border)' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/nutrition')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="text-xl bold">Scanner</h1>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: 24 }}>
          {[
            { key: 'photo', label: '📷 Photo repas' },
            { key: 'barcode', label: '🔲 Code-barres' },
          ].map(t => (
            <button key={t.key} onClick={() => { setMode(t.key); setError(null) }} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, padding: '12px 0',
              color: mode === t.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: mode === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {mode === 'photo' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ width: '100%', padding: 24, background: 'var(--surface)', borderRadius: 16, border: '0.5px solid var(--border)', textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}>
                <rect x="3" y="6" width="18" height="14" rx="2"/>
                <circle cx="12" cy="13" r="3"/>
                <path d="M8 6V4h8v2"/>
              </svg>
              <p className="text-sm text-secondary" style={{ marginBottom: 20 }}>Prends une photo de ton repas. Claude va identifier chaque aliment et estimer les macros automatiquement.</p>
              <label htmlFor="food-photo" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', padding: '18px',
                background: loading ? 'var(--surface-2)' : 'var(--accent)',
                color: loading ? 'var(--text-muted)' : '#000',
                fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'Claude analyse ton repas...' : 'PRENDRE UNE PHOTO DU REPAS'}
              </label>
              <input id="food-photo" type="file" accept="image/*" capture="environment" onChange={handleFoodPhoto} style={{ display: 'none' }} disabled={loading} />
              {loading && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: `dotPulse 1.2s ${i*0.2}s ease-in-out infinite` }} />
                  ))}
                  <style>{`@keyframes dotPulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)} }`}</style>
                </div>
              )}
            </div>
            {error && <div style={{ width: '100%', padding: 16, background: 'rgba(255,59,59,0.1)', border: '0.5px solid var(--danger)', borderRadius: 12 }}><p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p></div>}
            <p className="text-xs text-muted" style={{ textAlign: 'center' }}>Analyse visuelle par Claude AI · Estimations approximatives</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ width: '100%', padding: 24, background: 'var(--surface)', borderRadius: 16, border: '0.5px solid var(--border)', textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}>
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 14v4h4v-4z" strokeLinejoin="round"/>
              </svg>
              <p className="text-sm text-secondary" style={{ marginBottom: 20 }}>Prends en photo un code-barres EAN pour identifier le produit automatiquement.</p>
              <label htmlFor="barcode-photo" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', padding: '18px',
                background: loading ? 'var(--surface-2)' : 'var(--accent)',
                color: loading ? 'var(--text-muted)' : '#000',
                fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
              }}>{loading ? 'Analyse en cours...' : 'SCANNER UN CODE-BARRES'}</label>
              <input id="barcode-photo" type="file" accept="image/*" capture="environment" onChange={handleBarcode} style={{ display: 'none' }} disabled={loading} />
            </div>
            {error && <div style={{ width: '100%', padding: 16, background: 'rgba(255,59,59,0.1)', border: '0.5px solid var(--danger)', borderRadius: 12 }}><p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p></div>}
            <p className="text-xs text-muted" style={{ textAlign: 'center' }}>Données via Open Food Facts · Base de données ouverte</p>
          </div>
        )}
      </div>

      {/* Overlay */}
      {sheetOpen && <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}

      {/* Meal photo result sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: `translateX(-50%) translateY(${sheetOpen && mealResult && mode === 'photo' ? '0' : '100%'})`,
        width: '100%', maxWidth: 390,
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        borderTop: '0.5px solid var(--border)', padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)', zIndex: 200,
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        {mealResult && (
          <>
            <h2 className="text-lg bold" style={{ marginBottom: 8 }}>{mealResult.meal_name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '12px', background: 'var(--surface-2)', borderRadius: 12, marginBottom: 16 }}>
              {[
                { label: 'kcal', val: mealResult.total?.kcal },
                { label: 'P', val: `${mealResult.total?.proteins}g` },
                { label: 'G', val: `${mealResult.total?.carbs}g` },
                { label: 'L', val: `${mealResult.total?.fats}g` },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div className="text-base bold">{m.val}</div>
                  <div className="text-xs text-muted">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="section-label">ALIMENTS DÉTECTÉS</div>
            {(mealResult.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div>
                  <div className="text-sm bold">{item.name}</div>
                  <div className="text-xs text-muted">{item.grams}g · P:{item.proteins}g G:{item.carbs}g L:{item.fats}g</div>
                </div>
                <span className="text-sm bold">{item.kcal} kcal</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, margin: '16px 0', overflowX: 'auto' }}>
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
            <button className="btn-accent" onClick={addMealItems}>AJOUTER TOUT AU REPAS</button>
          </>
        )}
      </div>

      {/* Barcode result sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: `translateX(-50%) translateY(${sheetOpen && barcodeResult && mode === 'barcode' ? '0' : '100%'})`,
        width: '100%', maxWidth: 390,
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        borderTop: '0.5px solid var(--border)', padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)', zIndex: 200,
      }}>
        {barcodeResult && (
          <>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="text-lg bold">{barcodeResult.name}</div>
                <div className="text-sm text-muted">{barcodeResult.brand}</div>
              </div>
              <NutriscoreBadge score={barcodeResult.nutriscore} />
            </div>
            <div className="text-2xl bold" style={{ marginBottom: 16 }}>{barcodeResult.kcal} <span className="text-sm text-muted">kcal/100g</span></div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              {[['P', barcodeResult.proteins], ['G', barcodeResult.carbs], ['L', barcodeResult.fats]].map(([l,v]) => (
                <div key={l}><div className="text-xs text-muted">{l}</div><div className="text-lg bold">{v}g</div></div>
              ))}
            </div>
            <button className="btn-accent" onClick={addBarcodeItem}>AJOUTER AU REPAS</button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
