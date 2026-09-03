import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import './styles/global.css'
import './styles/animations.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// 100dvh, measured live instead of trusted blind — iOS WKWebView (both a
// Safari tab and, worse, a standalone home-screen PWA) has a documented
// timing bug where `dvh` doesn't always settle on the real, current
// visualViewport height: right after launch, or after a safe-area/layout
// recalculation, it can report a value shorter than the true screen. The
// shortfall isn't invisible — html's own background (#9C2A22, a dark
// brick-red — global.css's existing "safety net" for exactly this gap)
// shows through below body/#root, read as a solid dark band at the very
// bottom, below the nav pill and everything else.
// Fix: stop trusting `dvh` at face value. Measure the actual viewport
// (visualViewport.height) once at launch and write it to a CSS custom
// property that html/body/#root size themselves against, with `dvh` kept
// only as the pre-JS fallback for the css var.
//
// Deliberately NOT listening to `visualViewport`'s own `resize` event —
// that's the exact event that fires when the on-screen KEYBOARD opens
// (visualViewport.height shrinks to exclude it; `dvh` does not, by spec).
// Wiring it up made #root shrink under the keyboard while AICoach.jsx's
// own chat shell (a separate, self-contained height: 100dvh box, not
// using this variable) did not — #root, now shorter than its own child,
// had to scroll to reveal the focused input, dragging the sticky header
// up past the status bar (real screenshot: the clock overlapping the
// screen title, keyboard open). `resize`/`orientationchange` still cover
// genuine rotation/window changes; neither fires for the keyboard on iOS,
// which is exactly the distinction we want here.
//
// 2026-09-04 — the flip side of trusting the JS measurement turned out to
// be just as real as not trusting `dvh`: `visualViewport.height`/
// `innerHeight` have the EXACT SAME class of iOS timing bug described
// above (can report a value shorter than the true screen right after
// launch or a safe-area recalc) — and unlike `dvh`, which only mattered
// as a fallback before this file ran, this JS value is what html/body/
// #root are pinned to for the rest of the session (only re-measured on
// `resize`/`orientationchange`, not on every frame). Confirmed as the
// root cause of a real bug: `.bottom-nav` moved to `bottom: 0` (flush to
// the true screen edge, PR #174) to fix a different long-standing gap —
// which made THIS shortfall newly visible, since html/body/#root's own
// `overflow: hidden` now clips everything below the too-short measured
// height, including the nav's own fixed-position box, before it reaches
// the real edge (empirically confirmed with a debug border: the nav's
// own box visibly stopped short of the true screen edge). Diagnosed and
// documented in JOURNAL.md rather than re-explained in full here.
//
// Fix: never trust either source alone — take whichever of the two
// reports the LARGER height at the moment of measurement. `dvhPx()`
// reads the CSS engine's own current 100dvh in pixels via a hidden probe
// element (the same value html/body/#root would fall back to pre-JS),
// completely independent of `visualViewport`/`innerHeight`. The two
// sources have different failure timings, so they're very unlikely to
// both under-report by the same amount at the same instant — Math.max
// means a correct reading from either one is enough to avoid the clip,
// while a single wrong reading alone can no longer under-report.
//
// Verified safe against the keyboard bug this same function was written
// to avoid (see above): `dvh` does NOT shrink for the on-screen keyboard,
// by spec — so `dvhPx()` is never smaller than the correct "keyboard
// closed" height. Math.max(measured, dvh) can therefore only ever equal
// or exceed `dvh` — it can never report a height shorter than "keyboard
// closed", even in the hypothetical case this function got re-triggered
// while the keyboard was open (it isn't, today — `resize`/
// `orientationchange` don't fire for it). This fix cannot reintroduce
// the #root-shrinks-under-the-keyboard bug: it only ever pushes
// `--app-height` UP relative to the single-source version, never down.
let dvhProbe = null
function dvhPx() {
  if (!dvhProbe) {
    dvhProbe = document.createElement('div')
    // Zero footprint, no layout/paint impact on the real app — exists only
    // to ask the CSS engine "what is 100dvh right now", independent of any
    // JS viewport API.
    dvhProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100dvh;visibility:hidden;pointer-events:none;'
    document.body.appendChild(dvhProbe)
  }
  return dvhProbe.getBoundingClientRect().height
}
function setRealViewportHeight() {
  const measured = (window.visualViewport && window.visualViewport.height) || window.innerHeight
  const h = Math.max(measured, dvhPx())
  document.documentElement.style.setProperty('--app-height', `${h}px`)
}
setRealViewportHeight()
window.addEventListener('resize', setRealViewportHeight)
window.addEventListener('orientationchange', setRealViewportHeight)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
