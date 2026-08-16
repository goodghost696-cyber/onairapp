import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp, sleepFromHours } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { save } from '../utils/storage'
import { BOUNDS, clamp } from '../utils/validation'
import { dailyRemainingCalories } from '../utils/metabolism'
import { fetchStreakDetails } from '../utils/streak'
import { fetchHabitsWithProgress, checkHabitToday, uncheckHabitToday } from '../utils/habits'
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss'
import { activable } from '../utils/a11y'
import quotes from '../data/quotes.json'
import Avatar from '../components/Avatar'
import '../styles/dashboard.css'

// Streak paliers — first shown at 7 days, then every 30 days after the
// 30-day mark ("après 30 jours, 60 jours, 90 jours etc."). Deliberately
// tied to the *live* streak, not a permanently-unlocked trophy case: if
// the streak breaks, the badge disappears until it's earned again. A
// persistent achievements history would need a whole new table + screen
// and starts turning a coaching app into a collect-everything gamified
// app — bigger than what was asked, and the direction here has been
// "premium/futuriste", not "arcade". Capped at 365 (a year) as a
// defensive bound, same pattern as calculateStreak's own maxDays.
const STREAK_MILESTONES = [7, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365]
function currentStreakMilestone(streak) {
  let milestone = null
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) milestone = m
    else break
  }
  return milestone
}

