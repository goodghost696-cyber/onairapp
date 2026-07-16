import { applyCors, requireUser } from './_lib/auth.js';

// Proxies Open Food Facts' search-a-licious API server-side: unlike the legacy
// cgi/search.pl endpoint, search-a-licious never sends Access-Control-Allow-Origin,
// so browsers can't call it directly — the response gets blocked outright.
export default async function handler(req, res) {
  applyCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { q, page_size = 12, fields } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing q parameter' });

  try {
    const params = new URLSearchParams({ q, page_size });
    if (fields) params.append('fields', fields);

    const response = await fetch(`https://search.openfoodfacts.org/search?${params}`);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
