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
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
