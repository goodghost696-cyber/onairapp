import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// Stripe's hosted Billing Portal — lets a coach manage their own card /
// invoices / cancellation without asking Arnaud to do it by hand. Only
// works once a gym already has a stripe_customer_id (i.e. has gone through
// create-checkout-session.js at least once); a gym still on its free trial
// with no Stripe customer yet gets a clear error instead of a broken portal.
export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const rateLimit = await checkRateLimit(req, 'create-billing-portal-session', { max: 10, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeSecretKey || !serviceRoleKey) {
    console.error('[create-billing-portal-session] not configured (STRIPE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY)');
    return res.status(500).json({ error: 'Facturation non configurée' });
  }
  const stripe = new Stripe(stripeSecretKey);
  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  const { data: profile } = await admin.from('profiles').select('role, gym_id').eq('user_id', user.id).maybeSingle();
  if (!profile || !profile.gym_id || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return res.status(403).json({ error: 'Réservé aux coachs' });
  }

  const { data: gym } = await admin.from('gyms').select('id, stripe_customer_id').eq('id', profile.gym_id).maybeSingle();
  if (!gym?.stripe_customer_id) {
    return res.status(409).json({ error: 'Aucun abonnement en cours — souscris-en un depuis Réglages' });
  }

  const origin = (req.headers.origin || 'https://onairapp.vercel.app').replace(/\/$/, '');
  let session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: gym.stripe_customer_id,
      return_url: `${origin}/coach/settings`,
    });
  } catch (err) {
    console.error('[create-billing-portal-session] stripe portal session creation failed', err);
    return res.status(502).json({ error: "Erreur lors de l'ouverture de l'espace facturation" });
  }

  return res.status(200).json({ url: session.url });
}
