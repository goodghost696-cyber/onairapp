import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import NutriscoreBadge from '../components/NutriscoreBadge'
import BottomNav from '../components/BottomNav'

export default function Scan() {
  const navigate = useNavigate()
  const { appData, updateData } = useApp()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  async function handleCapture(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof window.Quagga === 'undefined') {
        setError('Scanner non disponible. Réessaie.')
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
              setResult({
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
              setError('Produit non trouvé dans la base de données.')
            }
          } catch {
            setError('Erreur de connexion. Réessaie.')
          }
        } else {
          setError('Code-barres non reconnu. Reprends la photo plus près.')
        }
        setLoading(false)
      })
    }
    reader.readAsDataURL(file)
  }

  function addToMeal() {
    if (!result) return
    const newMeal = {
      id: Date.now(),
      name: result.name,
      calories: result.kcal,
      protein: result.proteins,
      carbs: result.carbs,
      fat: result.fats,
      nutriscore: result.nutriscore,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
    updateData('meals', [...appData.meals, newMeal])
    updateData('calories', appData.calories + result.kcal)
    navigate('/nutrition')
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 12px', borderBottom: '1px solid var(--border)' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/nutrition')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="text-xl bold">Scanner</h1>
        </div>

        <div style={{ paddingTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: '100%', padding: 24, background: 'var(--surface)',
            borderRadius: 16, border: '0.5px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 14v4h4v-4z" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm text-secondary">Prends en photo un code-barres pour identifier l'aliment automatiquement</p>
            <label htmlFor="camera-input" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '18px',
              background: loading ? 'var(--surface-2)' : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : '#000',
              fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
              borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'ANALYSE EN COURS...' : 'PRENDRE EN PHOTO'}
            </label>
            <input id="camera-input" type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: 'none' }} disabled={loading} />
          </div>

          {error && (
            <div style={{ width: '100%', padding: 16, background: 'rgba(255,59,59,0.1)', border: '0.5px solid var(--danger)', borderRadius: 12 }}>
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
              <label htmlFor="camera-input" style={{ display: 'block', marginTop: 12, color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase' }}>
                RÉESSAYER
              </label>
            </div>
          )}

          <p className="text-xs text-muted" style={{ textAlign: 'center' }}>Données via Open Food Facts · Base de données ouverte</p>
        </div>
      </div>

      {sheetOpen && <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: `translateX(-50%) translateY(${sheetOpen && result ? '0' : '100%'})`,
        width: '100%', maxWidth: 390,
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        borderTop: '0.5px solid var(--border)', padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)', zIndex: 200,
      }}>
        {result && (
          <>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="text-lg bold" style={{ marginBottom: 2 }}>{result.name}</div>
                <div className="text-sm text-muted">{result.brand}</div>
              </div>
              <NutriscoreBadge score={result.nutriscore} />
            </div>
            <div className="text-2xl bold" style={{ marginBottom: 16 }}>{result.kcal} <span className="text-sm text-muted">kcal/100g</span></div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              {[['P', result.proteins], ['G', result.carbs], ['L', result.fats]].map(([l, v]) => (
                <div key={l}><div className="text-xs text-muted">{l}</div><div className="text-lg bold">{v}g</div></div>
              ))}
            </div>
            <button className="btn-accent" onClick={addToMeal} style={{ marginBottom: 10 }}>AJOUTER AU REPAS</button>
            <label htmlFor="camera-input" style={{ display: 'block', width: '100%', padding: 16, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>
              SCANNER À NOUVEAU
            </label>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
