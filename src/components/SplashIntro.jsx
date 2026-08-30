import { useEffect, useId, useRef, useState } from 'react'
import '../styles/splash.css'
import '../styles/splash-redesign.css'

// Intro animation shown once per visit to Landing (not gated behind
// localStorage — replays every time someone lands on "/", per what was
// asked: "quand on entre sur l'app"). Sequence: the VOLTA wordmark fades
// in first, then the mark's arrow traces itself in above it, then the
// whole overlay fades away to reveal the real Landing content underneath
// (already mounted/rendering the whole time — this is just an opaque
// layer on top of it). Tap/click anywhere skips straight to the end.
export default function SplashIntro({ onDone }) {
  const [wordVisible, setWordVisible] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [fading, setFading] = useState(false)
  const timers = useRef([])
  const done = useRef(false)
  // Mark rendu ici ET dans <Logo> (Landing.jsx monte les deux à la fois
  // tant que le splash est affiché) — id de dégradé unique par instance,
  // pas une chaîne fixe, pour ne jamais collisionner avec celui de <Logo>
  // dans le même document. Voir Logo.jsx pour le même besoin.
  const gradId = useId()

  function finish() {
    if (done.current) return
    done.current = true
    timers.current.forEach(clearTimeout)
    setFading(true)
    // Matches the overlay's own fade-out transition (splash.css) — unmount
    // only after it's visually gone, not before, so there's no flash cut.
    setTimeout(() => onDone?.(), 420)
  }

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      // Skip the choreography entirely, just hold briefly on the finished
      // mark so it doesn't feel like a broken flash, then move on.
      setWordVisible(true)
      setDrawing(true)
      timers.current.push(setTimeout(finish, 400))
      return () => timers.current.forEach(clearTimeout)
    }

    // Deliberately slow — "présence et autorité" was the ask, not a quick
    // flash. Word settles first, a beat of stillness, then the arrow draws
    // itself in over a long, decelerating stroke (timings mirrored in
    // splash.css's transition durations/delays — keep both in sync).
    timers.current.push(setTimeout(() => setWordVisible(true), 200))
    timers.current.push(setTimeout(() => setDrawing(true), 1000))
    timers.current.push(setTimeout(finish, 3200))
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`splash-overlay splash-redesign${fading ? ' fading' : ''}`} onClick={finish} role="presentation">
      {/* V-éclair (2026-08-30, remplace l'ancienne flèche zigzag stroke-only
          — mêmes 2 <path> que Logo.jsx/public/volta-mark.svg, extraits du
          groupe "VOLTA emblem" de public/logo-volta.svg). Le tracé au
          stroke-dasharray de l'ancien mark ne s'applique pas à des formes
          pleines (fill, pas de stroke) : l'effet "dessin qui se trace" est
          donc adapté en révélation par clip-path plutôt que retenté sur un
          stroke qui n'existe plus — voir splash.css pour le détail et le
          changement de comportement (déjà signalé). */}
      <span className={`splash-mark${drawing ? ' drawing' : ''}`}>
        <svg viewBox="-200 -10 435 455">
          <defs>
            <linearGradient id={`volta-mark-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4F24A" />
              <stop offset="48%" stopColor="#D8C8E8" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
          <path d="M-190 0 L-80 0 L55 235 L-8 340 Z" fill={`url(#volta-mark-${gradId})`} />
          <path d="M110 0 L225 0 L108 168 L174 168 L-8 435 L38 287 L-52 287 L72 112 L30 112 Z" fill="#A78BFA" />
        </svg>
      </span>
      <span className={`splash-word${wordVisible ? ' visible' : ''}`}>VOLTA</span>
    </div>
  )
}
