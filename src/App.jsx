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
import Rings from './screens/Rings'

function ProtectedRoute({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
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
      <Route path="/dashboard" element={<ProtectedRoute role="member"><Dashboard /></ProtectedRoute>} />
      <Route path="/nutrition" element={<ProtectedRoute role="member"><Nutrition /></ProtectedRoute>} />
      <Route path="/workout" element={<ProtectedRoute role="member"><Workout /></ProtectedRoute>} />
      <Route path="/run" element={<ProtectedRoute role="member"><Run /></ProtectedRoute>} />
      <Route path="/hydration" element={<ProtectedRoute role="member"><Hydration /></ProtectedRoute>} />
      <Route path="/sleep" element={<ProtectedRoute role="member"><Sleep /></ProtectedRoute>} />
      <Route path="/weekly" element={<ProtectedRoute role="member"><Weekly /></ProtectedRoute>} />
      <Route path="/ai-coach" element={<ProtectedRoute role="member"><AICoach /></ProtectedRoute>} />
      <Route path="/scan" element={<ProtectedRoute role="member"><Scan /></ProtectedRoute>} />
      <Route path="/coach" element={<ProtectedRoute role="coach"><CoachDashboard /></ProtectedRoute>} />
      <Route path="/coach/member/:id" element={<ProtectedRoute role="coach"><MemberDetail /></ProtectedRoute>} />
      <Route path="/workout/maison" element={<ProtectedRoute role="member"><WorkoutLibrary section="maison" /></ProtectedRoute>} />
      <Route path="/workout/salle" element={<ProtectedRoute role="member"><WorkoutLibrary section="salle" /></ProtectedRoute>} />
      <Route path="/workout/dehors" element={<ProtectedRoute role="member"><WorkoutLibrary section="dehors" /></ProtectedRoute>} />
      <Route path="/rings" element={<ProtectedRoute role="member"><Rings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
