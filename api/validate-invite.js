import { applyCors } from './_lib/auth.js';

// Public on purpose (called before the user has an account/session), but
// only ever reveals a boolean — the real code lives server-side in
// INVITE_CODE and is never shipped in the client bundle.
export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body || {};
  const expected = process.env.INVITE_CODE || 'ONAIR2026';
  return res.status(200).json({ valid: !!code && code === expected });
}
