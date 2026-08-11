import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Single dispatcher for every daily cron job, consolidated from what used
// to be api/cron/inactivity-nudge.js and api/cron/streak-nudge.js (plus the
// new "at-risk" job below) — Vercel Hobby caps a deployment at 12
// serverless functions, and this repo sits exactly at that cap, so a new
// job means merging into an existing file rather than adding one. Same
// dispatch shape as api/stripe-billing.js and api/invite.js elsewhere in
// this repo. vercel.json's 3 cron entries all point at this one file with
// a different `?job=` query param and their own schedule.
//
// Every job below duplicates its own date/status math rather than
// importing from src/utils/ — those files pull in lib/supabase.js, which
// reads import.meta.env (Vite-only, unavailable in this plain Node
// runtime). Same constraint every other api/*.js endpoint already has.

const INACTIVE_AFTER_DAYS = 5;
const ACTIVITY_WINDOW_DAYS = 14;
const STREAK_LOOKBACK_DAYS = 120;

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysStr(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.abs(Math.round((new Date(`${a}T00:00:00Z`) - new Date(`${b}T00:00:00Z`)) / 86400000));
}
function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(`${dateStr}T00:00:00`).getTime()) / 86400000);
}

// Same algorithm as src/utils/streak.js's calculateStreak — kept in sync by
// hand (see the Vite-import constraint above), not imported.
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

// Same thresholds as computeStatus() in src/utils/coachStats.js (seuil ON
// TRACK abaissé à 2 séances/semaine le 2026-08-11, cf. JOURNAL.md suite 96)
// — kept in sync by hand for the same Vite-import reason as above.
function computeStatus(lastActiveDate, sessionsThisWeek) {
  if (!lastActiveDate) return 'INACTIVE';
  const age = daysSince(lastActiveDate);
  if (age > 5) return 'INACTIVE';
  if (age <= 2 && sessionsThisWeek >= 2) return 'ON TRACK';
  return 'AT RISK';
}

async function sendToSubscriptions(supabase, subs, payload) {
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
  return results.some(r => r.status === 'fulfilled');
}

