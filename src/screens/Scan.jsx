import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import NutriscoreBadge from '../components/NutriscoreBadge'
import BottomNav from '../components/BottomNav'

export default function Scan() {
  const navigate = useNavigate()
  const { updateData, appData } = useApp()
  const videoRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | scanning | loading | found | error | denied
  const [product, setProduct] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const codeReaderRef = useRef(null)

  useEffect(() => {
    startScanner()
    return () => { codeReaderRef.current?.reset?.() }
  }, [])

  async function startScanner() {
    try {
      const { BrowserMultiFormatReader } = window.ZXingBrowser
      const codeReader = new BrowserMultiFormatReader()
      codeReaderRef.current = codeReader
      setStatus('scanning')
      await codeReader.decodeFromVideoDevice(null, videoRef.current, async (result, err) => {
        if (result) {
          codeReader.reset()
          setStatus('loading')
          await lookupProduct(result.getText())
        }
      })
    } catch (e) {
      if (e?.name === 'NotAllowedError') setStatus('denied')
      else setStatus('error')
    }
  }

  async function lookupProduct(barcode) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json()
      if (data.status === 0) { setStatus('error'); return }
      const p = data.product
      setProduct({
        name: p.product_name || 'Produit inconnu',
        brand: p.brands || '',
        nutriscore: p.nutrition_grades?.toUpperCase() || '?',
        kcal: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
        proteins: Math.round(p.nutriments?.proteins_100g || 0),
        carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
        fats: Math.round(p.nutriments?.fat_100g || 0),
      })
      setStatus('found')
      setTimeout(() => setSheetOpen(true), 50)
    } catch {
      setStatus('error')
    }
  }

  function addToMeal() {
    if (!product) return
    const newMeal = {
      id: Date.now(),
      name: product.name,
      calories: product.kcal,
      protein: product.proteins,
      carbs: product.carbs,
      fat: product.fats,
      nutriscore: product.nutriscore,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
    updateData('meals', [...appData.meals, newMeal])
    updateData('calories', appData.calories + product.kcal)
    navigate('/nutrition')
  }

  function rescan() {
    setProduct(null)
    setStatus('idle')
    setSheetOpen(false)
    setTimeout(startScanner, 100)
  }

  return (
    <div className="app-wrapper">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => navigate('/nutrition')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-primary)">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: '28px' }}>Scanner</h1>
        </div>

        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          {status === 'denied' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'center' }}>Accès caméra requis</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} style={{ width: '100%', height: '300px', objectFit: 'cover' }} muted playsInline />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ position: 'relative', width: 200, height: 100 }}>
                  <div style={{ position: 'absolute', inset: 0, border: '1.5px solid var(--accent)', opacity: 0.6 }} />
                  {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
                    <div key={v+h} style={{
                      position: 'absolute',
                      [v]: -1, [h]: -1,
                      width: 16, height: 16,
                      borderTop: v === 'top' ? '3px solid var(--accent)' : 'none',
                      borderBottom: v === 'bottom' ? '3px solid var(--accent)' : 'none',
                      borderLeft: h === 'left' ? '3px solid var(--accent)' : 'none',
                      borderRight: h === 'right' ? '3px solid var(--accent)' : 'none',
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {status === 'scanning' ? 'Pointe vers un code-barres' : status === 'loading' ? 'Scan en cours...' : ''}
                </span>
              </div>
            </>
          )}

          {status === 'error' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'rgba(0,0,0,0.85)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Produit non trouvé</p>
              <button onClick={rescan} style={{ background: 'var(--accent)', color: '#000', border: 'none', padding: '12px 24px', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>Réessayer</button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {sheetOpen && <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}

      {/* Bottom Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: `translateX(-50%) translateY(${sheetOpen ? '0' : '100%'})`,
        width: '100%', maxWidth: 390,
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        borderTop: '0.5px solid var(--border)',
        padding: '24px 20px 40px',
        transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 200,
      }}>
        {product && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: '26px', marginBottom: 4 }}>{product.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{product.brand}</div>
              </div>
              <NutriscoreBadge score={product.nutriscore} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, fontVariantNumeric: 'tabular-nums' }}>{product.kcal} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>kcal/100g</span></div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              {[['P', product.proteins], ['G', product.carbs], ['L', product.fats]].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{val}g</div>
                </div>
              ))}
            </div>
            <button onClick={addToMeal} style={{ background: 'var(--accent)', color: '#000', border: 'none', width: '100%', padding: 16, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', marginBottom: 10 }}>AJOUTER AU REPAS</button>
            <button onClick={rescan} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', width: '100%', padding: 16, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>SCANNER À NOUVEAU</button>
          </>
        )}
      </div>
    </div>
  )
}
