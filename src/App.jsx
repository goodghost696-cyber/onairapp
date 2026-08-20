import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
const Landing = lazy(() => import('./screens/Landing'))
const Login = lazy(() => import('./screens/Login'))
const CoachSignup = lazy(() => import('./screens/CoachSignup'))
const PlatformAdmin = lazy(() => import('./screens/PlatformAdmin'))
const ResetPassword = lazy(() => import('./screens/ResetPassword'))
const Dashboard = lazy(() => import('./screens/Dashboard'))
const Nutrition = lazy(() => import('./screens/Nutrition'))
const Workout = lazy(() => import('./screens/Workout'))
const Hydration = lazy(() => import('./screens/Hydration'))
const Weekly = lazy(() => import('./screens/Weekly'))
const AICoach = lazy(() => import('./screens/AICoach'))
const Scan = lazy(() => import('./screens/Scan'))
const CoachDashboard = lazy(() => import('./screens/CoachDashboard'))
const MemberDetail = lazy(() => import('./screens/MemberDetail'))
const CoachPrograms = lazy(() => import('./screens/CoachPrograms'))
const WorkoutLibrary = lazy(() => import('./screens/WorkoutLibrary'))
const WorkoutSession = lazy(() => import('./screens/WorkoutSession'))
const WorkoutHistory = lazy(() => import('./screens/WorkoutHistory'))
const ClientsList = lazy(() => import('./screens/ClientsList'))
const Messages = lazy(() => import('./screens/Messages'))
const Conversation = lazy(() => import('./screens/Conversation'))
const CoachMessages = lazy(() => import('./screens/CoachMessages'))
const Settings = lazy(() => import('./screens/Settings'))
const CoachSettings = lazy(() => import('./screens/CoachSettings'))
const Onboarding = lazy(() => import('./screens/Onboarding'))
const AppTour = lazy(() => import('./screens/AppTour'))
import MemberLayout from './layouts/MemberLayout'
import CoachLayout from './layouts/CoachLayout'
import PublicLayout from './layouts/PublicLayout'

// Fallback shown while a lazy-loaded screen chunk is fetched — crosses
// every route change in the app, member and coach alike, so it's the one
// loading state that's genuinely global rather than scoped to a single
// screen. Ring-spinner visual language kept (see .btn-spinner in
// Workout.css / .scan-loading-ring in global.css: border ring + accent
// top-border + the global `spin` keyframe from global.css), but recolored
// pastel chaud (2026-08-20, finitions oubliées du restyle, point 3) — was
// still on var(--border)/var(--accent) (tokens corail/or globaux) with no
// background of its own, meaning a flash of corail could show through
// between two crème screens on a slow chunk fetch. Explicit crème
// background + ink ring, same values as auth-redesign.css/manifest.json
// rather than the old global tokens.
function RouteLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#EFE7D9' }}>
      <div style={{
        width: 32,
        height: 32,
        border: '2px solid rgba(28,26,23,0.2)',
        borderTopColor: '#1C1A17',
        borderRadius: '50%',
        animation: 'spin 800ms linear infinite',
      }} />
    </div>
  )
}

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  // 'admin' bypasses the member/coach split so a single account can demo both spaces
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to={user.role === 'coach' ? '/coach' : '/dashboard'} replace />
  }
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return null
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
        {/* Landing/Login/ResetPassword/Onboarding/AppTour — the only 5
            routes that sit outside MemberLayout/CoachLayout, so they never
            got either shell's desktop-responsive #root treatment. Real
            screenshot showed Landing stuck at the mobile 480px cap with a
            huge black void on a wide screen — same class of bug the member
            side went through before member.css existed. */}
        <Route element={<PublicLayout />}>
          <Route path="/onboarding" element={
            localStorage.getItem('onair_just_registered') && user && user.role === 'member' ? <Onboarding /> : <Navigate to="/login" replace />
          } />
          {/* Same one-shot pattern as /onboarding above — reachable only right
              after Onboarding sets the flag, so it can't be replayed by
              revisiting the URL or seen by a member who never went through
              onboarding (e.g. one created directly by SQL). */}
          <Route path="/welcome" element={
            localStorage.getItem('onair_show_tour') && user && user.role === 'member' ? <AppTour /> : <Navigate to="/dashboard" replace />
          } />
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={user ? <Navigate to={user.role === 'coach' || user.role === 'admin' ? '/coach' : '/dashboard'} replace /> : <Login />} />
          {/* Self-service "créer ma salle" — same public-only guard as
              /login above (a logged-in user has no reason to be here). */}
          <Route path="/coach-signup" element={user ? <Navigate to={user.role === 'coach' || user.role === 'admin' ? '/coach' : '/dashboard'} replace /> : <CoachSignup />} />
          {/* Platform admin overview (all gyms) — gated on isPlatformAdmin,
              not role: it's a separate axis from coach/member/admin (see
              supabase_schema.sql, 2026-08-10), only ever true for Arnaud's
              own account, set by hand in SQL. Anyone else bounces to their
              normal home like every other guard in this file. */}
          <Route path="/admin" element={
            !user ? <Navigate to="/login" replace /> :
            user.isPlatformAdmin ? <PlatformAdmin /> :
            <Navigate to={user.role === 'coach' || user.role === 'admin' ? '/coach' : '/dashboard'} replace />
          } />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Member routes wrapped in MemberLayout (BottomNav + FAB) */}
        <Route element={<ProtectedRoute requiredRole="member"><MemberLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/workout/session" element={<WorkoutSession />} />
          <Route path="/workout/history/:id" element={<WorkoutHistory />} />
          <Route path="/workout/maison" element={<WorkoutLibrary section="maison" />} />
          <Route path="/workout/salle" element={<WorkoutLibrary section="salle" />} />
          <Route path="/workout/dehors" element={<WorkoutLibrary section="dehors" />} />
          <Route path="/hydration" element={<Hydration />} />
          <Route path="/weekly" element={<Weekly />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/coach" element={<Conversation />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Coach routes — wrapped in CoachLayout, which scopes the desktop-
            responsive rules in coach.css to this section only (see that
            file for why: a coach is much more likely than a member to work
            from a computer, so this side gets a real wide-screen layout
            instead of the same 390px mobile column as the rest of the app). */}
        <Route element={<ProtectedRoute requiredRole="coach"><CoachLayout /></ProtectedRoute>}>
          <Route path="/coach" element={<CoachDashboard />} />
          <Route path="/coach/member/:id" element={<MemberDetail />} />
          <Route path="/coach/programmes" element={<CoachPrograms />} />
          <Route path="/coach/clients" element={<ClientsList />} />
          <Route path="/coach/messages" element={<CoachMessages />} />
          <Route path="/coach/messages/:memberId" element={<Conversation isCoach />} />
          <Route path="/coach/settings" element={<CoachSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