async function handleInactivity(supabase) {
  const since = isoDaysAgo(INACTIVE_AFTER_DAYS);

  const [{ data: members, error: membersError }, { data: seances, error: seancesError }, { data: activite, error: activiteError }] = await Promise.all([
    supabase.from('profiles').select('user_id, last_inactivity_nudge_at').eq('role', 'member'),
    supabase.from('seances').select('user_id, date').gte('date', since),
    supabase.from('activite_jour').select('user_id, date').gte('date', since),
  ]);
  if (membersError || seancesError || activiteError) {
    console.error('[cron/nudges:inactivity] fetch failed', membersError || seancesError || activiteError);
    return { error: 'Fetch failed' };
  }

  const lastActiveByUser = {};
  for (const row of [...(seances || []), ...(activite || [])]) {
    if (!lastActiveByUser[row.user_id] || row.date > lastActiveByUser[row.user_id]) {
      lastActiveByUser[row.user_id] = row.date;
    }
  }

  const toNudge = (members || []).filter(m => {
    const lastActive = lastActiveByUser[m.user_id] || null;
    const isInactive = !lastActive || lastActive < since;
    if (!isInactive) return false;
    if (!m.last_inactivity_nudge_at) return true;
    return lastActive ? m.last_inactivity_nudge_at < `${lastActive}T00:00:00Z` : false;
  });

  if (toNudge.length === 0) return { nudged: 0 };

  const { data: subsRows, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', toNudge.map(m => m.user_id));
  if (subsError) {
    console.error('[cron/nudges:inactivity] subscriptions fetch failed', subsError);
    return { error: 'Subscriptions fetch failed' };
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
    if (await sendToSubscriptions(supabase, subs, payload)) {
      nudged += 1;
      await supabase.from('profiles').update({ last_inactivity_nudge_at: new Date().toISOString() }).eq('user_id', member.user_id);
    }
  }

  return { candidates: toNudge.length, nudged };
}

async function handleStreak(supabase) {
  const today = todayStr();
  const since = isoDaysAgo(STREAK_LOOKBACK_DAYS);

  const [{ data: members, error: membersError }, { data: seances, error: seancesError }, { data: repas, error: repasError }] = await Promise.all([
    supabase.from('profiles').select('user_id, last_streak_nudge_at').eq('role', 'member'),
    supabase.from('seances').select('user_id, date').gte('date', since),
    supabase.from('repas').select('user_id, date').gte('date', since),
  ]);
  if (membersError || seancesError || repasError) {
    console.error('[cron/nudges:streak] fetch failed', membersError || seancesError || repasError);
    return { error: 'Fetch failed' };
  }

  const activeDatesByUser = {};
  for (const row of [...(seances || []), ...(repas || [])]) {
    if (!activeDatesByUser[row.user_id]) activeDatesByUser[row.user_id] = new Set();
    activeDatesByUser[row.user_id].add(row.date);
  }

  const toNudge = (members || [])
    .map(m => {
      const activeDates = activeDatesByUser[m.user_id] || new Set();
      const streak = calculateStreak(activeDates, today);
      const activeToday = activeDates.has(today);
      const nudgedToday = m.last_streak_nudge_at && m.last_streak_nudge_at.slice(0, 10) === today;
      return { user_id: m.user_id, streak, eligible: streak > 0 && !activeToday && !nudgedToday };
    })
    .filter(m => m.eligible);

  if (toNudge.length === 0) return { nudged: 0 };

  const { data: subsRows, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', toNudge.map(m => m.user_id));
  if (subsError) {
    console.error('[cron/nudges:streak] subscriptions fetch failed', subsError);
    return { error: 'Subscriptions fetch failed' };
  }

  let nudged = 0;
  for (const member of toNudge) {
    const subs = (subsRows || []).filter(s => s.user_id === member.user_id);
    if (subs.length === 0) continue;

    const payload = JSON.stringify({
      title: `🔥 ${member.streak} jour${member.streak > 1 ? 's' : ''} de suite`,
      body: 'Une petite activité aujourd\'hui pour continuer sur ta lancée ?',
      url: '/dashboard',
    });

    if (await sendToSubscriptions(supabase, subs, payload)) {
      nudged += 1;
      await supabase.from('profiles').update({ last_streak_nudge_at: new Date().toISOString() }).eq('user_id', member.user_id);
    }
  }

  return { candidates: toNudge.length, nudged };
}

// Veille produit 2026-08-11, proposition n°2 : notifier le coach quand un
// membre BASCULE à risque — pas un rappel quotidien tant qu'il y reste
// (ça reviendrait à spammer le coach chaque jour pour un membre déjà connu
// comme fragile). `last_status_snapshot` (colonne profiles, écrite
// uniquement par ce job) retient le statut calculé au dernier passage ;
// une notification part seulement quand le nouveau statut est AT RISK et
// que l'ancien ne l'était pas. Le snapshot est réécrit à chaque passage,
// que la notification parte ou non (aucun abonnement push, coach hors
// salle, etc.) — sinon un membre resterait bloqué "détectable" et
// redéclencherait une notif dès qu'un abonnement apparaîtrait, des jours
// plus tard, sans rapport avec une vraie bascule du jour.
async function handleAtRisk(supabase) {
  const since = isoDaysAgo(ACTIVITY_WINDOW_DAYS);
  const weekAgo = isoDaysAgo(7);

  const [{ data: members, error: membersError }, { data: seances, error: seancesError }, { data: activite, error: activiteError }, { data: repas, error: repasError }] = await Promise.all([
    supabase.from('profiles').select('user_id, gym_id, prenom, last_status_snapshot').eq('role', 'member'),
    supabase.from('seances').select('user_id, date').gte('date', since),
    supabase.from('activite_jour').select('user_id, date').gte('date', since),
    supabase.from('repas').select('user_id, date').gte('date', since),
  ]);
  if (membersError || seancesError || activiteError || repasError) {
    console.error('[cron/nudges:at-risk] fetch failed', membersError || seancesError || activiteError || repasError);
    return { error: 'Fetch failed' };
  }

  const lastActiveByUser = {};
  const sessionsThisWeekByUser = {};
  for (const row of seances || []) {
    if (!lastActiveByUser[row.user_id] || row.date > lastActiveByUser[row.user_id]) lastActiveByUser[row.user_id] = row.date;
    if (row.date >= weekAgo) sessionsThisWeekByUser[row.user_id] = (sessionsThisWeekByUser[row.user_id] || 0) + 1;
  }
  for (const row of [...(activite || []), ...(repas || [])]) {
    if (!lastActiveByUser[row.user_id] || row.date > lastActiveByUser[row.user_id]) lastActiveByUser[row.user_id] = row.date;
  }

  const transitions = []; // { member, status }
  const snapshotUpdates = []; // { user_id, status }
  for (const m of members || []) {
    const status = computeStatus(lastActiveByUser[m.user_id] || null, sessionsThisWeekByUser[m.user_id] || 0);
    snapshotUpdates.push({ user_id: m.user_id, status });
    if (status === 'AT RISK' && m.last_status_snapshot !== 'AT RISK') {
      transitions.push({ member: m, status });
    }
  }

  // Snapshot every member's current status regardless of whether a
  // notification fires below — see the comment above the function.
  await Promise.all(snapshotUpdates.map(u =>
    supabase.from('profiles').update({ last_status_snapshot: u.status }).eq('user_id', u.user_id)
  ));

  if (transitions.length === 0) return { transitions: 0, notified: 0 };

  const gymIds = [...new Set(transitions.map(t => t.member.gym_id).filter(Boolean))];
  if (gymIds.length === 0) return { transitions: transitions.length, notified: 0 };

  const { data: coaches, error: coachesError } = await supabase
    .from('profiles')
    .select('user_id, gym_id')
    .in('gym_id', gymIds)
    .in('role', ['coach', 'admin']);
  if (coachesError) {
    console.error('[cron/nudges:at-risk] coaches fetch failed', coachesError);
    return { error: 'Coaches fetch failed' };
  }

  const { data: subsRows, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', (coaches || []).map(c => c.user_id));
  if (subsError) {
    console.error('[cron/nudges:at-risk] subscriptions fetch failed', subsError);
    return { error: 'Subscriptions fetch failed' };
  }

  let notified = 0;
  for (const { member } of transitions) {
    const gymCoaches = (coaches || []).filter(c => c.gym_id === member.gym_id);
    const subs = (subsRows || []).filter(s => gymCoaches.some(c => c.user_id === s.user_id));
    if (subs.length === 0) continue;

    const payload = JSON.stringify({
      title: '⚠️ Membre à risque',
      body: `${member.prenom || 'Un membre'} n'a pas été assez actif récemment — jette un œil à sa fiche.`,
      url: `/coach/member/${member.user_id}`,
    });

    if (await sendToSubscriptions(supabase, subs, payload)) notified += 1;
  }

  return { transitions: transitions.length, notified };
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const job = req.query?.job;
  if (!['inactivity', 'streak', 'at-risk'].includes(job)) {
    return res.status(400).json({ error: 'Unknown or missing job' });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@onairapp.com';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey || !serviceRoleKey) {
    console.error(`[cron/nudges:${job}] missing VAPID keys or service role key`);
    return res.status(500).json({ error: 'Not configured' });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // service_role — every job here is a system sweep with no logged-in
  // "caller" to scope an RLS-friendly token to (unlike api/send-push.js,
  // called by one coach messaging one specific member). Needs to read
  // across every member's activity, every gym's coaches, and everyone's
  // push subscriptions.
  const supabase = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  let result;
  if (job === 'inactivity') result = await handleInactivity(supabase);
  else if (job === 'streak') result = await handleStreak(supabase);
  else result = await handleAtRisk(supabase);

  if (result.error) return res.status(500).json({ error: result.error });
  return res.status(200).json(result);
}
