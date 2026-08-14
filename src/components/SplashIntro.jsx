import { useEffect, useRef, useState } from 'react'
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
      <span className={`splash-mark${drawing ? ' drawing' : ''}`}>
        <svg viewBox="-1 -1 26 26" fill="none" stroke="#F0C14B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 18 8.5 10.5 13.5 15.5 23 6" pathLength="1" />
          {/* Same fix as Logo.jsx's Mark() — a floating filled square read
              as a stray blob, not an arrowhead ("la flèche est toujours
              dégueulasse", reported again after the first pass only fixed
              the clipping, not the shape itself). Chevron polyline instead,
              corner on the main line's endpoint. */}
          <polyline className="arrowhead" points="17 6 23 6 23 12" />
        </svg>
      </span>
      <span className={`splash-word${wordVisible ? ' visible' : ''}`}>VOLTA</span>
    </div>
  )
}
