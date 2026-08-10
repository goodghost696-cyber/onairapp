// Shared "is this gym's coach access allowed right now" check — used by
// CoachLayout (the gate itself) and CoachSettings (the status display), so
// the two can never silently disagree about what "active" means.
//
// Business decision (JOURNAL.md, 2026-08-10): fixed monthly subscription
// per gym, 14-day free trial, and on non-payment ONLY coach access is
// blocked — members keep theirs. subscription_status mirrors Stripe's own
// subscription.status values, written by api/stripe-webhook.js.
export function isGymAccessActive(gym) {
  if (!gym) return true // no data yet (still loading, or fetch failed) — see CoachLayout for why this fails open, not closed
  if (gym.subscription_status === 'active') return true
  if (gym.subscription_status === 'trialing' && gym.trial_ends_at) {
    return new Date(gym.trial_ends_at) > new Date()
  }
  return false
}

export function trialDaysLeft(gym) {
  if (!gym?.trial_ends_at) return null
  const ms = new Date(gym.trial_ends_at) - new Date()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
