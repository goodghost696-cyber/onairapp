import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchMemberActivitySummaries, fetchGymWeeklyActivity, lastSeenLabel } from '../utils/coachStats'
import CoachNav from '../components/CoachNav'
import Icon from '../components/Icon'
import { activable } from '../utils/a11y'

const STATUS_COLORS = { 'ON TRACK': 'var(--success)', 'AT RISK': 'var(--warning)', 'INACTIVE': 'var(--danger)' }

export default function CoachDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [members, setMembers] = useState([])
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchMembers() {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
      if (cancelled) return
      if (error || !data) { setLoading(false); return }

      const userIds = data.map(m => m.user_id)
      const [summaries, weekly] = await Promise.all([
        fetchMemberActivitySummaries(userIds),
        fetchGymWeeklyActivity(userIds),
      ])
      if (cancelled) return
      setMembers(data.map(m => ({ ...m, ...summaries[m.user_id] })))
      setWeeklyActivity(weekly)
      setLoading(false)
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  const alerts = members.filter(m => m.status && m.status !== 'ON TRACK')
  const activeToday = members.filter(m => m.lastActiveDate && lastSeenLabel(m.lastActiveDate) === "Aujourd'hui")
  const sessionsThisWeekTotal = members.reduce((sum, m) => sum + (m.sessionsThisWeek || 0), 0)
  // Falls back to the most recently active members when nobody's active
  // *today* specifically — otherwise this section (and often the whole
  // dashboard below the stat tiles) reads as blank most of the day.
  const recentFallback = activeToday.length === 0
    ? [...members].filter(m => m.lastActiveDate).sort((a, b) => (b.lastActiveDate || '').localeCompare(a.lastActiveDate || '')).slice(0, 5)
    : []

  const maxSessions = Math.max(...weeklyActivity.map(d => d.sessions), 1)
  const statusCounts = {
    'ON TRACK': members.filter(m => m.status === 'ON TRACK').length,
    'AT RISK': members.filter(m => m.status === 'AT RISK').length,
    'INACTIVE': members.filter(m => !m.status || m.status === 'INACTIVE').length,
  }

  return (
    <div className="app-wrapper">
      <div className="screen">
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <div>
            <span className="text-xs bold" style={{ color: 'rgba(255,255,255,0.85)' }}>VOLTA</span>
            <span className="text-xs text-muted" style={{ marginLeft: 10 }}>Coach · {user?.name}</span>
          </div>
          {/* Même course que Settings.jsx/CoachSettings.jsx — logout() doit
              être attendu avant navigate(). */}
          <button className="icon-btn" onClick={async () => { await logout(); navigate('/') }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        {/* Était l'emoji 📋 — contredisait la charte (emoji réservés à
            quelques usages précis, jamais comme icône UI générique,
            voir JOURNAL.md), repéré en revoyant une vraie capture d'écran
            (2026-08-11). Icon.jsx a déjà "clipboard" dans son set. */}
        <h1 className="text-xl bold" style={{ marginBottom: 20, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="clipboard" size={20} /> Tableau de bord
        </h1>

        {/* .coach-stats caps this at a sane width on desktop — left
            unwrapped, these 4 tiles would stretch to the full ~1600px
            shell width, leaving a tiny number floating lost in a huge
            card. */}
        <div className="coach-stats">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
            {[
              { label: 'Clients', val: loading ? '-' : members.length },
              { label: 'Séances (7j)', val: loading ? '-' : sessionsThisWeekTotal },
              { label: 'Alertes', val: loading ? '-' : alerts.length, danger: true },
              { label: 'Actifs', val: loading ? '-' : activeToday.length },
            ].map((m, i) => (
              <div key={m.label} className="card card-animated" style={{ textAlign: 'center', padding: '12px 6px', '--delay': `${i * 40}ms` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: m.danger ? 'var(--danger)' : 'var(--text-primary)' }}>{m.val}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{m.label}</div>
              </div>
            ))}
          </div>

          <button className="btn-ghost" onClick={() => navigate('/coach/clients')} style={{ marginBottom: 8 }}>
            VOIR TOUS MES CLIENTS →
          </button>

          {/* Veille produit 2026-08-11, proposition n°4 : bibliothèque de
              programmes réutilisables. Bouton plutôt qu'un 5ᵉ onglet de nav
              (voir CoachPrograms.jsx). */}
          <button className="btn-ghost" onClick={() => navigate('/coach/programmes')} style={{ marginBottom: 20 }}>
            BIBLIOTHÈQUE DE PROGRAMMES →
          </button>

          {/* Activity trend — the dashboard used to be 4 numbers + lists,
              no actual chart anywhere, which read as a spreadsheet rather
              than a coaching tool. Gym-wide (not per-member — that detail
              already exists on MemberDetail's own charts), violet to match
              the coach side's own accent language vs the member side's gold. */}
          <div className="section-label">ACTIVITÉ DE LA SALLE — 7 JOURS</div>
          <div className="card card-animated" style={{ marginBottom: 16, '--delay': '160ms' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 90 }}>
              {weeklyActivity.map((d, i) => {
                const barH = d.sessions > 0 ? Math.max(4, Math.round((d.sessions / maxSessions) * 70)) : 3
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'flex-end', height: '100%' }}>
                    <span className="text-xs bold" style={{ color: d.sessions > 0 ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>{d.sessions || ''}</span>
                    <div style={{
                      width: '100%', height: barH, borderRadius: '3px 3px 0 0',
                      background: d.sessions > 0 ? 'var(--accent-secondary)' : 'var(--surface-2)',
                      transition: `height 500ms ease-out ${i * 40}ms`,
                    }} />
                    <span className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{d.label}</span>
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
              <div className="section-label">RÉPARTITION DES MEMBRES</div>
              <div className="card card-animated" style={{ marginBottom: 20, '--delay': '200ms' }}>
                <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                  {[
                    { key: 'ON TRACK', color: 'var(--success)' },
                    { key: 'AT RISK', color: 'var(--warning)' },
                    { key: 'INACTIVE', color: 'var(--danger)' },
                  ].map(s => statusCounts[s.key] > 0 && (
                    <div key={s.key} style={{ width: `${(statusCounts[s.key] / members.length) * 100}%`, background: s.color, transition: 'width 500ms ease-out' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { key: 'ON TRACK', label: 'Sur la bonne voie', color: 'var(--success)' },
                    { key: 'AT RISK', label: 'À risque', color: 'var(--warning)' },
                    { key: 'INACTIVE', label: 'Inactifs', color: 'var(--danger)' },
                  ].map(s => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span className="text-xs text-muted">{s.label} <strong className="text-primary">{statusCounts[s.key]}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {alerts.length > 0 && (
          <>
            <div className="section-label" style={{ color: 'var(--danger)' }}>NÉCESSITE ATTENTION</div>
            <div className="coach-grid">
              {alerts.map((m, i) => (
                <div key={m.id} className="card card-animated" style={{ borderLeft: '2px solid var(--danger)', marginBottom: 8, cursor: 'pointer', '--delay': `${Math.min(i, 6) * 40}ms` }} {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
                  <div className="flex justify-between items-center">
                    <span className="text-base bold">{m.prenom}</span>
                    <span className="text-xs text-accent">VOIR →</span>
                  </div>
                  <div className="text-sm text-secondary" style={{ marginTop: 4 }}>
                    {m.status === 'INACTIVE'
                      ? `Dernière activité : ${lastSeenLabel(m.lastActiveDate).toLowerCase()}`
                      : `${m.sessionsThisWeek || 0} séance${m.sessionsThisWeek > 1 ? 's' : ''} cette semaine · dernière activité ${lastSeenLabel(m.lastActiveDate).toLowerCase()}`}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-label">{activeToday.length > 0 ? "ACTIFS AUJOURD'HUI" : 'ACTIVITÉ RÉCENTE'}</div>
        {loading && <p className="text-sm text-muted">Chargement des clients...</p>}
        {!loading && activeToday.length === 0 && recentFallback.length === 0 && <p className="text-sm text-muted">Aucune activité enregistrée pour l'instant.</p>}
        <div className="coach-grid">
          {!loading && (activeToday.length > 0 ? activeToday : recentFallback).map((m, i) => (
            <div key={m.id} className="card card-animated" style={{ cursor: 'pointer', marginBottom: 8, '--delay': `${Math.min(i, 6) * 40}ms` }} {...activable(() => navigate(`/coach/member/${m.id}`), { label: `Voir la fiche de ${m.prenom}` })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', border: `1.5px solid ${STATUS_COLORS[m.status] || 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: STATUS_COLORS[m.status] || 'var(--text-muted)', flexShrink: 0 }}>
                  {m.prenom?.[0] || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between items-center">
                    <span className="text-base bold">{m.prenom}</span>
                    <span className="status-badge" style={{ color: STATUS_COLORS[m.status] || 'var(--text-muted)' }}>{m.status || '-'}</span>
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                    {activeToday.length > 0
                      ? `${m.sessionsThisWeek || 0} séance${m.sessionsThisWeek > 1 ? 's' : ''} cette semaine`
                      : `Vu ${lastSeenLabel(m.lastActiveDate).toLowerCase()} · ${m.sessionsThisWeek || 0} séance${m.sessionsThisWeek > 1 ? 's' : ''} cette semaine`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <CoachNav />
    </div>
  )
}
