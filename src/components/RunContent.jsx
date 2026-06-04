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

const CIRCUIT_PATH = "M 40,180 L 40,60 L 120,60 L 120,30 L 260,30 L 260,80 L 300,80 L 300,180 L 220,180 L 220,140 L 100,140 L 100,180 Z"

export default function RunContent() {
  const { t } = useLanguage()
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [distance, setDistance] = useState(0)

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

      <div style={{ height: 160, background: 'transparent', borderRadius: 16, border: '0.5px solid var(--border)', overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
        <svg width="100%" viewBox="0 0 340 220" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="routeGradRun" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1FD66B"/>
              <stop offset="40%" stopColor="#E00000"/>
              <stop offset="70%" stopColor="#F5A623"/>
              <stop offset="100%" stopColor="#E00000"/>
            </linearGradient>
          </defs>
          {Array.from({length:18}).map((_,i) => <line key={`v${i}`} x1={i*20} y1={0} x2={i*20} y2={220} stroke="rgba(255,255,255,0.03)" strokeWidth={1}/>)}
          {Array.from({length:12}).map((_,i) => <line key={`h${i}`} x1={0} y1={i*20} x2={340} y2={i*20} stroke="rgba(255,255,255,0.03)" strokeWidth={1}/>)}
          <path id="circuit-path-rc" d={CIRCUIT_PATH} style={{ display: 'none' }} />
          <path d={CIRCUIT_PATH} fill="rgba(224,0,0,0.04)" stroke="rgba(0,0,0,0.4)" strokeWidth={5} />
          <path d={CIRCUIT_PATH} fill="none" stroke="url(#routeGradRun)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="40" cy="180" r="6" fill="var(--success)" />
          <circle cx="40" cy="180" r="3" fill="white" />
          <circle r="6" fill="var(--accent)">
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
              <mpath href="#circuit-path-rc"/>
            </animateMotion>
          </circle>
          <circle r="10" fill="rgba(224,0,0,0.2)">
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
              <mpath href="#circuit-path-rc"/>
            </animateMotion>
          </circle>
        </svg>
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
