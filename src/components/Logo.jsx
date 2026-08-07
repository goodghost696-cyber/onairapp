import '../styles/brand.css'

// The VOLTA mark — zigzag ascending line + arrowhead terminal, gold on
// transparent. Single source of truth so every place the logo appears (nav,
// auth screens, PWA icon generation script, favicon) draws the exact same
// shape instead of hand-copied SVGs drifting apart over time.
// viewBox is "-1 -1 26 26", not "0 0 24 24" — the terminal's right edge
// sits past x=24, past a 24-wide viewBox, so it was getting clipped
// (reported as "la flèche est coupée"). The 1-unit padding on every side
// gives every shape in the mark room to breathe without moving a
// coordinate, so nothing needs re-touching pixel by pixel.
// The terminal was a filled square floating near the line's end — read as
// a stray blob, not part of the arrow ("la flèche est dégueulasse",
// reported directly, twice). Replaced with the standard trending-up
// arrowhead construction (same one Feather/Lucide's "trending-up" icon
// uses): a short two-segment chevron whose corner sits exactly on the main
// line's endpoint (23,6), so it reads as one continuous arrow tip instead
// of a separate shape stuck on afterward.
function Mark() {
  return (
    <svg viewBox="-1 -1 26 26" fill="none" stroke="#F0C14B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 18 8.5 10.5 13.5 15.5 23 6" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

// Three declinations of the brand, matching the "ICÔNE APP / LOCKUP
// PRINCIPAL / WORDMARK SEUL" reference:
//   - "icon"     — the mark alone (nav, favicon-sized spots)
//   - "wordmark" — "VOLTA" text alone, Unbounded extra-bold (headers that
//                   already show the mark elsewhere, e.g. next to a PWA icon)
//   - "lockup"   — mark + wordmark together (default). `orientation="column"`
//                   stacks them (splash/auth screens, matches the reference
//                   exactly); `orientation="row"` sits them side by side
//                   (page headers / hero titles that read left to right).
export default function Logo({ variant = 'lockup', orientation = 'column', size = 40, className = '', style }) {
  const icon = (
    <span className="brand-icon" style={{ width: size, height: size }}>
      <Mark />
    </span>
  )
  const word = (
    <span className="brand-wordmark" style={{ fontSize: Math.round(size * 0.42) }}>VOLTA</span>
  )

  if (variant === 'icon') return <span className={`brand-mark ${className}`} style={style}>{icon}</span>
  if (variant === 'wordmark') return <span className={`brand-mark ${className}`} style={style}>{word}</span>

  return (
    <span className={`brand-lockup brand-lockup-${orientation} ${className}`} style={style}>
      {icon}
      {word}
    </span>
  )
}
