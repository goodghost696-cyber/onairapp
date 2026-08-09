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
    // Was never mapped — frequency has no column of its own in `profiles`
    // (only prenom/email/poids/taille/age/objectif are grantable, see
    // supabase_schema.sql), so auth user_metadata is the only place it's
    // ever persisted. Needed so Settings.jsx can recalculate calorie
    // targets when a member redefines their objectif, the same formula
    // Onboarding.jsx used, without asking them to re-answer this step.
    frequency: meta.frequency || null,
  }
}

// Replaces the metadata-derived role on a user object with the real role
// from the profiles table (manually created / role-promoted accounts don't
// have user_metadata.role set — e.g. coach/admin accounts set via SQL).
//
// Also self-heals a missing profile row: register() below inserts one
// right after signUp(), but that's two separate awaited calls — if the
// connection drops or the tab/app closes between them (very plausible on a
// phone right after hitting "S'inscrire"), the auth account exists with no
// profile at all, forever, with nothing to ever retry it. Hit for real on
// 2026-08-05 (one member invisible to her coach, no name, nothing — fixed
// by hand in the database once, this makes sure it self-repairs from here
// on instead of needing another manual fix).
async function resolveRole(u) {
  if (!u) return u
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', u.id)
      .maybeSingle()
    if (error) {
      console.error('[Auth] resolveRole: profiles role lookup failed', error)
    } else if (data) {
      u.role = data.role
    } else {
      console.error('[Auth] resolveRole: no profile row for', u.id, '— self-healing one now')
      const { error: healError } = await supabase.from('profiles').upsert({
        user_id: u.id,
        prenom: u.name,
        email: u.email,
      }, { onConflict: 'user_id' })
      if (healError) console.error('[Auth] resolveRole: self-heal profile upsert failed', healError)
    }
  } catch (err) {
    console.error('[Auth] resolveRole: profiles role lookup threw', err)
    // keep fallback role already set on u (metadata role, then 'member')
  }
  return u
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Safety timeout — if Supabase doesn't respond (missing env vars), unblock the app
    const timeout = setTimeout(() => setLoading(false), 3000)

    async function applySession(session) {
      const u = await resolveRole(sessionToUser(session))
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
    const u = await resolveRole(sessionToUser(data.session))
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
      }
    } else {
      console.error('[Auth] register: signUp returned no error but data.user is null — no profile row created')
    }

    const u = sessionToUser(data.session) || { id: data.user?.id, email, name: firstName, role: 'member' }
    return { success: true, user: u }
  }

  async function sendPasswordResetEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async function logout() {
    await supabase.auth.signOut()
    // Clear all onair localStorage keys
    Object.keys(localStorage).filter(k => k.startsWith('onair_')).forEach(k => localStorage.removeItem(k))
  }

  async function updateUserProfile(profile) {
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
        // Omitted (not null) when absent — e.g. Settings.jsx's profile
        // save doesn't collect age, and upsert only touches columns
        // actually present in the payload, so this never wipes a real
        // age already saved from Onboarding.
        ...(profile.age ? { age: parseInt(profile.age, 10) } : {}),
        // Was only ever written to user_metadata (line above) — never
        // persisted here, so ClientsList.jsx's coach-facing goal badge
        // had nothing real to read and always showed "-".
        objectif: profile.goal || undefined,
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
          // Was `profile.waterGoal ?? 2500` — any caller not passing
          // waterGoal/stepsGoal (which is every caller now: eau/pas are
          // set directly from their Dashboard card via AppContext's
          // updateGoal, Settings.jsx no longer touches them) would silently
          // reset them back to the onboarding defaults on every unrelated
          // save (e.g. just editing calories). Only included when actually
          // provided now — same pattern already used for `age` above.
          ...(profile.waterGoal != null ? { eau_ml: profile.waterGoal } : {}),
          ...(profile.stepsGoal != null ? { pas_jour: profile.stepsGoal } : {}),
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
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUserProfile, sendPasswordResetEmail, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
