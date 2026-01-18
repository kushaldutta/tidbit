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
let schedulerStarted = false;

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
  
  // Test connection and start scheduler when ready
  (async () => {
    try {
      const { data, error } = await supabase.from('categories').select('id').limit(1);
      if (error) throw error;
      supabaseConnected = true;
      console.log('[SERVER] Supabase connected and tested:', SUPABASE_URL);
      
      // Start scheduler now that Supabase is confirmed connected
      if (!schedulerStarted) {
        setupNotificationScheduler();
        schedulerStarted = true;
      }
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
  console.log('[SERVER] 📥 Received token registration request');
  console.log('[SERVER] 📥 Request body:', JSON.stringify({
    token: req.body.token?.substring(0, 20) + '...',
    platform: req.body.platform,
    notificationInterval: req.body.notificationInterval,
    notificationsEnabled: req.body.notificationsEnabled,
  }, null, 2));
  
  try {
    const { 
      token, 
      platform, 
      appVersion,
      // User preferences (optional, will be updated if provided)
      notificationInterval,
      notificationsEnabled,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      selectedCategories,
      timezoneOffsetMinutes, // Timezone offset in minutes (e.g., PST = -480, EST = -300)
    } = req.body;
    
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
    
    // Prepare update data (only include fields that are provided)
    const updateData = {
      token,
      platform,
      app_version: appVersion || null,
      last_active: new Date().toISOString(),
    };
    
    // Add user preferences if provided
    if (notificationInterval !== undefined) {
      updateData.notification_interval = notificationInterval;
      console.log(`[SERVER] Updating notification_interval to: ${notificationInterval} minutes`);
    }
    if (notificationsEnabled !== undefined) {
      updateData.notifications_enabled = notificationsEnabled;
      console.log(`[SERVER] Updating notifications_enabled to: ${notificationsEnabled}`);
    }
    if (quietHoursEnabled !== undefined) updateData.quiet_hours_enabled = quietHoursEnabled;
    if (quietHoursStart !== undefined) updateData.quiet_hours_start = quietHoursStart;
    if (quietHoursEnd !== undefined) updateData.quiet_hours_end = quietHoursEnd;
    if (selectedCategories !== undefined) {
      updateData.selected_categories = selectedCategories;
      console.log(`[SERVER] Updating selected_categories to: ${JSON.stringify(selectedCategories)}`);
    }
    // Always update timezone if provided (even if 0, to fix devices registered before timezone support)
    if (timezoneOffsetMinutes !== undefined) {
      updateData.timezone_offset_minutes = timezoneOffsetMinutes;
      console.log(`[SERVER] Updating timezone_offset_minutes to: ${timezoneOffsetMinutes} (UTC${timezoneOffsetMinutes >= 0 ? '+' : ''}${timezoneOffsetMinutes / 60})`);
    } else {
      // If timezone not provided, log a warning (should always be sent from client)
      console.warn(`[SERVER] ⚠️ WARNING: timezoneOffsetMinutes not provided in registration request!`);
    }
    
    // Upsert device token (update if exists, insert if new)
    // IMPORTANT: Include all updateData fields so preferences are saved
    const upsertPromise = supabase
      .from('device_tokens')
      .upsert({
        token,
        platform,
        app_version: appVersion || null,
        last_active: new Date().toISOString(),
        ...updateData, // Include all user preferences (interval, categories, quiet hours, etc.)
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
      console.log(`[SERVER] 📝 Attempting to upsert device token with data:`, JSON.stringify({
        token: updateData.token.substring(0, 20) + '...',
        platform: updateData.platform,
        notification_interval: updateData.notification_interval,
        notifications_enabled: updateData.notifications_enabled,
        selected_categories: updateData.selected_categories,
      }, null, 2));
      
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
    
    console.log(`[SERVER] ✅ Device token registered: ${platform} (${token.substring(0, 20)}...)`);
    if (data) {
      console.log(`[SERVER] ✅ Database now has notification_interval: ${data.notification_interval || 'NOT SET'}`);
      console.log(`[SERVER] ✅ Database now has notifications_enabled: ${data.notifications_enabled ?? 'NOT SET'}`);
      console.log(`[SERVER] ✅ Database now has selected_categories: ${JSON.stringify(data.selected_categories || [])}`);
    } else {
      console.warn(`[SERVER] ⚠️ No data returned from upsert - preferences may not have been saved!`);
    }
    
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
    
    // Log the exact message format for test notifications
    console.log('[TEST_NOTIFICATION] Message being sent:', JSON.stringify({
      to: message.to.substring(0, 30) + '...',
      title: message.title,
      body: message.body?.substring(0, 50) + '...',
      categoryId: message.categoryId,
      hasData: !!message.data,
      priority: message.priority,
    }, null, 2));
    
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        console.log('[TEST_NOTIFICATION] Sending chunk, categoryId:', chunk[0].categoryId);
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

/**
 * Send push notifications to all eligible devices
 * This function is called by the cron scheduler
 */
/**
 * Convert UTC time to user's local time based on timezone offset
 * @param {Date} utcDate - UTC date object
 * @param {number} timezoneOffsetMinutes - Timezone offset in minutes (e.g., PST = -480, EST = -300)
 * @returns {Object} { hour, minute, minutesSinceMidnight }
 */
function getLocalTime(utcDate, timezoneOffsetMinutes = 0) {
  // Create a new date adjusted for timezone offset
  const localTime = new Date(utcDate.getTime() + (timezoneOffsetMinutes * 60 * 1000));
  const hour = localTime.getUTCHours();
  const minute = localTime.getUTCMinutes();
  const minutesSinceMidnight = hour * 60 + minute;
  return { hour, minute, minutesSinceMidnight };
}

async function sendScheduledNotifications() {
  if (!supabase || !supabaseConnected) {
    console.warn('[SCHEDULER] Supabase not available, skipping notification send');
    return;
  }
  
  try {
    const now = new Date(); // UTC time
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    
    // Get all active device tokens with their preferences
    const { data: devices, error } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('notifications_enabled', true)
      .order('last_active', { ascending: false });
    
    if (error) {
      console.error('[SCHEDULER] Error fetching devices:', error);
      return;
    }
    
    if (!devices || devices.length === 0) {
      console.log('[SCHEDULER] No active devices to notify');
      return;
    }
    
    console.log(`[SCHEDULER] ========================================`);
    console.log(`[SCHEDULER] Starting notification check at UTC ${utcHour}:${utcMinute.toString().padStart(2, '0')}`);
    console.log(`[SCHEDULER] Found ${devices.length} active device(s)`);
    
    // Get tidbits from Supabase
    const tidbitsData = await fetchTidbitsFromSupabase();
    if (!tidbitsData) {
      console.error('[SCHEDULER] Could not fetch tidbits');
      return;
    }
    
    const messages = [];
    
    console.log(`[SCHEDULER] Processing ${devices.length} devices`);
    
    for (const device of devices) {
      console.log(`[SCHEDULER] Checking device: ${device.token.substring(0, 20)}...`);
      console.log(`[SCHEDULER]   - Notification interval: ${device.notification_interval || 'NOT SET'} min`);
      console.log(`[SCHEDULER]   - Quiet hours enabled: ${device.quiet_hours_enabled}`);
      console.log(`[SCHEDULER]   - Quiet hours: ${device.quiet_hours_start || 23} - ${device.quiet_hours_end || 9}`);
      console.log(`[SCHEDULER]   - Selected categories: ${JSON.stringify(device.selected_categories || [])}`);
      
      // TEMPORARY: Hardcode PST (UTC-8, -480 minutes) for all devices in California
      // TODO: Remove this hardcode once app build includes proper timezone support
      // PST = UTC-8 = -480 minutes
      const timezoneOffset = -480; // Hardcoded PST for California users
      const localTime = getLocalTime(now, timezoneOffset);
      const { hour: currentHour, minute: currentMinute, minutesSinceMidnight } = localTime;
      
      console.log(`[SCHEDULER]   - Timezone offset: ${timezoneOffset} min (UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset / 60})${timezoneOffset === 0 ? ' ⚠️ WARNING: Timezone not set! Device needs to re-register.' : ''}`);
      console.log(`[SCHEDULER]   - Local time: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (UTC: ${utcHour}:${utcMinute.toString().padStart(2, '0')})`);
      
      // Check if it's time to send based on interval
      if (!device.notification_interval) {
        console.log(`[SCHEDULER]   - SKIPPING: No notification interval set`);
        continue;
      }
      
      const remainder = minutesSinceMidnight % device.notification_interval;
      const isTimeToSend = remainder === 0;
      
      console.log(`[SCHEDULER]   - Minutes since midnight (local): ${minutesSinceMidnight}, remainder: ${remainder}, should send: ${isTimeToSend}`);
      
      if (!isTimeToSend) {
        console.log(`[SCHEDULER]   - SKIPPING: Not time to send yet (interval: ${device.notification_interval} min)`);
        continue; // Skip this device - not time for their interval
      }
      
      // Check quiet hours (using local time)
      if (device.quiet_hours_enabled) {
        const quietStart = device.quiet_hours_start ?? 23;
        const quietEnd = device.quiet_hours_end ?? 9;
        
        // Handle quiet hours that span midnight (e.g., 23 to 9)
        let inQuietHours = false;
        if (quietStart > quietEnd) {
          // Quiet hours span midnight (e.g., 11 PM to 9 AM)
          // Example: 23 to 9 means 11 PM to 9 AM next day
          inQuietHours = currentHour >= quietStart || currentHour < quietEnd;
        } else {
          // Quiet hours within same day (e.g., 2 AM to 7 AM)
          // Example: 2 to 7 means 2 AM to 7 AM (inclusive start, exclusive end)
          inQuietHours = currentHour >= quietStart && currentHour < quietEnd;
        }
        
        console.log(`[SCHEDULER]   - In quiet hours: ${inQuietHours} (local: ${currentHour}:${currentMinute.toString().padStart(2, '0')}, quiet: ${quietStart}-${quietEnd})`);
        
        if (inQuietHours) {
          console.log(`[SCHEDULER]   - SKIPPING: Device in quiet hours`);
          continue; // Skip this device during quiet hours
        }
      }
      
      // Get selected categories for this device
      const selectedCategories = device.selected_categories || [];
      console.log(`[SCHEDULER]   - Categories count: ${selectedCategories.length}`);
      if (selectedCategories.length === 0) {
        console.log(`[SCHEDULER]   - SKIPPING: No categories selected`);
        continue; // No categories selected
      }
      
      // Pick a random tidbit from selected categories
      const availableTidbits = [];
      for (const categoryId of selectedCategories) {
        if (tidbitsData[categoryId] && tidbitsData[categoryId].length > 0) {
          for (const tidbitText of tidbitsData[categoryId]) {
            availableTidbits.push({
              text: tidbitText,
              category: categoryId,
            });
          }
        }
      }
      
      console.log(`[SCHEDULER]   - Available tidbits: ${availableTidbits.length}`);
      if (availableTidbits.length === 0) {
        console.log(`[SCHEDULER]   - SKIPPING: No tidbits available for selected categories`);
        continue; // No tidbits available for selected categories
      }
      
      // Pick random tidbit
      const randomTidbit = availableTidbits[Math.floor(Math.random() * availableTidbits.length)];
      console.log(`[SCHEDULER]   - Selected tidbit from category: ${randomTidbit.category}`);
      
      // Generate tidbit ID (same as ContentService)
      function generateTidbitId(text, category) {
        const content = `${text}|${category}`;
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
          const char = content.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const hashStr = Math.abs(hash).toString(16);
        return `tidbit_${hashStr}`;
      }
      
      const tidbitId = generateTidbitId(randomTidbit.text, randomTidbit.category);
      
      // Create notification message
      // IMPORTANT: Must match the exact format of test notifications
      // For iOS action buttons, categoryId must be at the top level
      const message = {
        to: device.token,
        sound: 'default',
        title: '📚 Tidbit',
        body: randomTidbit.text,
        data: {
          tidbit: JSON.stringify({
            text: randomTidbit.text,
            category: randomTidbit.category,
            id: tidbitId,
          }),
          tidbitId: tidbitId,
          category: randomTidbit.category,
        },
        categoryId: 'tidbit_feedback', // Required for iOS action buttons - Expo converts this to aps.category
        priority: 'high',
        // Also try adding it to the iOS-specific payload (Expo should handle this, but being explicit)
        _displayInForeground: true,
      };
      
      // Verify categoryId is included before adding to messages
      if (!message.categoryId) {
        console.error('[SCHEDULER] ERROR: categoryId is missing from message!');
      }
      
      console.log('[SCHEDULER] Creating notification with categoryId:', message.categoryId);
      console.log('[SCHEDULER] Full message structure:', JSON.stringify({
        hasTo: !!message.to,
        hasTitle: !!message.title,
        hasBody: !!message.body,
        hasData: !!message.data,
        categoryId: message.categoryId,
        priority: message.priority,
      }, null, 2));
      
      messages.push(message);
    }
    
    if (messages.length === 0) {
      console.log('[SCHEDULER] No notifications to send (all devices in quiet hours or no categories)');
      return;
    }
    
    // Send notifications in chunks (Expo limit)
    const chunks = expo.chunkPushNotifications(messages);
    let sentCount = 0;
    let errorCount = 0;
    
    // Log first message to verify categoryId is included
    if (messages.length > 0) {
      console.log('[SCHEDULER] Sample message being sent:', JSON.stringify({
        to: messages[0].to.substring(0, 20) + '...',
        title: messages[0].title,
        categoryId: messages[0].categoryId,
        hasData: !!messages[0].data,
      }, null, 2));
    }
    
    for (const chunk of chunks) {
      try {
        // Log the exact message format being sent
        console.log('[SCHEDULER] Sending chunk with', chunk.length, 'notifications');
        console.log('[SCHEDULER] First message in chunk:', JSON.stringify({
          to: chunk[0].to.substring(0, 30) + '...',
          title: chunk[0].title,
          body: chunk[0].body?.substring(0, 50) + '...',
          categoryId: chunk[0].categoryId,
          hasData: !!chunk[0].data,
          dataKeys: chunk[0].data ? Object.keys(chunk[0].data) : [],
        }, null, 2));
        
        // Log the EXACT payload being sent to Expo
        console.log('[SCHEDULER] About to send to Expo, chunk[0] categoryId:', chunk[0].categoryId);
        console.log('[SCHEDULER] Full chunk[0] keys:', Object.keys(chunk[0]));
        
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        
        // Log the response from Expo
        console.log('[SCHEDULER] Expo response tickets:', tickets.map(t => ({
          status: t.status,
          id: t.id,
          message: t.message,
        })));
        
        // Check for errors in tickets
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'ok') {
            sentCount++;
            console.log(`[SCHEDULER] ✅ Notification ${i+1} sent successfully, ticket ID: ${ticket.id}`);
            console.log(`[SCHEDULER] ✅ This notification SHOULD have categoryId: ${chunk[i].categoryId}`);
          } else {
            errorCount++;
            console.error(`[SCHEDULER] ❌ Notification ${i+1} error:`, ticket.message || ticket);
            if (ticket.details) {
              console.error('[SCHEDULER] Error details:', ticket.details);
            }
          }
        }
      } catch (error) {
        console.error('[SCHEDULER] Error sending notification chunk:', error);
        errorCount += chunk.length;
      }
    }
    
    console.log(`[SCHEDULER] Sent ${sentCount} notifications, ${errorCount} errors`);
    
  } catch (error) {
    console.error('[SCHEDULER] Error in sendScheduledNotifications:', error);
  }
}

/**
 * Setup cron jobs for sending notifications
 * Runs every minute and checks if it's time to send based on user intervals
 */
function setupNotificationScheduler() {
  // Run every minute
  // Note: Interval checking is now done inside sendScheduledNotifications() for each device individually
  cron.schedule('* * * * *', async () => {
    if (!supabase || !supabaseConnected) {
      return; // Skip if Supabase not available
    }
    
    try {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentHour = now.getHours();
      const minutesSinceMidnight = currentHour * 60 + currentMinute;
      
      console.log(`[CRON] Running at ${currentHour}:${currentMinute.toString().padStart(2, '0')} (minute ${minutesSinceMidnight} since midnight)`);
      
      // sendScheduledNotifications() will check intervals and quiet hours for each device individually
      await sendScheduledNotifications();
    } catch (error) {
      console.error('[SCHEDULER] Error in cron job:', error);
    }
  });
  
  console.log('[SCHEDULER] Notification scheduler started (runs every minute)');
}

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
  
  // Note: Scheduler will start automatically when Supabase connection test completes
  // (see async connection test above)
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

