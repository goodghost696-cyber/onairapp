import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'

const paceData = [
  { km: '1', pace: '5:45' },
  { km: '2', pace: '5:30' },
  { km: '3', pace: '5:12' },
  { km: '4', pace: '5:20' },
  { km: '5', pace: '5:08' },
  { km: '6', pace: '5:15' },
  { km: '7', pace: '5:05' },
]
function paceToSec(p) { const [m, s] = p.split(':').map(Number); return m * 60 + s }
const maxPaceSec = Math.max(...paceData.map(p => paceToSec(p.pace)))
const bestPaceSec = Math.min(...paceData.map(p => paceToSec(p.pace)))
const bestPaceDisplay = `${Math.floor(bestPaceSec / 60)}:${String(bestPaceSec % 60).padStart(2, '0')}/km`

export default function RunContent() {
  const { t } = useLanguage()
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [distance, setDistance] = useState(0)
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`
        )
        const data = await res.json()
        const code = data.current_weather?.weathercode
        const temp = Math.round(data.current_weather?.temperature)
        const windspeed = Math.round(data.current_weather?.windspeed)
        const getCondition = (c) => {
          if (c === 0) return { label: 'Ciel dégagé', emoji: '☀️', good: true }
          if (c <= 3)  return { label: 'Partiellement nuageux', emoji: '⛅', good: true }
          if (c <= 48) return { label: 'Brumeux', emoji: '🌫️', good: true }
          if (c <= 67) return { label: 'Pluie', emoji: '🌧️', good: false }
          if (c <= 77) return { label: 'Neige', emoji: '❄️', good: false }
          return { label: 'Orageux', emoji: '⛈️', good: false }
        }
        setWeather({ temp, windspeed, ...getCondition(code) })
      } catch {}
    }, () => {})
  }, [])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setSeconds(s => s + 1)
      setDistance(d => Math.round((d + 0.0032) * 10000) / 10000)
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const pace = distance > 0.05
    ? `${Math.floor(seconds / 60 / distance)}:${String(Math.round((seconds / distance) % 60)).padStart(2,'0')}`
    : '--:--'

  const displayDist = running || seconds > 0 ? distance.toFixed(2) : '5.24'
  const displayTime = running || seconds > 0 ? formatTime(seconds) : '27:18'
  const displayPace = running || seconds > 0 ? pace : '5:12'

  const metrics = [
    { label: t('pace'),       val: `${displayPace} /km` },
    { label: t('duration'),   val: displayTime },
    { label: t('heart_rate'), val: '142 bpm' },
  ]

  return (
    <>
      {weather && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          borderRadius: 16, marginBottom: 16,
          background: weather.good ? 'rgba(31,214,107,0.08)' : 'rgba(232,114,106,0.08)',
          border: `0.5px solid ${weather.good ? 'rgba(31,214,107,0.3)' : 'rgba(232,114,106,0.3)'}`,
        }}>
          <span style={{ fontSize: 24 }}>{weather.emoji}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{weather.temp}°C · {weather.label}</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {weather.good ? '✓ Bonnes conditions pour courir' : '⚠ Conditions difficiles'}
            </p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{weather.windspeed} km/h</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {metrics.map(m => (
          <div key={m.label} className="card" style={{ textAlign: 'center', padding: '14px 6px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{m.val}</div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <span className="text-xs text-muted">{t('pace_per_km')}</span>
          <span className="text-xs text-accent">Meilleure allure : {bestPaceDisplay}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 48 }}>
          {paceData.map((p, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: '100%', height: `${(paceToSec(p.pace)/maxPaceSec)*42}px`, background: i === 6 ? 'var(--accent)' : 'var(--surface-2)', borderRadius: '3px 3px 0 0' }} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.km}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => { setRunning(r => !r); if (!running) { setSeconds(0); setDistance(0) }; navigator.vibrate && navigator.vibrate([50,30,50]) }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: running ? 'var(--danger)' : 'var(--success)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 20px ${running ? 'rgba(255,59,59,0.4)' : 'rgba(31,214,107,0.4)'}`,
          }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#000', textTransform: 'uppercase' }}>
            {running ? t('stop') : t('start')}
          </span>
        </button>
        <span style={{ fontSize: 11, color: 'var(--success)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('gps_strong')}</span>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="text-xs text-muted" style={{ marginBottom: 6 }}>{t('this_week')}</div>
        <div className="text-sm text-secondary">32.6 km · 5 sorties · Avg 5:18/km</div>
      </div>
    </>
  )
}
