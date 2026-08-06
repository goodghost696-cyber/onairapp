import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import OnboardingTour from '../components/OnboardingTour'
import '../styles/coach.css'

// Scopes the desktop-responsive rules in coach.css to the /coach/* routes
// only, without touching the member side's mobile-first layout at all —
// #root is otherwise capped at 390px everywhere (global.css), which is
// correct for the member app but cramped for a coach working from a
// computer. Same "toggle a class while mounted, restore on unmount" trick
// already used to force Landing's dark theme regardless of the saved
// preference.
export default function CoachLayout() {
  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('coach-shell')
    return () => root?.classList.remove('coach-shell')
  }, [])

  return (
    <>
      <Outlet />
      <OnboardingTour variant="coach" />
    </>
  )
}
