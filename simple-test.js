// Simple test server for connectivity
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Relay Social Test Server',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    accessible: true
  }));
});

server.listen(3001, '0.0.0.0', () => {
  console.log('🧪 Simple test server running on http://0.0.0.0:3001');
  console.log('🌐 Accessible via Tailscale at: https://billos-virtual-machine.tail38dad7.ts.net:3001');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');  
  server.close();
});