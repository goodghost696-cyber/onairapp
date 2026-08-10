import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// Checkout + billing portal + webhook, one file on purpose — Vercel's
// Hobby plan caps a deployment at 12 Serverless Functions, and this repo
// was already sitting exactly at that cap before Stripe billing existed.
// Three separate files (which is how this started) pushed the deployment
// over the limit and it never went live. bodyParser is disabled for the
// whole file (Stripe's webhook signature check needs the exact raw
// bytes) — the browser-facing actions below parse the raw body back into
// JSON by hand instead of relying on Vercel's default parsing.
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

// Stripe calling us server-to-server (checkout.session.completed,
// customer.subscription.*) — authenticated by the signature check below
// (against STRIPE_WEBHOOK_SECRET), not a user bearer token. Mirrors
// subscription_status as-is from Stripe's own value rather than
// re-deriving it, so every status transition (trial ending, payment
// failing, card fixed, cancellation) is handled by one switch.
async function handleWebhook(req, res, stripe, admin, rawBody) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-billing] webhook: STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Not configured' });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], webhookSecret);
  } catch (err) {
    console.error('[stripe-billing] webhook: signature verification failed', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const gymId = session.metadata?.gym_id;
        if (gymId && session.subscription) {
          const { error } = await admin.from('gyms').update({ stripe_subscription_id: session.subscription }).eq('id', gymId);
          if (error) console.error('[stripe-billing] checkout.session.completed update failed', error);
        }
        break;
      }
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
          if (error) console.error('[stripe-billing] customer.subscription.updated update failed', error);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const gymId = sub.metadata?.gym_id;
        if (gymId) {
          const { error } = await admin.from('gyms').update({ subscription_status: 'canceled' }).eq('id', gymId);
          if (error) console.error('[stripe-billing] customer.subscription.deleted update failed', error);
        }
        break;
      }
      default:
        // Invoices, payment intents, etc. — not needed for the gate
        // (subscription_status alone drives it), ignored on purpose.
        break;
    }
  } catch (err) {
    console.error('[stripe-billing] webhook handler failed', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
  return res.status(200).json({ received: true });
}

// The two browser-facing actions — a coach starting a subscription, or
// managing an existing one. Both need the caller's own gym, resolved the
// same way create-gym.js does (service_role, since this runs with
// bodyParser off and no anon-key client context set up here).
async function handleCheckoutOrPortal(req, res, stripe, admin, action) {
  applyCors(req, res, 'POST');

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const rateLimit = await checkRateLimit(req, `stripe-billing-${action}`, { max: 10, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const { data: profile } = await admin.from('profiles').select('role, gym_id').eq('user_id', user.id).maybeSingle();
  if (!profile || !profile.gym_id || (profile.role !== 'coach' && profile.role !== 'admin')) {
    return res.status(403).json({ error: 'Réservé aux coachs' });
  }

  const { data: gym } = await admin.from('gyms').select('id, name, stripe_customer_id').eq('id', profile.gym_id).maybeSingle();
  if (!gym) return res.status(404).json({ error: 'Salle introuvable' });

  const origin = (req.headers.origin || 'https://onairapp.vercel.app').replace(/\/$/, '');

  if (action === 'portal') {
    if (!gym.stripe_customer_id) {
      return res.status(409).json({ error: 'Aucun abonnement en cours — souscris-en un depuis Réglages' });
    }
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: gym.stripe_customer_id,
        return_url: `${origin}/coach/settings`,
      });
      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('[stripe-billing] portal session creation failed', err);
      return res.status(502).json({ error: "Erreur lors de l'ouverture de l'espace facturation" });
    }
  }

  // action === 'checkout'
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error('[stripe-billing] STRIPE_PRICE_ID not configured');
    return res.status(500).json({ error: 'Facturation non configurée' });
  }

  let customerId = gym.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: gym.name, metadata: { gym_id: gym.id } });
    customerId = customer.id;
    const { error: custErr } = await admin.from('gyms').update({ stripe_customer_id: customerId }).eq('id', gym.id);
    if (custErr) console.error('[stripe-billing] failed to persist stripe_customer_id', custErr);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/coach/settings?billing=success`,
      cancel_url: `${origin}/coach/settings?billing=cancelled`,
      metadata: { gym_id: gym.id },
      subscription_data: { metadata: { gym_id: gym.id } },
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[stripe-billing] checkout session creation failed', err);
    return res.status(502).json({ error: 'Erreur lors de la création de la session de paiement' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res, 'POST');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeSecretKey || !serviceRoleKey) {
    console.error('[stripe-billing] not configured (STRIPE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY)');
    return res.status(500).json({ error: 'Facturation non configurée' });
  }
  const stripe = new Stripe(stripeSecretKey);
  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  const rawBody = await readRawBody(req);

  // Stripe's own calls carry this header (computed from the webhook
  // signing secret, nothing our browser code could ever produce) — that's
  // the dispatch, not the URL or a query param.
  if (req.headers['stripe-signature']) {
    return handleWebhook(req, res, stripe, admin, rawBody);
  }

  let body = {};
  try {
    body = rawBody.length ? JSON.parse(rawBody.toString('utf-8')) : {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (body.action !== 'checkout' && body.action !== 'portal') {
    return res.status(400).json({ error: 'Invalid action' });
  }
  return handleCheckoutOrPortal(req, res, stripe, admin, body.action);
}
