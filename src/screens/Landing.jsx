import { useEffect } from 'react'
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
      <img
        src="/logo-onair.png"
        alt="ON AIR"
        style={{
          width: '280px',
          maxWidth: '80vw',
          mixBlendMode: 'screen',
          animation: reducedMotion ? 'none' : 'logoFadeIn 900ms cubic-bezier(0.25,0.46,0.45,0.94) forwards',
          opacity: reducedMotion ? 1 : 0,
        }}
      />

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes logoFadeIn {
            from { opacity: 0; transform: scale(0.92); }
            to   { opacity: 1; transform: scale(1); }
          }
        }
      `}</style>
    </div>
  )
}
