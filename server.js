const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.disable('x-powered-by');

// Rate limiting (100 requests/15min)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/proxy', limiter);

// Serve static files
app.use(express.static('public'));

// Proxy endpoint
app.use('/proxy', createProxyMiddleware({
  target: false,
  changeOrigin: true,
  router: (req) => {
    const targetUrl = new URL(req.query.url);
    return `${targetUrl.protocol}//${targetUrl.hostname}`;
  },
  pathRewrite: (path, req) => {
    const targetUrl = new URL(req.query.url);
    return targetUrl.pathname + targetUrl.search;
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: 'Proxy error' });
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Frontend route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
