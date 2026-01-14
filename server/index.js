const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase client
const { createClient } = require('@supabase/supabase-js');
// Expo Push Notification SDK
const { Expo } = require('expo-server-sdk');
// Cron for scheduling
const cron = require('node-cron');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client (use service role for admin access)
let supabase = null;
let supabaseConnected = false;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      fetch: (url, options = {}) => {
        // Add timeout to fetch requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
  });
  
  // Test connection
  (async () => {
    try {
      const { data, error } = await supabase.from('categories').select('id').limit(1);
      if (error) throw error;
      supabaseConnected = true;
      console.log('[SERVER] Supabase connected and tested:', SUPABASE_URL);
    } catch (error) {
      console.error('[SERVER] Supabase connection test failed:', error.message);
      console.warn('[SERVER] Supabase will be unavailable. Token registration may fail.');
      supabaseConnected = false;
    }
  })();
} else {
  console.warn('[SERVER] Supabase credentials not found. Using JSON file fallback.');
  console.warn('[SERVER] Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to use database.');
}

// Initialize Expo Push Notification client
const expo = new Expo();

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

// Path to tidbits.json (fallback)
const TIDBITS_PATH = path.join(__dirname, '../content/tidbits.json');
const fs = require('fs');

// Helper function to get content version from Supabase
async function getContentVersionFromSupabase() {
  if (!supabase) return null;
  
  try {
    // Get max updated_at from tidbits table as version indicator
    const { data, error } = await supabase
      .from('tidbits')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    
    // Hash the timestamp for version
    const timestamp = data.updated_at;
    let hash = 0;
    for (let i = 0; i < timestamp.length; i++) {
      const char = timestamp.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  } catch (error) {
    console.error('[SERVER] Error getting version from Supabase:', error);
    return null;
  }
}

// Helper function to get content version from JSON file (fallback)
function getContentVersionFromFile() {
  try {
    const content = fs.readFileSync(TIDBITS_PATH, 'utf8');
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
async function getLastModified() {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('tidbits')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      return data?.updated_at || new Date().toISOString();
    } catch (error) {
      // Fall through to file-based
    }
  }
  
  // Fallback to file
  try {
    const stats = fs.statSync(TIDBITS_PATH);
    return stats.mtime.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

// Fetch tidbits from Supabase
async function fetchTidbitsFromSupabase() {
  if (!supabase) return null;
  
  try {
    // Fetch categories with sort order
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, description, sort_order')
      .order('sort_order', { ascending: true });
    
    if (catError) {
      console.error('[SERVER] Error fetching categories:', catError);
      return null;
    }
    
    // Fetch all active tidbits
    const { data: tidbits, error: tidbitsError } = await supabase
      .from('tidbits')
      .select('id, category_id, text')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    
    if (tidbitsError) {
      console.error('[SERVER] Error fetching tidbits:', tidbitsError);
      return null;
    }
    
    // Transform to the format your app expects: { categoryId: [tidbitTexts] }
    const tidbitsByCategory = {};
    
    // Initialize all categories (even if empty)
    for (const category of categories) {
      tidbitsByCategory[category.id] = [];
    }
    
    // Group tidbits by category
    for (const tidbit of tidbits) {
      if (!tidbitsByCategory[tidbit.category_id]) {
        tidbitsByCategory[tidbit.category_id] = [];
      }
      tidbitsByCategory[tidbit.category_id].push(tidbit.text);
    }
    
    console.log('[SERVER] Loaded from Supabase:', Object.keys(tidbitsByCategory).length, 'categories,', tidbits.length, 'tidbits');
    return tidbitsByCategory;
  } catch (error) {
    console.error('[SERVER] Error fetching from Supabase:', error);
    return null;
  }
}

// Fetch tidbits from JSON file (fallback)
function fetchTidbitsFromFile() {
  try {
    const tidbitsData = JSON.parse(fs.readFileSync(TIDBITS_PATH, 'utf8'));
    console.log('[SERVER] Loaded from JSON file (fallback)');
    return tidbitsData;
  } catch (error) {
    console.error('[SERVER] Error reading JSON file:', error);
    return null;
  }
}

// GET /api/tidbits - Get all tidbits
app.get('/api/tidbits', async (req, res) => {
  try {
    // Try Supabase first, fallback to JSON file
    let tidbitsData = await fetchTidbitsFromSupabase();
    
    if (!tidbitsData) {
      console.log('[SERVER] Supabase fetch failed, using JSON fallback');
      tidbitsData = fetchTidbitsFromFile();
    }
    
    if (!tidbitsData) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load tidbits',
        message: 'Both Supabase and JSON file failed',
      });
    }
    
    // Get version and last modified
    const version = supabase 
      ? await getContentVersionFromSupabase() 
      : getContentVersionFromFile();
    const lastModified = await getLastModified();
    
    res.json({
      success: true,
      tidbits: tidbitsData,
      version: version || 'unknown',
      lastModified,
      timestamp: new Date().toISOString(),
      source: supabase ? 'supabase' : 'json',
    });
  } catch (error) {
    console.error('[SERVER] Error in /api/tidbits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load tidbits',
      message: error.message,
    });
  }
});

