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
function setRealViewportHeight() {
  const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight
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
