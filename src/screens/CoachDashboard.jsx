import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMemberActivitySummaries, fetchGymWeeklyActivity, lastSeenLabel, fetchCoachRoster, consentLabel } from '../utils/coachStats'
import CoachNavBar from '../components/CoachNavBar'
import Icon from '../components/Icon'
import { activable } from '../utils/a11y'
import '../styles/CoachDashboard-redesign.css'

const STATUS_CLASS = { 'ON TRACK': 'status-on-track', 'AT RISK': 'status-at-risk', 'INACTIVE': 'status-inactive' }
const STATUS_BADGE_CLASS = { 'ON TRACK': 'cd-status-on-track', 'AT RISK': 'cd-status-at-risk', 'INACTIVE': 'cd-status-inactive' }

export default function CoachDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [members, setMembers] = useState([])
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [loading, setLoading] = useState(true)

  // Même raison que dashboard.css (membre) : évite que le rubber-band iOS
  // au-delà des limites du wrapper ne retombe sur le dégradé corail partagé
  // de <body>.
  useEffect(() => {
    document.body.classList.add('coachdashboard-body-bg')
    return () => document.body.classList.remove('coachdashboard-body-bg')
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchMembers() {
      setLoading(true)
      // Identité de tous les membres (hors consentement), statistiques
      // seulement pour ceux qui partagent — voir fetchCoachRoster.
      const data = await fetchCoachRoster()
      if (cancelled) return

      const sharingIds = data.filter(m => m.sharesData).map(m => m.user_id)
      const [summaries, weekly] = await Promise.all([
        fetchMemberActivitySummaries(sharingIds),
        fetchGymWeeklyActivity(sharingIds),
      ])
      if (cancelled) return
      setMembers(data.map(m => m.sharesData ? { ...m, ...summaries[m.user_id] } : m))
      setWeeklyActivity(weekly)
      setLoading(false)
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  // Toutes les agrégations ci-dessous ne portent que sur les membres qui
  // partagent : un membre sans consentement n'a pas de statut, et le compter
  // comme « inactif » ou « à risque » serait une conclusion tirée d'une
  // absence de données, pas d'une absence d'activité. Le compteur CLIENTS,
  // lui, compte bien tout le monde — c'est le seul chiffre d'identité.
  const sharingMembers = members.filter(m => m.sharesData)
  const notSharing = members.filter(m => !m.sharesData)
  const alerts = sharingMembers.filter(m => m.status && m.status !== 'ON TRACK')
  const activeToday = sharingMembers.filter(m => m.lastActiveDate && lastSeenLabel(m.lastActiveDate) === "Aujourd'hui")
  const sessionsThisWeekTotal = sharingMembers.reduce((sum, m) => sum + (m.sessionsThisWeek || 0), 0)
  // Falls back to the most recently active members when nobody's active
  // *today* specifically — otherwise this section (and often the whole
  // dashboard below the stat tiles) reads as blank most of the day.
  const recentFallback = activeToday.length === 0
    ? [...sharingMembers].filter(m => m.lastActiveDate).sort((a, b) => (b.lastActiveDate || '').localeCompare(a.lastActiveDate || '')).slice(0, 5)
    : []

  const maxSessions = Math.max(...weeklyActivity.map(d => d.sessions), 1)
  const statusCounts = {
    'ON TRACK': sharingMembers.filter(m => m.status === 'ON TRACK').length,
    'AT RISK': sharingMembers.filter(m => m.status === 'AT RISK').length,
    'INACTIVE': sharingMembers.filter(m => !m.status || m.status === 'INACTIVE').length,
  }

  // ── Dérivés uniquement pour le layout desktop (≥1280px, Claude Design) —
  // toujours calculés à partir des données déjà chargées ci-dessus, aucune
  // requête ni donnée inventée.
  const now = new Date()
  // "+N ce mois" sur la tuile Clients : membres dont le rattachement
  // (coach_member_identity.rattache_le, déjà dans le roster) tombe dans le
  // mois civil en cours.
  const newThisMonth = members.filter(m => {
    if (!m.rattacheLe) return false
    const d = new Date(m.rattacheLe)
    return !isNaN(d) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
  // Séances/membre suivi (et non "/membre actif" comme dans le mockup :
  // diviser par activeToday.length aurait pu tomber à zéro, "suivi" —
  // sharingMembers, les membres dont on a vraiment des données — reste
  // défini même les jours calmes).
  const avgSessionsPerMember = sharingMembers.length > 0 ? sessionsThisWeekTotal / sharingMembers.length : 0
  const avgSessionsPerMemberLabel = avgSessionsPerMember.toFixed(1).replace('.', ',')

  // Graphique 7 jours : échelle à paliers "ronds" (0 / tiers / 2 tiers / max)
  // plutôt que le pic réel brut, pour des repères d'axe lisibles — reproduit
  // le principe du mockup (0/3/6/9) sans figer la valeur 9 en dur, qui
  // n'aurait eu aucun sens sur une salle avec une activité différente.
  const realMaxSessions = Math.max(...weeklyActivity.map(d => d.sessions), 0)
  const chartMax = Math.max(3, Math.ceil(realMaxSessions / 3) * 3)
  const chartTicks = [0, chartMax / 3, (chartMax / 3) * 2, chartMax]
  const CHART_H = 220
  // Sous-titre de la carte graphique ("X séances au total · moyenne Y/jour")
  // — même somme que celle utilisée ci-dessous pour la moyenne, calculée une
  // seule fois.
  const totalSessions7d = weeklyActivity.reduce((sum, d) => sum + d.sessions, 0)
  const avgSessionsPerDay = weeklyActivity.length > 0 ? totalSessions7d / weeklyActivity.length : 0
  const avgSessionsPerDayLabel = avgSessionsPerDay.toFixed(1).replace('.', ',')
  const highestDate = realMaxSessions > 0 ? (weeklyActivity.find(d => d.sessions === realMaxSessions)?.date ?? null) : null
  const dayDateLabel = dateStr => new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  const todayLabel = (() => {
    const s = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  return (
    <div className="app-wrapper coachdashboard-redesign">
      <div className="coachdashboard-screen">
        {/* Layout mobile/tablette (<1280px) — inchangé pixel pour pixel,
            simplement enveloppé dans ce conteneur pour pouvoir le masquer
            au profit du layout desktop ci-dessous à partir de 1280px (voir
            .cd-mobile-content / .cd-desktop dans CoachDashboard-redesign.css,
            aucune règle existante modifiée, seulement de nouvelles règles
            ajoutées). Entre 900px (sidebar, PR#145) et 1280px, ce bloc reste
            affiché — seule la nav bascule en sidebar, le contenu garde sa
            disposition empilée jusqu'à 1280px. */}
        <div className="cd-mobile-content">
        <div className="cd-topbar">
          <span className="cd-brand">
            <span className="cd-brand-mark">VOLTA</span>
            <span className="cd-brand-sub">Coach · {user?.name}</span>
          </span>
          {/* Même course que Settings.jsx/CoachSettings.jsx — logout() doit
              être attendu avant navigate(). */}
          <button className="cd-logout" aria-label="Se déconnecter" onClick={async () => { await logout(); navigate('/') }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        <h1 className="cd-title">
          <Icon name="clipboard" size={20} /> Tableau de bord
        </h1>

        <div className="cd-stats">
          {[
            { label: 'Clients', val: loading ? '-' : members.length },
            { label: 'Séances 7j', val: loading ? '-' : sessionsThisWeekTotal },
            { label: 'Alertes', val: loading ? '-' : alerts.length, danger: true },
            { label: 'Actifs', val: loading ? '-' : activeToday.length },
          ].map(m => (
            <div key={m.label} className={`cd-stat-tile${m.danger ? ' danger' : ''}`}>
              <div className="cd-stat-value">{m.val}</div>
              <div className="cd-stat-label">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="cd-actions">
          <button className="cd-action-btn" onClick={() => navigate('/coach/clients')}>
            Voir tous mes clients →
          </button>
          {/* Veille produit 2026-08-11, proposition n°4 : bibliothèque de
              programmes réutilisables. Bouton plutôt qu'un 5ᵉ onglet de nav
              (voir CoachPrograms.jsx). */}
          <button className="cd-action-btn" onClick={() => navigate('/coach/programmes')}>
            Bibliothèque de programmes →
          </button>
        </div>

        {/* Activity trend — gym-wide (pas par membre, ce détail existe déjà
            sur les graphiques propres de MemberDetail). */}
        <div className="cd-section-label">Activité de la salle — 7 jours</div>
        <div className="cd-chart-card">
          <div className="cd-chart-bars">
            {weeklyActivity.map(d => {
              const barH = d.sessions > 0 ? Math.max(4, Math.round((d.sessions / maxSessions) * 70)) : 4
              return (
                <div key={d.date} className="cd-chart-col">
                  <span className="cd-chart-value">{d.sessions || ''}</span>
                  <div className={`cd-chart-bar${d.sessions > 0 ? '' : ' empty'}`} style={{ height: barH }} />
                  <span className="cd-chart-day">{d.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status distribution — same ON TRACK / AT RISK / INACTIVE the
            tiles and "Nécessite attention" already use below, just given
            a shape instead of buried in a plain number. */}
        {!loading && members.length > 0 && (
          <>
            <div className="cd-section-label">Répartition des membres</div>
            <div className="cd-distribution-card">
              <div className="cd-distribution-bar">
                {[
                  { key: 'ON TRACK', var: '--cd-olive' },
                  { key: 'AT RISK', var: '--cd-lavender' },
                  { key: 'INACTIVE', var: '--cd-pink' },
                ].map(s => statusCounts[s.key] > 0 && (
                  <div key={s.key} style={{ width: `${(statusCounts[s.key] / members.length) * 100}%`, background: `var(${s.var})`, transition: 'width 500ms ease-out' }} />
                ))}
              </div>
              <div className="cd-distribution-legend">
                {[
                  { key: 'ON TRACK', label: 'Sur la bonne voie', var: '--cd-olive' },
                  { key: 'AT RISK', label: 'À risque', var: '--cd-lavender' },
                  { key: 'INACTIVE', label: 'Inactifs', var: '--cd-pink' },
                ].map(s => (
                  <span key={s.key} className="cd-legend-item">
                    <span className="cd-legend-dot" style={{ background: `var(${s.var})` }} />
                    {s.label} <strong>{statusCounts[s.key]}</strong>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Section neutre, volontairement séparée de « Nécessite attention » :
            ne pas partager ses données n'est pas un problème d'assiduité et
            ne doit pas être présenté comme une alerte. Le coach voit
            simplement que ces membres existent et pourquoi il n'a rien
            d'autre à leur sujet. */}
        {!loading && notSharing.length > 0 && (
          <>
            <div className="cd-section-label">Données non partagées</div>
            <div className="cd-member-cards">
              {notSharing.map(m => (
                <button key={m.id} className="cd-unshared-card" {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
                  <div>
                    <div className="cd-unshared-name">{m.prenom}</div>
                    <div className="cd-unshared-label">{consentLabel(m.consentState)}</div>
                  </div>
                  <span className="cd-unshared-arrow">›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {alerts.length > 0 && (
          <>
            <div className="cd-section-label alert">Nécessite attention</div>
            <div className="cd-member-cards">
              {alerts.map(m => (
                <button key={m.id} className="cd-alert-card" {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
                  <div className="cd-alert-row">
                    <span className="cd-alert-name">{m.prenom}</span>
                    <span className="cd-alert-cta">Voir →</span>
                  </div>
                  <p className="cd-alert-sub">
                    {m.status === 'INACTIVE'
                      ? `Dernière activité : ${lastSeenLabel(m.lastActiveDate).toLowerCase()}`
                      : `${m.sessionsThisWeek || 0} séance${m.sessionsThisWeek > 1 ? 's' : ''} cette semaine · dernière activité ${lastSeenLabel(m.lastActiveDate).toLowerCase()}`}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="cd-section-label">{activeToday.length > 0 ? "Actifs aujourd'hui" : 'Activité récente'}</div>
        {loading && <p className="cd-empty-note">Chargement des clients...</p>}
        {!loading && activeToday.length === 0 && recentFallback.length === 0 && <p className="cd-empty-note">Aucune activité enregistrée pour l'instant.</p>}
        <div className="cd-member-cards">
          {!loading && (activeToday.length > 0 ? activeToday : recentFallback).map(m => (
            <button key={m.id} className="cd-active-card" {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
              <div className={`cd-avatar ${STATUS_CLASS[m.status] || ''}`}>
                {m.prenom?.[0] || '?'}
              </div>
              <div className="cd-active-body">
                <div className="cd-active-top">
                  <span className="cd-active-name">{m.prenom}</span>
                  <span className={`cd-status-badge ${STATUS_BADGE_CLASS[m.status] || ''}`}>{m.status || '-'}</span>
                </div>
                <div className="cd-active-sub">
                  {activeToday.length > 0
                    ? `${m.sessionsThisWeek || 0} séance${m.sessionsThisWeek > 1 ? 's' : ''} cette semaine`
                    : `Vu ${lastSeenLabel(m.lastActiveDate).toLowerCase()} · ${m.sessionsThisWeek || 0} séance${m.sessionsThisWeek > 1 ? 's' : ''} cette semaine`}
                </div>
              </div>
            </button>
          ))}
        </div>
        </div>
        {/* ── Layout desktop (≥1280px), maquette Claude Design ── masqué
            sous 1280px (CoachDashboard-redesign.css), même données que le
            bloc mobile ci-dessus — uniquement une disposition différente. */}
        <div className="cd-desktop">
          <div className="cd-d-topbar">
            <div>
              <h1 className="cd-d-title">
                <Icon name="clipboard" size={22} /> Tableau de bord
              </h1>
              <p className="cd-d-meta">
                {todayLabel} · {loading ? '…' : `${members.length} membre${members.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="cd-d-actions">
              <button className="cd-d-btn-secondary" onClick={() => navigate('/coach/programmes')}>
                Bibliothèque de programmes
              </button>
              <button className="cd-d-btn-primary" onClick={() => navigate('/coach/clients')}>
                Voir tous mes clients →
              </button>
            </div>
          </div>

          <div className="cd-d-row cd-d-row-stats">
            <div className="cd-d-stats-grid">
              {[
                { label: 'Clients', val: loading ? '-' : members.length, ctx: `+${newThisMonth} ce mois` },
                { label: 'Séances 7j', val: loading ? '-' : sessionsThisWeekTotal, ctx: `${avgSessionsPerMemberLabel}/membre suivi` },
                { label: 'Alertes', val: loading ? '-' : alerts.length, ctx: 'À relancer cette semaine', danger: true },
                { label: 'Actifs', val: loading ? '-' : activeToday.length, ctx: "Vus aujourd'hui" },
              ].map(m => (
                <div key={m.label} className={`cd-stat-tile cd-d-stat-tile${m.danger ? ' danger' : ''}`}>
                  <div className="cd-stat-value">{m.val}</div>
                  <div className="cd-stat-label">{m.label}</div>
                  {!loading && <div className="cd-d-stat-ctx">{m.ctx}</div>}
                </div>
              ))}
            </div>

            {!loading && members.length > 0 && (
              <div className="cd-d-distribution">
                <div className="cd-section-label">Répartition des membres</div>
                <div className="cd-distribution-bar">
                  {[
                    { key: 'ON TRACK', var: '--cd-olive' },
                    { key: 'AT RISK', var: '--cd-lavender' },
                    { key: 'INACTIVE', var: '--cd-pink' },
                  ].map(s => statusCounts[s.key] > 0 && (
                    <div key={s.key} style={{ width: `${(statusCounts[s.key] / members.length) * 100}%`, background: `var(${s.var})`, transition: 'width 500ms ease-out' }} />
                  ))}
                </div>
                <div className="cd-d-distribution-numbers">
                  {[
                    { key: 'ON TRACK', label: 'Sur la bonne voie', var: '--cd-olive' },
                    { key: 'AT RISK', label: 'À risque', var: '--cd-lavender' },
                    { key: 'INACTIVE', label: 'Inactifs', var: '--cd-pink' },
                  ].map(s => (
                    <div key={s.key} className="cd-d-distribution-stat">
                      <span className="cd-legend-dot" style={{ background: `var(${s.var})` }} />
                      <div>
                        <div className="cd-d-distribution-value">{statusCounts[s.key]}</div>
                        <div className="cd-d-distribution-caption">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="cd-d-row cd-d-row-chart">
            <div className="cd-d-chart-card">
              <div className="cd-d-chart-header">
                <div>
                  <div className="cd-section-label">Activité de la salle — 7 jours</div>
                  <p className="cd-d-chart-subtitle">
                    {totalSessions7d} séance{totalSessions7d > 1 ? 's' : ''} au total · moyenne {avgSessionsPerDayLabel}/jour
                  </p>
                </div>
                {/* Légende de la ligne pointillée magenta du graphique
                    ci-dessous (.cd-d-chart-avgline) — même couleur/style de
                    trait reproduit ici en miniature. */}
                <span className="cd-d-chart-legend">
                  <span className="cd-d-chart-legend-swatch" aria-hidden="true" /> Moyenne
                </span>
              </div>
              <div className="cd-d-chart-plot">
                <div className="cd-d-chart-yaxis" style={{ height: CHART_H }}>
                  {chartTicks.map(t => <span key={t} className="cd-d-chart-ytick">{t}</span>)}
                </div>
                <div className="cd-d-chart-body">
                  <div className="cd-d-chart-area" style={{ height: CHART_H }}>
                    {chartTicks.map(t => (
                      <div key={t} className="cd-d-chart-gridline" style={{ bottom: Math.round((t / chartMax) * CHART_H) }} />
                    ))}
                    {avgSessionsPerDay > 0 && (
                      <div
                        className="cd-d-chart-avgline"
                        style={{ bottom: Math.min(CHART_H, Math.round((avgSessionsPerDay / chartMax) * CHART_H)) }}
                        title={`Moyenne : ${avgSessionsPerDayLabel} séance(s)/jour`}
                      />
                    )}
                    <div className="cd-d-chart-bars">
                      {weeklyActivity.map(d => {
                        const barH = d.sessions > 0 ? Math.max(4, Math.round((d.sessions / chartMax) * CHART_H)) : 2
                        const isHighest = highestDate !== null && d.date === highestDate
                        return (
                          <div key={d.date} className="cd-d-chart-col">
                            <span className="cd-d-chart-value">{d.sessions}</span>
                            <div
                              className={`cd-d-chart-bar${d.sessions === 0 ? ' empty' : ''}${isHighest ? ' highest' : ''}`}
                              style={{ height: barH }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="cd-d-chart-daylabels">
                    {weeklyActivity.map(d => (
                      <div key={d.date} className="cd-d-chart-daylabel">
                        <span>{d.label}</span><span>{dayDateLabel(d.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="cd-d-attention-card">
              <div className="cd-section-label alert">Nécessite attention</div>
              {alerts.length === 0 ? (
                <p className="cd-empty-note">Aucune alerte pour l'instant.</p>
              ) : (
                <>
                  <div className="cd-d-attention-list">
                    {alerts.map(m => (
                      <button key={m.id} className="cd-d-attention-row" {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
                        <span className="cd-d-attention-name">{m.prenom}</span>
                        <span className={`cd-status-badge ${STATUS_BADGE_CLASS[m.status] || ''}`}>{m.status || '-'}</span>
                      </button>
                    ))}
                  </div>
                  <button className="cd-d-attention-link" onClick={() => navigate('/coach/clients')}>
                    Traiter les {alerts.length} alerte{alerts.length > 1 ? 's' : ''} →
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={`cd-d-row cd-d-row-active${notSharing.length === 0 ? ' cd-d-row-active--single' : ''}`}>
            <div className="cd-d-active-block">
              <div className="cd-section-label">{activeToday.length > 0 ? "Actifs aujourd'hui" : 'Activité récente'}</div>
              {loading && <p className="cd-empty-note">Chargement des clients...</p>}
              {!loading && activeToday.length === 0 && recentFallback.length === 0 && <p className="cd-empty-note">Aucune activité enregistrée pour l'instant.</p>}
              <div className="cd-d-active-grid">
                {!loading && (activeToday.length > 0 ? activeToday : recentFallback).map(m => (
                  <button key={m.id} className="cd-active-card cd-d-active-card" {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
                    <div className={`cd-avatar ${STATUS_CLASS[m.status] || ''}`}>
                      {m.prenom?.[0] || '?'}
                    </div>
                    <div className="cd-active-body">
                      <div className="cd-active-top">
                        <span className="cd-active-name">{m.prenom}</span>
                      </div>
                      <div className="cd-active-sub">
                        {m.sessionsThisWeek || 0} séance{m.sessionsThisWeek > 1 ? 's' : ''} cette semaine
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {!loading && notSharing.length > 0 && (
              <div className="cd-d-unshared-block">
                <div className="cd-section-label">Données non partagées</div>
                <div className="cd-d-unshared-list">
                  {notSharing.map(m => (
                    <button key={m.id} className="cd-unshared-card cd-d-unshared-card" {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
                      <div>
                        <div className="cd-unshared-name">{m.prenom}</div>
                        <div className="cd-unshared-label">{consentLabel(m.consentState)}</div>
                      </div>
                      <span className="cd-unshared-arrow">›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <CoachNavBar />
    </div>
  )
}
