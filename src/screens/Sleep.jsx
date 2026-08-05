import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { fetchWeeklyStats } from '../utils/weeklyStats'

export default function Sleep() {
  const navigate = useNavigate()
  const { appData } = useApp()
  const { user } = useAuth()
  const [sleepData, setSleepData] = useState([])
  const maxH = 10

  useEffect(() => {
    if (!user?.id) return
    fetchWeeklyStats(user.id).then(({ sleepData }) => setSleepData(sleepData))
  }, [user?.id])

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-xs bold" style={{ color: 'var(--accent-secondary)' }}>😴 SOMMEIL</span>
        </div>

        <div className="card card-animated" style={{ textAlign: 'center', padding: 32, '--delay': '50ms' }}>
          <div className="text-2xl bold" style={{ fontSize: 48, lineHeight: 1 }}>
            {appData.sleep.hours}h{String(appData.sleep.minutes).padStart(2,'0')}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>CETTE NUIT</div>
          <div className="text-sm text-muted" style={{ marginTop: 12 }}>{appData.sleep.quality}</div>
        </div>

        <div className="section-label">CETTE SEMAINE</div>
        <div className="card card-animated" style={{ '--delay': '150ms' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {sleepData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: `${d.hours / maxH * 100}%`,
                  background: d.hours > 7 ? 'var(--success)' : d.hours > 5 ? 'var(--warning)' : d.hours > 0 ? 'var(--danger)' : 'var(--border)',
                  minHeight: d.hours > 0 ? 4 : 2,
                  borderRadius: 2,
                }} />
                <span className="text-xs text-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
