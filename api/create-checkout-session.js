import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// Starts (or resumes) the Stripe Checkout flow for a gym's coach
// subscription. Business decision behind this file, JOURNAL.md 2026-08-10:
// fixed monthly price per gym (STRIPE_PRICE_ID, set once in Arnaud's own
// Stripe dashboard — not a number this code hardcodes), 14-day trial
// already running before this is ever called (set at gym creation in
// create-gym.js), coach access only (members are never gated).
//
// Requires STRIPE_SECRET_KEY / STRIPE_PRICE_ID in Vercel env vars, set up
// in a real Stripe account — nothing in this codebase can create that
// account or those keys. Until they're set, this endpoint returns 500
// rather than silently doing nothing, same posture as send-push.js when
// VAPID keys are missing.
export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const rateLimit = await checkRateLimit(req, 'create-checkout-session', { max: 10, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeSecretKey || !priceId || !serviceRoleKey) {
    console.error('[create-checkout-session] not configured (STRIPE_SECRET_KEY / STRIPE_PRICE_ID / SUPABASE_SERVICE_ROLE_KEY)');
    return res.status(500).json({ error: 'Facturation non configurée' });
  }
  const stripe = new Stripe(stripeSecretKey);
  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  const { data: profile } = await admin.from('profiles').select('role, gym_id').eq('user_id', user.id).maybeSingle();
  if (!profile || !profile.gym_id || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return res.status(403).json({ error: 'Réservé aux coachs' });
  }

  const { data: gym } = await admin.from('gyms').select('id, name, stripe_customer_id').eq('id', profile.gym_id).maybeSingle();
  if (!gym) return res.status(404).json({ error: 'Salle introuvable' });

  let customerId = gym.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: gym.name,
      metadata: { gym_id: gym.id },
    });
    customerId = customer.id;
    const { error: custErr } = await admin.from('gyms').update({ stripe_customer_id: customerId }).eq('id', gym.id);
    if (custErr) console.error('[create-checkout-session] failed to persist stripe_customer_id', custErr);
  }

  const origin = (req.headers.origin || 'https://onairapp.vercel.app').replace(/\/$/, '');
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/coach/settings?billing=success`,
      cancel_url: `${origin}/coach/settings?billing=cancelled`,
      metadata: { gym_id: gym.id },
      subscription_data: { metadata: { gym_id: gym.id } },
    });
  } catch (err) {
    console.error('[create-checkout-session] stripe checkout session creation failed', err);
    return res.status(502).json({ error: 'Erreur lors de la création de la session de paiement' });
  }

  return res.status(200).json({ url: session.url });
}
