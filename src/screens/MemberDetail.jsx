import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchMemberDetailStats, fetchMemberRecentActivity, fetchCoachNote, saveCoachNote, lastSeenLabel } from '../utils/coachStats'
import CoachNav from '../components/CoachNav'
import { authHeader } from '../lib/supabase'

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

const STATUS_COLORS = { 'ON TRACK': 'var(--success)', 'AT RISK': 'var(--warning)', 'INACTIVE': 'var(--danger)' }

const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Returns the ISO date for each of the last 7 days (oldest first), paired
// with the French weekday initial used by the chart.
function last7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    days.push({ iso: d.toISOString().slice(0, 10), label: weekDays[(d.getDay() + 6) % 7] })
  }
  return days
}

export default function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [member, setMember] = useState(null)
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState({ recentMeals: [], recentSessions: [] })
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [note, setNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (cancelled) return
      if (error || !profile) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setMember(profile)
      const [detail, activity, existingNote] = await Promise.all([
        fetchMemberDetailStats(profile.user_id),
        fetchMemberRecentActivity(profile.user_id),
        user?.id ? fetchCoachNote(user.id, profile.user_id) : Promise.resolve(''),
      ])
      if (cancelled) return
      setStats(detail)
      setRecent(activity)
      setNote(existingNote)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id, user?.id])

  async function handleSaveNote() {
    if (!user?.id || !member?.user_id) return
    setNoteSaving(true)
    const result = await saveCoachNote(user.id, member.user_id, note)
    setNoteSaving(false)
    if (result.success) {
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 1500)
    }
  }

  if (loading) return (
    <div className="app-wrapper"><div className="screen"><p className="text-base text-muted" style={{ marginTop: 40 }}>Chargement...</p></div></div>
  )
  if (notFound || !member) return (
    <div className="app-wrapper"><div className="screen"><p className="text-base text-muted" style={{ marginTop: 40 }}>Membre introuvable.</p></div></div>
  )

  const color = STATUS_COLORS[stats?.status] || 'var(--text-muted)'
  const sessionDays = last7Days().map(d => ({ ...d, done: stats?.weekSessionDates?.has(d.iso) }))

  async function generateAnalysis() {
    setAnalysisLoading(true)
    setAnalysis('')
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeader()),
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: `Tu es Thomas, coach chez ON AIR Fitness Clichy. Bilan court sur ${member.prenom}. Données réelles des 7 derniers jours : ${stats.sessionsThisWeek} séances, calories moyennes ${stats.avgCalories} kcal/jour, sommeil moyen ${stats.avgSleepH}h, pas moyens ${stats.avgSteps}/jour, statut ${stats.status}, dernière activité ${lastSeenLabel(stats.lastActiveDate)}. 3 phrases max. Direct, pro, actionnable. Termine par une reco concrète. Pas de bullet points. Pas de titre.`,
          messages: [{ role: 'user', content: `Bilan pour ${member.prenom}` }],
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAnalysis(data.content[0].text)
    } catch {
      setAnalysis('Erreur lors de la génération. Réessaie.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/coach')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="text-xl bold" style={{ flex: 1 }}>{member.prenom}</h1>
          <span style={{ border: `1px solid ${color}`, color, fontSize: 9, padding: '3px 8px', borderRadius: 4, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>{stats.status}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'Poids', val: member.poids ? `${member.poids} kg` : '—' },
            { label: 'Taille', val: member.taille ? `${member.taille} cm` : '—' },
            { label: 'Séances (7j)', val: stats.sessionsThisWeek },
            { label: 'Calories moy.', val: stats.avgCalories ? `${stats.avgCalories} kcal` : '—' },
            { label: 'Sommeil moy.', val: stats.avgSleepH ? `${stats.avgSleepH}h` : '—' },
            { label: 'Pas/jour moy.', val: stats.avgSteps ? stats.avgSteps.toLocaleString() : '—' },
          ].map(s => (
            <div key={s.label} className="card card-animated" style={{ '--delay': '0ms', padding: '12px 16px' }}>
              <div className="text-xs text-muted">{s.label}</div>
              <div className="text-sm bold" style={{ marginTop: 4 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Weekly sessions chart */}
        <div className="section-label">SÉANCES CETTE SEMAINE</div>
        <div className="card" style={{ marginBottom: 8 }}>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {sessionDays.map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: d.done ? 36 : 6, background: d.done ? 'var(--accent)' : 'var(--border)', borderRadius: '3px 3px 0 0' }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', width: '100%', textAlign: 'center' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Objectives — real numeric goals from the objectifs table */}
        <div className="section-label">OBJECTIFS</div>
        <div className="card" style={{ marginBottom: 8 }}>
          {stats.objectifs ? [
            `${stats.objectifs.calories_jour} kcal/jour`,
            `${stats.objectifs.proteines}g de protéines/jour`,
            `${stats.objectifs.pas_jour?.toLocaleString()} pas/jour`,
            `${stats.objectifs.eau_ml} ml d'eau/jour`,
          ].map((obj, i, arr) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < arr.length - 1 ? '2px solid var(--border)' : 'none' }}>
              <span className="text-sm">{obj}</span>
            </div>
          )) : (
            <p className="text-sm text-muted">Aucun objectif enregistré pour ce membre.</p>
          )}
        </div>

        {/* Recent activity — the averages above are good for a trend, but
            spotting a specific problem (a bad meal, a skipped session)
            needs the actual entries. */}
        <div className="section-label">DERNIERS REPAS</div>
        <div className="card" style={{ marginBottom: 8 }}>
          {recent.recentMeals.length > 0 ? recent.recentMeals.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recent.recentMeals.length - 1 ? '2px solid var(--border)' : 'none' }}>
              <div>
                <div className="text-sm">{r.nom}</div>
                <div className="text-xs text-muted">{formatShortDate(r.date)}{r.type_repas ? ` · ${r.type_repas}` : ''}</div>
              </div>
              <span className="text-sm bold">{r.calories} kcal</span>
            </div>
          )) : (
            <p className="text-sm text-muted">Aucun repas enregistré récemment.</p>
          )}
        </div>

        <div className="section-label">DERNIÈRES SÉANCES</div>
        <div className="card" style={{ marginBottom: 8 }}>
          {recent.recentSessions.length > 0 ? recent.recentSessions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recent.recentSessions.length - 1 ? '2px solid var(--border)' : 'none' }}>
              <div>
                <div className="text-sm">{s.nom}</div>
                <div className="text-xs text-muted">{formatShortDate(s.date)} · {(s.exercices || []).length} exercice{(s.exercices || []).length > 1 ? 's' : ''}</div>
              </div>
              <span className="text-sm bold">{s.duree_min} min</span>
            </div>
          )) : (
            <p className="text-sm text-muted">Aucune séance enregistrée récemment.</p>
          )}
        </div>

        {/* Coach notes — private to this coach, never visible to the
            member (RLS scoped to auth.uid() = coach_id, no member policy
            exists at all). */}
        <div className="section-label">NOTES COACH</div>
        <div className="card" style={{ marginBottom: 8 }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note privée sur ce membre (blessure, objectif particulier...)"
            style={{ width: '100%', minHeight: 80, background: 'var(--surface-2)', border: '2px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, padding: 12, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          />
          <button className="btn-ghost" onClick={handleSaveNote} disabled={noteSaving} style={{ marginTop: 10 }}>
            {noteSaving ? '...' : noteSaved ? '✓ ENREGISTRÉ' : 'ENREGISTRER LA NOTE'}
          </button>
        </div>

        {/* Message button — opens the real persisted conversation (messages
            table) instead of the fake local-state modal this used to be,
            which looked like it sent something but never persisted it. */}
        <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(`/coach/messages/${member.id}`)}>
          ENVOYER UN MESSAGE
        </button>

        {/* AI Analysis */}
        <div className="section-label">ANALYSE IA</div>
        <button className="btn-accent" onClick={generateAnalysis} disabled={analysisLoading} style={{ opacity: analysisLoading ? 0.7 : 1, marginBottom: analysis ? 0 : 16 }}>
          {analysisLoading ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER ANALYSE IA'}
        </button>
        {analysis && (
          <div className="card" style={{ marginTop: 12, animation: 'fadeIn 400ms ease-out' }}>
            <p className="text-base" style={{ lineHeight: '24px' }}>{analysis}</p>
            <p className="text-xs text-muted" style={{ marginTop: 10 }}>Généré par AI Coach ON AIR</p>
          </div>
        )}
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
      <CoachNav />
    </div>
  )
}
