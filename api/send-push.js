import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';

// Works both directions: a coach messaging a member, or a member messaging
// their coach. Which one it is doesn't matter here — the caller's own
// bearer token is used to read `receiverId`'s subscriptions, and RLS
// ("Coaches can view member push subscriptions" / "Members can view coach
// push subscriptions") decides whether that's allowed, so a caller who is
// neither just gets zero rows back instead of an error.
export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { receiverId, title, body, url } = req.body || {};
  if (!receiverId || !title || !body) {
    return res.status(400).json({ error: 'receiverId, title and body are required' });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@onairapp.com';
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[send-push] VAPID keys not configured');
    return res.status(500).json({ error: 'Push not configured' });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // Scoped with the CALLER's own token (whoever just sent the message) —
  // relies on the RLS policies above rather than a service_role key, so a
  // caller with no relationship to `receiverId` simply gets zero rows back
  // instead of an error (fails closed, no special-casing needed here).
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', receiverId);

  if (error) {
    console.error('[send-push] subscriptions fetch failed', error);
    return res.status(500).json({ error: 'Failed to load subscriptions' });
  }
  if (!subs || subs.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body, url: url || '/messages' });

  const results = await Promise.allSettled(subs.map(sub =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    ).catch(async err => {
      // 404/410 = the subscription is gone (browser data cleared, app
      // uninstalled) — clean it up so we stop trying, using the caller's own
      // token same as the read above (covered by the same RLS policies).
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
      throw err;
    })
  ));

  const sent = results.filter(r => r.status === 'fulfilled').length;
  return res.status(200).json({ sent, total: subs.length });
}
