export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
