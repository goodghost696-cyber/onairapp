import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isGymAccessActive, trialDaysLeft } from '../utils/billing'

// The missing "toutes les salles VOLTA" overview flagged in JOURNAL.md
// 2026-08-10 — until now, checking who signed up meant querying the
// database by hand. Plain client-side queries under RLS (same pattern
// CoachDashboard/ClientsList already use for their own gym): the new
// "Platform admins can view all gyms/profiles" policies do the scoping,
// this screen just reads and aggregates. Reachable only via
// user.isPlatformAdmin (App.jsx route guard) — a flag set by hand in SQL,
// never through any self-service flow.
export default function PlatformAdmin() {
  const navigate = useNavigate()
  const [gyms, setGyms] = useState(null)
  const [counts, setCounts] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('gyms').select('id, name, invite_code, created_at, subscription_status, trial_ends_at, current_period_end').order('created_at', { ascending: false }),
      supabase.from('profiles').select('gym_id, role').not('gym_id', 'is', null),
    ]).then(([gymsRes, profilesRes]) => {
      if (cancelled) return
      if (gymsRes.error) { setError(gymsRes.error.message); return }
      if (profilesRes.error) { setError(profilesRes.error.message); return }
      const byGym = {}
      for (const p of profilesRes.data || []) {
        if (!byGym[p.gym_id]) byGym[p.gym_id] = { members: 0, coaches: 0 }
        if (p.role === 'coach' || p.role === 'admin') byGym[p.gym_id].coaches++
        else byGym[p.gym_id].members++
      }
      setCounts(byGym)
      setGyms(gymsRes.data || [])
    }).catch(err => !cancelled && setError(err.message))
    return () => { cancelled = true }
  }, [])

  const statusLabel = (gym) => {
    if (gym.subscription_status === 'active') return { text: 'Actif', color: 'var(--success)' }
    if (gym.subscription_status === 'trialing') {
      return isGymAccessActive(gym)
        ? { text: `Essai — ${trialDaysLeft(gym)} j`, color: 'var(--text-secondary)' }
        : { text: 'Essai terminé', color: 'var(--danger)' }
    }
    if (gym.subscription_status === 'past_due') return { text: 'Paiement en échec', color: 'var(--danger)' }
    if (gym.subscription_status === 'canceled') return { text: 'Annulé', color: 'var(--danger)' }
    return { text: gym.subscription_status, color: 'var(--text-secondary)' }
  }

  const totals = gyms ? {
    gyms: gyms.length,
    members: Object.values(counts).reduce((s, c) => s + c.members, 0),
    coaches: Object.values(counts).reduce((s, c) => s + c.coaches, 0),
    active: gyms.filter(isGymAccessActive).length,
  } : null

  return (
    <div className="app-wrapper">
      <div style={{ padding: '80px 20px 100px', minHeight: '100dvh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, fontSize: 20, lineHeight: 1, fontFamily: 'inherit' }}>
            ←
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            Toutes les salles
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
          Vue d'ensemble plateforme — réservée à ton compte.
        </p>

        {error && <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

        {totals && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
            {[
              ['Salles', totals.gyms],
              ['Abonnements actifs', totals.active],
              ['Coachs', totals.coaches],
              ['Membres', totals.members],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--surface)', border: '2px solid var(--border-strong)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                <div style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {gyms === null && !error && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</div>}

        {gyms && gyms.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucune salle pour l'instant.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gyms?.map(gym => {
            const status = statusLabel(gym)
            const c = counts[gym.id] || { members: 0, coaches: 0 }
            return (
              <div key={gym.id} style={{ background: 'var(--surface)', border: '2px solid var(--border-strong)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{gym.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Créée le {new Date(gym.created_at).toLocaleDateString('fr-FR')} · code {gym.invite_code}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: status.color, whiteSpace: 'nowrap' }}>{status.text}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>{c.coaches} coach{c.coaches !== 1 ? 's' : ''}</span>
                  <span>{c.members} membre{c.members !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
