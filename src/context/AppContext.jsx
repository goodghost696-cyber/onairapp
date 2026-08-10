import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { save, load, clearDay } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { writeWithQueue } from '../utils/writeQueue'
import { useAuth } from './AuthContext'
import { BOUNDS, clamp } from '../utils/validation'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function mealFromRow(r) {
  return {
    id: r.id,
    name: r.nom,
    calories: r.calories || 0,
    protein: Number(r.proteines) || 0,
    carbs: Number(r.glucides) || 0,
    fat: Number(r.lipides) || 0,
    nutriscore: r.nutriscore || 'B',
    mealType: r.type_repas || null,
    time: new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }
}

// Reconstructs the {hours, minutes, quality} shape the UI expects from the
// single `sommeil_h` numeric column activite_jour actually stores.
function sleepFromHours(h) {
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  const quality = h >= 7 ? 'GOOD' : h >= 5 ? 'FAIR' : 'POOR'
  return { hours, minutes, quality }
}

function seanceFromRow(row) {
  const exercices = row.exercices || []
  return {
    id: row.id,
    date: new Date(`${row.date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    type: row.nom || 'SÉANCE',
    exercises: exercices.map(e => e.name),
    duration: `${row.duree_min || 0} min`,
    totalSets: exercices.reduce((acc, e) => acc + (e.sets?.length || 0), 0),
    exerciseDetails: exercices,
  }
}

export const FOOD_DATABASE = [
  { id:'f1',  name:'Blanc de poulet',     per100g: { kcal:110, proteins:23,  carbs:0,   fats:2   }},
  { id:'f2',  name:'Riz blanc cuit',      per100g: { kcal:130, proteins:2.7, carbs:28,  fats:0.3 }},
  { id:'f3',  name:'Oeuf entier',         per100g: { kcal:155, proteins:13,  carbs:1,   fats:11  }},
  { id:'f4',  name:"Flocons d'avoine",    per100g: { kcal:370, proteins:13,  carbs:58,  fats:7   }},
  { id:'f5',  name:'Saumon grillé',       per100g: { kcal:208, proteins:20,  carbs:0,   fats:13  }},
  { id:'f6',  name:'Patate douce',        per100g: { kcal:86,  proteins:1.6, carbs:20,  fats:0.1 }},
  { id:'f7',  name:'Greek Yogurt',        per100g: { kcal:59,  proteins:10,  carbs:4,   fats:0.4 }},
  { id:'f8',  name:'Banane',              per100g: { kcal:89,  proteins:1.1, carbs:23,  fats:0.3 }},
  { id:'f9',  name:'Amandes',             per100g: { kcal:579, proteins:21,  carbs:22,  fats:50  }},
  { id:'f10', name:'Quinoa cuit',         per100g: { kcal:120, proteins:4,   carbs:21,  fats:2   }},
  { id:'f11', name:'Avocat',              per100g: { kcal:160, proteins:2,   carbs:9,   fats:15  }},
  { id:'f12', name:'Boeuf haché 5%',      per100g: { kcal:137, proteins:21,  carbs:0,   fats:5   }},
  { id:'f13', name:'Pain complet',        per100g: { kcal:247, proteins:9,   carbs:41,  fats:3   }},
  { id:'f14', name:'Cottage cheese',      per100g: { kcal:98,  proteins:11,  carbs:3,   fats:4   }},
  { id:'f15', name:'Blueberries',         per100g: { kcal:57,  proteins:0.7, carbs:14,  fats:0.3 }},
  { id:'f16', name:'Granola',             per100g: { kcal:390, proteins:9,   carbs:60,  fats:12  }},
  { id:'f17', name:'Thon en boîte',       per100g: { kcal:116, proteins:26,  carbs:0,   fats:1   }},
  { id:'f18', name:'Lait demi-écrémé',    per100g: { kcal:46,  proteins:3.2, carbs:4.8, fats:1.5 }},
  { id:'f19', name:'Whey protéine',       per100g: { kcal:380, proteins:80,  carbs:5,   fats:3   }},
  { id:'f20', name:"Huile d'olive",       per100g: { kcal:884, proteins:0,   carbs:0,   fats:100 }},
]

// Était 3 séances d'exemple (PUSH/PULL/LEG DAY, charges précises type
// "développé couché 90kg") — un nouveau membre les voyait dans son propre
// historique dès l'inscription, sans rien qui les signale comme des
// exemples. Elles disparaissaient normalement dès que la vraie requête
// `seances` aboutissait (voir l'effet plus bas), mais restaient visibles
// jusque-là, écrites dans le localStorage entre-temps, et seraient restées
// pour de bon si cette requête échouait. Même défaut que l'onglet Course au
// GPS simulé, supprimé en suite 82 — repéré en relisant l'app comme un
// utilisateur (2026-08-10). Un membre démarre maintenant sur un historique
// vide, avec un vrai message plutôt qu'un faux contenu (voir Workout.jsx).
const DEFAULT_SESSION_HISTORY = []

function getPersonalisedGoals() {
  try {
    const user = JSON.parse(localStorage.getItem('onair_user') || '{}')
    return {
      calorieGoal: parseInt(localStorage.getItem('onair_calorieGoal')) || user.calorieGoal || 2400,
      proteinGoal: user.proteinGoal || 180,
      carbsGoal: user.carbGoal || 240,
      fatGoal: user.fatGoal || 80,
    }
  } catch { return { calorieGoal: 2400, proteinGoal: 180, carbsGoal: 240, fatGoal: 80 } }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user } = useAuth()
  // Guards the activite_jour persist-effects below from firing with stale
  // localStorage/default values before the day's real row has been fetched.
  const [activiteLoaded, setActiviteLoaded] = useState(false)
  // activiteLoaded only guarded writes BEFORE the fetch — not the write
  // that fires ON the exact transition to true, which still carries
  // whatever appData held right then (a previous day's cached value, or
  // the hardcoded seed default like sleep's {hours:7,minutes:23}). That
  // write was real and silent: confirmed in production, every single day
  // since the earliest row, activite_jour.sommeil_h sat at exactly
  // 7.3833...h (7h23, the untouched default) and pas/eau_ml/km_courus at
  // 0 — not because nothing was tracked, but because this effect was
  // re-persisting the unedited default back over each new day's row
  // before the user ever touched anything. One ref per field skips
  // exactly that first post-load run; any later change is a real edit
  // and persists normally.
  const skipFirstPersist = useRef({ water: true, steps: true, kmRun: true, sleep: true })
  const [appData, setAppData] = useState(() => {
    const goals = getPersonalisedGoals()
    return {
      calories: load('calories', 0),
      calorieGoal: goals.calorieGoal,
      protein: load('protein', 0),
      proteinGoal: goals.proteinGoal,
      carbs: load('carbs', 0),
      carbsGoal: goals.carbsGoal,
      fat: load('fat', 0),
      fatGoal: goals.fatGoal,
      steps: load('steps', 0),
      stepsGoal: 10000,
      kmRun: load('kmRun', 0),
      // Was display-only (Dashboard hardcoded 5/8) — now a real objectif,
      // modifiable straight from the card ("chemin simple", pas besoin de
      // Réglages), matching stepsGoal/waterGoal below. Same defaults as
      // the DB columns' own defaults (objectifs.km_objectif/sommeil_h_objectif).
      kmRunGoal: 5,
      // Used only for the running-calorie-burn estimate (utils/metabolism.js)
      // — a reasonable adult default until the real profile loads below.
      weightKg: 75,
      water: load('water', 0),
      waterGoal: 2500,
      sleep: load('sleep', { hours: 7, minutes: 23, quality: 'Bonne' }),
      sleepGoal: 8,
      // Était 4 par défaut — même défaut que sessionHistory ci-dessous : un
      // membre qui vient de s'inscrire voyait "4/6 séances" avec une barre
      // aux deux tiers pleine, avant que la vraie requête `seances` (plus
      // bas) ne l'écrase à sa vraie valeur. Repéré en même temps, même
      // correctif : démarrer à zéro, comme calories/water/steps.
      weeklyWorkouts: load('weeklyWorkouts', 0),
      weeklyGoal: 6,
      // Étaient 5 repas d'exemple par défaut — le reset quotidien juste plus
      // bas (clearDay()) les efface dès le premier montage sur un compte
      // neuf, mais entre le rendu initial (qui lit déjà ce défaut) et l'effet
      // qui les vide, ils apparaissaient brièvement. Même correctif que
      // sessionHistory/weeklyWorkouts ci-dessus : démarrer vide.
      meals: load('meals', []),
      activeSession: { exercises: [], startTime: null, startTimestamp: null },
      sessionHistory: load('sessionHistory', DEFAULT_SESSION_HISTORY),
    }
  })

  // Day reset — resets only daily metrics. sleep/kmRun were missing here
  // (only calories/water/steps/protein/carbs/fat/meals were reset) — on a
  // fresh local day, before the Supabase fetch below finds today's row
  // (there isn't one yet), appData.sleep/.kmRun kept showing yesterday's
  // cached number instead of a blank slate, unlike everything else.
  useEffect(() => {
    if (clearDay()) {
      const freshSleep = sleepFromHours(0)
      setAppData(prev => ({ ...prev, calories: 0, water: 0, steps: 0, protein: 0, carbs: 0, fat: 0, meals: [], sleep: freshSleep, kmRun: 0 }))
      save('calories', 0); save('water', 0); save('steps', 0)
      save('protein', 0); save('carbs', 0); save('fat', 0); save('meals', [])
      save('sleep', freshSleep); save('kmRun', 0)
    }
  }, [])

  // Load today's real meals + calorie/macro goals from Supabase once a user is known.
  // This is the source of truth once available — it overrides the localStorage seed above.
  useEffect(() => {
    if (!user?.id) return
    const today = todayStr()

    supabase
      .from('repas')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('[App] fetch repas failed', error)
          return
        }
        const meals = (data || []).map(mealFromRow)
        const rawTotals = meals.reduce((acc, m) => ({
          calories: acc.calories + m.calories,
          protein: acc.protein + m.protein,
          carbs: acc.carbs + m.carbs,
          fat: acc.fat + m.fat,
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
        // This reduce runs on every fetch (page load/refresh) — the actual
        // source of the "51.10000000000001G" bug reported on a real
        // screenshot, not just the addMeal/deleteMeal state updates below
        // (those only matter until the next refresh recomputes from
        // scratch here). Same 1-decimal rounding applied.
        const round1 = n => Math.round(n * 10) / 10
        const totals = {
          calories: Math.round(rawTotals.calories),
          protein: round1(rawTotals.protein),
          carbs: round1(rawTotals.carbs),
          fat: round1(rawTotals.fat),
        }
        setAppData(prev => ({ ...prev, meals, ...totals }))
      })

    supabase
      .from('objectifs')
      .select('calories_jour, proteines, glucides, lipides, eau_ml, pas_jour, km_objectif, sommeil_h_objectif')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        setAppData(prev => ({
          ...prev,
          calorieGoal: data.calories_jour ?? prev.calorieGoal,
          proteinGoal: data.proteines ?? prev.proteinGoal,
          carbsGoal: data.glucides ?? prev.carbsGoal,
          fatGoal: data.lipides ?? prev.fatGoal,
          waterGoal: data.eau_ml ?? prev.waterGoal,
          stepsGoal: data.pas_jour ?? prev.stepsGoal,
          kmRunGoal: data.km_objectif ?? prev.kmRunGoal,
          sleepGoal: data.sommeil_h_objectif ?? prev.sleepGoal,
        }))
      })

    // Real body weight, used only for the running-calorie-burn estimate in
    // utils/metabolism.js — everything else calorie-related already goes
    // through objectifs/repas above.
    supabase
      .from('profiles')
      .select('poids')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('[App] fetch profile weight failed', error); return }
        if (data?.poids != null) setAppData(prev => ({ ...prev, weightKg: data.poids }))
      })
  }, [user?.id])

  // Load today's real water/steps/sleep/run from Supabase once a user is known.
  useEffect(() => {
    if (!user?.id) { setActiviteLoaded(false); return }
    let cancelled = false
    supabase
      .from('activite_jour')
      .select('pas, eau_ml, sommeil_h, km_courus')
      .eq('user_id', user.id)
      .eq('date', todayStr())
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('[App] fetch activite_jour failed', error)
        } else if (data) {
          setAppData(prev => ({
            ...prev,
            steps: data.pas ?? prev.steps,
            water: data.eau_ml ?? prev.water,
            kmRun: data.km_courus != null ? Number(data.km_courus) : prev.kmRun,
            sleep: data.sommeil_h != null ? sleepFromHours(Number(data.sommeil_h)) : prev.sleep,
          }))
        }
        setActiviteLoaded(true)
      })
    return () => { cancelled = true }
  }, [user?.id])

  // Load recent seances from Supabase once a user is known — replaces the
  // localStorage/demo seed above, and derives a real "workouts this week"
  // count instead of the old ever-incrementing local counter.
  useEffect(() => {
    if (!user?.id) return
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    const weekAgoStr = weekAgo.toISOString().slice(0, 10)

    supabase
      .from('seances')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (error) {
          console.error('[App] fetch seances failed', error)
          return
        }
        const rows = data || []
        const sessionHistory = rows.slice(0, 10).map(seanceFromRow)
        const weeklyWorkouts = rows.filter(r => r.date >= weekAgoStr).length
        setAppData(prev => ({ ...prev, sessionHistory, weeklyWorkouts }))
      })
  }, [user?.id])

  // Persist water/steps/sleep/run to activite_jour whenever they change —
  // gated on activiteLoaded so we never write back the pre-fetch defaults
  // over a real row that hasn't loaded yet, AND skipping the exact first
  // run once activiteLoaded flips true (see skipFirstPersist above) so
  // that transition itself — carrying whatever value was already in
  // appData, real or default, not a user edit — never gets written back.
  // clamp() below is a second line of defense, not the primary guard — the
  // UI inputs (Dashboard, AI Coach tool calls) already clamp before calling
  // updateData. This just guarantees nothing absurd can reach the DB even
  // from a future caller that forgets to, since every write to these
  // columns funnels through these four effects.
  useEffect(() => {
    if (!user?.id || !activiteLoaded) return
    if (skipFirstPersist.current.water) { skipFirstPersist.current.water = false; return }
    writeWithQueue({
      table: 'activite_jour', op: 'upsert', onConflict: 'user_id,date',
      payload: { user_id: user.id, date: todayStr(), eau_ml: clamp(appData.water, BOUNDS.water) },
    })
  }, [appData.water, activiteLoaded, user?.id])

  useEffect(() => {
    if (!user?.id || !activiteLoaded) return
    if (skipFirstPersist.current.steps) { skipFirstPersist.current.steps = false; return }
    writeWithQueue({
      table: 'activite_jour', op: 'upsert', onConflict: 'user_id,date',
      payload: { user_id: user.id, date: todayStr(), pas: clamp(appData.steps, BOUNDS.steps) },
    })
  }, [appData.steps, activiteLoaded, user?.id])

  useEffect(() => {
    if (!user?.id || !activiteLoaded) return
    if (skipFirstPersist.current.kmRun) { skipFirstPersist.current.kmRun = false; return }
    writeWithQueue({
      table: 'activite_jour', op: 'upsert', onConflict: 'user_id,date',
      payload: { user_id: user.id, date: todayStr(), km_courus: clamp(appData.kmRun, BOUNDS.kmRun) },
    })
  }, [appData.kmRun, activiteLoaded, user?.id])

  useEffect(() => {
    if (!user?.id || !activiteLoaded) return
    if (skipFirstPersist.current.sleep) { skipFirstPersist.current.sleep = false; return }
    const hours = clamp((appData.sleep?.hours || 0) + (appData.sleep?.minutes || 0) / 60, BOUNDS.sleepHours)
    writeWithQueue({
      table: 'activite_jour', op: 'upsert', onConflict: 'user_id,date',
      payload: { user_id: user.id, date: todayStr(), sommeil_h: hours },
    })
  }, [appData.sleep, activiteLoaded, user?.id])

  // Persist on change
  useEffect(() => { save('calories', appData.calories) }, [appData.calories])
  useEffect(() => { save('water', appData.water) }, [appData.water])
  useEffect(() => { save('steps', appData.steps) }, [appData.steps])
  useEffect(() => { save('protein', appData.protein) }, [appData.protein])
  useEffect(() => { save('carbs', appData.carbs) }, [appData.carbs])
  useEffect(() => { save('fat', appData.fat) }, [appData.fat])
  useEffect(() => { save('meals', appData.meals) }, [appData.meals])
  useEffect(() => { save('sessionHistory', appData.sessionHistory) }, [appData.sessionHistory])
  useEffect(() => { save('weeklyWorkouts', appData.weeklyWorkouts) }, [appData.weeklyWorkouts])
  useEffect(() => { save('sleep', appData.sleep) }, [appData.sleep])
  useEffect(() => { save('kmRun', appData.kmRun) }, [appData.kmRun])

  function updateData(key, value) {
    setAppData(prev => ({ ...prev, [key]: value }))
  }

  // Objectifs des cartes d'activité (Dashboard) — jusqu'ici seuls steps/eau
  // étaient réglables, et seulement depuis Réglages (Settings.jsx's
  // saveGoals -> AuthContext.updateUserProfile, qui upsert TOUT `objectifs`
  // d'un coup). Reporté directement : passer par Réglages pour ça "c'est
  // pas ouf" — l'utilisateur veut modifier l'objectif directement en tapant
  // sur la carte concernée. D'où ce upsert ciblé, une seule colonne à la
  // fois, appelé depuis la sheet d'édition de chaque carte (Dashboard.jsx)
  // au lieu de repasser par le flow complet de Réglages.
  const GOAL_COLUMNS = { stepsGoal: 'pas_jour', waterGoal: 'eau_ml', kmRunGoal: 'km_objectif', sleepGoal: 'sommeil_h_objectif' }
  async function updateGoal(key, value) {
    setAppData(prev => ({ ...prev, [key]: value }))
    const column = GOAL_COLUMNS[key]
    if (!column || !user?.id) return
    // Valeur absolue + onConflict user_id : rejouable sans risque. Deux
    // réglages de colonnes différentes ne se collapsent pas entre eux dans
    // la file (jeux de colonnes différents), deux réglages de la MÊME
    // colonne si — seul le dernier compte, c'est le comportement voulu.
    await writeWithQueue({
      table: 'objectifs', op: 'upsert', onConflict: 'user_id',
      payload: { user_id: user.id, [column]: value },
    })
  }

  function clearActiveSession() {
    setAppData(prev => ({ ...prev, activeSession: { exercises: [], startTime: null, startTimestamp: null } }))
  }

  function addExerciseToSession(exercise) {
    setAppData(prev => {
      const current = prev.activeSession || { exercises: [], startTime: null, startTimestamp: null }
      const exists = current.exercises.find(e => e.id === exercise.id)
      if (exists) return prev
      return {
        ...prev,
        activeSession: {
          exercises: [...current.exercises, {
            ...exercise,
            sets: [{ reps: '', kg: '', done: false }],
          }],
          startTime: current.startTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          startTimestamp: current.startTimestamp || Date.now(),
        }
      }
    })
  }

  function addExercisesToSession(exercises) {
    const formatted = exercises.map(ex => ({
      id: `ai_${Date.now()}_${Math.random()}`,
      name: ex.name,
      muscles: '',
      sets: Array(ex.sets).fill(null).map(() => ({ reps: '', kg: ex.kg ?? '', done: false })),
      suggested: { reps: ex.reps, kg: ex.kg, rest: ex.rest }
    }))
    setAppData(prev => {
      const current = prev.activeSession || { exercises: [], startTime: null, startTimestamp: null }
      return {
        ...prev,
        activeSession: {
          exercises: [...current.exercises, ...formatted],
          startTime: current.startTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          startTimestamp: current.startTimestamp || Date.now(),
        }
      }
    })
  }

  function addSetToExercise(exIdx) {
    setAppData(prev => {
      const exercises = [...(prev.activeSession?.exercises || [])]
      exercises[exIdx] = {
        ...exercises[exIdx],
        sets: [...exercises[exIdx].sets, { reps: '', kg: '', done: false }],
      }
      return { ...prev, activeSession: { ...prev.activeSession, exercises } }
    })
  }

  function toggleSetDone(exIdx, setIdx) {
    setAppData(prev => {
      const exercises = [...(prev.activeSession?.exercises || [])]
      const sets = [...exercises[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], done: !sets[setIdx].done }
      exercises[exIdx] = { ...exercises[exIdx], sets }
      return { ...prev, activeSession: { ...prev.activeSession, exercises } }
    })
  }

  function updateSet(exIdx, setIdx, field, value) {
    setAppData(prev => {
      const exercises = [...(prev.activeSession?.exercises || [])]
      const sets = [...exercises[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      exercises[exIdx] = { ...exercises[exIdx], sets }
      return { ...prev, activeSession: { ...prev.activeSession, exercises } }
    })
  }

  // Persists a completed session to `seances` and reflects it in local state.
  // Falls back to the locally-built session (temp id) if the write fails.
  async function addSessionToHistory(session) {
    let entry = session

    if (user?.id) {
      const { data } = await writeWithQueue({
        table: 'seances',
        op: 'insert',
        returning: true,
        payload: {
          user_id: user.id,
          date: todayStr(),
          nom: session.type,
          duree_min: session.durationMin,
          exercices: session.exerciseDetails,
        },
      })
      if (data) entry = seanceFromRow(data)
    }

    setAppData(prev => ({
      ...prev,
      sessionHistory: [entry, ...prev.sessionHistory.slice(0, 9)],
      weeklyWorkouts: (prev.weeklyWorkouts || 0) + 1,
    }))
  }

  // Logs a single exercise outside the full "start a session" flow — e.g. the
  // member already finished training and just forgot to add one exercise.
  // Inserted as its own standalone `seances` row rather than editing an
  // existing one: `seances` has no UPDATE policy (see security audit), so
  // amending today's real session isn't possible without a schema change.
  // Deliberately does NOT increment weeklyWorkouts — this is one exercise,
  // not a full session, so it shouldn't inflate the "X/6 séances" counters.
  async function logQuickExercise({ name, setsCount, reps, kg }) {
    const sets = Array.from({ length: setsCount }, () => ({ reps, kg }))
    let entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
      type: name,
      exercises: [name],
      duration: '0 min',
      totalSets: setsCount,
      exerciseDetails: [{ name, sets }],
    }

    if (user?.id) {
      const { data } = await writeWithQueue({
        table: 'seances',
        op: 'insert',
        returning: true,
        payload: {
          user_id: user.id,
          date: todayStr(),
          nom: name,
          duree_min: 0,
          exercices: [{ name, sets }],
        },
      })
      if (data) entry = seanceFromRow(data)
    }

    setAppData(prev => ({
      ...prev,
      sessionHistory: [entry, ...prev.sessionHistory.slice(0, 9)],
    }))
  }

  // Persists a meal to `repas` and reflects it (+ its totals) in local state.
  // L'interface ne bloque toujours pas sur le réseau (bon réflexe d'origine),
  // mais une écriture ratée part maintenant en file de rejeu au lieu d'être
  // perdue en silence — voir writeQueue.js (audit 2026-08-10, point 02).
  //
  // Seul rejeu non strictement idempotent de l'app : si l'insertion a en
  // fait réussi mais que la réponse s'est perdue, le rejeu crée un doublon.
  // Assumé — `repas` n'a pas de colonne d'idempotence, et un repas en double
  // se supprime d'un geste, alors qu'un repas perdu ne se récupère jamais.
  //
  // Limite connue, assumée elle aussi : un repas mis en file garde un id
  // temporaire (Date.now()) côté local, alors que le rejeu lui donnera un
  // vrai uuid en base. Le supprimer AVANT le prochain rechargement ne
  // supprimera donc pas la ligne réelle, et il réapparaîtra au
  // rafraîchissement. Fenêtre étroite (même session, ajout hors ligne puis
  // suppression immédiate) et ça se répare tout seul au rechargement, qui
  // relit les vrais ids. Corriger proprement demanderait une colonne
  // d'idempotence sur `repas` — pas fait ici pour rester sur le périmètre.
  async function addMeal({ name, calories, protein, carbs, fat, nutriscore, mealType }) {
    // Write-boundary clamp — every caller (manual add, Scan, AI recipe, AI
    // Coach tool calls) goes through this one function, so this is the
    // single place that guarantees a bad value (typo, scan glitch, bad AI
    // output) never reaches `repas`. Reported case: a 222002656161 kcal meal.
    calories = clamp(calories, BOUNDS.mealKcal)
    protein = clamp(protein, BOUNDS.mealMacroG)
    carbs = clamp(carbs, BOUNDS.mealMacroG)
    fat = clamp(fat, BOUNDS.mealMacroG)

    let meal = {
      id: Date.now(),
      name, calories, protein, carbs, fat,
      nutriscore: nutriscore || 'B',
      mealType: mealType || null,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }

    if (user?.id) {
      const { data } = await writeWithQueue({
        table: 'repas',
        op: 'insert',
        returning: true,
        payload: {
          user_id: user.id,
          nom: name,
          calories,
          proteines: protein,
          glucides: carbs,
          lipides: fat,
          nutriscore: nutriscore || null,
          type_repas: mealType || null,
        },
      })
      if (data) meal = mealFromRow(data)
    }

    // Raw float addition (0.1 + 0.2-style JS rounding error) — reported
    // directly on a real screenshot ("LIPIDES 51.10000000000001G"). Round
    // to 1 decimal on every accumulation, same precision already used
    // when these values are computed per-meal elsewhere (Nutrition.jsx's
    // calcNutrition, foodEstimate.js).
    const round1 = n => Math.round(n * 10) / 10
    setAppData(prev => ({
      ...prev,
      meals: [...prev.meals, meal],
      calories: Math.round(prev.calories + meal.calories),
      protein: round1(prev.protein + meal.protein),
      carbs: round1(prev.carbs + meal.carbs),
      fat: round1(prev.fat + meal.fat),
    }))
  }

  // Deletes a meal from `repas` (repas has no update policy — correcting a
  // mistake is delete-then-re-add) and subtracts it from today's totals.
  async function deleteMeal(mealId) {
    if (user?.id) {
      // Rejouable sans risque : supprimer une ligne déjà supprimée est un
      // no-op. Un repas effacé qui "revient" au rafraîchissement était le
      // symptôme inverse du même bug (audit 2026-08-10, point 02).
      await writeWithQueue({
        table: 'repas',
        op: 'delete',
        match: { id: mealId, user_id: user.id },
      })
    }
    setAppData(prev => {
      const meal = prev.meals.find(m => m.id === mealId)
      if (!meal) return prev
      // Same float rounding as addMeal above, symmetric on the way out.
      const round1 = n => Math.round(n * 10) / 10
      return {
        ...prev,
        meals: prev.meals.filter(m => m.id !== mealId),
        calories: Math.max(0, Math.round(prev.calories - meal.calories)),
        protein: Math.max(0, round1(prev.protein - meal.protein)),
        carbs: Math.max(0, round1(prev.carbs - meal.carbs)),
        fat: Math.max(0, round1(prev.fat - meal.fat)),
      }
    })
  }

  return (
    <AppContext.Provider value={{
      appData, updateData, updateGoal,
      addExerciseToSession, addExercisesToSession,
      addSetToExercise, toggleSetDone, updateSet,
      clearActiveSession, addSessionToHistory, logQuickExercise,
      addMeal, deleteMeal,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
