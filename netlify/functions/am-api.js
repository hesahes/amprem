export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, email, link } = req.body;

    if (!action || !email) {
      return res.status(400).json({ error: 'action dan email wajib diisi' });
    }

    const apiKey = process.env.AM_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key tidak ditemukan di server' });
    }

    const payload = { action, email };
    if (action === 'verify') {
      if (!link) {
        return res.status(400).json({ error: 'Link wajib diisi untuk verify' });
      }
      payload.link = link;
    }

    const response = await fetch('https://diyymotion.vercel.app/api/am-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
