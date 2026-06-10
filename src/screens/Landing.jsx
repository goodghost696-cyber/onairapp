import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = reduced ? 1500 : 2800
    const timer = setTimeout(() => navigate('/login', { replace: true }), delay)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#0D0D0D',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <img
        src="/logo-onair.png"
        alt="ON AIR"
        style={{
          width: 280,
          maxWidth: '80vw',
          mixBlendMode: 'screen',
          animation: 'logoFadeIn 900ms cubic-bezier(0.25,0.46,0.45,0.94) forwards',
        }}
      />

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes logoFadeIn {
            from { opacity: 0; transform: scale(0.92); }
            to   { opacity: 1; transform: scale(1); }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes logoFadeIn {
            from { opacity: 1; transform: scale(1); }
            to   { opacity: 1; transform: scale(1); }
          }
        }
      `}</style>
    </div>
  )
}
