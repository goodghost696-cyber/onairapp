import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMemberDetailStats, fetchMemberRecentActivity, fetchCoachNote, saveCoachNote, saveMemberObjectifs, lastSeenLabel, fetchCoachRoster, consentLabel } from '../utils/coachStats'
import { fetchHabitsWithProgress, assignHabit, archiveHabit } from '../utils/habits'
import { authHeader } from '../lib/supabase'
import { BOUNDS, clamp } from '../utils/validation'
import '../styles/MemberDetail-redesign.css'

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

const STATUS_CLASS = { 'ON TRACK': 'md-status-on-track', 'AT RISK': 'md-status-at-risk', 'INACTIVE': 'md-status-inactive' }

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
  // Édition des objectifs par le coach (veille produit 2026-08-11, prop. 1).
  const [editingObjectifs, setEditingObjectifs] = useState(false)
  const [objectifsForm, setObjectifsForm] = useState(null)
  const [objectifsSaving, setObjectifsSaving] = useState(false)
  const [objectifsSaved, setObjectifsSaved] = useState(false)
  // Habitudes assignées par le coach (veille produit 2026-08-11, prop. 3).
  const [habits, setHabits] = useState([])
  const [assigningHabit, setAssigningHabit] = useState(false)
  const [newHabitTitre, setNewHabitTitre] = useState('')
  const [newHabitFreq, setNewHabitFreq] = useState(7)
  const [habitSaving, setHabitSaving] = useState(false)

  // Même raison que les autres écrans coach restylés : évite que le
  // rubber-band iOS au-delà des limites du wrapper ne retombe sur le
  // dégradé corail partagé de <body>.
  useEffect(() => {
    document.body.classList.add('memberdetail-body-bg')
    return () => document.body.classList.remove('memberdetail-body-bg')
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      // L'identité passe par le roster (hors consentement) : sinon la fiche
      // d'un membre qui ne partage pas renvoyait "introuvable", alors qu'il
      // est bien membre de la salle.
      const roster = await fetchCoachRoster()
      if (cancelled) return
      const profile = roster.find(m => m.id === id)
      if (!profile) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setMember(profile)

      // Pas de consentement : on n'interroge même pas les tables de suivi.
      // La RLS les couperait de toute façon, mais s'arrêter ici évite
      // surtout de peupler l'écran de zéros qui se liraient comme un membre
      // inactif. La note du coach, elle, lui appartient et reste accessible.
      if (!profile.sharesData) {
        const existingNote = user?.id ? await fetchCoachNote(user.id, profile.user_id) : ''
        if (cancelled) return
        setNote(existingNote)
        setLoading(false)
        return
      }

      const [detail, activity, existingNote, memberHabits] = await Promise.all([
        fetchMemberDetailStats(profile.user_id),
        fetchMemberRecentActivity(profile.user_id),
        user?.id ? fetchCoachNote(user.id, profile.user_id) : Promise.resolve(''),
        fetchHabitsWithProgress(profile.user_id),
      ])
      if (cancelled) return
      setStats(detail)
      setRecent(activity)
      setNote(existingNote)
      setHabits(memberHabits)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id, user?.id])

  async function handleAssignHabit() {
    if (!user?.id || !member?.user_id || !newHabitTitre.trim()) return
    setHabitSaving(true)
    const result = await assignHabit(user.id, member.user_id, newHabitTitre, Number(newHabitFreq))
    setHabitSaving(false)
    if (result.success) {
      setNewHabitTitre('')
      setNewHabitFreq(7)
      setAssigningHabit(false)
      setHabits(await fetchHabitsWithProgress(member.user_id))
    }
  }

  async function handleArchiveHabit(habitudeId) {
    const result = await archiveHabit(habitudeId)
    if (result.success) setHabits(prev => prev.filter(h => h.id !== habitudeId))
  }

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

  function startEditObjectifs() {
    const o = stats?.objectifs
    setObjectifsForm({
      calorieGoal: o?.calories_jour ?? 2400,
      proteinGoal: o?.proteines ?? 180,
      stepsGoal: o?.pas_jour ?? 10000,
      waterGoal: o?.eau_ml ?? 2500,
    })
    setEditingObjectifs(true)
  }

  async function handleSaveObjectifs() {
    if (!member?.user_id) return
    setObjectifsSaving(true)
    const values = {
      calories_jour: clamp(objectifsForm.calorieGoal, BOUNDS.calorieGoal),
      proteines: clamp(objectifsForm.proteinGoal, BOUNDS.proteinGoal),
      pas_jour: clamp(objectifsForm.stepsGoal, BOUNDS.stepsGoal),
      eau_ml: clamp(objectifsForm.waterGoal, BOUNDS.waterGoal),
    }
    const result = await saveMemberObjectifs(member.user_id, values)
    setObjectifsSaving(false)
    if (result.success) {
      setStats(prev => ({ ...prev, objectifs: { ...prev.objectifs, ...values } }))
      setEditingObjectifs(false)
      setObjectifsSaved(true)
      setTimeout(() => setObjectifsSaved(false), 1500)
    }
  }

  if (loading) return (
    <div className="app-wrapper memberdetail-redesign"><div className="memberdetail-screen"><p className="md-loading">Chargement...</p></div></div>
  )
  if (notFound || !member) return (
    <div className="app-wrapper memberdetail-redesign"><div className="memberdetail-screen"><p className="md-loading">Membre introuvable.</p></div></div>
  )

  // Membre sans consentement : fiche d'identité seule. Rendu distinct plutôt
  // que la fiche habituelle avec des tuiles à « — » partout, qui se lirait
  // comme un membre inscrit et totalement inactif. La note du coach reste
  // accessible (elle lui appartient) et le bouton message aussi : ne pas
  // partager ses données n'empêche pas d'échanger avec son coach.
  if (!member.sharesData) return (
    <div className="app-wrapper memberdetail-redesign">
      <div className="memberdetail-screen">
        <div className="md-topbar">
          <button className="md-back" aria-label="Retour" onClick={() => navigate('/coach')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="md-name">{member.prenom}</h1>
        </div>

        <div className="md-unshared-panel">
          <div className="md-unshared-title">{consentLabel(member.consentState)}</div>
          <div className="md-unshared-sub">
            {member.prenom} fait bien partie de ta salle
            {member.rattacheLe ? ` depuis le ${new Date(member.rattacheLe).toLocaleDateString('fr-FR')}` : ''}, mais
            n'a pas donné son accord pour partager ses données de suivi (nutrition,
            poids, activité, sommeil, entraînement, habitudes). Ce choix lui
            appartient et se modifie depuis ses réglages.
          </div>
        </div>

        <div className="md-section-label"><span className="md-section-label-text">Notes coach</span></div>
        <div className="md-notes-card">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note privée sur ce membre..."
          />
        </div>
        <button className="md-pill-btn" onClick={handleSaveNote} disabled={noteSaving} style={{ marginBottom: 20 }}>
          {noteSaving ? '...' : noteSaved ? '✓ Enregistré' : 'Enregistrer la note'}
        </button>

        <button className="md-pill-btn" onClick={() => navigate(`/coach/messages/${member.id}`)}>
          Envoyer un message
        </button>
      </div>
    </div>
  )

  const statusClass = STATUS_CLASS[stats?.status] || ''
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
          system: `Tu es Thomas, coach chez VOLTA Fitness Clichy. Bilan court sur ${member.prenom}. Données réelles des 7 derniers jours : ${stats.sessionsThisWeek} séances, calories moyennes ${stats.avgCalories} kcal/jour, sommeil moyen ${stats.avgSleepH}h, pas moyens ${stats.avgSteps}/jour, statut ${stats.status}, dernière activité ${lastSeenLabel(stats.lastActiveDate)}. 3 phrases max. Direct, pro, actionnable. Termine par une reco concrète. Pas de bullet points. Pas de titre.`,
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
    <div className="app-wrapper memberdetail-redesign">
      <div className="memberdetail-screen">
        <div className="md-topbar">
          <button className="md-back" aria-label="Retour" onClick={() => navigate('/coach')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="md-name">{member.prenom}</h1>
          <span className={`md-status-badge ${statusClass}`}>{stats.status}</span>
        </div>

        <div className="md-stats">
          {[
            { label: 'Poids', val: member.poids ? `${member.poids} kg` : '—' },
            { label: 'Taille', val: member.taille ? `${member.taille} cm` : '—' },
            { label: 'Séances (7j)', val: stats.sessionsThisWeek },
            { label: 'Calories moy.', val: stats.avgCalories ? `${stats.avgCalories} kcal` : '—' },
            { label: 'Sommeil moy.', val: stats.avgSleepH ? `${stats.avgSleepH}h` : '—' },
            { label: 'Pas/jour moy.', val: stats.avgSteps ? stats.avgSteps.toLocaleString() : '—' },
          ].map(s => (
            <div key={s.label} className="md-stat-tile">
              <div className="md-stat-label">{s.label}</div>
              <div className="md-stat-value">{s.val}</div>
            </div>
          ))}
        </div>

        {/* Weekly sessions chart */}
        <div className="md-section-label"><span className="md-section-label-text">Séances cette semaine</span></div>
        <div className="md-week-card">
          <div className="md-week-grid">
            {sessionDays.map((d, i) => (
              <div key={i} className="md-week-col">
                <div className={`md-week-bar${d.done ? ' done' : ''}`} style={{ height: d.done ? 34 : 6 }} />
                <span className="md-week-day">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Objectives — real numeric goals from the objectifs table.
            Modifiables par le coach depuis le 2026-08-11 (veille produit,
            proposition n°1 : "le coach observe mais n'agit pas" — c'est le
            premier vrai geste d'action donné au coach sur un membre). */}
        <div className="md-section-label">
          <span className="md-section-label-text">Objectifs</span>
          {!editingObjectifs && (
            <button className="md-section-action" onClick={startEditObjectifs}>
              {objectifsSaved ? '✓ Enregistré' : 'Modifier'}
            </button>
          )}
        </div>
        {editingObjectifs ? (
          <div className="md-list-card" style={{ padding: '14px 20px 20px' }}>
            <div className="md-form" style={{ border: 'none', marginBottom: 0, paddingBottom: 0 }}>
              {[
                { key: 'calorieGoal', label: 'Calories/jour' },
                { key: 'proteinGoal', label: 'Protéines/jour' },
                { key: 'stepsGoal', label: 'Pas/jour' },
                { key: 'waterGoal', label: 'Eau/jour' },
              ].map(f => (
                <div key={f.key} className="md-form-field">
                  <label>{f.label}</label>
                  <input
                    type="number"
                    value={objectifsForm[f.key]}
                    onChange={e => setObjectifsForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="md-form-actions">
                <button className="md-pill-btn solid" onClick={handleSaveObjectifs} disabled={objectifsSaving} style={{ flex: 1 }}>
                  {objectifsSaving ? '...' : 'Enregistrer'}
                </button>
                <button className="md-pill-btn" onClick={() => setEditingObjectifs(false)} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="md-list-card">
            {stats.objectifs ? [
              ['Calories/jour', `${stats.objectifs.calories_jour} kcal`],
              ['Protéines/jour', `${stats.objectifs.proteines} g`],
              ['Pas/jour', stats.objectifs.pas_jour?.toLocaleString()],
              ['Eau/jour', `${stats.objectifs.eau_ml} ml`],
            ].map(([label, val]) => (
              <div key={label} className="md-list-row">
                <span className="md-list-row-label">{label}</span>
                <span className="md-list-row-value">{val}</span>
              </div>
            )) : (
              <p className="md-empty-note">Aucun objectif enregistré pour ce membre.</p>
            )}
          </div>
        )}

        {/* Habitudes/défis assignés — veille produit 2026-08-11, proposition
            n°3 : le coach assigne, le membre coche au quotidien depuis son
            Dashboard. Bande de 7 points façon streak, la plus récente à
            droite, même lecture visuelle que la grille SÉANCES au-dessus. */}
        <div className="md-section-label">
          <span className="md-section-label-text">Habitudes</span>
          {!assigningHabit && (
            <button className="md-section-action" onClick={() => setAssigningHabit(true)}>
              + Assigner
            </button>
          )}
        </div>
        <div className="md-habits-card">
          {assigningHabit && (
            <div className="md-form">
              <div className="md-form-field">
                <label>Habitude ou défi</label>
                <input
                  type="text"
                  value={newHabitTitre}
                  onChange={e => setNewHabitTitre(e.target.value)}
                  placeholder="Ex: Boire 2L d'eau par jour"
                />
              </div>
              <div className="md-form-field">
                <label>Fréquence visée</label>
                <select value={newHabitFreq} onChange={e => setNewHabitFreq(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>{n}x / semaine</option>
                  ))}
                </select>
              </div>
              <div className="md-form-actions">
                <button className="md-pill-btn solid" onClick={handleAssignHabit} disabled={habitSaving || !newHabitTitre.trim()} style={{ flex: 1 }}>
                  {habitSaving ? '...' : 'Assigner'}
                </button>
                <button className="md-pill-btn" onClick={() => { setAssigningHabit(false); setNewHabitTitre('') }} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
          {habits.length > 0 ? habits.map(h => (
            <div key={h.id} className="md-habit-row">
              <div className="md-habit-top">
                <span className="md-habit-title">{h.titre}</span>
                <button className="md-section-action muted" onClick={() => handleArchiveHabit(h.id)}>
                  Archiver
                </button>
              </div>
              <div className="md-habit-progress">
                <div className="md-habit-dots">
                  {h.last7Days.map((done, j) => (
                    <div key={j} className={`md-habit-dot${done ? ' done' : ''}`} />
                  ))}
                </div>
                <span className="md-habit-count">{h.countThisWeek}/{h.frequenceParSemaine}</span>
              </div>
            </div>
          )) : !assigningHabit && (
            <p className="md-empty-note">Aucune habitude assignée à ce membre.</p>
          )}
        </div>

        {/* Recent activity — the averages above are good for a trend, but
            spotting a specific problem (a bad meal, a skipped session)
            needs the actual entries. */}
        <div className="md-section-label"><span className="md-section-label-text">Derniers repas</span></div>
        <div className="md-list-card">
          {recent.recentMeals.length > 0 ? recent.recentMeals.map((r, i) => (
            <div key={i} className="md-entry-row">
              <div>
                <div className="md-entry-name">{r.nom}</div>
                <div className="md-entry-sub">{formatShortDate(r.date)}{r.type_repas ? ` · ${r.type_repas}` : ''}</div>
              </div>
              <span className="md-entry-value">{r.calories} kcal</span>
            </div>
          )) : (
            <p className="md-empty-note">Aucun repas enregistré récemment.</p>
          )}
        </div>

        <div className="md-section-label"><span className="md-section-label-text">Dernières séances</span></div>
        <div className="md-list-card">
          {recent.recentSessions.length > 0 ? recent.recentSessions.map((s, i) => (
            <div key={i} className="md-entry-row">
              <div>
                <div className="md-entry-name">{s.nom}</div>
                <div className="md-entry-sub">{formatShortDate(s.date)} · {(s.exercices || []).length} exercice{(s.exercices || []).length > 1 ? 's' : ''}</div>
              </div>
              <span className="md-entry-value">{s.duree_min} min</span>
            </div>
          )) : (
            <p className="md-empty-note">Aucune séance enregistrée récemment.</p>
          )}
        </div>

        {/* Coach notes — private to this coach, never visible to the
            member (RLS scoped to auth.uid() = coach_id, no member policy
            exists at all). */}
        <div className="md-section-label"><span className="md-section-label-text">Notes coach</span></div>
        <div className="md-notes-card">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note privée sur ce membre (blessure, objectif particulier...)"
          />
        </div>
        <button className="md-pill-btn" onClick={handleSaveNote} disabled={noteSaving} style={{ marginBottom: 20 }}>
          {noteSaving ? '...' : noteSaved ? '✓ Enregistré' : 'Enregistrer la note'}
        </button>

        {/* Message button — opens the real persisted conversation (messages
            table) instead of the fake local-state modal this used to be,
            which looked like it sent something but never persisted it. */}
        <button className="md-pill-btn" style={{ marginBottom: 20 }} onClick={() => navigate(`/coach/messages/${member.id}`)}>
          Envoyer un message
        </button>

        {/* AI Analysis */}
        <div className="md-section-label"><span className="md-section-label-text">Analyse IA</span></div>
        <button className="md-pill-btn solid" onClick={generateAnalysis} disabled={analysisLoading}>
          {analysisLoading ? 'Génération en cours...' : 'Générer analyse IA'}
        </button>
        {analysis && (
          <div className="md-ai-card fresh" style={{ marginTop: 12 }}>
            <p className="md-ai-text">{analysis}</p>
            <p className="md-ai-credit">Généré par AI Coach VOLTA</p>
          </div>
        )}
      </div>
    </div>
  )
}
