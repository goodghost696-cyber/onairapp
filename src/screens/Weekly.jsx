import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { fetchWeeklyStats } from '../utils/weeklyStats'
import { fetchLiftProgress } from '../utils/liftProgress'
import { calculateCalorieGoal } from '../utils/metabolism'
import { BOUNDS, clamp } from '../utils/validation'
import '../styles/Weekly.css'
import '../styles/weekly-redesign.css'

const MEDALS = ['🥇', '🥈', '🥉']

const BAR_MAX_HEIGHT = 60

// Déménagé depuis Settings.jsx (2026-08-15) — même 4 options/valeurs que
// l'étape "goal" d'Onboarding.jsx, les values sont les clés que
// GOAL_MULTIPLIERS (utils/metabolism.js) matche, à garder en synchro avec
// cette liste-là, pas juste visuellement similaire.
const GOAL_OPTIONS = [
  { label: 'Perdre du poids',   value: 'Perte de poids' },
  { label: 'Prendre du muscle', value: 'Prise de masse' },
  { label: 'Mieux manger',      value: 'Nutrition' },
  { label: 'Performance',       value: 'Performance' },
]

// Cycle de teintes pour le remplissage des courbes de charge (une par
// exercice, dans l'ordre) — reprend la palette du restyle "pastel chaud",
// même esprit que les badges-lettre de Nutrition.jsx (couleur ≠ donnée,
// juste une distinction visuelle entre cartes consécutives).
const LIFT_FILL_COLORS = ['var(--wk-olive)', 'var(--wk-lavender)', 'var(--wk-pink)', 'var(--wk-carb)']

function LiftCurve({ lift, idx = 0 }) {
  const max = Math.max(...lift.sessions)
  const min = Math.min(...lift.sessions)
  const w = 300, h = 80
  const padding = { top: 10, right: 16, bottom: 24, left: 32 }
  const chartW = w - padding.left - padding.right
  const chartH = h - padding.top - padding.bottom
  const n = lift.sessions.length
  const getX = i => padding.left + (i / (n - 1)) * chartW
  const getY = v => max === min ? padding.top + chartH / 2 : padding.top + chartH - ((v - min) / (max - min)) * chartH
  const points = lift.sessions.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')
  const latest = lift.sessions[n - 1]
  const prev = lift.sessions[n - 2]

  const fillColor = LIFT_FILL_COLORS[idx % LIFT_FILL_COLORS.length]
  const gradId = `grad-${lift.name.replace(/\s/g,'-')}`

  return (
    <div className="lift-curve-card">
      <div className="lift-curve-header">
        <p className="lift-curve-name">{lift.name}</p>
        <div className="lift-curve-trend">
          {latest > prev
            ? <span style={{ color: 'var(--wk-magenta)' }}>↑ {latest - prev} {lift.unit}</span>
            : <span style={{ color: 'var(--wk-text-muted)' }}>→ stable</span>
          }
          <span className="lift-curve-latest">{latest} {lift.unit}</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={padding.left} y1={padding.top + t * chartH} x2={w - padding.right} y2={padding.top + t * chartH} stroke="var(--wk-border)" strokeWidth="0.5" />
        ))}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={fillColor} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={`${padding.left},${padding.top + chartH} ${points} ${w - padding.right},${padding.top + chartH}`} fill={`url(#${gradId})`} />
        <polyline points={points} fill="none" stroke="var(--wk-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {lift.sessions.map((v, i) => (
          <circle key={i} cx={getX(i)} cy={getY(v)} r={i === n - 1 ? 4.4 : 3.4} fill={i === n - 1 ? 'var(--wk-ink)' : 'var(--wk-cream)'} stroke="var(--wk-ink)" strokeWidth={i === n - 1 ? 0 : 1.8} />
        ))}
        {lift.dates.map((d, i) => (
          <text key={i} x={getX(i)} y={h - 4} textAnchor="middle" fontSize="8" fill="var(--wk-text-muted)">{d.split(' ')[0]}</text>
        ))}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" fontSize="8" fill="var(--wk-text-muted)">{max}</text>
        <text x={padding.left - 4} y={padding.top + chartH} textAnchor="end" fontSize="8" fill="var(--wk-text-muted)">{min}</text>
      </svg>
    </div>
  )
}

