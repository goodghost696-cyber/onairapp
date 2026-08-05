import { useCountUp } from '../hooks/useCountUp'

export default function CalorieRing({ current, goal, size = 180 }) {
  const animated = useCountUp(current)
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(current / goal, 1)
  const offset = circumference - pct * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 180 180">
        <defs>
          <filter id="rglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="2.5"/>
        {/* Progress arc */}
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          filter="url(#rglow)"
          style={{ transition: 'stroke-dashoffset 1000ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-2.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{animated.toLocaleString()}</span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>KCAL</span>
      </div>
    </div>
  )
}
