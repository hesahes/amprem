exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }

    const { action, email, link } = body;

    if (!action || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'action dan email wajib diisi' }),
      };
    }

    const apiKey = process.env.AM_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key tidak ditemukan di server' }),
      };
    }

    const payload = { action, email };
    if (action === 'verify') {
      if (!link) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Link wajib diisi untuk verify' }),
        };
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

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
