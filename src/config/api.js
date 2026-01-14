// API Configuration
// In production, replace with your actual server URL
// For development, use your local IP or localhost with tunnel

const API_CONFIG = {
  // Development: Use your local IP or tunnel URL
  // Example: 'http://192.168.1.100:3000' or 'https://your-tunnel-url.ngrok.io'
  BASE_URL: __DEV__ 
    ? 'http://10.0.0.8:3001'  // Your Wi‑Fi IPv4 (for physical iPhone testing)
    : 'https://your-production-server.com',  // Replace with your production URL
  
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

