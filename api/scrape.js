// api/scrape.js — Vercel Serverless Function
const { processAccount, generateEmail, randomString } = require('../scraper');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, password } = req.body;
    const useEmail = email || generateEmail();
    const usePassword = password || randomString(12) + 'A1!';

    const result = await processAccount(useEmail, usePassword, true);
    res.status(200).json({
      success: true,
      email: useEmail,
      password: usePassword,
      codeOrder: result.codeOrder,
      magicLink: result.magicLink
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
