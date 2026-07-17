import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

// Models the app actually uses (AICoach/Scan/Workout/MemberDetail use Haiku,
// Nutrition's AI recipe feature uses Fable 5 for higher quality) — anything
// else is rejected rather than silently proxied.
const ALLOWED_MODELS = new Set(['claude-haiku-4-5-20251001', 'claude-fable-5']);
const MAX_TOKENS_CAP = 1500;

export default async function handler(req, res) {
  applyCors(req, res, 'POST');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { model, max_tokens } = req.body || {};
  if (!ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: 'Unsupported model' });
  }
  if (typeof max_tokens !== 'number' || max_tokens <= 0 || max_tokens > MAX_TOKENS_CAP) {
    return res.status(400).json({ error: `max_tokens must be between 1 and ${MAX_TOKENS_CAP}` });
  }

  const rateLimit = await checkRateLimit(req, 'claude', { max: 15, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic error' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
