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

app.get('/api/ubl/:companyId/e_invoices/:id', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const invRes = await fetch(`https://api.parasut.com/v4/${req.params.companyId}/e_invoices/${req.params.id}`, {
      headers: { Authorization: token }
    });
    const invData = await invRes.json();
    const signedUblUrl = invData?.data?.attributes?.signed_ubl_url;
    if (!signedUblUrl) return res.status(404).json({ error: 'No signed_ubl_url' });
    const zipRes = await fetch(signedUblUrl, { headers: { Authorization: token } });
    const zipBuffer = await zipRes.buffer();
    const unzipper = require('unzipper');
    const directory = await unzipper.Open.buffer(zipBuffer);
    const xmlFile = directory.files.find(f => f.path.endsWith('.xml'));
    if (!xmlFile) return res.status(404).json({ error: 'No XML in ZIP' });
    const xmlContent = await xmlFile.buffer();
    res.send(xmlContent.toString('utf8'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.all('/api/parasut/:companyId/*', async (req, res) => {
  try {
    const path = req.params[0];
    const queryString = qs.stringify(req.query, { encode: false, allowDots: false });
    const url = `https://api.parasut.com/v4/${req.params.companyId}/${path}${queryString ? '?' + queryString : ''}`;
    console.log('Parasut URL:', url);
    const r = await fetch(url, {
      method: req.method === 'OPTIONS' ? 'GET' : req.method,
      headers: { Authorization: req.headers.authorization, 'Content-Type': 'application/json' },
      body: ['POST','PUT','PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/claude', async (req, res) => {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': req.headers['x-claude-key'], 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(req.body)
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
