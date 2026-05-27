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
    const claudeKey = req.headers['x-claude-key'];
    
    // Get PDF URL
    const pdfRes = await fetch(`https://api.parasut.com/v4/${req.params.companyId}/e_invoices/${req.params.id}/pdf`, {
      headers: { Authorization: token }
    });
    const pdfData = await pdfRes.json();
    const pdfUrl = pdfData?.data?.attributes?.url;
    if (!pdfUrl) return res.status(404).json({ error: 'No PDF URL' });
    
    // Fetch PDF as base64
    const pdfFileRes = await fetch(pdfUrl);
    const pdfBuffer = await pdfFileRes.buffer();
    const pdfBase64 = pdfBuffer.toString('base64');
    
    // Send to Claude to extract invoice details
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: 'Bu faturadan ürün kalemlerini çıkar. Her kalem için: ürün adı, birim fiyat, miktar. Sadece JSON döndür, başka hiçbir şey yazma. Format: [{"name":"ürün adı","unit_price":100,"quantity":1}]' }
          ]
        }]
      })
    });
    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text || '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    const items = JSON.parse(clean);
    res.json({ items, invoice_id: req.params.id });
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
