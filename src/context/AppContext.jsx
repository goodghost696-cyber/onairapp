import { createContext, useContext, useState, useEffect } from 'react'
import { save, load, clearDay } from '../utils/storage'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

// Local calendar date (not UTC) so "today" lines up with clearDay()'s
// device-local day boundary instead of drifting near midnight.
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function repasToMeal(row) {
  return {
    id: row.id,
    name: row.nom,
    calories: row.calories,
    protein: row.proteines,
    carbs: row.glucides,
    fat: row.lipides,
    nutriscore: row.nutriscore || 'B',
    mealType: row.type,
    time: new Date(row.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
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

const DEFAULT_SESSION_HISTORY = [
  {
    id: 1, date: 'Mar 3 juin', type: 'PUSH DAY',
    exercises: ['Bench Press', 'Incline Press', 'Cable Fly'], duration: '52 min', totalSets: 12,
    exerciseDetails: [
      { name: 'Bench Press', sets: [{ reps: 10, kg: 80 }, { reps: 8, kg: 85 }, { reps: 8, kg: 85 }, { reps: 6, kg: 90 }] },
      { name: 'Incline Dumbbell Press', sets: [{ reps: 12, kg: 28 }, { reps: 10, kg: 30 }, { reps: 10, kg: 30 }] },
      { name: 'Cable Fly', sets: [{ reps: 15, kg: 20 }, { reps: 15, kg: 20 }, { reps: 12, kg: 22 }] },
    ]
  },
  {
    id: 2, date: 'Lun 2 juin', type: 'PULL DAY',
    exercises: ['Deadlift', 'Pull-up', 'Cable Row'], duration: '48 min', totalSets: 10,
    exerciseDetails: [
      { name: 'Deadlift', sets: [{ reps: 5, kg: 120 }, { reps: 5, kg: 130 }, { reps: 3, kg: 140 }] },
      { name: 'Pull-up', sets: [{ reps: 10, kg: 0 }, { reps: 8, kg: 0 }, { reps: 8, kg: 0 }] },
      { name: 'Cable Row', sets: [{ reps: 12, kg: 60 }, { reps: 10, kg: 65 }, { reps: 10, kg: 65 }] },
    ]
  },
  {
    id: 3, date: 'Sam 1 juin', type: 'LEG DAY',
    exercises: ['Back Squat', 'Romanian Deadlift', 'Fentes'], duration: '55 min', totalSets: 14,
    exerciseDetails: [
      { name: 'Back Squat', sets: [{ reps: 8, kg: 100 }, { reps: 6, kg: 110 }, { reps: 6, kg: 110 }, { reps: 5, kg: 120 }] },
      { name: 'Romanian Deadlift', sets: [{ reps: 10, kg: 80 }, { reps: 10, kg: 80 }, { reps: 8, kg: 85 }] },
      { name: 'Fentes', sets: [{ reps: 12, kg: 40 }, { reps: 12, kg: 40 }, { reps: 10, kg: 45 }, { reps: 10, kg: 45 }] },
    ]
  },
]

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
  const [mealsLoaded, setMealsLoaded] = useState(false)
  const [appData, setAppData] = useState(() => {
    const goals = getPersonalisedGoals()
    return {
      calories: 0,
      calorieGoal: goals.calorieGoal,
      protein: 0,
      proteinGoal: goals.proteinGoal,
      carbs: 0,
      carbsGoal: goals.carbsGoal,
      fat: 0,
      fatGoal: goals.fatGoal,
      steps: load('steps', 0),
      stepsGoal: 10000,
      kmRun: load('kmRun', 0),
      water: load('water', 0),
      waterGoal: 2500,
      sleep: load('sleep', { hours: 7, minutes: 23, quality: 'Bonne' }),
      weeklyWorkouts: load('weeklyWorkouts', 4),
      weeklyGoal: 6,
      meals: [],
      weeklyData: [
        { day: 'L', calories: 2100, steps: 9200, workout: true },
        { day: 'M', calories: 1950, steps: 7800, workout: false },
        { day: 'M', calories: 2300, steps: 11000, workout: true },
        { day: 'J', calories: 1847, steps: 8247, workout: true },
        { day: 'V', calories: 0, steps: 0, workout: false },
        { day: 'S', calories: 0, steps: 0, workout: false },
        { day: 'D', calories: 0, steps: 0, workout: false },
      ],
      activeSession: { exercises: [], startTime: null, startTimestamp: null },
      sessionHistory: load('sessionHistory', DEFAULT_SESSION_HISTORY),
      runSessions: [
        { date: "Aujourd'hui", km: 5.2, time: '27:30', pace: '5:17/km', calories: 420 },
        { date: 'Mardi', km: 8.0, time: '42:15', pace: '5:17/km', calories: 640 },
        { date: 'Dimanche', km: 12.5, time: '1:05:30', pace: '5:14/km', calories: 980 },
      ],
      sleepData: [
        { day: 'L', hours: 7.5 },
        { day: 'M', hours: 6.2 },
        { day: 'M', hours: 8.0 },
        { day: 'J', hours: 7.4 },
        { day: 'V', hours: 0 },
        { day: 'S', hours: 0 },
        { day: 'D', hours: 0 },
      ],
    }
  })

  // Day reset — resets only daily metrics still backed by localStorage.
  // Meals/calories/protein/carbs/fat are no longer reset here: they're derived
  // from today's `repas` rows in Supabase, so a new day naturally comes up empty.
  useEffect(() => {
    if (clearDay()) {
      setAppData(prev => ({ ...prev, water: 0, steps: 0 }))
      save('water', 0); save('steps', 0)
    }
  }, [])

  // Persist on change
  useEffect(() => { save('water', appData.water) }, [appData.water])
  useEffect(() => { save('steps', appData.steps) }, [appData.steps])
  useEffect(() => { save('sessionHistory', appData.sessionHistory) }, [appData.sessionHistory])
  useEffect(() => { save('weeklyWorkouts', appData.weeklyWorkouts) }, [appData.weeklyWorkouts])
  useEffect(() => { save('sleep', appData.sleep) }, [appData.sleep])
  useEffect(() => { save('kmRun', appData.kmRun) }, [appData.kmRun])

  // Hydrate today's meals from Supabase whenever the authenticated user changes.
  useEffect(() => {
    if (!user?.id) {
      setAppData(prev => ({ ...prev, meals: [], calories: 0, protein: 0, carbs: 0, fat: 0 }))
      setMealsLoaded(false)
      return
    }
    let cancelled = false
    supabase
      .from('repas')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr())
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('[App] fetch repas failed', error)
          setMealsLoaded(true)
          return
        }
        const meals = (data || []).map(repasToMeal)
        setAppData(prev => ({
          ...prev,
          meals,
          calories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
          protein: meals.reduce((sum, m) => sum + (m.protein || 0), 0),
          carbs: meals.reduce((sum, m) => sum + (m.carbs || 0), 0),
          fat: meals.reduce((sum, m) => sum + (m.fat || 0), 0),
        }))
        setMealsLoaded(true)
      })
    return () => { cancelled = true }
  }, [user?.id])

  function updateData(key, value) {
    setAppData(prev => ({ ...prev, [key]: value }))
  }

  // Inserts a meal into `repas` (source of truth) then reflects it locally.
  // Returns { success, error }.
  async function addMeal({ name, calories, protein, carbs, fat, nutriscore, mealType }) {
    if (!user?.id) return { success: false, error: 'not authenticated' }
    const { data, error } = await supabase
      .from('repas')
      .insert({
        user_id: user.id,
        date: todayStr(),
        nom: name,
        calories: Math.round(calories || 0),
        proteines: protein || 0,
        glucides: carbs || 0,
        lipides: fat || 0,
        nutriscore: nutriscore || null,
        type: mealType || null,
      })
      .select()
      .single()
    if (error) {
      console.error('[App] addMeal: repas insert failed', error)
      return { success: false, error: error.message }
    }
    const meal = repasToMeal(data)
    setAppData(prev => ({
      ...prev,
      meals: [...prev.meals, meal],
      calories: prev.calories + (meal.calories || 0),
      protein: prev.protein + (meal.protein || 0),
      carbs: prev.carbs + (meal.carbs || 0),
      fat: prev.fat + (meal.fat || 0),
    }))
    return { success: true, meal }
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
      sets: Array(ex.sets).fill(null).map(() => ({ reps: '', kg: ex.kg || '', done: false })),
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

  function addSessionToHistory(session) {
    setAppData(prev => ({
      ...prev,
      sessionHistory: [session, ...prev.sessionHistory.slice(0, 9)],
      weeklyWorkouts: (prev.weeklyWorkouts || 0) + 1,
    }))
  }

  return (
    <AppContext.Provider value={{
      appData, updateData, addMeal, mealsLoaded,
      addExerciseToSession, addExercisesToSession,
      addSetToExercise, toggleSetDone, updateSet,
      clearActiveSession, addSessionToHistory,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
