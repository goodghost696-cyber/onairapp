import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CoachNavBar from '../components/CoachNavBar'
import { supabase, authHeader } from '../lib/supabase'
import { fetchMemberActivitySummaries, lastSeenLabel, fetchCoachRoster, consentLabel } from '../utils/coachStats'
import { fetchStreaksForUsers } from '../utils/streak'
import Icon from '../components/Icon'
import { activable } from '../utils/a11y'
import '../styles/ClientsList-redesign.css'

const STATUS_CLASS = { 'ON TRACK': 'status-on-track', 'AT RISK': 'status-at-risk', 'INACTIVE': 'status-inactive' }
// Keys match the exact values Onboarding.jsx's goal step writes to
// profiles.objectif — see STEPS[1].options there.
const GOAL_COLORS = {
  'Prise de masse': 'var(--cl-olive-ink)',
  'Perte de poids': 'var(--cl-magenta)',
  'Performance': 'var(--cl-lavender-ink)',
  'Nutrition': 'var(--cl-olive-ink)',
}
// Variante sombre de GOAL_COLORS ci-dessus, posée en custom property
// plutôt qu'en `color` inline direct : GOAL_COLORS garde exactement les
// mêmes valeurs en clair (aucun changement), une règle sombre dédiée
// (ClientsList-redesign.css) lit --cl-goal-dark à la place. Les teintes
// -ink (olive-ink/lavender-ink) sont conçues pour contraster sur LEUR
// PROPRE accent clair, pas en texte autoportant sur la carte qui, elle,
// fonce en sombre — sans ça, "Prise de masse"/"Nutrition"/"Performance"
// deviendraient peu lisibles. Basculées sur l'accent plein correspondant.
// "Perte de poids" (magenta) reste inchangé : assez lumineux pour rester
// lisible sur la carte sombre, contrairement aux teintes -ink.
const GOAL_COLORS_DARK = {
  'Prise de masse': 'var(--cl-olive)',
  'Perte de poids': 'var(--cl-magenta)',
  'Performance': 'var(--cl-lavender)',
  'Nutrition': 'var(--cl-olive)',
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

  // Même raison que CoachDashboard-redesign.css : évite que le rubber-band
  // iOS au-delà des limites du wrapper ne retombe sur le dégradé corail
  // partagé de <body>.
  useEffect(() => {
    document.body.classList.add('clientslist-body-bg')
    return () => document.body.classList.remove('clientslist-body-bg')
  }, [])

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
    <div className="app-wrapper clientslist-redesign">
      <div className="clientslist-screen">
        <div className="cl-topbar">
          <h1 className="cl-title"><Icon name="users" size={19} /> Mes Clients</h1>
          <span className="cl-count">{loading ? '...' : `${members.length} membres`}</span>
        </div>

        <div className="cl-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..." />
        </div>

        <div className="cl-filters">
          {FILTERS.map(f => (
            <button key={f} className={`cl-filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        {loading && <p className="cl-loading">Chargement des clients...</p>}

        {!loading && members.length === 0 && (
          <div className="cl-empty-card">
            <p className="cl-empty-title">Ta salle est prête, personne ne l'a encore rejointe</p>
            <p className="cl-empty-sub">Partage ce code à tes premiers membres pour qu'ils s'inscrivent.</p>
            {inviteCode && (
              <>
                <div className="cl-invite-box">
                  <div className="cl-invite-label">Code d'invitation</div>
                  <div className="cl-invite-code">{inviteCode}</div>
                </div>
                <button className="cl-copy-btn" onClick={copyCode}>{copied ? '✓ Copié' : 'Copier le code'}</button>
              </>
            )}
          </div>
        )}

        {!loading && members.length > 0 && filtered.length === 0 && (
          <p className="cl-empty-search">Aucun client ne correspond à cette recherche.</p>
        )}

        <div className="cl-list">
          {!loading && filtered.map(m => (
            <button key={m.id} className={`cl-card${m.sharesData ? '' : ' unshared'}`} {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
              <div className={`cl-avatar ${STATUS_CLASS[m.status] || ''}`}>
                {m.prenom?.[0] || '?'}
              </div>
              <div className="cl-body">
                <div className="cl-row-top">
                  <span className="cl-name">{m.prenom}</span>
                  {m.sharesData && (
                    <span className="cl-goal-tag" style={{ color: GOAL_COLORS[m.objectif] || 'var(--cl-text-muted)', '--cl-goal-dark': GOAL_COLORS_DARK[m.objectif] || 'var(--cl-text-muted)' }}>{m.objectif || '-'}</span>
                  )}
                </div>
                {/* Deux rendus distincts, pas un même bloc avec des valeurs
                    vides : un membre qui ne partage pas doit se lire comme
                    « pas de données accessibles », jamais comme « membre à
                    zéro d'activité ». */}
                {m.sharesData ? (
                  <>
                    <div className="cl-sub">
                      Vu {lastSeenLabel(m.lastActiveDate).toLowerCase()} · {m.sessionsThisWeek ?? 0} séance{m.sessionsThisWeek > 1 ? 's' : ''}
                      {m.streak > 0 && (
                        <span className={`cl-streak${m.streak >= 3 ? ' hot' : ''}`}> · 🔥 {m.streak}j</span>
                      )}
                    </div>
                    <div className="cl-progress-track">
                      <div className="cl-progress-fill" style={{ width: `${Math.min((m.sessionsThisWeek || 0)/8*100,100)}%` }} />
                    </div>
                  </>
                ) : (
                  <div className="cl-unshared-label">{consentLabel(m.consentState)}</div>
                )}
              </div>
              <svg className="cl-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      </div>
      <CoachNavBar />
    </div>
  )
}
