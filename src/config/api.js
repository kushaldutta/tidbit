// API Configuration
// In production, replace with your actual server URL
// For development, use your local IP or localhost with tunnel

const API_CONFIG = {
  // Development: Use your local IP or tunnel URL
  // Example: 'http://192.168.1.100:3000' or 'https://your-tunnel-url.ngrok.io'
  BASE_URL: 'https://tidbit-u2qo.onrender.com',  // Render production server
  // For local testing, temporarily change to: 'http://10.0.0.8:3001'
  
  ENDPOINTS: {
    TIDBITS: '/api/tidbits',
    VERSION: '/api/version',
    HEALTH: '/health',
  },
  
  // Cache settings
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  VERSION_CHECK_INTERVAL: 60 * 60 * 1000, // Check for updates every hour
};

export default API_CONFIG;