// Restyle "pastel chaud" (2026-08-14) — mêmes 4 états qu'avant (vide /
// objectif atteint ou dépassé / proche / en dessous), recolorés pour la
// carte blanche crème plutôt que la gold card héritée. Encre pour "atteint"
// (le ton le plus affirmé de la palette), olive foncé pour "proche",
// magenta pour "nettement en dessous" — la maquette elle-même n'a pas de
// code couleur par objectif sur ce graphique (barres décoratives), donc
// pas de valeur à reprendre littéralement : palette inventée en restant
// dans les teintes du restyle, en gardant les 4 états bien distincts.
function calBarColor(cal, goal) {
  if (cal === 0) return 'var(--wk-track)'
  const pct = cal / goal
  if (pct >= 1) return 'var(--wk-ink)'
  if (pct >= 0.8) return 'var(--wk-olive-ink)'
  return 'var(--wk-magenta)'
}

// Étiquette décorative "Semaine du X au Y" du header (maquette) — calculée
// depuis la date du jour (lundi→dimanche de la semaine en cours), aucune
// dépendance aux données fetchées : purement un libellé d'affichage, la
// logique de calcul des stats elle-même (fetchWeeklyStats etc.) n'est pas
// touchée.
function currentWeekRangeLabel() {
  const now = new Date()
  const day = now.getDay() // 0 = dimanche
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const month = sunday.toLocaleDateString('fr-FR', { month: 'long' })
  return `Semaine du ${monday.getDate()} au ${sunday.getDate()} ${month}`
}

// Rapporté en test réel (2026-08-14, investigation JOURNAL.md) : sans état
// loading, les states initiaux (tableaux vides, zéros) affichaient un écran
// "vide mais complet" avant résolution des 2 fetchs qui alimentent cet
// écran (stats + charges), puis tout sautait d'un coup à l'arrivée des
// données. Ces trois blocs reprennent la forme exacte des cartes réelles
// (mêmes classes wk-calorie-card/wk-summary-row/lift-curve-card, déjà des
// cartes crème arrondies) avec des barres pulsantes à la place des vraies
// valeurs — cohérent avec le restyle pastel plutôt que le spinner générique
// (RouteLoadingFallback, App.jsx) pensé pour un changement de route, pas un
// écran déjà monté qui attend ses données. Les libellés statiques (titres
// de section, sous-titres) restent affichés normalement pendant le
// chargement — seuls les blocs qui dépendent des données fetchées basculent.
function CalorieBarsSkeleton() {
  return (
    <div className="wk-calorie-bars">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="wk-calorie-bar-col">
          <div className="wk-skeleton-block" style={{ width: 20, height: 9 }} />
          <div className="wk-skeleton-block" style={{ width: '100%', height: 24 + (i % 3) * 14, borderRadius: '12px 12px 5px 5px' }} />
          <div className="wk-skeleton-block" style={{ width: 16, height: 8 }} />
        </div>
      ))}
    </div>
  )
}

function SummaryListSkeleton() {
  return (
    <div className="wk-summary-list">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="wk-summary-row card-animated" style={{ '--delay': `${100 + i * 60}ms` }}>
          <div className="wk-skeleton-block" style={{ width: 100, height: 12 }} />
          <div className="wk-skeleton-block" style={{ width: 44, height: 14 }} />
        </div>
      ))}
    </div>
  )
}

function LiftsSkeleton() {
  return (
    <>
      {[0, 1].map(i => (
        <div key={i} className="lift-curve-card">
          <div className="wk-skeleton-block" style={{ width: '55%', height: 13, marginBottom: 14 }} />
          <div className="wk-skeleton-block" style={{ width: '100%', height: 56, borderRadius: 12 }} />
        </div>
      ))}
    </>
  )
}

