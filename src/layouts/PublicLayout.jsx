import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import '../styles/public.css'

// Landing / Login / Reset password / Onboarding / AppTour — the 5 routes
// in App.jsx that sit outside both MemberLayout and CoachLayout, so they
// never got either shell's desktop-responsive treatment. #root stayed
// capped at its mobile 480px on every screen size, which is exactly what a
// real wide-screen screenshot showed on Landing: a narrow column floating
// in a huge black void. Same "toggle a class while mounted" mechanism as
// the other two layouts.
export default function PublicLayout() {
  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('public-shell')
    return () => root?.classList.remove('public-shell')
  }, [])

  return <Outlet />
}
