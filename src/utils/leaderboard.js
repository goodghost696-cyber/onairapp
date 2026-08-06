import { supabase } from '../lib/supabase'

// Reads from the `leaderboard_weekly` view (see scripts/supabase_schema.sql)
// rather than querying `seances` directly — that table's RLS only ever
// returns the calling user's own rows, so this is the one legitimate way
// for a member to see how their week compares to the rest of the gym.
// Members with 0 séances this week are excluded (a wall of zeroes reads as
// discouraging, not motivating — showing the classement once someone's
// actually on it is the more useful default) and the result caps at 10 so
// the card stays a glanceable "top of the gym", not a full roster dump.
export async function fetchWeeklyLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard_weekly')
    .select('user_id, prenom, seances_semaine')
    .gt('seances_semaine', 0)
    .order('seances_semaine', { ascending: false })
    .order('prenom', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[leaderboard] fetchWeeklyLeaderboard failed', error)
    return []
  }
  return data || []
}
