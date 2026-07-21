import { createClient } from '@supabase/supabase-js';

// Sliding-window rate limiter backed by the api_rate_limit table. Scoped to
// the caller's own rows via RLS (auth.uid() = user_id), using the same
// bearer-token client pattern as invite-code.js — no service-role key needed.
// Fails open (allows the request) if the limiter itself errors, so a
// Supabase hiccup never blocks legitimate users.
export async function checkRateLimit(req, endpoint, { max, windowMs }) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401 };

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const cutoff = new Date(Date.now() - windowMs).toISOString();

  // Best-effort cleanup so this table doesn't grow unbounded per user.
  await supabase.from('api_rate_limit').delete().eq('endpoint', endpoint).lt('created_at', cutoff);

  const { count, error } = await supabase
    .from('api_rate_limit')
    .select('id', { count: 'exact', head: true })
    .eq('endpoint', endpoint)
    .gte('created_at', cutoff);

  if (error) {
    console.error('[rateLimit] count failed', error);
    return { ok: true };
  }

  if ((count || 0) >= max) return { ok: false, status: 429 };

  const { error: insertError } = await supabase.from('api_rate_limit').insert({ endpoint });
  if (insertError) console.error('[rateLimit] insert failed', insertError);

  return { ok: true };
}

// In-memory per-container fallback for endpoints with no authenticated user
// yet (e.g. invite-code validation, called before signup). Not durable
// across cold starts or multiple concurrent instances — a best-effort
// deterrent, not a hard guarantee. The real defense for that endpoint is a
// long, non-default INVITE_CODE.
const memoryHits = new Map();

export function checkMemoryRateLimit(key, { max, windowMs }) {
  const now = Date.now();
  const hits = (memoryHits.get(key) || []).filter(t => now - t < windowMs);
  if (hits.length >= max) {
    memoryHits.set(key, hits);
    return false;
  }
  hits.push(now);
  memoryHits.set(key, hits);
  return true;
}
