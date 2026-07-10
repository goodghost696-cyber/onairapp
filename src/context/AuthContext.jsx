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
    // Safety timeout — if Supabase doesn't respond (missing env vars), unblock the app
    const timeout = setTimeout(() => setLoading(false), 3000)

    // Resolve the user from a session, replacing the metadata-derived role
    // with the real role from the profiles table (manually created accounts
    // don't have user_metadata.role set).
    async function applySession(session) {
      const u = sessionToUser(session)
      if (u) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', u.id)
            .single()
          if (error) {
            console.error('[Auth] applySession: profiles role lookup failed', error)
          } else if (data?.role) {
            u.role = data.role
          }
        } catch (err) {
          console.error('[Auth] applySession: profiles role lookup threw', err)
          // keep fallback role already set on u (metadata role, then 'member')
        }
      }
      setUser(u)
    }

    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      applySession(session).finally(() => setLoading(false))
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
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
    console.log('[Auth] register: calling supabase.auth.signUp', { email })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: firstName, role: 'member', ...extraMeta },
      },
    })
    console.log('[Auth] register: signUp response', { user: data?.user, session: data?.session, error })
    if (error) {
      console.error('[Auth] register: signUp failed', error)
      return { success: false, error: error.message }
    }

    // Insert profile row
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: data.user.id,
        prenom: firstName,
        email,
      }, { onConflict: 'user_id' })
      if (profileError) {
        console.error('[Auth] register: profiles upsert failed', profileError)
      } else {
        console.log('[Auth] register: profiles upsert succeeded', { user_id: data.user.id })
      }
    } else {
      console.error('[Auth] register: signUp returned no error but data.user is null — no profile row created')
    }

    const u = sessionToUser(data.session) || { id: data.user?.id, email, name: firstName, role: 'member' }
    console.log('[Auth] register: resolved user', u)
    return { success: true, user: u }
  }

  async function logout() {
    await supabase.auth.signOut()
    // Clear all onair localStorage keys
    Object.keys(localStorage).filter(k => k.startsWith('onair_')).forEach(k => localStorage.removeItem(k))
  }

  async function updateUserProfile(profile) {
    console.log('[Auth] updateUserProfile: calling supabase.auth.updateUser', profile)
    // Update Supabase user metadata
    const { data, error: updateUserError } = await supabase.auth.updateUser({ data: profile })
    if (updateUserError) {
      console.error('[Auth] updateUserProfile: auth.updateUser failed', updateUserError)
    }
    const updated = sessionToUser(data?.user ? { user: data.user } : null)
    if (updated) {
      setUser(prev => ({ ...prev, ...profile, ...updated }))
    } else {
      setUser(prev => ({ ...prev, ...profile }))
    }

    // Also upsert profiles table
    const userId = user?.id
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: userId,
        prenom: profile.name || profile.prenom,
        email: profile.email,
        poids: profile.weight ? parseFloat(profile.weight) : null,
        taille: profile.height ? parseFloat(profile.height) : null,
      }, { onConflict: 'user_id' })
      if (profileError) {
        console.error('[Auth] updateUserProfile: profiles upsert failed', profileError)
      }
      if (profile.calorieGoal) {
        const { error: objectifsError } = await supabase.from('objectifs').upsert({
          user_id: userId,
          calories_jour: profile.calorieGoal,
          proteines: profile.proteinGoal,
          glucides: profile.carbGoal,
          lipides: profile.fatGoal,
          eau_ml: 2500,
          pas_jour: 10000,
        }, { onConflict: 'user_id' })
        if (objectifsError) {
          console.error('[Auth] updateUserProfile: objectifs upsert failed', objectifsError)
        }
      }
    } else {
      console.error('[Auth] updateUserProfile: no authenticated user id — skipping profiles/objectifs upsert')
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
