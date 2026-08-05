const express = require('express');
const cors = require('cors');
const { processAccount, generateEmail, randomString } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/scrape', async (req, res) => {
  try {
    const { email, password } = req.body;
    const useEmail = email || generateEmail();
    const usePassword = password || randomString(12) + 'A1!';
    const result = await processAccount(useEmail, usePassword, true);
    res.json({ success: true, ...result, password: usePassword });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', version: 'v2-scraper' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Scraper V2 running on port ${PORT}`));