// Real weather + reverse-geocoded place name — moved here from the now-
// deleted onglet "Course" (RunContent.jsx), the only part of that screen
// that was ever genuinely real (not a fake GPS/pace/BPM simulation).
// Deliberately a single compact line merged into the existing date
// subtitle rather than its own card — the Dashboard is already dense
// (streak, calories, 4 activity cards, CTA, weekly card); a whole new
// weather card would be one block too many for what's a nice-to-have,
// not core to the app. Best-effort: silent on failure/denied permission,
// exactly like the original.
function useWeather() {
  const [weather, setWeather] = useState(null)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
        const data = await res.json()
        const code = data.current_weather?.weathercode
        const temp = Math.round(data.current_weather?.temperature)
        const emoji = code === 0 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : '⛈️'
        let place = null
        try {
          const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`)
          const geoData = await geoRes.json()
          place = geoData.city || geoData.locality || geoData.principalSubdivision || null
        } catch {}
        setWeather({ temp, emoji, place })
      } catch {}
    }, () => {})
  }, [])
  return weather
}

// Citation du jour — déterministe (jour de l'année modulo la taille du
// tableau), pas un tirage aléatoire : la même citation reste affichée
// toute la journée, y compris si l'app est fermée/rouverte plusieurs fois,
// et change automatiquement le lendemain. Remplace l'ancien composant à
// défilement (RotatingQuote, setInterval + 5 phrases sans attribution) —
// rapporté comme se chevauchant visuellement pendant la transition entre
// deux citations. src/data/quotes.json : 55 citations effort/discipline/
// sport/mental avec un vrai auteur attribué chacune, données locales
// statiques (même choix que le catalogue d'exercices — pas de dépendance
// à une API externe après la vente).
function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - start) / 86400000)
}

function QuoteOfTheDay() {
  const quote = quotes[dayOfYear(new Date()) % quotes.length]
  return (
    <div className="db-quote">
      <p className="db-quote-text">"{quote.text}"</p>
      <p className="db-quote-author">— {quote.author}</p>
    </div>
  )
}


export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { appData, updateData, updateGoal } = useApp()
  const { t } = useLanguage()
  const [editingCard, setEditingCard] = useState(null)
  const [inputVal, setInputVal] = useState('')
  // The sheet's handle bar looked draggable (standard bottom-sheet
  // convention) but did nothing — reported directly on a real screenshot.
  const swipeDismiss = useSwipeToDismiss(() => setEditingCard(null))
  // Objectif édité directement dans la sheet de la carte — "passer par
  // Réglages pour ça c'est pas ouf, il faut rendre le chemin simple". Un
  // seul state car une seule sheet est ouverte à la fois (comme inputVal).
  const [goalInputVal, setGoalInputVal] = useState('')
  const [streak, setStreak] = useState(0)
  const [restDayAvailable, setRestDayAvailable] = useState(false)
  const weather = useWeather()
  // Habitudes assignées par le coach (veille produit 2026-08-11, prop. 3) —
  // rien à afficher tant qu'aucune n'est assignée, section entière masquée
  // plutôt qu'un état vide de plus sur un dashboard déjà dense.
  const [habits, setHabits] = useState([])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchStreakDetails(user.id).then(({ streak, restDayAvailable }) => {
      if (cancelled) return
      setStreak(streak)
      setRestDayAvailable(restDayAvailable)
    })
    fetchHabitsWithProgress(user.id).then(h => { if (!cancelled) setHabits(h) })
    return () => { cancelled = true }
  }, [user?.id])

  // Le fix CSS scopé à .dashboard-redesign (min-height + ::before pour le
  // notch, voir dashboard.css) couvre le rendu normal, mais pas le
  // rubber-band iOS : en tirant la page au-delà de ses limites, on dépasse
  // la boîte du wrapper interne et on retombe sur le fond de <body>
  // (dégradé corail, global.css) — rapporté directement sur un test réel
  // (tirer en haut ET en bas). <body> est partagé par tout le reste de
  // l'app donc on ne peut pas le repeindre statiquement en CSS sans casser
  // les autres écrans (pas encore restylés) ; on pilote plutôt la couleur
  // dynamiquement, seulement pendant que ce screen est monté, et on
  // retire la classe au démontage pour que les autres écrans retrouvent
  // leur fond d'origine.
  useEffect(() => {
    document.body.classList.add('dashboard-body-bg')
    return () => document.body.classList.remove('dashboard-body-bg')
  }, [])

  // Optimiste : la coche/décoche est reflétée tout de suite dans l'état
  // local, l'écriture réelle (avec sa propre file d'attente hors-ligne côté
  // checkHabitToday) se fait derrière sans bloquer le tap.
  async function toggleHabitToday(habit) {
    const willBeDone = !habit.doneToday
    setHabits(prev => prev.map(h => h.id !== habit.id ? h : {
      ...h,
      doneToday: willBeDone,
      last7Days: [...h.last7Days.slice(0, -1), willBeDone],
      countThisWeek: h.countThisWeek + (willBeDone ? 1 : -1),
    }))
    navigator.vibrate && navigator.vibrate(8)
    if (willBeDone) await checkHabitToday(habit.id, user.id)
    else await uncheckHabitToday(habit.id, user.id)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting_morning') : hour < 18 ? t('greeting_afternoon') : t('greeting_evening')

  // Direction corail (2026-08-06): colored emoji badges instead of
  // monochrome line icons — a warm/playful palette reads better with real
  // color per card than a single neutral icon color did, per direct
  // feedback ("tu peux remmetre les emoji ça marche avec ce style").
  // Was a hardcoded 2500 regardless of the real objectif (Settings'
  // "Eau (ml)", appData.waterGoal) — the card's progress bar and the new
  // bottle picker below need to agree on the same goal, otherwise a
  // custom goal would show a full bar here but a half-empty bottle row
  // in the sheet, or vice versa.
  const waterGoalMl = appData.waterGoal || 2500
  // Was hardcoded to 10000 regardless of the real objectif configurable in
  // Réglages (appData.stepsGoal) — the bar filled against a number that
  // had nothing to do with what the member actually set for themselves.
  // Fixed the same way waterGoalMl was above.
  const stepsGoalVal = appData.stepsGoal || 10000
  // Reported directly: the bar fills but the goal it's filling towards is
  // never shown anywhere on the card — added a visible "Objectif : X"
  // line below the value on every card (see the JSX below). Follow-up
  // request: all 4 objectifs (not just steps/eau) are now editable
  // straight from the card's sheet (updateGoal, AppContext.jsx) instead of
  // Réglages — kmRun/sleep gained real persisted goals for this
  // (objectifs.km_objectif/sommeil_h_objectif) instead of staying a
  // display-only default.
  // Tints alignés sur la palette du restyle "pastel chaud" (import Claude
  // Design, 2026-08-13) — Eau garde un badge crème car sa carte entière
  // passe en fond lavande plein (.activity-card-accent, dashboard.css),
  // seule carte à fond coloré de la grille dans la maquette.
  const CARDS = [
    { key: 'steps', label: 'PAS', icon: '👟', tint: '#EBEB7D', value: appData.steps, unit: 'pas', target: stepsGoalVal },
    { key: 'kmRun', label: 'COURSE', icon: '🏃', tint: '#A3AEFE', value: appData.kmRun, unit: 'km', target: appData.kmRunGoal || 5 },
    { key: 'water', label: 'EAU', icon: '💧', tint: '#F7F1E6', value: appData.water, unit: 'ml', target: waterGoalMl },
    // Valeur en heures décimales (7h30 -> 7.5) : n'afficher que `hours`
    // laissait la carte annoncer "7h" pour une nuit de 7h30 déjà enregistrée
    // comme telle en base.
    { key: 'sleep', label: 'SOMMEIL', icon: '😴', tint: '#FFBEF0', value: Math.round(((appData.sleep?.hours || 0) + (appData.sleep?.minutes || 0) / 60) * 10) / 10, unit: 'h', target: appData.sleepGoal || 8 },
  ]
  const currentCard = CARDS.find(c => c.key === editingCard)

  // Bottles instead of a numeric keyboard for water — reported directly
  // ("je lis Eau bue ajd (ml)... on peut le rendre plus simple"). One
  // bottle = 500ml, count derived from the real goal (5 bottles for the
  // default 2500ml). Tapping bottle N fills 1..N in one tap (1500ml on
  // the 3rd); tapping the currently-last-filled bottle again empties it,
  // so a mis-tap is correctable without typing a number.
  // Icon went 💧 → custom bottle SVG (rejected, ugly) → custom glass SVG
  // → now 🥛 : asked directly to use an emoji rather than a hand-drawn
  // icon. No Unicode emoji actually depicts a glass of water — 🥛 is
  // technically milk — but it's the closest real "glass" shape available
  // and reads fine against the "verre" wording below.
  const bottleCount = Math.max(1, Math.round(waterGoalMl / 500))
  const filledBottles = Math.min(bottleCount, Math.round(appData.water / 500))

  function setWaterBottles(index) {
    const targetCount = index + 1
    const newCount = targetCount === filledBottles ? filledBottles - 1 : targetCount
    const newMl = clamp(newCount * 500, BOUNDS.water)
    updateData('water', newMl)
    save('water', newMl)
    navigator.vibrate && navigator.vibrate(8)
  }

  const handleSave = () => {
    const raw = parseFloat(inputVal)
    if (isNaN(raw) || raw < 0) { setEditingCard(null); return }
    if (editingCard === 'steps') { const num = clamp(raw, BOUNDS.steps); updateData('steps', num); save('steps', num) }
    if (editingCard === 'kmRun') { const num = clamp(raw, BOUNDS.kmRun); updateData('kmRun', num); save('kmRun', num) }
    if (editingCard === 'water') { const num = clamp(raw, BOUNDS.water); updateData('water', num); save('water', num) }
    if (editingCard === 'sleep') {
      const num = clamp(raw, BOUNDS.sleepHours)
      // `minutes: 0` en dur ici jetait silencieusement la partie décimale :
      // saisir 7.5 enregistrait 7h (constaté en test réel le 2026-08-16, en
      // base comme à l'écran). Rien d'autre dans la chaîne ne l'imposait —
      // activite_jour.sommeil_h est un `numeric` sans échelle fixe, et
      // AppContext repersiste bien `hours + minutes/60`. On réutilise donc sa
      // conversion plutôt que d'aplatir.
      const s = sleepFromHours(num)
      updateData('sleep', s); save('sleep', s)
    }
    navigator.vibrate && navigator.vibrate(8)
    setEditingCard(null)
    setInputVal('')
  }

  // Saves the objectif itself (not today's value) — separate action from
  // handleSave above on purpose, so tapping one never accidentally
  // changes the other. Bounds key matches appData's own key by
  // construction (stepsGoal/kmRunGoal/waterGoal/sleepGoal), same pattern
  // BOUNDS already follows everywhere else.
  function saveGoal() {
    const raw = parseFloat(goalInputVal)
    if (isNaN(raw) || raw <= 0 || !editingCard) return
    const goalKey = `${editingCard}Goal`
    const num = clamp(raw, BOUNDS[goalKey], currentCard?.target)
    updateGoal(goalKey, num)
    navigator.vibrate && navigator.vibrate(8)
  }

  const streakMilestone = currentStreakMilestone(streak)

  // Same fix as Nutrition.jsx's hero card: folds in today's logged
  // steps/course instead of a flat calorieGoal - calories, so activity
  // actually shows up in what's left to eat (see utils/metabolism.js).
  const { remaining: calsRemaining, activityBurn } = dailyRemainingCalories({
    calorieGoal: appData.calorieGoal || 2400,
    calories: appData.calories,
    steps: appData.steps,
    kmRun: appData.kmRun,
    weightKg: appData.weightKg,
  })

  return (
    <div className="app-wrapper dashboard-redesign">
      <div className="screen dashboard-screen">
        {/* Header — restyle VOLTA "pastel chaud" (import Claude Design,
            2026-08-13) : eyebrow magenta, avatar lavande, texte encre
            plutôt que blanc (l'écran a maintenant son propre fond crème,
            plus le dégradé corail derrière). */}
        <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingBottom: 28 }}>
          <div>
            <p className="db-eyebrow">VOLTA</p>
            <h1 className="db-greeting">{greeting}, {user?.name}.</h1>
            <p className="db-subtitle">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {weather && ` · ${weather.emoji} ${weather.temp}°C${weather.place ? ` · ${weather.place}` : ''}`}
            </p>
          </div>
          <button onClick={() => navigate('/settings')} className="db-avatar-btn" style={{ marginTop: 4 }}>
            <Avatar name={user?.name} avatarUrl={appData.avatarUrl} />
          </button>
        </div>

        {/* Citation du jour */}
        <QuoteOfTheDay />

        {/* Streak — always present now (direct request: "je veux qu'elle
            soit toujours présente"). At 0, neutral/muted treatment (dimmed
            flame) rather than hidden — reads as an invitation, not a
            failure. Restyle "pastel chaud" (2026-08-13) : carte olive
            plate, plus de bordure/glow dorée — cohérent avec l'esthétique
            flat de la maquette (aucun effet de glow nulle part ailleurs). */}
        <div className="db-streak-card card-animated" style={{ '--delay': '0ms' }}>
          <span className="db-streak-flame" style={{ opacity: streak > 0 ? 1 : 0.35 }}>🔥</span>
          <div>
            <div>
              <span className="db-streak-count">{streak} jour{streak > 1 ? 's' : ''}</span>
              <span className="db-streak-sub">{streak > 0 ? 'de suite' : "— à toi de commencer aujourd'hui"}</span>
            </div>
            {/* Palier — only the currently-active streak's highest reached
                milestone, not a permanent trophy (see STREAK_MILESTONES
                comment above). */}
            {streakMilestone && (
              <div className="db-streak-milestone">
                🏅 Palier {streakMilestone} jours
              </div>
            )}
            {/* Rest-day tolerance made visible — was already there
                silently (calculateStreak's freeze logic), reported
                directly ("rendre le jour de repos toléré visible"). */}
            {restDayAvailable && (
              <div className="db-streak-rest">
                🛡️ Jour de repos disponible cette semaine
              </div>
            )}
          </div>
        </div>

        {/* Calorie card — était un anneau (CalorieRing.jsx) sur une surface
            sombre ; converti en la même carte « hero » que Nutrition.jsx
            utilise déjà, pour garder les deux affichages de calories
            cohérents entre eux. CalorieRing.jsx (et son hook useCountUp)
            ont été supprimés en Phase 3 : plus importés nulle part depuis
            ce changement, et issus d'une direction visuelle abandonnée
            depuis le restyle « pastel chaud ». Récupérables dans l'historique
            git si le besoin revient. */}
        <div className="db-calorie-card card-animated" style={{ '--delay': '0ms' }}>
          <div className="db-calorie-top">
            <div>
              <p className="db-calorie-label">Calories du jour</p>
              <span className="db-calorie-value">{appData.calories}</span>
              <span className="db-calorie-unit">kcal</span>
            </div>
            <div className="db-calorie-restant">
              <p className="db-calorie-restant-label">Restant</p>
              <p className="db-calorie-restant-value">{calsRemaining}</p>
              {activityBurn > 0 && (
                <p className="db-calorie-restant-extra">+{activityBurn} activité</p>
              )}
            </div>
          </div>
          <div className="db-calorie-bar-wrap">
            <div className="db-calorie-bar-fill" style={{ width: `${Math.min(appData.calories / (appData.calorieGoal + activityBurn) * 100, 100)}%` }} />
          </div>
          <div className="db-macro-list">
            {[
              { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal, unit: 'g', color: 'var(--db-lavender)' },
              { label: 'Glucides', val: appData.carbs, goal: appData.carbsGoal, unit: 'g', color: 'var(--db-carb)' },
              { label: 'Lipides', val: appData.fat, goal: appData.fatGoal, unit: 'g', color: 'var(--db-pink)' },
            ].map(m => (
              <div key={m.label}>
                <div className="db-macro-top">
                  <span className="db-macro-label">{m.label}</span>
                  <span className="db-macro-value">{m.val}{m.unit} <span className="db-macro-goal">/ {m.goal}{m.unit}</span></span>
                </div>
                <div className="db-macro-bar-wrap">
                  <div className="db-macro-bar-fill" style={{ width: `${Math.min((m.val / m.goal) * 100, 100)}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity cards — kept the existing data-rich cards (live numbers
            + progress bar, tap to edit) rather than switching to the
            mockup's icon-only circles: those show no data at all, which
            would be a real functional step back for a tracking app. Took
            the part of the mockup that *is* a straightforward improvement
            instead — the icon now sits in an actual circular badge
            (.activity-card-icon-badge) instead of floating loose, matching
            the mockup's icon-circle language without losing the numbers. */}
        <p className="db-section-label">{t('activity')}</p>
        <div className="activity-grid">
          {CARDS.map((card, i) => (
            <div
              key={card.key}
              className={`activity-card-compact card-animated${card.key === 'water' ? ' activity-card-accent' : ''}`}
              style={{ '--delay': `${80 + i * 40}ms` }}
              {...activable(
                () => { setEditingCard(card.key); setInputVal(''); setGoalInputVal(String(card.target)) },
                { label: `${card.label} — modifier` },
              )}
            >
              <span className="activity-card-icon-badge" style={{ background: card.tint }}>{card.icon}</span>
              <p className="activity-card-label">{card.label}</p>
              <p className="activity-card-value">
                {card.key === 'steps' ? appData.steps.toLocaleString('fr-FR') : card.value}
                <span className="activity-card-unit"> {card.unit}</span>
              </p>
              {card.target && (
                <>
                  {/* Bar filled but towards a goal that was never shown
                      anywhere on the card — reported directly ("je ne vois
                      pas d'objectif, la jauge se remplit ok mais
                      pourquoi"). */}
                  <p className="activity-card-goal">
                    Objectif : {card.key === 'steps' ? card.target.toLocaleString('fr-FR') : card.target}{card.unit}
                  </p>
                  <div className="activity-card-bar-wrap">
                    <div
                      className="activity-card-bar-fill"
                      style={{ width: `${Math.min((card.value / card.target) * 100, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* CTA to today's workout */}
        <button onClick={() => navigate('/workout')} className="dashboard-cta-btn card-animated" style={{ '--delay': '260ms' }}>
          <span>Voir mon entraînement du jour</span>
          <span className="dashboard-cta-icon">🔥</span>
        </button>

        {/* Weekly sessions card — barre continue remplacée par des
            segments (1 par séance-objectif), même lecture que la maquette. */}
        <div className="db-weekly-card card-animated" style={{ '--delay': '320ms' }}>
          <div className="db-weekly-top">
            <span className="db-weekly-label">Séances cette semaine</span>
            <span className="db-weekly-count">
              {appData.weeklyWorkouts}<span className="db-weekly-count-total">/{appData.weeklyGoal}</span>
            </span>
          </div>
          <div className="db-weekly-segments">
            {Array.from({ length: appData.weeklyGoal }).map((_, i) => (
              <div key={i} className={`db-weekly-segment${i < appData.weeklyWorkouts ? ' filled' : ''}`} />
            ))}
          </div>
        </div>

        {/* Habitudes assignées par le coach — veille produit 2026-08-11,
            proposition n°3. Tap sur la carte pour cocher/décocher le jour,
            même geste simple que les bottles d'eau au-dessus. */}
        {habits.length > 0 && (
          <>
            <p className="db-section-label">Habitudes</p>
            <div className="db-habits-list">
              {habits.map((h, i) => (
                <div
                  key={h.id}
                  className="db-habit-card card-animated"
                  style={{ '--delay': `${360 + i * 40}ms`, '--db-habit-accent': i % 2 === 0 ? 'var(--db-olive)' : 'var(--db-lavender)' }}
                  {...activable(() => toggleHabitToday(h), {
                    role: 'checkbox',
                    'aria-checked': !!h.doneToday,
                    label: `${h.titre} — marquer comme fait aujourd'hui`,
                  })}
                >
                  <div className={`db-habit-check${h.doneToday ? ' done' : ''}`}>
                    {h.doneToday ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="db-habit-title">{h.titre}</p>
                    <div className="db-habit-days">
                      {h.last7Days.map((done, j) => (
                        <div key={j} className={`db-habit-day${done ? ' done' : ''}`} />
                      ))}
                    </div>
                  </div>
                  <span className="db-habit-count">{h.countThisWeek}/{h.frequenceParSemaine}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom sheet for editing */}
      {editingCard && (
        <>
          <div className="sheet-overlay" onClick={() => setEditingCard(null)} />
          <div className="activity-edit-sheet" style={swipeDismiss.style}>
            {/* The visible bar (.modal-handle, 36x4px) is too small a target
                to reliably grab — wrapped in a full-width padded zone that
                actually listens for the drag, same trick as ExerciseModal. */}
            <div className="sheet-drag-zone" {...swipeDismiss.handlers}>
              <div className="modal-handle" />
            </div>
            <p className="sheet-title">{currentCard?.label}</p>

            {/* Progression + objectif, réunis ici — "je peux modifier mes
                objectifs et voir ma progression" depuis la carte, sans
                passer par Réglages. Même barre que sur la carte elle-même,
                juste reprise en plus grand avec le % à côté. */}
            <div className="sheet-progress-row">
              <div className="sheet-progress-bar-wrap">
                <div
                  className="sheet-progress-bar-fill"
                  style={{ width: `${Math.min((currentCard?.value / currentCard?.target) * 100, 100)}%` }}
                />
              </div>
              <p className="sheet-progress-label">
                {currentCard?.value}{currentCard?.unit} / {currentCard?.target}{currentCard?.unit}
                {' — '}{Math.round(Math.min((currentCard?.value / currentCard?.target) * 100, 100))}%
              </p>
            </div>
            <div className="sheet-goal-row">
              <span className="sheet-goal-label">Objectif</span>
              <input
                className="sheet-goal-input"
                type="number"
                inputMode="decimal"
                value={goalInputVal}
                onChange={e => setGoalInputVal(e.target.value)}
                onBlur={saveGoal}
                onKeyDown={e => e.key === 'Enter' && (saveGoal(), e.target.blur())}
              />
              <span className="sheet-goal-unit">{currentCard?.unit}</span>
            </div>

            <p className="sheet-subtitle">
              {editingCard === 'steps' && "Nombre de pas aujourd'hui"}
              {editingCard === 'kmRun' && "Km courus aujourd'hui"}
              {editingCard === 'water' && "Combien de verres as-tu bus ?"}
              {editingCard === 'sleep' && "Heures de sommeil cette nuit"}
            </p>
            {editingCard === 'water' ? (
              <>
                <div className="water-bottle-row">
                  {Array.from({ length: bottleCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`water-bottle-btn${i < filledBottles ? ' filled' : ''}`}
                      onClick={() => setWaterBottles(i)}
                      aria-label={`${(i + 1) * 500}ml`}
                    >
                      🥛
                    </button>
                  ))}
                </div>
                <p className="sheet-subtitle" style={{ marginTop: 12, marginBottom: 20 }}>
                  Chaque verre = 500ml
                </p>
                <button className="sheet-cancel-btn" onClick={() => setEditingCard(null)}>Fermer</button>
              </>
            ) : (
              <>
                <input
                  className="sheet-input"
                  type="text"
                  inputMode="decimal"
                  placeholder={String(CARDS.find(c => c.key === editingCard)?.value || '0')}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <button className="sheet-save-btn" onClick={handleSave}>ENREGISTRER</button>
                <button className="sheet-cancel-btn" onClick={() => setEditingCard(null)}>Annuler</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
