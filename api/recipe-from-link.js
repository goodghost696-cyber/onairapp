import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// Real video transcript (what's actually said in the video) via Supadata —
// https://docs.supadata.ai — a paid third-party API (per-request credits),
// picked over building a download+ffmpeg+speech-to-text pipeline ourselves:
// no extra infra, works across TikTok/Instagram/YouTube/X uniformly. Only
// used when SUPADATA_API_KEY is configured; short TikTok/Reel clips are
// expected to resolve synchronously (HTTP 200) almost always, but the API
// can return a jobId (HTTP 202) for longer content — polled a few times
// within this function's own time budget rather than left unhandled.
async function fetchTranscript(url) {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&text=true&mode=auto`,
      { headers: { 'x-api-key': apiKey } }
    );

    if (res.status === 202) {
      const { jobId } = await res.json();
      if (!jobId) return null;
      // Short clips shouldn't need this at all — a handful of quick polls
      // is a safety net, not the expected path. Bounded so this function
      // can't run past its own maxDuration (vercel.json).
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, {
          headers: { 'x-api-key': apiKey },
        });
        if (!poll.ok) continue;
        const data = await poll.json();
        if (data.status === 'completed' && typeof data.content === 'string') return data.content;
        if (data.status === 'failed') return null;
      }
      return null;
    }

    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.content === 'string' ? data.content : null;
  } catch (err) {
    console.error('[recipe-from-link] Supadata transcript fetch failed', err);
    return null;
  }
}

// Fallback when SUPADATA_API_KEY isn't configured (or the transcript call
// comes back empty) — the original best-effort caption/description
// extraction: TikTok's public oEmbed, or a raw og:description/og:title
// scrape for both platforms (the only option for Instagram without an
// approved Meta app token). Much less reliable than a real transcript —
// only catches recipes that happen to be written in the post's own text.
async function extractCaption(url) {
  if (/tiktok\.com/i.test(url)) {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) return data.title;
      }
    } catch { /* fall through to the generic scrape below */ }
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OnAirBot/1.0; +https://onairapp.vercel.app)' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const desc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
    return desc || title || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const rateLimit = await checkRateLimit(req, 'recipe-from-link', { max: 20, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const { url } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Lien invalide' });
  }
  if (!/tiktok\.com|instagram\.com/i.test(url)) {
    return res.status(400).json({ error: 'Seuls les liens TikTok et Instagram sont supportés pour le moment' });
  }

  let transcript = await fetchTranscript(url);
  let source = 'transcript';
  if (!transcript) {
    transcript = await extractCaption(url);
    source = 'caption';
  }

  if (!transcript || transcript.trim().length < 15) {
    return res.status(422).json({
      error: "Impossible de lire cette vidéo (transcript et légende introuvables ou trop courts) — essaie une photo de tes ingrédients à la place.",
    });
  }

  return res.status(200).json({ transcript: transcript.trim(), source });
}
