import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Derive a user shape from a Supabase session
function sessionToUser(session) {
  if (!session?.user) return null
  const meta = session.user.user_metadata || {}
  return {
    id: session.user.id,
    email: session.user.email,
    name: meta.name || meta.first_name || session.user.email.split('@')[0],
    role: meta.role || 'member',
    goal: meta.goal || null,
    calorieGoal: meta.calorieGoal || null,
    proteinGoal: meta.proteinGoal || null,
    carbGoal: meta.carbGoal || null,
    fatGoal: meta.fatGoal || null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(sessionToUser(session))
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(sessionToUser(session))
    })

    return () => subscription.unsubscribe()
  }, [])

  // Also keep onair_user in localStorage for AppContext / onboarding compatibility
  useEffect(() => {
    if (user) {
      localStorage.setItem('onair_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('onair_user')
    }
  }, [user])

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: error.message }
    const u = sessionToUser(data.session)
    return { success: true, user: u, role: u.role }
  }

  async function register(firstName, email, password, extraMeta = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: firstName, role: 'member', ...extraMeta },
      },
    })
    if (error) return { success: false, error: error.message }

    // Insert profile row
    if (data.user) {
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        prenom: firstName,
        email,
      })
    }

    const u = sessionToUser(data.session) || { id: data.user?.id, email, name: firstName, role: 'member' }
    return { success: true, user: u }
  }

  async function logout() {
    await supabase.auth.signOut()
    // Clear all onair localStorage keys
    Object.keys(localStorage).filter(k => k.startsWith('onair_')).forEach(k => localStorage.removeItem(k))
  }

  async function updateUserProfile(profile) {
    // Update Supabase user metadata
    const { data } = await supabase.auth.updateUser({ data: profile })
    const updated = sessionToUser(data?.user ? { user: data.user } : null)
    if (updated) {
      setUser(prev => ({ ...prev, ...profile, ...updated }))
    } else {
      setUser(prev => ({ ...prev, ...profile }))
    }

    // Also upsert profiles table
    const userId = user?.id
    if (userId) {
      await supabase.from('profiles').upsert({
        user_id: userId,
        prenom: profile.name || profile.prenom,
        email: profile.email,
        poids: profile.weight ? parseFloat(profile.weight) : null,
        taille: profile.height ? parseFloat(profile.height) : null,
      })
      if (profile.calorieGoal) {
        await supabase.from('objectifs').upsert({
          user_id: userId,
          calories_jour: profile.calorieGoal,
          proteines: profile.proteinGoal,
          glucides: profile.carbGoal,
          lipides: profile.fatGoal,
          eau_ml: 2500,
          pas_jour: 10000,
        })
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
