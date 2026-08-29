import { applyCors } from './_lib/auth.js';
import { checkMemoryRateLimit } from './_lib/rateLimit.js';

// Server-side check for the Cloudflare Turnstile widget on the two signup
// forms (Login.jsx membre, CoachSignup.jsx coach). Deliberately public — no
// requireUser() — this runs BEFORE either form calls supabase.auth.signUp(),
// so there is no session/account yet to authenticate against. Same shape as
// api/invite.js's handleValidateCode (unauthenticated, pre-account, IP-keyed
// in-memory rate limit rather than the DB-backed one used post-auth).
export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!checkMemoryRateLimit(`verify-turnstile:${ip}`, { max: 20, windowMs: 5 * 60 * 1000 })) {
    return res.status(429).json({ error: 'Too many attempts, try again shortly' });
  }

  const { token } = req.body || {};
  if (!token) return res.status(200).json({ success: false });

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('[verify-turnstile] TURNSTILE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Not configured' });
  }

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);

    const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = await cfRes.json();
    return res.status(200).json({ success: !!result.success });
  } catch (err) {
    console.error('[verify-turnstile] siteverify call failed', err);
    return res.status(200).json({ success: false });
  }
}
