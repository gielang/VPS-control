/**
 * Hostinger API Proxy — run this on your VPS (srv1948979.hstgr.cloud)
 *
 * Requirements: Node.js (already installed on most VPS)
 * Start: node vps-proxy.js
 * Keep running: pm2 start vps-proxy.js  OR  nohup node vps-proxy.js &
 *
 * The proxy listens on port 8080.
 * Make sure port 8080 is open in your firewall:
 *   ufw allow 8080
 */

const https = require('https');
const fs    = require('fs');

const PORT        = 8080;
const API_HOST    = 'developers.hostinger.com';
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';

// Self-signed cert generated with:
// openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=89.116.236.15"
const sslOptions = {
  key:  fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

const server = https.createServer(sslOptions, (req, res) => {
  // CORS headers — allow brainmelter.org to call this proxy
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Extract target API path from query string: ?path=/api/vps/v1/...
  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const apiPath = url.searchParams.get('path');

  if (!apiPath || !apiPath.startsWith('/api/vps/')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing or invalid ?path parameter' }));
    return;
  }

  // Read request body (for POST/PUT)
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const options = {
      hostname: API_HOST,
      port: 443,
      path: apiPath,
      method: req.method,
      headers: {
        'Authorization': req.headers['authorization'] || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);

    const proxyReq = https.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    proxyReq.on('error', err => {
      console.error('Proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`✓ VPS Proxy running on port ${PORT}`);
  console.log(`  Forwarding to: https://${API_HOST}`);
  console.log(`  Allowed origin: ${ALLOW_ORIGIN}`);
});
