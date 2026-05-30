import { useState, useEffect, useRef } from 'react'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'
import { useCountUp } from '../hooks/useCountUp'

const paceData = [
  { km: '1', pace: 5.75, label: '5:45' },
  { km: '2', pace: 5.50, label: '5:30' },
  { km: '3', pace: 5.20, label: '5:12' },
  { km: '4', pace: 5.33, label: '5:20' },
  { km: '5', pace: 5.13, label: '5:08' },
  { km: '6', pace: 5.25, label: '5:15' },
  { km: '7', pace: 5.08, label: '5:05' },
]
const maxPace = Math.max(...paceData.map(p => p.pace))

// SVG path for a realistic running circuit
const CIRCUIT_PATH = "M 40 160 C 60 120, 80 80, 120 60 C 160 40, 200 50, 240 70 C 270 85, 285 110, 280 145 C 275 175, 255 195, 225 205 C 190 215, 155 210, 125 195 C 90 178, 60 195, 40 180 Z"

export default function Run() {
  const { appData } = useApp()
  const [running, setRunning] = useState(false)
  const [dotProgress, setDotProgress] = useState(0)
  const animRef = useRef(null)
  const animatedKm = useCountUp(appData.kmRun * 100) / 100

  useEffect(() => {
    let start = null
    const duration = 3000
    function animate(ts) {
      if (!start) start = ts
      const p = ((ts - start) % duration) / duration
      setDotProgress(p)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  function getPointOnPath(progress) {
    // Approximate point along the circuit path
    const t = progress
    // Use a simple ellipse approximation for the dot position
    const cx = 160, cy = 130, rx = 125, ry = 85
    const angle = t * 2 * Math.PI - Math.PI / 2
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    }
  }

  const dotPos = getPointOnPath(dotProgress)

  const metrics1 = [
    { label: 'DISTANCE', val: '5.24 km' },
    { label: 'PACE', val: '5:12 /km' },
    { label: 'DURÉE', val: '27:18' },
  ]
  const metrics2 = [
    { label: 'DÉNIVELÉ', val: '48 m' },
    { label: 'FREQ. CARD.', val: '142 bpm' },
    { label: 'CALORIES', val: '487' },
  ]

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ padding: '20px 0 8px' }}>
          <span className="text-xs text-accent bold">RUN</span>
        </div>

        {/* Hero metrics row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginBottom: 1 }}>
          {metrics1.map(m => (
            <div key={m.label} className="card" style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{m.val}</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Hero metrics row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginBottom: 16 }}>
          {metrics2.map(m => (
            <div key={m.label} className="card" style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{m.val}</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Circuit map */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
          <svg width="100%" viewBox="0 0 320 220" style={{ display: 'block' }}>
            {/* Grid */}
            {Array.from({ length: 16 }).map((_, i) => (
              <line key={`v${i}`} x1={i*20} y1={0} x2={i*20} y2={220} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i*20} x2={320} y2={i*20} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            ))}

            {/* Route shadow/glow */}
            <path d={CIRCUIT_PATH} fill="none" stroke="rgba(224,0,0,0.2)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            {/* Route */}
            <path d={CIRCUIT_PATH} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

            {/* Distance markers */}
            <text x="120" y="52" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="600">1km</text>
            <text x="245" y="75" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="600">2km</text>
            <text x="272" y="155" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="600">3km</text>

            {/* Start marker */}
            <circle cx="40" cy="160" r="6" fill="var(--success)" />
            <circle cx="40" cy="160" r="3" fill="white" />

            {/* Animated dot */}
            <circle cx={dotPos.x} cy={dotPos.y} r="7" fill="rgba(224,0,0,0.3)" />
            <circle cx={dotPos.x} cy={dotPos.y} r="5" fill="var(--accent)" />

            {/* Corner label */}
            <text x="200" y="213" fill="rgba(255,255,255,0.2)" fontSize="9">Clichy · Simulation</text>
          </svg>
        </div>

        {/* Pace chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="text-xs text-muted" style={{ marginBottom: 12 }}>ALLURE PAR KM</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
            {paceData.map((p, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: `${(p.pace / maxPace) * 52}px`,
                  background: i === 2 ? 'var(--accent)' : 'var(--surface-2)',
                  borderRadius: 4,
                  transition: 'height 600ms ease',
                }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.km}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STOP/START button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => {
              setRunning(r => !r)
              navigator.vibrate && navigator.vibrate([50, 30, 50])
            }}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: running ? 'var(--danger)' : 'var(--success)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 20px ${running ? 'rgba(255,59,59,0.4)' : 'rgba(31,214,107,0.4)'}`,
              transition: 'all 200ms ease',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#000' }}>
              {running ? 'STOP' : 'START'}
            </span>
          </button>
          <span style={{ fontSize: 11, color: 'var(--success)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>GPS · Signal fort</span>
        </div>

        {/* Weekly summary */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="text-xs text-muted" style={{ marginBottom: 8 }}>CETTE SEMAINE</div>
          <div className="text-sm text-secondary">32.6 km · 5 sorties · Avg 5:18/km</div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
