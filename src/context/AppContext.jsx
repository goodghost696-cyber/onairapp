import { createContext, useContext, useState } from 'react'

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

const defaultData = {
  calories: 1847,
  calorieGoal: 2400,
  protein: 142,
  proteinGoal: 180,
  carbs: 198,
  carbsGoal: 240,
  fat: 62,
  fatGoal: 80,
  steps: 8247,
  stepsGoal: 10000,
  kmRun: 5.2,
  water: 0,
  waterGoal: 2500,
  sleep: { hours: 7, minutes: 23, quality: 'Bonne' },
  weeklyWorkouts: 4,
  weeklyGoal: 6,
  todayWorkouts: [
    { name: 'Squat', sets: 4, reps: 8, weight: 100 },
    { name: 'Développé couché', sets: 3, reps: 10, weight: 80 },
    { name: 'Rowing barre', sets: 4, reps: 8, weight: 70 },
  ],
  meals: [
    { id: 1, name: 'Flocons d\'avoine + banane', calories: 380, protein: 12, carbs: 68, fat: 6, nutriscore: 'A', time: '07:30' },
    { id: 2, name: 'Poulet grillé + riz', calories: 520, protein: 45, carbs: 58, fat: 8, nutriscore: 'B', time: '12:30' },
    { id: 3, name: 'Yaourt grec + fruits rouges', calories: 210, protein: 18, carbs: 22, fat: 4, nutriscore: 'A', time: '16:00' },
    { id: 4, name: 'Saumon + légumes', calories: 480, protein: 42, carbs: 28, fat: 22, nutriscore: 'A', time: '19:30' },
    { id: 5, name: 'Whey protéine', calories: 257, protein: 25, carbs: 22, fat: 2, nutriscore: 'C', time: '14:00' },
  ],
  weeklyData: [
    { day: 'L', calories: 2100, steps: 9200, workout: true },
    { day: 'M', calories: 1950, steps: 7800, workout: false },
    { day: 'M', calories: 2300, steps: 11000, workout: true },
    { day: 'J', calories: 1847, steps: 8247, workout: true },
    { day: 'V', calories: 0, steps: 0, workout: false },
    { day: 'S', calories: 0, steps: 0, workout: false },
    { day: 'D', calories: 0, steps: 0, workout: false },
  ],
  activeSession: { exercises: [], startTime: null },
  sessionHistory: [
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
  ],
  runSessions: [
    { date: 'Aujourd\'hui', km: 5.2, time: '27:30', pace: '5:17/km', calories: 420 },
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

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [appData, setAppData] = useState(defaultData)

  function updateData(key, value) {
    setAppData(prev => ({ ...prev, [key]: value }))
  }

  function clearActiveSession() {
    setAppData(prev => ({ ...prev, activeSession: { exercises: [], startTime: null } }))
  }

  function addExerciseToSession(exercise) {
    setAppData(prev => {
      const current = prev.activeSession || { exercises: [], startTime: null }
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
      const current = prev.activeSession || { exercises: [], startTime: null }
      return {
        ...prev,
        activeSession: {
          exercises: [...current.exercises, ...formatted],
          startTime: current.startTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
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

  return <AppContext.Provider value={{ appData, updateData, addExerciseToSession, addExercisesToSession, addSetToExercise, toggleSetDone, updateSet, clearActiveSession }}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
