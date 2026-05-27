const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Paraşüt token al
app.post('/api/token', async (req, res) => {
  try {
    const { client_id, client_secret, username, password } = req.body;
    const r = await fetch('https://api.parasut.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id, client_secret, username, password, grant_type: 'password', redirect_uri: 'urn:ietf:wg:oauth:2.0:oob' })
    });
    const data = await r.json();
    if (!r.ok) return res.status(400).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Paraşüt me endpoint
app.get('/api/me', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const r = await fetch('https://api.parasut.com/v4/me', { headers: { Authorization: token } });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Paraşüt genel proxy
app.get('/api/parasut/:companyId/*', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const path = req.params[0];
    const query = new URLSearchParams(req.query).toString();
    const url = `https://api.parasut.com/v4/${req.params.companyId}/${path}${query ? '?' + query : ''}`;
    const r = await fetch(url, { headers: { Authorization: token } });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Claude proxy
app.post('/api/claude', async (req, res) => {
  try {
    const apiKey = req.headers['x-claude-key'];
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Kahve Saati backend running on port ${PORT}`));
