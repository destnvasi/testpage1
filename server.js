const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Proxy Test Endpoint
app.post('/api/proxy-test', async (req, res) => {
  try {
    const { proxy, url = 'https://httpbin.org/ip' } = req.body;
    
    // Validate proxy format
    if (!/^[\d\.]+:\d+$/.test(proxy)) {
      return res.status(400).json({ error: 'Invalid proxy format (IP:PORT required)' });
    }

    const [host, port] = proxy.split(':');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      agent: new HttpsProxyAgent(`http://${host}:${port}`),
      signal: controller.signal
    });

    clearTimeout(timeout);
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ 
      error: err.name === 'AbortError' ? 'Proxy timeout' : 'Proxy connection failed'
    });
  }
});

// Main Proxy Gateway
app.use('/gateway', createProxyMiddleware({
  target: false,
  changeOrigin: true,
  router: (req) => {
    const proxy = req.query.proxy;
    if (!proxy) throw new Error('Proxy not specified');
    return `http://${proxy}`;
  },
  pathRewrite: (path, req) => {
    try {
      return new URL(req.query.url).pathname;
    } catch {
      return '/';
    }
  },
  onError: (err, req, res) => {
    res.status(500).send('Proxy error: ' + err.message);
  }
}));

// Serve Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port
