import { applyCors, requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  applyCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req);
  if (!user) return res.status(200).json({ quote: 'Chaque séance compte.', author: 'ON AIR' });

  const apiKey = process.env.NINJA_API_KEY;
  const category = req.query.category || 'fitness';

  try {
    const response = await fetch(
      `https://api.api-ninjas.com/v1/quotes?category=${category}`,
      { headers: { 'X-Api-Key': apiKey } }
    );
    const data = await response.json();
    return res.status(200).json(data[0] || { quote: 'Chaque séance compte.', author: 'ON AIR' });
  } catch {
    return res.status(200).json({ quote: 'Chaque séance compte.', author: 'ON AIR' });
  }
}
