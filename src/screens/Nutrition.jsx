import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'
import NutriscoreBadge from '../components/NutriscoreBadge'
import '../styles/nutrition.css'

export default function Nutrition() {
  const navigate = useNavigate()
  const { appData } = useApp()

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">NUTRITION</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="text-sm text-muted">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <button onClick={() => navigate('/scan')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent)"><path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M20 5h-6v6h6V5zm-6 8h1.5v1.5H14V13zm1.5 1.5H17V16h-1.5v-1.5zM17 13h1.5v1.5H17V13zm-3 3h1.5v1.5H14V16zm1.5 1.5H17V19h-1.5v-1.5zM17 16h1.5v1.5H17V16zm1.5-1.5H20V16h-1.5v-1.5zm0 3H20V19h-1.5v-1.5zM22 7h-2V4h-3V2h5v5zm0 15v-5h-2v3h-3v2h5zM2 22h5v-2H4v-3H2v5zM2 2v5h2V4h3V2H2z"/></svg>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>SCANNER</span>
            </button>
          </div>
        </div>

        <div className="card card-animated" style={{ marginBottom: 16, '--delay': '50ms' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
            <div>
              <span className="text-2xl bold">{appData.calories}</span>
              <span className="text-sm text-muted"> / {appData.calorieGoal} kcal</span>
            </div>
            <span className="text-sm text-muted">{appData.calorieGoal - appData.calories} restantes</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill macro-fill" style={{ '--w': `${Math.min(appData.calories/appData.calorieGoal*100,100)}%`, '--delay': '100ms' }} />
          </div>
          <div className="macro-row" style={{ marginTop: 16 }}>
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
        {appData.meals.map((meal, idx) => (
          <div key={meal.id} className="card meal-card card-animated" style={{ '--delay': `${100 + idx * 60}ms` }}>
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
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <span className="text-xs text-muted">P: {meal.protein}g</span>
              <span className="text-xs text-muted">G: {meal.carbs}g</span>
              <span className="text-xs text-muted">L: {meal.fat}g</span>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
