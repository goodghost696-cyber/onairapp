import { useState, useEffect, useRef } from 'react'
import BottomNav from '../components/BottomNav'
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

const elevationBars = [20, 28, 35, 42, 38, 30, 25, 32, 40, 35, 28, 22]
const maxElev = Math.max(...elevationBars)

// Realistic street circuit path for Clichy
const CIRCUIT_PATH = "M 50 170 C 55 140, 65 110, 90 85 C 115 60, 150 48, 185 52 C 215 56, 240 72, 258 95 C 272 114, 278 138, 272 162 C 265 186, 248 202, 225 210 C 198 219, 168 218, 142 208 C 112 196, 85 196, 65 185 Z"

export default function Run() {
  const [running, setRunning] = useState(false)
  const [dotPos, setDotPos] = useState({ x: 50, y: 170 })
  const animRef = useRef(null)
  const startTime = useRef(null)

  useEffect(() => {
    const duration = 4000
    // Approximate ellipse for dot travel
    const cx = 161, cy = 131, rx = 118, ry = 83
    function animate(ts) {
      if (!startTime.current) startTime.current = ts
      const t = ((ts - startTime.current) % duration) / duration
      const angle = t * 2 * Math.PI - Math.PI / 2
      setDotPos({
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      })
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

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

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          {metrics1.map(m => (
            <div key={m.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{m.val}</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {metrics2.map(m => (
            <div key={m.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{m.val}</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 16,
          border: '0.5px solid var(--border)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4), inset 0 -1px 4px rgba(255,255,255,0.02)',
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)', pointerEvents: 'none', zIndex: 1 }} />
          <svg width="100%" viewBox="0 0 320 240" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1FD66B"/>
                <stop offset="45%" stopColor="#E00000"/>
                <stop offset="75%" stopColor="#F5A623"/>
                <stop offset="100%" stopColor="#E00000"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Grid */}
            {Array.from({ length: 17 }).map((_, i) => (
              <line key={`v${i}`} x1={i*20} y1={0} x2={i*20} y2={240} stroke="rgba(255,255,255,0.03)" strokeWidth={1}/>
            ))}
            {Array.from({ length: 13 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i*20} x2={320} y2={i*20} stroke="rgba(255,255,255,0.03)" strokeWidth={1}/>
            ))}

            {/* Terrain fill */}
            <path d={`${CIRCUIT_PATH}`} fill="rgba(224,0,0,0.05)" />

            {/* Shadow path */}
            <path d={CIRCUIT_PATH} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" transform="translate(2,3)" />

            {/* Main route */}
            <path d={CIRCUIT_PATH} fill="none" stroke="url(#routeGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

            {/* Distance markers */}
            <text x="185" y="46" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="600">1km</text>
            <text x="262" y="100" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="600">2km</text>
            <text x="255" y="175" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="600">3km</text>

            {/* Street names */}
            <text x="90" y="58" fill="rgba(255,255,255,0.20)" fontSize="8" transform="rotate(-10,90,58)">Rue H. Barbusse</text>
            <text x="195" y="220" fill="rgba(255,255,255,0.20)" fontSize="8">Bd Victor Hugo</text>
            <text x="55" y="145" fill="rgba(255,255,255,0.20)" fontSize="8" transform="rotate(-60,55,145)">Av. de Clichy</text>

            {/* Start marker */}
            <circle cx="50" cy="170" r="6" fill="var(--success)" />
            <circle cx="50" cy="170" r="3" fill="white" />

            {/* Animated dot with pulse */}
            <circle cx={dotPos.x} cy={dotPos.y} r="10" fill="rgba(224,0,0,0.25)" />
            <circle cx={dotPos.x} cy={dotPos.y} r="6" fill="rgba(224,0,0,0.5)" />
            <circle cx={dotPos.x} cy={dotPos.y} r="4" fill="var(--accent)" />

            {/* Corner label */}
            <text x="195" y="233" fill="rgba(255,255,255,0.15)" fontSize="8">Clichy · Simulation</text>
          </svg>
        </div>

        {/* Elevation profile */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
            <span className="text-xs text-muted">DÉNIVELÉ</span>
            <span className="text-xs text-accent">48m</span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 50 }}>
            {elevationBars.map((h, i) => {
              const pct = h / maxElev
              const r = Math.round(31 + (245-31)*pct)
              const g = Math.round(214 + (163-214)*pct)
              const b = Math.round(107 + (35-107)*pct)
              return (
                <div key={i} style={{ flex: 1, height: `${h}px`, background: `rgb(${r},${g},${b})`, borderRadius: '2px 2px 0 0', opacity: 0.85 }} />
              )
            })}
          </div>
        </div>

        {/* Pace chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="text-xs text-muted" style={{ marginBottom: 10 }}>ALLURE PAR KM</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 56 }}>
            {paceData.map((p, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${(p.pace/maxPace)*48}px`, background: i === 2 ? 'var(--accent)' : 'var(--surface-2)', borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.km}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => { setRunning(r => !r); navigator.vibrate && navigator.vibrate([50,30,50]) }} style={{
            width: 64, height: 64, borderRadius: '50%',
            background: running ? 'var(--danger)' : 'var(--success)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 20px ${running ? 'rgba(255,59,59,0.4)' : 'rgba(31,214,107,0.4)'}`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#000', textTransform: 'uppercase' }}>{running ? 'STOP' : 'START'}</span>
          </button>
          <span style={{ fontSize: 11, color: 'var(--success)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>GPS · Signal fort</span>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="text-xs text-muted" style={{ marginBottom: 6 }}>CETTE SEMAINE</div>
          <div className="text-sm text-secondary">32.6 km · 5 sorties · Avg 5:18/km</div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
