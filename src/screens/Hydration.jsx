import { useState } from 'react'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'

export default function Hydration() {
  const { appData, updateData } = useApp()
  const pct = Math.min(appData.water / appData.waterGoal * 100, 100)
  const [filledKey, setFilledKey] = useState(null)

  function addWater(ml) {
    updateData('water', Math.min(appData.water + ml, appData.waterGoal))
    setFilledKey(ml)
    setTimeout(() => setFilledKey(null), 300)
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">HYDRATATION</span>
        </div>

        <div className="card card-animated" style={{ textAlign: 'center', padding: 40, '--delay': '50ms' }}>
          <div className="text-2xl bold" style={{ fontSize: 48, lineHeight: 1 }}>{appData.water}</div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>ML / {appData.waterGoal}ML</div>
          <div className="progress-bar" style={{ height: 8, marginTop: 24 }}>
            <div className="progress-fill success macro-fill" style={{ '--w': `${pct}%`, '--delay': '100ms' }} />
          </div>
          <div className="text-sm text-muted" style={{ marginTop: 12 }}>{Math.round(pct)}% de l'objectif</div>
        </div>

        <div className="section-label">AJOUTER</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[150, 250, 330, 500].map(ml => (
            <button
              key={ml}
              className={`btn-ghost cup${filledKey === ml ? ' just-filled' : ''}`}
              onClick={() => addWater(ml)}
            >
              + {ml}ml
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