// GET /api/version - Check content version (lightweight endpoint)
app.get('/api/version', async (req, res) => {
  try {
    const version = supabase 
      ? await getContentVersionFromSupabase() 
      : getContentVersionFromFile();
    const lastModified = await getLastModified();
    
    res.json({
      success: true,
      version: version || 'unknown',
      lastModified,
      timestamp: new Date().toISOString(),
      source: supabase ? 'supabase' : 'json',
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

// POST /api/register-token - Register device push token
app.post('/api/register-token', async (req, res) => {
  try {
    const { token, platform, appVersion } = req.body;
    
    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: token, platform',
      });
    }
    
    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Platform must be "ios" or "android"',
      });
    }
    
    // Validate Expo push token format
    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Expo push token format',
      });
    }
    
    if (!supabase || !supabaseConnected) {
      console.warn('[SERVER] Supabase not available, but token received:', token.substring(0, 20) + '...');
      // Return success anyway - token will be registered on next app start
      return res.json({
        success: true,
        message: 'Token received (database unavailable, will retry later)',
        warning: 'Database connection failed - token will be saved on next registration',
      });
    }
    
    // Upsert device token (update if exists, insert if new)
    // Add timeout wrapper for Supabase call
    const upsertPromise = supabase
      .from('device_tokens')
      .upsert({
        token,
        platform,
        app_version: appVersion || null,
        last_active: new Date().toISOString(),
      }, {
        onConflict: 'token',
      })
      .select()
      .single();
    
    // Add 15 second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase connection timeout')), 15000)
    );
    
    let data, error;
    try {
      const result = await Promise.race([upsertPromise, timeoutPromise]);
      data = result.data;
      error = result.error;
    } catch (timeoutError) {
      console.error('[SERVER] Supabase connection timeout:', timeoutError);
      // Still return success to client, but log the error
      // Token will be registered on next app start
      console.warn('[SERVER] Token registration timed out, but token was received:', token.substring(0, 20) + '...');
      return res.json({
        success: true,
        message: 'Token received (database save timed out, will retry later)',
        warning: 'Database connection timeout - token will be saved on next registration',
      });
    }
    
    if (error) {
      console.error('[SERVER] Error registering token:', error);
      // Check if it's a connection error
      if (error.message && error.message.includes('fetch failed')) {
        console.error('[SERVER] Supabase connection failed - check network and credentials');
        return res.json({
          success: true,
          message: 'Token received (database unavailable, will retry later)',
          warning: 'Database connection failed - token will be saved on next registration',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to register token',
        message: error.message,
      });
    }
    
    console.log(`[SERVER] Device token registered: ${platform} (${token.substring(0, 20)}...)`);
    
    res.json({
      success: true,
      message: 'Token registered successfully',
      token: data,
    });
  } catch (error) {
    console.error('[SERVER] Error in /api/register-token:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/send-notification - Send a push notification (for testing)
app.post('/api/send-notification', async (req, res) => {
  try {
    const { token, title, body, data: notificationData, categoryId } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token',
      });
    }
    
    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Expo push token',
      });
    }
    
    const message = {
      to: token,
      sound: 'default',
      title: title || '📚 Tidbit',
      body: body || 'You have a new tidbit!',
      data: notificationData || {},
      categoryId: categoryId || 'tidbit_feedback',
      priority: 'high',
    };
    
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('[SERVER] Error sending push notification:', error);
      }
    }
    
    res.json({
      success: true,
      message: 'Notification sent',
      tickets,
    });
  } catch (error) {
    console.error('[SERVER] Error in /api/send-notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message,
    });
  }
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

