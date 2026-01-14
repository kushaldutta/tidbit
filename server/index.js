const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function getLanIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net && net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

// Enable CORS for React Native app
app.use(cors());
app.use(express.json());

// Path to tidbits.json
const TIDBITS_PATH = path.join(__dirname, '../content/tidbits.json');

// Helper function to get content version (hash of file content)
function getContentVersion() {
  try {
    const content = fs.readFileSync(TIDBITS_PATH, 'utf8');
    // Simple hash of content for version checking
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  } catch (error) {
    return null;
  }
}

// Helper function to get last modified time
function getLastModified() {
  try {
    const stats = fs.statSync(TIDBITS_PATH);
    return stats.mtime.toISOString();
  } catch (error) {
    return null;
  }
}

// GET /api/tidbits - Get all tidbits
app.get('/api/tidbits', (req, res) => {
  try {
    const tidbitsData = JSON.parse(fs.readFileSync(TIDBITS_PATH, 'utf8'));
    const version = getContentVersion();
    const lastModified = getLastModified();
    
    res.json({
      success: true,
      tidbits: tidbitsData,
      version,
      lastModified,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SERVER] Error reading tidbits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load tidbits',
      message: error.message,
    });
  }
});

// GET /api/version - Check content version (lightweight endpoint)
app.get('/api/version', (req, res) => {
  try {
    const version = getContentVersion();
    const lastModified = getLastModified();
    
    res.json({
      success: true,
      version,
      lastModified,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SERVER] Error getting version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get version',
      message: error.message,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server (with friendly error handling)
const server = app.listen(PORT, HOST, () => {
  const lanIp = getLanIPv4();
  console.log(`[SERVER] Tidbit content server running on http://${HOST}:${PORT}`);
  console.log(`[SERVER] Local endpoints:`);
  console.log(`         http://localhost:${PORT}/api/tidbits`);
  console.log(`         http://localhost:${PORT}/api/version`);
  if (lanIp) {
    console.log(`[SERVER] LAN endpoints (use this on your phone):`);
    console.log(`         http://${lanIp}:${PORT}/api/tidbits`);
    console.log(`         http://${lanIp}:${PORT}/health`);
  } else {
    console.log('[SERVER] Could not detect LAN IPv4 address automatically.');
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[SERVER] Port ${PORT} is already in use.`);
    console.error('[SERVER] Fix: stop the other server process, OR run with a different port:');
    console.error('         PowerShell:  $env:PORT=3001; npm run server');
    console.error('         Then update src/config/api.js to http://<your-ip>:3001');
    process.exit(1);
  }
  console.error('[SERVER] Server error:', err);
  process.exit(1);
});