export default function Weekly() {
  const { appData, updateData } = useApp()
  const { user, updateUserProfile } = useAuth()
  const { t } = useLanguage()
  const [weeklyData, setWeeklyData] = useState([])
  const [sleepData, setSleepData] = useState([])
  const [weeklySteps, setWeeklySteps] = useState(0)
  const [weeklyKmRun, setWeeklyKmRun] = useState(0)
  const [liftProgress, setLiftProgress] = useState([])
  // Le classement est masqué côté produit depuis le 2026-08-13 (rendu mis en
  // commentaire plus bas, décision « repoussée, pas abandonnée »). Son fetch,
  // lui, continuait de partir à CHAQUE montage du Bilan pour alimenter un
  // état que plus rien ne lisait — une requête réseau par visite, pour rien,
  // et qui plus est sur `leaderboard_weekly`, la vue SECURITY DEFINER dont la
  // Phase 1 a dû reboucher la fuite cross-salle. Retiré (Phase 3) : l'état
  // `leaderboard`/`leaderboardLoaded`, l'appel dans l'effet, et l'import.
  // `utils/leaderboard.js` est volontairement conservé, non importé, avec le
  // rendu commenté — pour rebrancher, remettre ces trois éléments.
  // Édition d'objectif déménagée depuis Settings.jsx (2026-08-15, demande
  // explicite de centraliser l'édition ici plutôt que de la dupliquer sur
  // les deux écrans) — même state/logique que l'ancien Settings.jsx,
  // adaptés à cet écran. user.goal est la chaîne jointe par ', '
  // qu'Onboarding.jsx écrit (voir son handleComplete) — sessionToUser la
  // remappe fiablement depuis les métadonnées auth, même après un reload.
  const [selectedGoals, setSelectedGoals] = useState(() => user?.goal ? user.goal.split(', ').filter(Boolean) : [])
  const [goals, setGoals] = useState({ calories: String(appData.calorieGoal), protein: String(appData.proteinGoal) })
  const [goalsSaving, setGoalsSaving] = useState(false)
  const [goalsSaved, setGoalsSaved] = useState(false)
  // Taille/âge — nécessaires pour recalculer les calories (formule
  // utils/metabolism.js) quand un chip d'objectif est basculé, comme le
  // faisait Settings.jsx. Le poids est déjà disponible en temps réel via
  // appData.weightKg (AppContext, fetché une fois pour toute l'app) — pas
  // besoin de le redemander ici, seuls taille/âge manquent à cet écran.
  const [bodyStats, setBodyStats] = useState({ height: '', age: '' })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase.from('profiles').select('taille, age').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('[Weekly] profile fetch failed', error); return }
        if (data) {
          setBodyStats({
            height: data.taille != null ? String(data.taille) : '',
            age: data.age != null ? String(data.age) : '',
          })
        }
      })
    return () => { cancelled = true }
  }, [user?.id])

  // Même logique que l'ancien Settings.jsx : recalcule calories/protéines
  // à partir de la même formule qu'Onboarding, appelée dès qu'un chip est
  // basculé pour que les nouveaux chiffres apparaissent immédiatement dans
  // les champs ci-dessous, toujours modifiables à la main avant
  // "ENREGISTRER LES OBJECTIFS" comme n'importe quel autre objectif ici.
  function recalcCalorieGoals(goalsList) {
    const weightKg = appData.weightKg || 75
    const { calorieGoal } = calculateCalorieGoal({
      weightKg,
      heightCm: parseFloat(bodyStats.height) || 175,
      age: parseFloat(bodyStats.age) || 25,
      goals: goalsList,
      frequency: user?.frequency,
    })
    setGoals(g => ({ ...g, calories: String(calorieGoal), protein: String(Math.round(weightKg * 2)) }))
  }

  function toggleGoal(value) {
    setSelectedGoals(prev => {
      const next = prev.includes(value) ? prev.filter(g => g !== value) : [...prev, value]
      recalcCalorieGoals(next)
      return next
    })
  }

  async function saveGoals() {
    const calorieGoal = clamp(parseInt(goals.calories), BOUNDS.calorieGoal, appData.calorieGoal)
    const proteinGoal = clamp(parseInt(goals.protein), BOUNDS.proteinGoal, appData.proteinGoal)
    // Répercussion locale immédiate (l'anneau du Dashboard, les barres de
    // Nutrition, etc. lisent appData.*Goal directement).
    updateData('calorieGoal', calorieGoal)
    updateData('proteinGoal', proteinGoal)
    setGoalsSaving(true)
    // waterGoal/stepsGoal volontairement PAS envoyés — eau/pas s'éditent
    // depuis leur propre carte Dashboard (AppContext.updateGoal), et
    // AuthContext.updateUserProfile ne touche eau_ml/pas_jour que si ces
    // clés sont explicitement fournies, donc les omettre ici laisse ce qui
    // a été réglé depuis la carte intact.
    await updateUserProfile({
      goal: selectedGoals.join(', '),
      calorieGoal, proteinGoal,
      carbGoal: appData.carbsGoal, fatGoal: appData.fatGoal,
    })
    setGoalsSaving(false)
    setGoalsSaved(true)
    setTimeout(() => setGoalsSaved(false), 2000)
  }
  // Couvre les 2 fetchs qui alimentent le contenu visible (calories/résumé
  // + charges).
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    Promise.all([
      fetchWeeklyStats(user.id),
      fetchLiftProgress(user.id),
    ]).then(([stats, lifts]) => {
      setWeeklyData(stats.weeklyData)
      setSleepData(stats.sleepData)
      setWeeklySteps(stats.weeklySteps)
      setWeeklyKmRun(stats.weeklyKmRun)
      setLiftProgress(lifts)
      setLoading(false)
    })
  }, [user?.id])

  // Même fix que Dashboard.jsx/Nutrition.jsx (voir dashboard.css/JOURNAL.md)
  // : couvre le rubber-band iOS, où le fond de <body> (dégradé corail
  // partagé) reste visible au-delà des limites du wrapper interne. Classe
  // active seulement tant que ce screen est monté.
  useEffect(() => {
    document.body.classList.add('weekly-body-bg')
    return () => document.body.classList.remove('weekly-body-bg')
  }, [])

  const maxCalories = Math.max(...weeklyData.map(d => d.calories), 1)
  const loggedSleepDays = sleepData.filter(d => d.hours > 0)
  const avgSleep = loggedSleepDays.length
    ? Math.round((loggedSleepDays.reduce((s, d) => s + d.hours, 0) / loggedSleepDays.length) * 10) / 10
    : 0

  return (
    <div className="app-wrapper weekly-redesign">
      <div className="screen weekly-screen">
        <div className="screen-header" style={{ paddingTop: 56, paddingBottom: 22 }}>
          <p className="wk-eyebrow">BILAN</p>
          <h1 className="wk-title">Récap de<br />la semaine.</h1>
          <p className="wk-subtitle">{currentWeekRangeLabel()}</p>
        </div>

        <div className="wk-section-label wk-section-label-row">
          <span>{t('daily_calories')}</span>
          <span className="wk-section-goal">{t('goal')} : {appData.calorieGoal.toLocaleString('fr-FR')} kcal</span>
        </div>
        <div className="wk-calorie-card card-animated" style={{ '--delay': '0ms' }}>
          {loading ? <CalorieBarsSkeleton /> : (
            <div className="wk-calorie-bars">
              {weeklyData.map((d, i) => {
                const barH = d.calories > 0 ? Math.max(4, Math.round((d.calories / maxCalories) * BAR_MAX_HEIGHT)) : 4
                return (
                  <div key={i} className="wk-calorie-bar-col">
                    <span className="wk-calorie-bar-val">{d.calories > 0 ? d.calories.toLocaleString('fr-FR') : '—'}</span>
                    <div className="wk-calorie-bar-fill" style={{ height: `${barH}px`, background: calBarColor(d.calories, appData.calorieGoal) }} />
                    <span className="wk-calorie-bar-day">{d.day}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="wk-section-label">{t('summary')}</div>
        {loading ? <SummaryListSkeleton /> : (
          <div className="wk-summary-list">
            {[
              { label: t('workouts_done'), val: `${appData.weeklyWorkouts}/${appData.weeklyGoal}` },
              { label: t('avg_sleep'), val: loggedSleepDays.length ? `${avgSleep} h` : '—' },
              { label: t('distance_run'), val: `${Math.round(weeklyKmRun * 10) / 10} km` },
              { label: t('steps'), val: weeklySteps.toLocaleString() },
            ].map((r, idx) => (
              <div key={r.label} className="wk-summary-row card-animated" style={{ '--delay': `${100 + idx * 60}ms` }}>
                <span className="wk-summary-label">{r.label}</span>
                <span className="wk-summary-value">{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Objectif — déménagé depuis Settings.jsx (2026-08-15, demande
            explicite) : "il faut remettre l'objectif et toujours laisser
            le choix à l'utilisateur de redéfinir son objectif" reste
            valable, juste centralisé ici plutôt que dupliqué entre
            Réglages et Bilan. Settings.jsx n'affiche plus qu'un résumé en
            lecture seule de ces mêmes valeurs (user.goal/appData.*Goal,
            déjà synchronisées via les contexts partagés). */}
        <div className="wk-section-label">OBJECTIF</div>
        <div className="wk-goal-card card-animated" style={{ '--delay': '160ms' }}>
          <p className="wk-goal-hint">Ton ou tes objectifs — choisir en modifie automatiquement les calories/protéines ci-dessous.</p>
          <div className="goal-selector">
            {GOAL_OPTIONS.map(o => (
              <button
                key={o.value}
                type="button"
                className={`goal-chip${selectedGoals.includes(o.value) ? ' active' : ''}`}
                onClick={() => toggleGoal(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="wk-goal-field">
            <span className="wk-goal-field-label">{t('calories_day')}</span>
            <input type="number" value={goals.calories} onChange={e => setGoals(g => ({ ...g, calories: e.target.value }))} />
          </div>
          <div className="wk-goal-field">
            <span className="wk-goal-field-label">{t('proteins')}</span>
            <input type="number" value={goals.protein} onChange={e => setGoals(g => ({ ...g, protein: e.target.value }))} />
          </div>
          {/* Eau/Pas volontairement absents ici aussi — modifiables
              directement depuis leur carte sur le Dashboard. */}
        </div>
        <button className="wk-goal-save-btn" onClick={saveGoals} disabled={goalsSaving} style={{ opacity: goalsSaving ? 0.6 : 1 }}>
          {goalsSaving ? '...' : goalsSaved ? '✓ Enregistré' : t('save_goals')}
        </button>

        {/* Classement de la salle — audit marché 2026-08-06 (JOURNAL.md
            suite 47) : c'est le seul terrain où Volta n'a aucun concurrent
            direct, ni les trackers grand public (pas de vraie salle
            derrière) ni les plateformes B2B (pensées pour des coachs sans
            lien entre leurs clients). N'affiche que les membres avec au
            moins 1 séance cette semaine — voir le commentaire dans
            utils/leaderboard.js pour pourquoi.

            Masquée le 2026-08-13 (demande produit) : décision de ne plus
            afficher le classement pour l'instant. Code, fetch
            (fetchWeeklyLeaderboard) et vue SQL leaderboard_weekly gardés
            intacts pour reprise ultérieure — juste le rendu qui saute.
        {leaderboardLoaded && leaderboard.length > 0 && (
          <>
            <div className="section-label">CLASSEMENT DE LA SALLE — CETTE SEMAINE</div>
            <div className="card card-animated" style={{ marginBottom: 16, '--delay': '80ms' }}>
              {leaderboard.map((row, i) => {
                const isMe = row.user_id === user?.id
                return (
                  <div
                    key={row.user_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0',
                      borderBottom: i < leaderboard.length - 1 ? '0.5px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ width: 22, textAlign: 'center', fontSize: i < 3 ? 16 : 13, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {MEDALS[i] || i + 1}
                    </span>
                    <span className={`text-sm ${isMe ? 'bold text-primary' : 'text-secondary'}`} style={{ flex: 1 }}>
                      {row.prenom || 'Membre'}{isMe ? ' (toi)' : ''}
                    </span>
                    <span className={`text-sm ${isMe ? 'bold' : ''}`} style={{ color: isMe ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {row.seances_semaine} séance{row.seances_semaine > 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
        */}

        {/* Section 1 — Progression physique
            Masquée le 2026-08-13 (audit JOURNAL.md) : bloc UI statique non
            branché à aucune donnée (4 slots vides, "+" sans onClick, aucune
            table/upload derrière). Décision produit : fonctionnalité
            repoussée, pas abandonnée — code gardé pour reprise ultérieure.
        <div className="progress-section">
          <p className="section-label">MA PROGRESSION</p>
          <p className="section-sub">Photos semaine par semaine</p>
          <div className="progress-photos-row">
            {['S-3', 'S-2', 'S-1', 'Cette sem.'].map((week, i) => (
              <div key={i} className="progress-photo-slot">
                <div className="progress-photo-placeholder">
                  <span className="progress-photo-plus">+</span>
                </div>
                <p className="progress-photo-label">{week}</p>
              </div>
            ))}
          </div>
        </div>
        */}

        {/* Section 2 — Progression des charges */}
        <div className="lifts-section">
          <p className="wk-section-label" style={{ padding: 0, marginBottom: 4 }}>MES CHARGES</p>
          <p className="section-sub">Évolution sur les 4 dernières séances</p>
          {loading
            ? <LiftsSkeleton />
            : liftProgress.length
              ? liftProgress.map((lift, i) => <LiftCurve key={i} lift={lift} idx={i} />)
              : <div className="wk-lift-empty">
                  Pas encore assez de séances enregistrées pour un même exercice — reviens après quelques séances.
                </div>
          }
        </div>
      </div>

    </div>
  )
}
