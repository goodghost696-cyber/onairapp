import { createContext, useContext, useState } from 'react'

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
  water: 1800,
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

  return <AppContext.Provider value={{ appData, updateData }}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
