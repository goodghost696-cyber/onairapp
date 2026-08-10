import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe needs the exact raw request bytes to verify a webhook's signature
// (stripe.webhooks.constructEvent) — Vercel's default JSON body parsing
// would hand us an already-parsed object instead, which fails verification.
// `config.api.bodyParser: false` disables that (this convention works on
// plain Vercel Node functions too, not just Next.js — confirmed against
// Vercel's own docs before writing this), so the body is read by hand below.
export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// No applyCors/requireUser here on purpose — this is Stripe calling us
// server-to-server, not a browser. The signature check below (against
// STRIPE_WEBHOOK_SECRET, known only to Stripe and this deployment) is what
// authenticates the caller instead of a user bearer token.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeSecretKey || !webhookSecret || !serviceRoleKey) {
    console.error('[stripe-webhook] not configured (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / SUPABASE_SERVICE_ROLE_KEY)');
    return res.status(500).json({ error: 'Not configured' });
  }
  const stripe = new Stripe(stripeSecretKey);
  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      // Fires once, right after a successful Checkout — the subscription
      // exists but subscription_data.metadata (set at creation in
      // create-checkout-session.js) is also mirrored onto the subscription
      // object itself, so 'customer.subscription.*' below stays the source
      // of truth for status going forward; this just captures the id early.
      case 'checkout.session.completed': {
        const session = event.data.object;
        const gymId = session.metadata?.gym_id;
        if (gymId && session.subscription) {
          const { error } = await admin.from('gyms').update({
            stripe_subscription_id: session.subscription,
          }).eq('id', gymId);
          if (error) console.error('[stripe-webhook] checkout.session.completed update failed', error);
        }
        break;
      }
      // Covers every status transition after that: trial ending, payment
      // failing (past_due), card fixed (back to active), cancellation
      // scheduled, etc. — one handler, subscription.status is just mirrored
      // as-is rather than re-deriving it.
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const gymId = sub.metadata?.gym_id;
        if (gymId) {
          const { error } = await admin.from('gyms').update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          }).eq('id', gymId);
          if (error) console.error('[stripe-webhook] customer.subscription.updated update failed', error);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const gymId = sub.metadata?.gym_id;
        if (gymId) {
          const { error } = await admin.from('gyms').update({ subscription_status: 'canceled' }).eq('id', gymId);
          if (error) console.error('[stripe-webhook] customer.subscription.deleted update failed', error);
        }
        break;
      }
      default:
        // Anything else (invoices, payment intents, ...) — not needed for
        // the current gate (subscription_status alone drives it), ignored
        // rather than handled to keep this endpoint's blast radius small.
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler failed', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  return res.status(200).json({ received: true });
}
