import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

export default async function handler(req, res) {
  applyCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const rateLimit = await checkRateLimit(req, 'exercises', { max: 60, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const { muscle, type, difficulty, offset = 0 } = req.query;
  const apiKey = process.env.NINJA_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const params = new URLSearchParams();
    if (muscle) params.append('muscle', muscle);
    if (type) params.append('type', type);
    if (difficulty) params.append('difficulty', difficulty);
    params.append('offset', offset);

    const response = await fetch(
      `https://api.api-ninjas.com/v1/exercises?${params}`,
      { headers: { 'X-Api-Key': apiKey } }
    );
    const data = await response.json();
    // Was always `res.status(200)` regardless of what api-ninjas actually
    // returned — a rate-limit/quota error from them (often shipped as a 200
    // or 429 with an `{"error": "..."}` body) showed up in our own logs as
    // a plain success, making "API indisponible" on the client (which does
    // correctly check for `data.error`) look like a mystery from here.
    // Forwarding the real status makes future failures visible in
    // get_runtime_logs instead of hiding behind a false 200.
    if (!response.ok || data?.error) {
      console.error('[exercises] api-ninjas returned an error', response.status, data);
    }
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
