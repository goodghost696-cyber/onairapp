import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, authHeader } from '../lib/supabase'

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
async function resolveRole(u, sessionUser) {
  if (!u) return u
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, gym_id, is_platform_admin')
      .eq('user_id', u.id)
      .maybeSingle()
    if (error) {
      console.error('[Auth] resolveRole: profiles role lookup failed', error)
    } else if (data) {
      u.role = data.role
      u.gymId = data.gym_id
      // Cross-gym platform-superadmin flag (billing/overview, 2026-08-10) —
      // independent of role, see supabase_schema.sql. Only ever true for
      // Arnaud's own account, set by hand in SQL.
      u.isPlatformAdmin = data.is_platform_admin
    } else {
      console.error('[Auth] resolveRole: no profile row for', u.id, '— self-healing one now')
      // No gym_id here — this rare self-heal path has no invite code to
      // resolve one from (unlike register(), which threads it through
      // from api/invite.js). A self-healed profile lands with
      // gym_id null, meaning it fails CLOSED under the same-gym coach RLS
      // policies (invisible to any coach) rather than leaking into the
      // wrong gym — safe direction to fail in, but still a real gap to
      // notice: if this ever fires for a real user, gym_id needs fixing
      // by hand afterwards (same as this account's original healing on
      // 2026-08-05, done manually).
      const { error: healError } = await supabase.from('profiles').upsert({
        user_id: u.id,
        prenom: u.name,
        email: u.email,
      }, { onConflict: 'user_id' })
      if (healError) console.error('[Auth] resolveRole: self-heal profile upsert failed', healError)

      // Confirm email support (2026-08-12) — finishes the create-gym/join-
      // gym step that register()/CoachSignup.jsx couldn't run at signUp()
      // time because no session existed yet (data.session is null until
      // the confirmation link is clicked). That info was stashed in
      // user_metadata precisely so it could be replayed here, the first
      // time a real session exists for this account. authHeader() below
      // now has a valid token to work with. Dead code today — while
      // Confirm email is off, data.session always exists right out of
      // signUp(), so the profile row above is never missing and this
      // branch never runs for a fresh signup.
      const meta = sessionUser?.user_metadata || {}
      if (u.role === 'coach' && meta.gymName) {
        try {
          const res = await fetch('/api/create-gym', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
            body: JSON.stringify({ gymName: meta.gymName, firstName: meta.firstName || u.name }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            console.error('[Auth] resolveRole: deferred create-gym failed', body.error || res.status)
          }
        } catch (err) {
          console.error('[Auth] resolveRole: deferred create-gym threw', err)
        }
      } else if (u.role !== 'coach' && meta.inviteCode) {
        try {
          const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
            body: JSON.stringify({ code: meta.inviteCode }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            console.error('[Auth] resolveRole: deferred complete-signup (gym join) failed', body.error || res.status)
          }
        } catch (err) {
          console.error('[Auth] resolveRole: deferred complete-signup (gym join) threw', err)
        }
      }
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
      const u = await resolveRole(sessionToUser(session), session?.user)
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
    const u = await resolveRole(sessionToUser(data.session), data.session?.user)
    return { success: true, user: u, role: u.role }
  }

  // `inviteCode` is the raw code the user typed (Login.jsx), not a gym_id —
  // as of 2026-08-10 (suite 90) gym_id is never trusted from the client
  // anywhere. This function's own profile upsert below deliberately never
  // sets gym_id (a BEFORE INSERT trigger would null it out even if it
  // tried to, see supabase_schema.sql); api/invite.js's complete-signup
  // path re-validates the code server-side and sets gym_id itself, right
  // after this signUp() succeeds — closing the gap where a raw REST insert
  // could previously self-declare membership in an arbitrary gym.
  //
  // Optional param so any other caller of register() that hasn't been
  // updated yet doesn't break — no code just means the member won't be
  // visible to any coach's same-gym RLS policies until fixed by hand,
  // which is loud/obviously-broken rather than a silent leak.
  async function register(firstName, email, password, extraMeta = {}, inviteCode = null) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // inviteCode also stashed in user_metadata (not just threaded through
      // the profile upsert/api call below) so it can still be read and
      // replayed later — see resolveRole()'s self-heal path — if
      // Confirm email is active and no session exists yet at this point.
      options: {
        data: { name: firstName, role: 'member', inviteCode, ...extraMeta },
      },
    })
    if (error) {
      console.error('[Auth] register: signUp failed', error)
      return { success: false, error: error.message }
    }

    // Confirm email active: data.session is null until the confirmation
    // link is clicked — no authenticated context yet, so neither the
    // profile upsert nor /api/invite below (both RLS-gated on auth.uid())
    // would succeed. Deferred to resolveRole()'s self-heal path, which runs
    // once a real session exists for this account (right after the coach/
    // member clicks the email link and logs in). Dead code today — while
    // Confirm email is off, data.session always exists right out of
    // signUp(), so this branch never runs.
    if (!data.session) {
      return { success: true, needsConfirmation: true, user: { email, name: firstName } }
    }

    // Insert profile row — gym_id is never included here on purpose (see
    // above), only what a member is genuinely allowed to set about
    // themselves.
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: data.user.id,
        prenom: firstName,
        email,
      }, { onConflict: 'user_id' })
      if (profileError) {
        console.error('[Auth] register: profiles upsert failed', profileError)
      }

      if (inviteCode) {
        try {
          const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
            body: JSON.stringify({ code: inviteCode }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            console.error('[Auth] register: complete-signup (gym join) failed', body.error || res.status)
          }
        } catch (err) {
          console.error('[Auth] register: complete-signup (gym join) threw', err)
        }
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

  // Bug réel signalé par Arnaud (2026-08-11) : déconnexion côté membre,
  // puis clic sur "Accès coach" (Landing → /login) renvoyait directement
  // dans l'espace membre au lieu du formulaire de connexion. Root cause :
  // cette fonction ne mettait jamais `user` à null elle-même — elle
  // dépendait entièrement du listener onAuthStateChange (déclenché par
  // supabase.auth.signOut()) pour le faire, et les 3 boutons "se
  // déconnecter" de l'app appelaient logout() sans l'attendre avant de
  // naviguer. Selon le timing exact de la notification interne du SDK,
  // `user` pouvait donc être encore peuplé au moment où la garde de route
  // de App.jsx réévaluait /login. Corrigé à deux niveaux : les 3 boutons
  // attendent maintenant logout() (Settings.jsx/CoachSettings.jsx/
  // CoachDashboard.jsx), et cette fonction vide `user` elle-même,
  // explicitement et synchrone à son retour, plutôt que de dépendre
  // uniquement du timing du listener (qui continuera de le refaire aussi,
  // sans effet — idempotent).
  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
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
