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
// bottom, below the nav pill and everything else. That's almost certainly
// what a real device screenshot showed (a dark bar with the page's own
// coral still visible around it — not Safari UI, since it reproduced in
// the installed standalone app too, which has no browser chrome at all).
// Fix: stop trusting `dvh` at face value. Measure the actual viewport
// (visualViewport.height, which iOS keeps accurate in real time — it's
// the same API used to detect an on-screen keyboard) and write it to a
// CSS custom property that html/body/#root now size themselves against,
// with `dvh` kept only as the pre-JS fallback for the css var.
function setRealViewportHeight() {
  const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight
  document.documentElement.style.setProperty('--app-height', `${h}px`)
}
setRealViewportHeight()
window.addEventListener('resize', setRealViewportHeight)
window.addEventListener('orientationchange', setRealViewportHeight)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setRealViewportHeight)
}

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
