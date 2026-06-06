import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const delay = reducedMotion ? 1500 : 2800
    const timer = setTimeout(() => navigate('/login'), delay)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0D0D0D',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div style={{
          fontSize: 80, fontWeight: 900, letterSpacing: 12,
          color: '#fff', textTransform: 'uppercase',
          animation: reducedMotion ? 'none' : 'splashFocusIn 900ms cubic-bezier(0.25,0.46,0.45,0.94) forwards',
          opacity: reducedMotion ? 1 : 0,
        }}>
          ON AIR
        </div>
        <div style={{
          height: 2, background: '#E8726A',
          animation: reducedMotion ? 'none' : 'splashUnderline 400ms ease-out 900ms both',
          width: reducedMotion ? '100%' : '0%',
        }} />
      </div>

      <div style={{
        fontSize: 11, color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase',
        marginTop: 16,
        animation: reducedMotion ? 'none' : 'splashSubFade 400ms ease-out 1000ms both',
        opacity: reducedMotion ? 1 : 0,
      }}>
        FITNESS · CLICHY
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes splashFocusIn {
            from { font-size: 120px; filter: blur(20px); opacity: 0; letter-spacing: 24px; }
            to   { font-size: 80px;  filter: blur(0);    opacity: 1; letter-spacing: 12px; }
          }
          @keyframes splashUnderline {
            from { width: 0%; }
            to   { width: 100%; }
          }
          @keyframes splashSubFade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>
  )
}
