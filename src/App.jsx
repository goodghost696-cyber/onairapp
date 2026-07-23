import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './screens/Landing'
import Login from './screens/Login'
import ResetPassword from './screens/ResetPassword'
import Dashboard from './screens/Dashboard'
import Nutrition from './screens/Nutrition'
import Workout from './screens/Workout'
import Hydration from './screens/Hydration'
import Sleep from './screens/Sleep'
import Weekly from './screens/Weekly'
import AICoach from './screens/AICoach'
import Scan from './screens/Scan'
import CoachDashboard from './screens/CoachDashboard'
import MemberDetail from './screens/MemberDetail'
import WorkoutLibrary from './screens/WorkoutLibrary'
import WorkoutSession from './screens/WorkoutSession'
import WorkoutHistory from './screens/WorkoutHistory'
import ClientsList from './screens/ClientsList'
import Messages from './screens/Messages'
import Conversation from './screens/Conversation'
import CoachMessages from './screens/CoachMessages'
import Settings from './screens/Settings'
import CoachSettings from './screens/CoachSettings'
import Onboarding from './screens/Onboarding'
import MemberLayout from './layouts/MemberLayout'

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
    <Routes>
        <Route path="/onboarding" element={
          localStorage.getItem('onair_just_registered') && user && user.role === 'member' ? <Onboarding /> : <Navigate to="/login" replace />
        } />
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to={user.role === 'coach' || user.role === 'admin' ? '/coach' : '/dashboard'} replace /> : <Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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

        {/* Coach routes */}
        <Route path="/coach" element={<ProtectedRoute requiredRole="coach"><CoachDashboard /></ProtectedRoute>} />
        <Route path="/coach/member/:id" element={<ProtectedRoute requiredRole="coach"><MemberDetail /></ProtectedRoute>} />
        <Route path="/coach/clients" element={<ProtectedRoute requiredRole="coach"><ClientsList /></ProtectedRoute>} />
        <Route path="/coach/messages" element={<ProtectedRoute requiredRole="coach"><CoachMessages /></ProtectedRoute>} />
        <Route path="/coach/messages/:memberId" element={<ProtectedRoute requiredRole="coach"><Conversation isCoach /></ProtectedRoute>} />
        <Route path="/coach/settings" element={<ProtectedRoute requiredRole="coach"><CoachSettings /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}
