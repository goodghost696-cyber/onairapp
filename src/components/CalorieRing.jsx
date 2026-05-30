import { useCountUp } from '../hooks/useCountUp'

export default function CalorieRing({ current, goal, size = 140 }) {
  const animated = useCountUp(current)
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(current / goal, 1)
  const offset = circumference - pct * circumference

  // Generate 48 tick marks
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const angle = (i / 48) * 360
    const rad = (angle - 90) * Math.PI / 180
    const isMajor = i % 12 === 0
    const tickLen = isMajor ? 7 : 4
    const outer = size / 2
    const inner = outer - tickLen
    return {
      x1: outer + Math.cos(rad) * outer,
      y1: outer + Math.sin(rad) * outer,
      x2: outer + Math.cos(rad) * inner,
      y2: outer + Math.sin(rad) * inner,
    }
  })

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="rgba(255,255,255,0.2)" strokeWidth={i % 12 === 0 ? 1.5 : 1} />
        ))}
        {/* Background arc */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="var(--border)" strokeWidth={5}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${size/2}px ${size/2}px` }} />
        {/* Progress arc */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="var(--accent)" strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: `${size/2}px ${size/2}px`,
            transition: 'stroke-dashoffset 1000ms cubic-bezier(0.25,0.46,0.45,0.94)',
            filter: 'drop-shadow(0 0 10px rgba(224,0,0,0.6))',
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{animated.toLocaleString()}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>kcal</span>
      </div>
    </div>
  )
}
