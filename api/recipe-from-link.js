import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// Best-effort extraction of whatever text a TikTok/Instagram Reel link
// exposes without logging in (caption/description). There's no real
// video/audio transcription pipeline in this app — this can only work
// when the recipe is actually written out in the post's caption (common
// for food content, not universal). Returns null rather than guessing
// when nothing usable comes back, so the caller can be honest with the
// user instead of asking Claude to hallucinate a recipe from nothing.
async function extractCaption(url) {
  // TikTok's oEmbed is public, no token needed — `title` is usually the
  // post caption.
  if (/tiktok\.com/i.test(url)) {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) return data.title;
      }
    } catch { /* fall through to the generic scrape below */ }
  }

  // Generic fallback — also the only path for Instagram, since their
  // oEmbed requires an approved Meta app token this project doesn't have.
  // Instagram in particular often serves a generic "X likes, Y comments"
  // placeholder instead of the real caption to a logged-out request — a
  // real platform limitation, not a bug, surfaced honestly to the client
  // rather than silently producing a bad recipe from it.
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

  const caption = await extractCaption(url);
  if (!caption || caption.trim().length < 15) {
    return res.status(422).json({
      error: "Impossible de lire la légende de cette vidéo (introuvable ou trop courte) — essaie une photo de tes ingrédients à la place.",
    });
  }

  return res.status(200).json({ caption: caption.trim() });
}
