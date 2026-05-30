import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'
import NutriscoreBadge from '../components/NutriscoreBadge'
import '../styles/nutrition.css'

export default function Nutrition() {
  const { appData } = useApp()

  return (
    <div className="app-wrapper">
      <div className="screen">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">NUTRITION</span>
          <span className="text-sm text-muted">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
            <div>
              <span className="text-2xl bold">{appData.calories}</span>
              <span className="text-sm text-muted"> / {appData.calorieGoal} kcal</span>
            </div>
            <span className="text-sm text-muted">{appData.calorieGoal - appData.calories} restantes</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${Math.min(appData.calories/appData.calorieGoal*100,100)}%` }} />
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
        {appData.meals.map(meal => (
          <div key={meal.id} className="card meal-card">
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
