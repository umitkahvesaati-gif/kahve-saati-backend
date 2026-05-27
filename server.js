const express = require('express');
const fetch = require('node-fetch');
const qs = require('qs');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-claude-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'ok' }));

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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me', async (req, res) => {
  try {
    const r = await fetch('https://api.parasut.com/v4/me', { headers: { Authorization: req.headers.authorization } });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.all('/api/parasut/:companyId/*', async (req, res) => {
  try {
    const path = req.params[0];
    const queryString = qs.s
