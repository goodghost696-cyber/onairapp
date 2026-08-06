// Shared calorie math — centralizes what used to be a one-off inline
// calculation in Onboarding.jsx, so it can also drive a live daily budget
// (AppContext) instead of only a static number set once at signup.
//
// Mifflin-St Jeor for BMR. No sex/gender field exists in `profiles` yet
// (only poids/taille/age), so this keeps the same unisex approximation
// Onboarding already used (the male "+5" constant) rather than silently
// picking one gender for everyone — a real per-sex formula needs that
// field first. Documented here so it's an explicit, known simplification,
// not an accident.
export function calculateBMR({ weightKg, heightCm, age }) {
  const w = Number(weightKg) || 75
  const h = Number(heightCm) || 175
  const a = Number(age) || 25
  return Math.round(10 * w + 6.25 * h - 5 * a + 5)
}

const GOAL_MULTIPLIERS = {
  'Perte de poids': 0.8,
  'Prise de masse': 1.1,
  'Nutrition': 1,
  'Performance': 1.05,
}

// Averages the multipliers of every selected goal — a member training for
// both "perte de poids" and "performance" at once lands between the two
// instead of only ever using whichever goal happened to be first. `goals`
// accepts either a single string (legacy accounts, pre-multi-select) or
// an array.
export function goalMultiplier(goals) {
  const list = Array.isArray(goals) ? goals : [goals].filter(Boolean)
  if (list.length === 0) return 1
  const sum = list.reduce((s, g) => s + (GOAL_MULTIPLIERS[g] ?? 1), 0)
  return sum / list.length
}

const ACTIVITY_MULTIPLIERS = { '2-3': 1.375, '4-5': 1.55, '6-7': 1.725 }

export function calculateCalorieGoal({ weightKg, heightCm, age, goals, frequency }) {
  const bmr = calculateBMR({ weightKg, heightCm, age })
  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[frequency] || 1.55))
  const calorieGoal = Math.round(tdee * goalMultiplier(goals))
  return { bmr, tdee, calorieGoal }
}

// Kcal burned by today's *logged* activity (steps + running) — added on
// top of the baseline goal so the day's real budget moves the way it does
// in Yazio: walk more, eat more room. Deliberately simple, widely-cited
// rough formulas rather than a full metabolic model — there's no heart
// rate/VO2 data available. Doesn't include lifting sessions yet (no
// reliable per-session duration/intensity signal in appData today) —
// steps + running cover the concrete example this was requested from
// ("2h de marche = 600 kcal").
export function estimateActivityBurn({ steps = 0, kmRun = 0, weightKg = 75 }) {
  // ~0.045 kcal/step for an average adult stride (commonly cited range is
  // 0.04-0.05 kcal/step depending on weight and pace — picked the midpoint).
  const stepsBurn = steps * 0.045
  // Running: ~1 kcal per kg of body weight per km — a standard rough
  // estimate, dominated by distance and mass rather than pace.
  const runningBurn = kmRun * (Number(weightKg) || 75)
  return Math.round(stepsBurn + runningBurn)
}

// The actual number shown to the member as "what you can still eat today"
// — baseline goal (set at onboarding / editable in Settings, itself BMR-
// derived) plus today's logged activity burn, minus what's already been
// eaten. This is what fixes recipe ideas defaulting near 1000 kcal for a
// snack: previously that used calorieGoal - calories directly, now it
// factors in real activity too, and (see Nutrition.jsx) gets capped per
// meal type on top of this.
export function dailyRemainingCalories({ calorieGoal, calories, steps, kmRun, weightKg }) {
  const activityBurn = estimateActivityBurn({ steps, kmRun, weightKg })
  return {
    activityBurn,
    remaining: Math.max(0, Math.round((calorieGoal || 0) + activityBurn - (calories || 0))),
  }
}
