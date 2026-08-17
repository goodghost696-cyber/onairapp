import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CoachNav from '../components/CoachNav'
import { supabase, authHeader } from '../lib/supabase'
import { fetchMemberActivitySummaries, lastSeenLabel, fetchCoachRoster, consentLabel } from '../utils/coachStats'
import { fetchStreaksForUsers } from '../utils/streak'
import Icon from '../components/Icon'
import { activable } from '../utils/a11y'

const STATUS_COLORS = { 'ON TRACK': 'var(--success)', 'AT RISK': 'var(--warning)', 'INACTIVE': 'var(--danger)' }
// Keys match the exact values Onboarding.jsx's goal step writes to
// profiles.objectif — see STEPS[1].options there.
const GOAL_COLORS = {
  'Prise de masse': 'var(--accent)',
  'Perte de poids': 'var(--warning)',
  'Performance': 'var(--success)',
  'Nutrition': '#2EA8FF',
}
const FILTERS = ['TOUS', 'ON TRACK', 'AT RISK', 'INACTIVE']

export default function ClientsList() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('TOUS')
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  // Repéré en relisant l'app comme un coach qui vient de créer sa salle
  // (2026-08-10) : ce deuxième écran qu'il ouvre, juste après un accueil
  // "Créer ma salle" bien fait, était vide — pas de code d'invitation, pas
  // d'invitation à agir, pas de raison d'y croire. Récupéré ici (même
  // endpoint que CoachSettings) uniquement pour l'état vide ci-dessous.
  const [inviteCode, setInviteCode] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchMembers() {
      setLoading(true)
      // Roster complet (identité hors consentement) plutôt qu'un
      // `profiles.select('*')` : ce dernier est gaté par le consentement, un
      // membre qui refuse disparaissait donc entièrement de la liste — le
      // coach ne voyait même pas qu'il existait.
      const data = await fetchCoachRoster()
      if (cancelled) return
      if (!data.length) { setMembers([]); setLoading(false); return }
      // Same pattern as CoachDashboard.jsx — this screen was pulling only
      // profiles.* and never merging real activity, so every card silently
      // showed "Vu — · — séances" and the status filter chips never matched
      // anything (m.status was always undefined).
      // Statistiques demandées uniquement pour les membres qui partagent.
      // Les interroger pour les autres ne renverrait de toute façon rien
      // (RLS), mais surtout : leur attribuer un résumé vide produirait un
      // « Vu jamais · 0 séance » indistinguable d'un membre réellement
      // inactif. Un refus de partage n'est pas une absence d'activité.
      const sharingIds = data.filter(m => m.sharesData).map(m => m.user_id)
      const [summaries, streaks] = await Promise.all([
        fetchMemberActivitySummaries(sharingIds),
        fetchStreaksForUsers(sharingIds),
      ])
      if (cancelled) return
      setMembers(data.map(m => m.sharesData
        ? { ...m, ...summaries[m.user_id], streak: streaks[m.user_id] || 0 }
        : m))
      setLoading(false)
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  // Uniquement récupéré quand il sert vraiment (salle vide) — pas de coût
  // réseau supplémentaire pour un coach dont la liste est déjà peuplée.
  useEffect(() => {
    if (loading || members.length > 0 || inviteCode) return
    let cancelled = false
    authHeader().then(headers => fetch('/api/invite', { headers }).then(r => r.json()))
      .then(data => { if (!cancelled) setInviteCode(data.code || null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [loading, members.length, inviteCode])

  function copyCode() {
    if (!inviteCode) return
    navigator.clipboard?.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = members.filter(m => {
    const matchFilter = filter === 'TOUS' || m.status === filter
    const matchSearch = (m.prenom || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="app-wrapper">
      <div className="screen">
        <div className="screen-header" style={{ padding: '20px 0 8px' }}>
          <h1 className="text-xl bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="users" size={20} /> Mes Clients</h1>
          <span className="text-xs text-muted">{loading ? '...' : `${members.length} membres`}</span>
        </div>

        {/* .coach-toolbar caps this at a sane width on desktop — left
            unwrapped, the search input (width:100%) would stretch into a
            giant, mostly-empty text box on the wider shell. */}
        <div className="coach-toolbar" style={{ position: 'relative', marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..." style={{ paddingLeft: 40 }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {FILTERS.map(f => (
            <button key={f} className={`goal-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{f}</button>
          ))}
        </div>

        {loading && <p className="text-sm text-muted">Chargement des clients...</p>}

        {!loading && members.length === 0 && (
          <div className="card card-animated" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <p className="text-base bold" style={{ margin: '0 0 6px' }}>Ta salle est prête, personne ne l'a encore rejointe</p>
            <p className="text-sm text-muted" style={{ margin: '0 0 20px' }}>
              Partage ce code à tes premiers membres pour qu'ils s'inscrivent.
            </p>
            {inviteCode && (
              <>
                <div style={{
                  background: 'var(--surface-2)', border: '2px solid var(--accent)', borderRadius: 14,
                  padding: '16px', marginBottom: 14,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Code d'invitation
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {inviteCode}
                  </div>
                </div>
                <button className="btn-ghost" onClick={copyCode}>{copied ? '✓ Copié' : 'Copier le code'}</button>
              </>
            )}
          </div>
        )}

        {!loading && members.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted">Aucun client ne correspond à cette recherche.</p>
        )}

        <div className="coach-grid">
          {!loading && filtered.map((m, i) => (
            <div key={m.id} className="card card-animated" style={{ '--delay': `${i*40}ms`, cursor: 'pointer', marginBottom: 8 }} {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)', border: `1.5px solid ${STATUS_COLORS[m.status] || 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: STATUS_COLORS[m.status] || 'var(--text-muted)', flexShrink: 0 }}>
                  {m.prenom?.[0] || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 2 }}>
                    <span className="text-base bold">{m.prenom}</span>
                    {m.sharesData && (
                      <span className="status-badge" style={{ color: GOAL_COLORS[m.objectif] || 'var(--text-muted)' }}>{m.objectif || '-'}</span>
                    )}
                  </div>
                  {/* Deux rendus distincts, pas un même bloc avec des valeurs
                      vides : un membre qui ne partage pas doit se lire comme
                      « pas de données accessibles », jamais comme « membre à
                      zéro d'activité ». */}
                  {m.sharesData ? (
                    <>
                      <div className="text-xs text-muted">
                        Vu {lastSeenLabel(m.lastActiveDate).toLowerCase()} · {m.sessionsThisWeek ?? 0} séance{m.sessionsThisWeek > 1 ? 's' : ''}
                        {m.streak > 0 && (
                          <span style={{ color: m.streak >= 3 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: m.streak >= 3 ? 700 : 400 }}>
                            {' '}· 🔥 {m.streak}j
                          </span>
                        )}
                      </div>
                      <div className="progress-bar" style={{ marginTop: 6 }}>
                        <div className="progress-fill" style={{ width: `${Math.min((m.sessionsThisWeek || 0)/8*100,100)}%` }} />
                      </div>
                    </>
                  ) : (
                    <div className="consent-none">{consentLabel(m.consentState)}</div>
                  )}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
      <CoachNav />
    </div>
  )
}
