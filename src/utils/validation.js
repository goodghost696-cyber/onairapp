// Shared sanity bounds for user-entered numeric values across the app —
// added after a test account's onboarding (weight 454kg, height 545cm) went
// unchecked all the way into a 10800 kcal/day goal (see JOURNAL.md 2026-07-10).
export const BOUNDS = {
  weightKg: { min: 30, max: 300 },
  heightCm: { min: 100, max: 250 },
  calorieGoal: { min: 800, max: 6000 },
  proteinGoal: { min: 20, max: 400 },
  waterGoal: { min: 500, max: 10000 },
  stepsGoal: { min: 1000, max: 50000 },
  steps: { min: 0, max: 100000 },
  water: { min: 0, max: 10000 },
  kmRun: { min: 0, max: 500 },
  sleepHours: { min: 0, max: 24 },
  grams: { min: 1, max: 5000 },
  // Guards addMeal's own write boundary (AppContext.jsx) — every path that
  // logs a meal (manual add, scan, AI recipe, AI Coach tool calls) funnels
  // through it, so clamping there is the one place that actually stops a
  // bad value from ever reaching `repas`, whatever screen or future entry
  // point produced it. Added after a report of a 222002656161 kcal meal.
  mealKcal: { min: 0, max: 5000 },
  mealMacroG: { min: 0, max: 500 },
}

export function inBounds(value, bound) {
  const n = Number(value)
  return Number.isFinite(n) && n >= bound.min && n <= bound.max
}

export function clamp(value, bound, fallback = bound.min) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, bound.min), bound.max)
}
