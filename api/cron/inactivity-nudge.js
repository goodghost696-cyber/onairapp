import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Daily job (see vercel.json's "crons" entry) — pushes a nudge to any
// member who just crossed into INACTIVE (no logged session/activity in
// 5+ days, same threshold as computeStatus() in src/utils/coachStats.js —
// duplicated here rather than imported since that file pulls in
// lib/supabase.js, which reads import.meta.env (Vite-only, unavailable in
// this plain Node runtime); every other api/*.js endpoint has the same
// constraint and duplicates its own createClient() for that reason).
const INACTIVE_AFTER_DAYS = 5;

export default async function handler(req, res) {
  // Vercel signs cron requests with this header when CRON_SECRET is set —
  // without it, anyone who finds the URL could trigger mass pushes.
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@onairapp.com';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey || !serviceRoleKey) {
    console.error('[cron/inactivity-nudge] missing VAPID keys or service role key');
    return res.status(500).json({ error: 'Not configured' });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // service_role — this is a system job with no logged-in "caller" to
  // scope an RLS-friendly token to, unlike api/send-push.js (called by a
  // coach messaging one specific member). Needs to read across every
  // member's activity and every member's push subscriptions.
  const supabase = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  const since = new Date(Date.now() - INACTIVE_AFTER_DAYS * 86400000).toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() - INACTIVE_AFTER_DAYS * 86400000).toISOString();

  const [{ data: members, error: membersError }, { data: seances, error: seancesError }, { data: activite, error: activiteError }] = await Promise.all([
    supabase.from('profiles').select('user_id, last_inactivity_nudge_at').eq('role', 'member'),
    supabase.from('seances').select('user_id, date').gte('date', since),
    supabase.from('activite_jour').select('user_id, date').gte('date', since),
  ]);

  if (membersError || seancesError || activiteError) {
    console.error('[cron/inactivity-nudge] fetch failed', membersError || seancesError || activiteError);
    return res.status(500).json({ error: 'Fetch failed' });
  }

  const lastActiveByUser = {};
  for (const row of [...(seances || []), ...(activite || [])]) {
    if (!lastActiveByUser[row.user_id] || row.date > lastActiveByUser[row.user_id]) {
      lastActiveByUser[row.user_id] = row.date;
    }
  }

  // Inactive = no activity at all in the window, OR their most recent
  // activity is older than the cutoff.
  const toNudge = (members || []).filter(m => {
    const lastActive = lastActiveByUser[m.user_id] || null;
    const isInactive = !lastActive || lastActive < since;
    if (!isInactive) return false;
    // One nudge per inactivity episode: skip if already nudged since
    // their last known activity (or, if they've never been active, skip
    // if nudged at all — no lastActive to compare against).
    if (!m.last_inactivity_nudge_at) return true;
    return lastActive ? m.last_inactivity_nudge_at < `${lastActive}T00:00:00Z` : false;
  });

  if (toNudge.length === 0) return res.status(200).json({ nudged: 0 });

  const { data: subsRows, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', toNudge.map(m => m.user_id));
  if (subsError) {
    console.error('[cron/inactivity-nudge] subscriptions fetch failed', subsError);
    return res.status(500).json({ error: 'Subscriptions fetch failed' });
  }

  const payload = JSON.stringify({
    title: 'Coach IA VOLTA',
    body: 'Ça fait quelques jours qu\'on ne t\'a pas vu — une petite séance aujourd\'hui ?',
    url: '/dashboard',
  });

  let nudged = 0;
  for (const member of toNudge) {
    const subs = (subsRows || []).filter(s => s.user_id === member.user_id);
    if (subs.length === 0) continue;

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
      await supabase.from('profiles').update({ last_inactivity_nudge_at: new Date().toISOString() }).eq('user_id', member.user_id);
    }
  }

  return res.status(200).json({ candidates: toNudge.length, nudged });
}
