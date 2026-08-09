import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Daily job (see vercel.json's "crons" entry), same shape as
// inactivity-nudge.js (duplicated createClient/logic for the same reason:
// this plain Node runtime can't import src/utils/streak.js, which pulls in
// lib/supabase.js and its import.meta.env, Vite-only).
//
// Purpose: for a member with an active streak who hasn't logged anything
// yet TODAY, send one positively-framed nudge in the evening — never
// phrased as a loss ("tu vas perdre ton streak"), always as an invitation
// to keep it going. Explicit constraint from the original streak spec,
// still honored here now that a notification actually exists.
const LOOKBACK_DAYS = 120;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}
function addDaysStr(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.abs(Math.round((new Date(`${a}T00:00:00Z`) - new Date(`${b}T00:00:00Z`)) / 86400000));
}
// Same algorithm as src/utils/streak.js's calculateStreak — kept in sync
// by hand (see the Vite-import constraint above), not imported.
function calculateStreak(activeDates, today, maxDays = 400) {
  let cursor = activeDates.has(today) ? today : addDaysStr(today, -1);
  let streak = 0;
  const freezeDates = [];
  for (let i = 0; i < maxDays; i++) {
    if (activeDates.has(cursor)) { streak++; cursor = addDaysStr(cursor, -1); continue; }
    const canFreeze = !freezeDates.some(fd => daysBetween(cursor, fd) < 7);
    if (canFreeze) { freezeDates.push(cursor); cursor = addDaysStr(cursor, -1); continue; }
    break;
  }
  return streak;
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@onairapp.com';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey || !serviceRoleKey) {
    console.error('[cron/streak-nudge] missing VAPID keys or service role key');
    return res.status(500).json({ error: 'Not configured' });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  const today = todayStr();
  const since = isoDaysAgo(LOOKBACK_DAYS);

  const [{ data: members, error: membersError }, { data: seances, error: seancesError }, { data: repas, error: repasError }] = await Promise.all([
    supabase.from('profiles').select('user_id, last_streak_nudge_at').eq('role', 'member'),
    supabase.from('seances').select('user_id, date').gte('date', since),
    supabase.from('repas').select('user_id, date').gte('date', since),
  ]);
  if (membersError || seancesError || repasError) {
    console.error('[cron/streak-nudge] fetch failed', membersError || seancesError || repasError);
    return res.status(500).json({ error: 'Fetch failed' });
  }

  const activeDatesByUser = {};
  for (const row of [...(seances || []), ...(repas || [])]) {
    if (!activeDatesByUser[row.user_id]) activeDatesByUser[row.user_id] = new Set();
    activeDatesByUser[row.user_id].add(row.date);
  }

  // Candidates: active streak (>=1), nothing logged today yet, not already
  // nudged today.
  const toNudge = (members || [])
    .map(m => {
      const activeDates = activeDatesByUser[m.user_id] || new Set();
      const streak = calculateStreak(activeDates, today);
      const activeToday = activeDates.has(today);
      const nudgedToday = m.last_streak_nudge_at && m.last_streak_nudge_at.slice(0, 10) === today;
      return { user_id: m.user_id, streak, eligible: streak > 0 && !activeToday && !nudgedToday };
    })
    .filter(m => m.eligible);

  if (toNudge.length === 0) return res.status(200).json({ nudged: 0 });

  const { data: subsRows, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', toNudge.map(m => m.user_id));
  if (subsError) {
    console.error('[cron/streak-nudge] subscriptions fetch failed', subsError);
    return res.status(500).json({ error: 'Subscriptions fetch failed' });
  }

  let nudged = 0;
  for (const member of toNudge) {
    const subs = (subsRows || []).filter(s => s.user_id === member.user_id);
    if (subs.length === 0) continue;

    // Always an invitation, never a loss ("tu vas perdre ton streak") —
    // explicit constraint from the original streak spec.
    const payload = JSON.stringify({
      title: `🔥 ${member.streak} jour${member.streak > 1 ? 's' : ''} de suite`,
      body: 'Une petite activité aujourd\'hui pour continuer sur ta lancée ?',
      url: '/dashboard',
    });

    const results = await Promise.allSettled(subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        throw err;
      })
    ));
    if (results.some(r => r.status === 'fulfilled')) {
      nudged += 1;
      await supabase.from('profiles').update({ last_streak_nudge_at: new Date().toISOString() }).eq('user_id', member.user_id);
    }
  }

  return res.status(200).json({ candidates: toNudge.length, nudged });
}
