import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

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
  const { lang, setLanguage, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
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
          <h1 className="text-xl bold">{t('settings_title')}</h1>
        </div>

        <div className="section-label">{t('profile_section')}</div>
        <div className="card">
          <Field label={t('first_name')} value={profile.name} onChange={v => setProfile(p => ({...p, name: v}))} />
          <Field label={t('email')} value={profile.email} onChange={v => setProfile(p => ({...p, email: v}))} type="email" />
          <Field label={t('weight')} value={profile.weight} onChange={v => setProfile(p => ({...p, weight: v}))} type="number" />
          <Field label={t('height')} value={profile.height} onChange={v => setProfile(p => ({...p, height: v}))} type="number" />
        </div>

        <div className="section-label">{t('goals_section')}</div>
        <div className="card">
          <Field label={t('calories_day')} value={goals.calories} onChange={v => setGoals(g => ({...g, calories: v}))} type="number" />
          <Field label={t('proteins')} value={goals.protein} onChange={v => setGoals(g => ({...g, protein: v}))} type="number" />
          <Field label={t('water_goal')} value={goals.water} onChange={v => setGoals(g => ({...g, water: v}))} type="number" />
          <Field label={t('steps_goal')} value={goals.steps} onChange={v => setGoals(g => ({...g, steps: v}))} type="number" />
        </div>
        <button className="btn-ghost" onClick={saveGoals} style={{ marginBottom: 8 }}>{t('save_goals')}</button>

        <div className="section-label">{t('notifications_section')}</div>
        <div className="card">
          {[
            { key: 'hydration', label: t('hydration_reminder') },
            { key: 'session', label: t('workout_reminder') },
            { key: 'weekly', label: t('weekly_recap_notif') },
          ].map(n => (
            <div key={n.key} className="flex justify-between items-center" style={{ padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span className="text-sm text-secondary">{n.label}</span>
              <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({...p, [n.key]: !p[n.key]}))} />
            </div>
          ))}
        </div>

        <div className="section-label">Apparence</div>
        <div className="card">
          <div className="flex justify-between items-center" style={{ padding: '14px 0' }}>
            <div>
              <p className="text-sm text-secondary">Thème</p>
              <p className="text-xs text-muted">{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</p>
            </div>
            <Toggle on={theme === 'light'} onToggle={toggleTheme} />
          </div>
        </div>

        <div className="section-label">{t('language_section')}</div>
        <div className="lang-selector">
          {[
            { code: 'fr', label: 'Français', flag: '🇫🇷' },
            { code: 'en', label: 'English', flag: '🇬🇧' },
            { code: 'es', label: 'Español', flag: '🇪🇸' },
          ].map(l => (
            <button
              key={l.code}
              className={`lang-btn${lang === l.code ? ' active' : ''}`}
              onClick={() => setLanguage(l.code)}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        <div className="section-label">{t('account_section')}</div>
        <button onClick={() => { logout(); navigate('/') }} style={{ width: '100%', padding: 16, background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 12, cursor: 'pointer', marginBottom: 16 }}>
          {t('logout')}
        </button>
      </div>

    </div>
  )
}
