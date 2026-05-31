import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, background: on ? 'var(--accent)' : 'var(--border)', borderRadius: 13, position: 'relative', cursor: 'pointer', transition: 'background 200ms ease', flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: 20, height: 20, background: 'white', borderRadius: '50%', top: 3, left: 3, transform: on ? 'translateX(18px)' : 'none', transition: 'transform 200ms ease' }} />
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
      <span className="text-sm text-secondary">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 15, textAlign: 'right', width: 140, outline: 'none', fontFamily: 'inherit' }} />
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { appData, updateData } = useApp()
  const [notifs, setNotifs] = useState({ hydration: true, session: true, weekly: true })

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', weight: '78', height: '180' })
  const [goals, setGoals] = useState({ calories: String(appData.calorieGoal), protein: String(appData.proteinGoal), water: String(appData.waterGoal), steps: String(appData.stepsGoal) })

  function saveGoals() {
    updateData('calorieGoal', parseInt(goals.calories) || appData.calorieGoal)
    updateData('proteinGoal', parseInt(goals.protein) || appData.proteinGoal)
    updateData('waterGoal', parseInt(goals.water) || appData.waterGoal)
    updateData('stepsGoal', parseInt(goals.steps) || appData.stepsGoal)
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 12px' }}>
          <h1 className="text-xl bold">Paramètres</h1>
        </div>

        <div className="section-label">PROFIL</div>
        <div className="card">
          <Field label="Prénom" value={profile.name} onChange={v => setProfile(p => ({...p, name: v}))} />
          <Field label="Email" value={profile.email} onChange={v => setProfile(p => ({...p, email: v}))} type="email" />
          <Field label="Poids (kg)" value={profile.weight} onChange={v => setProfile(p => ({...p, weight: v}))} type="number" />
          <Field label="Taille (cm)" value={profile.height} onChange={v => setProfile(p => ({...p, height: v}))} type="number" />
        </div>

        <div className="section-label">OBJECTIFS</div>
        <div className="card">
          <Field label="Calories/jour" value={goals.calories} onChange={v => setGoals(g => ({...g, calories: v}))} type="number" />
          <Field label="Protéines (g)" value={goals.protein} onChange={v => setGoals(g => ({...g, protein: v}))} type="number" />
          <Field label="Eau (ml)" value={goals.water} onChange={v => setGoals(g => ({...g, water: v}))} type="number" />
          <Field label="Pas/jour" value={goals.steps} onChange={v => setGoals(g => ({...g, steps: v}))} type="number" />
        </div>
        <button className="btn-ghost" onClick={saveGoals} style={{ marginBottom: 8 }}>ENREGISTRER LES OBJECTIFS</button>

        <div className="section-label">NOTIFICATIONS</div>
        <div className="card">
          {[
            { key: 'hydration', label: 'Rappel hydratation' },
            { key: 'session', label: 'Rappel séance' },
            { key: 'weekly', label: 'Bilan hebdo' },
          ].map(n => (
            <div key={n.key} className="flex justify-between items-center" style={{ padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span className="text-sm text-secondary">{n.label}</span>
              <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({...p, [n.key]: !p[n.key]}))} />
            </div>
          ))}
        </div>

        <div className="section-label">COMPTE</div>
        <button onClick={() => { logout(); navigate('/') }} style={{ width: '100%', padding: 16, background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 12, cursor: 'pointer', marginBottom: 16 }}>
          SE DÉCONNECTER
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
