import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './screens/Landing'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import Nutrition from './screens/Nutrition'
import Workout from './screens/Workout'
import Run from './screens/Run'
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
import Rings from './screens/Rings'
import ClientsList from './screens/ClientsList'
import Messages from './screens/Messages'
import Conversation from './screens/Conversation'
import CoachMessages from './screens/CoachMessages'
import Settings from './screens/Settings'
import CoachSettings from './screens/CoachSettings'

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'coach' ? '/coach' : '/dashboard'} replace />
  }
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to={user.role === 'coach' ? '/coach' : '/dashboard'} replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="member"><Dashboard /></ProtectedRoute>} />
      <Route path="/nutrition" element={<ProtectedRoute requiredRole="member"><Nutrition /></ProtectedRoute>} />
      <Route path="/workout" element={<ProtectedRoute requiredRole="member"><Workout /></ProtectedRoute>} />
      <Route path="/run" element={<ProtectedRoute requiredRole="member"><Run /></ProtectedRoute>} />
      <Route path="/hydration" element={<ProtectedRoute requiredRole="member"><Hydration /></ProtectedRoute>} />
      <Route path="/sleep" element={<ProtectedRoute requiredRole="member"><Sleep /></ProtectedRoute>} />
      <Route path="/weekly" element={<ProtectedRoute requiredRole="member"><Weekly /></ProtectedRoute>} />
      <Route path="/ai-coach" element={<ProtectedRoute requiredRole="member"><AICoach /></ProtectedRoute>} />
      <Route path="/scan" element={<ProtectedRoute requiredRole="member"><Scan /></ProtectedRoute>} />
      <Route path="/rings" element={<ProtectedRoute requiredRole="member"><Rings /></ProtectedRoute>} />
      <Route path="/workout/session" element={<ProtectedRoute requiredRole="member"><WorkoutSession /></ProtectedRoute>} />
      <Route path="/workout/history/:id" element={<ProtectedRoute requiredRole="member"><WorkoutHistory /></ProtectedRoute>} />
      <Route path="/workout/maison" element={<ProtectedRoute requiredRole="member"><WorkoutLibrary section="maison" /></ProtectedRoute>} />
      <Route path="/workout/salle" element={<ProtectedRoute requiredRole="member"><WorkoutLibrary section="salle" /></ProtectedRoute>} />
      <Route path="/workout/dehors" element={<ProtectedRoute requiredRole="member"><WorkoutLibrary section="dehors" /></ProtectedRoute>} />
      <Route path="/coach" element={<ProtectedRoute requiredRole="coach"><CoachDashboard /></ProtectedRoute>} />
      <Route path="/coach/member/:id" element={<ProtectedRoute requiredRole="coach"><MemberDetail /></ProtectedRoute>} />
      <Route path="/coach/clients" element={<ProtectedRoute requiredRole="coach"><ClientsList /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute requiredRole="member"><Messages /></ProtectedRoute>} />
      <Route path="/messages/coach" element={<ProtectedRoute requiredRole="member"><Conversation /></ProtectedRoute>} />
      <Route path="/coach/messages" element={<ProtectedRoute requiredRole="coach"><CoachMessages /></ProtectedRoute>} />
      <Route path="/coach/messages/:memberId" element={<ProtectedRoute requiredRole="coach"><Conversation isCoach /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requiredRole="member"><Settings /></ProtectedRoute>} />
      <Route path="/coach/settings" element={<ProtectedRoute requiredRole="coach"><CoachSettings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
