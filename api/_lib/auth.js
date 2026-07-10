import { createClient } from '@supabase/supabase-js';

// Same-project deployment domain (production + Vercel previews) and local dev.
const ALLOWED_ORIGIN = /^https:\/\/onairapp(-[a-z0-9]+)*\.vercel\.app$/i;
const ALLOWED_LOCAL = new Set(['http://localhost:3000', 'http://localhost:5173']);

export function applyCors(req, res, methods = 'GET, POST, OPTIONS') {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGIN.test(origin) || ALLOWED_LOCAL.has(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://onairapp.vercel.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', `${methods}, OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Verifies the caller's Supabase access token (sent as "Authorization: Bearer <token>").
// Returns the authenticated user, or null if the token is missing/invalid.
export async function requireUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
