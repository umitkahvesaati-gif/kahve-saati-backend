const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.post('/api/token', async (req, res) => {
  try {
    const { client_id, client_secret, username, password } = req.body;
    const r = await fetch('https://api.parasut.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id, client_secret, username, password, grant_type: 'password', redirect_uri: 'urn:ietf:wg:oauth:2.0:oob' }) });
    const data = await r.json();
    if (!r.ok) return res.status(400).json(data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/me', async (req, res) => {
  try {
    const r = await fetch('https://api.parasut.com/v4/me', { headers: { Authorization: req.headers.authorization } });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/parasut/:companyId/*', async (req, res) => {
  try {
    const path = req.params[0];
    const query = new URLSearchParams(req.query).toString();
    const url = `https://api.parasut.com/v4/${req.params.companyId}/${path}${query ? '?' + query : ''}`;
    const r = await fetch(url, { headers: { Authorization: req.headers.authorization } });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/claude', async (req, res) => {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers['x-claude-key'], 'anthropic-version': '2023-06-01' }, body: JSON.stringify(req.body) });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
