const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// OpenAI client (W10)
const OpenAI = require('openai');
const multer = require('multer');
const snapUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const openaiClient = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-...')
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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
app.use(express.json({ limit: '12mb' }));

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
      .select('id, category_id, text, term')
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
      tidbitsByCategory[tidbit.category_id].push({ text: tidbit.text, term: tidbit.term || null });
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
      userId, // Supabase auth.users.id once the user logs in
      // User preferences (optional, will be updated if provided)
      notificationInterval,
      notificationsEnabled,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      selectedCategories,
      selectedDeckIds,
      selectedDeckSections,
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
    if (userId) {
      updateData.user_id = userId;
    }
    
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
    if (selectedDeckIds !== undefined) {
      updateData.selected_deck_ids = selectedDeckIds;
      console.log(`[SERVER] Updating selected_deck_ids to: ${JSON.stringify(selectedDeckIds)}`);
    }
    if (selectedDeckSections !== undefined) {
      updateData.selected_deck_sections = selectedDeckSections;
      console.log(`[SERVER] Updating selected_deck_sections keys: ${Object.keys(selectedDeckSections || {}).length}`);
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

// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat webhook (W9)
// RevenueCat POSTs here on every subscription lifecycle event.
// We upsert the entitlements table so the DB is always the source of truth.
// Set the webhook URL in RevenueCat dashboard → Project → Integrations → Webhooks.
// Set Authorization header value to match REVENUECAT_WEBHOOK_AUTH in .env.
// ─────────────────────────────────────────────────────────────────────────────
const REVENUECAT_WEBHOOK_AUTH = process.env.REVENUECAT_WEBHOOK_AUTH || '';

app.post('/api/revenuecat-webhook', express.json(), async (req, res) => {
  // Validate the shared secret so only RevenueCat can call this
  const auth = req.headers.authorization || '';
  if (REVENUECAT_WEBHOOK_AUTH && auth !== REVENUECAT_WEBHOOK_AUTH) {
    console.warn('[RC_WEBHOOK] Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const event = req.body;
  const eventType = event?.event?.type;
  const appUserId = event?.event?.app_user_id;   // This is the Supabase user UUID we set via logIn()
  const expiresAt = event?.event?.expiration_at_ms
    ? new Date(event.event.expiration_at_ms).toISOString()
    : null;

  console.log(`[RC_WEBHOOK] Event: ${eventType}, user: ${appUserId}`);

  if (!supabase || !appUserId) {
    return res.status(200).json({ received: true });
  }

  try {
    const activeEvents = [
      'INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED',
    ];
    const revokedEvents = [
      'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE', 'SUBSCRIBER_ALIAS',
    ];

    if (activeEvents.includes(eventType)) {
      await supabase.from('entitlements').upsert({
        user_id:    appUserId,
        product:    'premium_monthly',
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product' });
      console.log(`[RC_WEBHOOK] Entitlement granted for ${appUserId}`);
    } else if (revokedEvents.includes(eventType)) {
      await supabase.from('entitlements')
        .delete()
        .eq('user_id', appUserId)
        .eq('product', 'premium_monthly');
      console.log(`[RC_WEBHOOK] Entitlement revoked for ${appUserId}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[RC_WEBHOOK] Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Deck Generation (W10)
// POST /api/ai/generate-deck
//
// Body: {
//   userId:    string  (Supabase auth UID — client sends it, server trusts Supabase RLS)
//   mode:      'text_prompt' | 'paste_notes' | 'snap_page'
//   prompt:    string  (topic description or pasted text)
//   imageBase64?: string  (for snap_page mode only)
//   deckTitle?: string  (optional override, server auto-generates if omitted)
//   classId?:  string  (optional, attached to the saved deck)
// }
//
// Returns: { deckId, title, cards: [{front, back}] }
// ─────────────────────────────────────────────────────────────────────────────

const AI_MONTHLY_QUOTA = 30;
const SNAP_CARDS_PER_PAGE = 30;
const SNAP_MAX_TOKENS_PER_PAGE = 4096;

/** Notification copy: title always "Tidbit"; body is "term: definition" when term exists. */
function formatTidbitNotificationTitle({ bedtime = false } = {}) {
  return bedtime ? '🌙 Tidbit' : '📚 Tidbit';
}

function formatTidbitNotificationBody(text, term) {
  if (term) return `${term}: ${text}`;
  return text;
}

function generateTidbitId(text, category) {
  const content = `${text}|${category}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `tidbit_${Math.abs(hash).toString(16)}`;
}

/** Cards from selected preset + user-owned decks (scoped to device owner). */
async function fetchCardsForDeckIds(deckIds, userId, sectionFilterByDeck = {}) {
  if (!supabase || !deckIds?.length) return [];

  const uniqueIds = [...new Set(deckIds.filter(Boolean))];
  const { data: decks, error: deckErr } = await supabase
    .from('decks')
    .select('id, slug, owner_id')
    .in('id', uniqueIds);

  if (deckErr || !decks?.length) return [];

  const allowedDeckIds = decks
    .filter((d) => !d.owner_id || (userId && d.owner_id === userId))
    .map((d) => d.id);
  if (!allowedDeckIds.length) return [];

  const slugByDeckId = Object.fromEntries(decks.map((d) => [d.id, d.slug || d.id]));

  const { data: cards, error: cardErr } = await supabase
    .from('cards')
    .select('id, deck_id, front, back, section_id')
    .in('deck_id', allowedDeckIds);

  if (cardErr || !cards?.length) return [];

  return cards
    .filter((c) => {
      if (!c.back?.trim()) return false;
      const raw = sectionFilterByDeck[c.deck_id];
      if (raw === undefined) return true;

      let sectionIds;
      let includeUncategorized;
      if (Array.isArray(raw)) {
        sectionIds = raw;
        includeUncategorized = raw.length > 0;
      } else if (raw && typeof raw === 'object') {
        sectionIds = Array.isArray(raw.sectionIds) ? raw.sectionIds : [];
        includeUncategorized = !!raw.includeUncategorized;
      } else {
        return false;
      }

      if (!sectionIds.length && !includeUncategorized) return false;
      if (!c.section_id) return includeUncategorized;
      return sectionIds.includes(c.section_id);
    })
    .map((c) => {
      const front = (c.front || '').trim();
      const back = c.back.trim();
      const term = front && front !== back ? front : null;
      return {
        id: c.id,
        text: back,
        term,
        category: slugByDeckId[c.deck_id] || c.deck_id,
      };
    });
}

function buildNotificationPool(tidbitsData, selectedCategories, deckCards) {
  const pool = [];
  const seenText = new Set();

  const add = (item) => {
    const text = (item.text || '').trim();
    if (!text || seenText.has(text)) return;
    seenText.add(text);
    pool.push(item);
  };

  for (const categoryId of selectedCategories || []) {
    const items = tidbitsData?.[categoryId] || [];
    for (const tidbitItem of items) {
      const text = typeof tidbitItem === 'string' ? tidbitItem : tidbitItem.text;
      const term = typeof tidbitItem === 'string' ? null : tidbitItem.term;
      add({ text, term: term || null, category: categoryId, id: null });
    }
  }

  for (const card of deckCards || []) {
    add({
      text: card.text,
      term: card.term || null,
      category: card.category,
      id: card.id,
    });
  }

  return pool;
}

function notificationPayloadFromPoolItem(item) {
  const tidbitId = item.id || generateTidbitId(item.text, item.category);
  return {
    text: item.text,
    term: item.term || null,
    category: item.category,
    id: tidbitId,
  };
}

async function getMonthlyUsage(userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_generation_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());
  return count ?? 0;
}

function buildSystemPrompt(mode, { pageCount = 1, targetPerPage = null } = {}) {
  const base = `You are an expert flashcard creator for college and AP-level students.
Your job is to produce high-quality term-and-definition study cards from the user's input.

Rules:
- Use term-and-definition format: each card's FRONT is the term, concept name, or formula label (max 10 words).
- Each card's BACK is a clear, self-contained definition or explanation (max 40 words). One concept only.
- Do NOT phrase the front as a question (avoid "What is…?", "Define…", "How does…?", etc.).
- Only use a question on the front if the source material is itself a question with no natural term (rare — at most 1 in 10 cards).
- Do not include card numbers or labels.
- Be academically rigorous and precise. Do not make things up.
- Return ONLY a valid JSON object with a "cards" array. No markdown, no explanation, no extra text.

Format:
{"cards": [{"front": "Numerical Analysis", "back": "The study of algorithms for approximating solutions to mathematical problems that cannot be solved exactly."}, ...]}`;

  if (mode === 'paste_notes') {
    return base + '\n\nThe user will paste raw notes or text. Extract the key concepts and turn each into a term/definition card.';
  }
  if (mode === 'snap_page') {
    const perPage = targetPerPage || SNAP_CARDS_PER_PAGE;
    const pageLabel = pageCount === 1 ? '1 page' : `${pageCount} pages`;
    return base + `\n\nThe user photographed ${pageLabel} of notes or a textbook. Extract EVERY distinct concept, term, definition, bullet, and formula visible on the page. For each one, put the term or concept name on "front" and its definition or explanation on "back". Do not merge unrelated ideas. Aim for ${perPage} cards (typically 25–35). Cover the full page thoroughly; do not stop early.`;
  }
  // text_prompt
  return base + '\n\nThe user will describe a topic. Generate term/definition cards covering the most important concepts for that topic. Produce between 10 and 20 cards depending on how much material is provided.';
}

function parseCardsFromAiContent(rawText) {
  const parsed = JSON.parse(rawText.trim());
  const cards = Array.isArray(parsed)
    ? parsed
    : (parsed.cards || parsed.flashcards || Object.values(parsed).find(Array.isArray));
  if (!Array.isArray(cards)) {
    throw new Error('invalid_json');
  }
  return cards
    .filter((c) => c.front?.trim() && c.back?.trim())
    .map((c) => ({ front: String(c.front).trim(), back: String(c.back).trim() }));
}

/** One OpenAI call per page so each gets a full token budget (~30 cards/page). */
async function generateSnapPageCards(snapImages, userPrompt) {
  const pageCount = snapImages.length;
  const basePrompt = userPrompt?.trim() || 'Extract term-and-definition cards from this page of notes.';

  const pageResults = await Promise.all(
    snapImages.map(async (img, index) => {
      const textPrompt = pageCount > 1
        ? `${basePrompt} (page ${index + 1} of ${pageCount})`
        : basePrompt;

      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSystemPrompt('snap_page', { pageCount: 1, targetPerPage: SNAP_CARDS_PER_PAGE }) },
          {
            role: 'user',
            content: [
              { type: 'text', text: textPrompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img}`, detail: 'high' } },
            ],
          },
        ],
        temperature: 0.4,
        max_tokens: SNAP_MAX_TOKENS_PER_PAGE,
        response_format: { type: 'json_object' },
      });

      if (completion.choices[0].finish_reason === 'length') {
        console.warn(`[AI] Page ${index + 1}/${pageCount} hit max_tokens — output may be truncated`);
      }

      try {
        const cards = parseCardsFromAiContent(completion.choices[0].message.content);
        console.log(`[AI] Page ${index + 1}/${pageCount}: ${cards.length} cards parsed`);
        return cards.slice(0, SNAP_CARDS_PER_PAGE);
      } catch (err) {
        console.error(`[AI] Failed to parse page ${index + 1}/${pageCount}:`, err.message);
        return [];
      }
    })
  );

  const merged = pageResults.flat();
  if (merged.length === 0) return null;
  return merged.slice(0, pageCount * SNAP_CARDS_PER_PAGE);
}

app.post('/api/ai/generate-deck', express.json({ limit: '10mb' }), async (req, res) => {
  if (!openaiClient) {
    return res.status(503).json({ error: 'AI generation is not configured on this server.' });
  }
  if (!supabase || !supabaseConnected) {
    return res.status(503).json({ error: 'Database unavailable.' });
  }

  const { userId, mode = 'text_prompt', prompt, imageBase64, imagesBase64, deckTitle, classId } = req.body;

  if (!userId || !prompt?.trim()) {
    return res.status(400).json({ error: 'userId and prompt are required.' });
  }

  const snapImages = (Array.isArray(imagesBase64) && imagesBase64.length > 0)
    ? imagesBase64.slice(0, 6)
    : (imageBase64 ? [imageBase64] : []);
  const pageCount = mode === 'snap_page' ? Math.max(1, snapImages.length) : 1;

  if (mode === 'snap_page' && snapImages.length === 0) {
    return res.status(400).json({ error: 'No image received. Please try again or update the app.' });
  }

  // Quota check
  try {
    const used = await getMonthlyUsage(userId);
    if (used >= AI_MONTHLY_QUOTA) {
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);
      resetDate.setDate(1);
      return res.status(429).json({
        error: 'quota_exceeded',
        used,
        limit: AI_MONTHLY_QUOTA,
        resetsAt: resetDate.toISOString(),
      });
    }
  } catch (err) {
    console.error('[AI] Quota check failed:', err);
    // Fail open — don't block the user if quota check errors
  }

  try {
    let cards;

    if (mode === 'snap_page' && snapImages.length > 0) {
      console.log(`[AI] Snap-a-Page for user ${userId}, pages: ${pageCount} (one API call per page)`);
      cards = await generateSnapPageCards(snapImages, prompt);
      if (!cards?.length) {
        return res.status(500).json({ error: 'AI returned no cards. Try a more specific prompt.' });
      }
    } else {
      const messages = [
        { role: 'system', content: buildSystemPrompt(mode, { pageCount }) },
        { role: 'user', content: prompt },
      ];

      console.log(`[AI] Generating deck for user ${userId}, mode: ${mode}, prompt length: ${prompt.length}`);

      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      try {
        cards = parseCardsFromAiContent(completion.choices[0].message.content);
      } catch {
        return res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' });
      }

      if (!cards.length) {
        return res.status(500).json({ error: 'AI returned no cards. Try a more specific prompt.' });
      }

      cards = cards.slice(0, 25);
    }

    // Auto-generate deck title if not provided
    const title = deckTitle?.trim() || await generateDeckTitle(prompt, mode);

    // Save deck + cards to Supabase
    const { data: deck, error: deckErr } = await supabase
      .from('decks')
      .insert({
        owner_id: userId,
        title,
        class_id: classId || null,
        cover_emoji: '🤖',
        source: 'ai_generated',
        is_public: false,
      })
      .select()
      .single();

    if (deckErr) throw deckErr;

    const cardRows = cards.map((c, i) => ({
      deck_id: deck.id,
      front: c.front,
      back: c.back,
      card_type: 'basic',
      position: i,
    }));

    const { error: cardsErr } = await supabase.from('cards').insert(cardRows);
    if (cardsErr) throw cardsErr;

    // Log usage
    await supabase.from('ai_generation_log').insert({
      user_id: userId,
      source: mode,
      deck_id: deck.id,
      cards_generated: cards.length,
      prompt_chars: prompt.length,
    });

    console.log(`[AI] Generated ${cards.length} cards, deck "${title}" (${deck.id})`);

    res.json({ deckId: deck.id, title, cards });
  } catch (err) {
    console.error('[AI] Generation error:', err);
    res.status(500).json({ error: err.message || 'Generation failed. Please try again.' });
  }
});

async function generateDeckTitle(prompt, mode) {
  try {
    const short = prompt.slice(0, 200);
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Generate a short, specific deck title (4-6 words) for a set of flashcards. Return only the title, no quotes.' },
        { role: 'user', content: short },
      ],
      max_tokens: 20,
      temperature: 0.3,
    });
    return completion.choices[0].message.content.trim() || 'AI Generated Deck';
  } catch {
    return mode === 'snap_page' ? 'Snap-a-Page Deck' : 'AI Generated Deck';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Snap-a-Page endpoint — multipart upload (avoids base64 JSON size limits)
// POST /api/ai/snap-page   (multipart/form-data)
//   Fields: userId, deckTitle (optional)
//   File:   image (jpeg/png)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/ai/snap-page', snapUpload.single('image'), async (req, res) => {
  if (!openaiClient) return res.status(503).json({ error: 'AI not configured.' });
  if (!supabase || !supabaseConnected) return res.status(503).json({ error: 'Database unavailable.' });

  const { userId, deckTitle } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required.' });
  if (!req.file) return res.status(400).json({ error: 'image file is required.' });

  // Quota check
  try {
    const used = await getMonthlyUsage(userId);
    if (used >= AI_MONTHLY_QUOTA) {
      return res.status(429).json({ error: 'quota_exceeded', used, limit: AI_MONTHLY_QUOTA });
    }
  } catch {}

  try {
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    console.log(`[AI/SNAP] user=${userId} size=${req.file.size} bytes`);

    const cards = await generateSnapPageCards([imageBase64], 'Extract term-and-definition cards from this page.');
    if (!cards?.length) {
      return res.status(500).json({ error: 'AI returned no cards. Try a clearer photo.' });
    }

    const title = deckTitle?.trim() || await generateDeckTitle('Snap-a-Page notes', 'snap_page');

    const { data: deck, error: deckErr } = await supabase
      .from('decks')
      .insert({ owner_id: userId, title, cover_emoji: '📸', source: 'ai_generated', is_public: false })
      .select().single();
    if (deckErr) throw deckErr;

    await supabase.from('cards').insert(
      cards.map((c, i) => ({ deck_id: deck.id, front: c.front, back: c.back, card_type: 'basic', position: i }))
    );

    await supabase.from('ai_generation_log').insert({
      user_id: userId, source: 'snap_page', deck_id: deck.id,
      cards_generated: cards.length, prompt_chars: 0,
    });

    console.log(`[AI/SNAP] Generated ${cards.length} cards → deck "${title}" (${deck.id})`);
    res.json({ deckId: deck.id, title, cards });
  } catch (err) {
    console.error('[AI/SNAP] Error:', err);
    res.status(500).json({ error: err.message || 'Generation failed. Please try again.' });
  }
});

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
    
    // Get tidbits from Supabase (may be empty if only deck sources are selected)
    const tidbitsData = (await fetchTidbitsFromSupabase()) || {};
    
    const messages = [];
    const deckCardsCache = new Map();
    
    async function getDeckCardsForDevice(device) {
      const deckIds = device.selected_deck_ids || [];
      if (!deckIds.length) return [];
      const sectionFilter = device.selected_deck_sections || {};
      const key = `${device.user_id || 'anon'}:${[...deckIds].sort().join(',')}:${JSON.stringify(sectionFilter)}`;
      if (deckCardsCache.has(key)) return deckCardsCache.get(key);
      const cards = await fetchCardsForDeckIds(deckIds, device.user_id, sectionFilter);
      deckCardsCache.set(key, cards);
      return cards;
    }
    
    console.log(`[SCHEDULER] Processing ${devices.length} devices`);
    
    for (const device of devices) {
      console.log(`[SCHEDULER] Checking device: ${device.token.substring(0, 20)}...`);
      console.log(`[SCHEDULER]   - Notification interval: ${device.notification_interval || 'NOT SET'} min`);
      console.log(`[SCHEDULER]   - Quiet hours enabled: ${device.quiet_hours_enabled}`);
      console.log(`[SCHEDULER]   - Quiet hours: ${device.quiet_hours_start || 23} - ${device.quiet_hours_end || 9}`);
      console.log(`[SCHEDULER]   - Selected categories: ${JSON.stringify(device.selected_categories || [])}`);
      console.log(`[SCHEDULER]   - Selected decks: ${JSON.stringify(device.selected_deck_ids || [])}`);
      
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

      // If it's 10 PM local, let the bedtime brief handle this slot instead
      // so the user only gets one notification (the branded 🌙 one, not a plain one)
      if (currentHour === 22) {
        console.log(`[SCHEDULER]   - SKIPPING: 10 PM slot deferred to bedtime brief`);
        continue;
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
      
      const selectedCategories = device.selected_categories || [];
      const selectedDeckIds = device.selected_deck_ids || [];
      console.log(`[SCHEDULER]   - Categories count: ${selectedCategories.length}, decks: ${selectedDeckIds.length}`);
      if (selectedCategories.length === 0 && selectedDeckIds.length === 0) {
        console.log(`[SCHEDULER]   - SKIPPING: No categories or decks selected`);
        continue;
      }

      const deckCards = await getDeckCardsForDevice(device);
      const availableTidbits = buildNotificationPool(tidbitsData, selectedCategories, deckCards);
      
      console.log(`[SCHEDULER]   - Available tidbits: ${availableTidbits.length} (${deckCards.length} from decks)`);
      if (availableTidbits.length === 0) {
        console.log(`[SCHEDULER]   - SKIPPING: No tidbits available for selected sources`);
        continue;
      }
      
      const randomItem = availableTidbits[Math.floor(Math.random() * availableTidbits.length)];
      const randomTidbit = notificationPayloadFromPoolItem(randomItem);
      console.log(`[SCHEDULER]   - Selected tidbit from: ${randomTidbit.category}`);
      
      const tidbitId = randomTidbit.id;
      
      // Create notification message
      const message = {
        to: device.token,
        sound: 'default',
        title: formatTidbitNotificationTitle(),
        body: formatTidbitNotificationBody(randomTidbit.text, randomTidbit.term),
        data: {
          tidbit: JSON.stringify({
            text: randomTidbit.text,
            term: randomTidbit.term || null,
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

// ─────────────────────────────────────────────────────────────────────────────
// Bedtime brief (W8)
// Fires once per day at 22:00 local time for each device.
// Sends exactly one card regardless of the user's normal notification interval.
// Bypasses quiet hours (10pm is before everyone's quiet window).
// Uses a separate "bedtime_sent_date" field on device_tokens to ensure
// we only send once per calendar day per device.
// ─────────────────────────────────────────────────────────────────────────────

async function sendBedtimeBriefs() {
  if (!supabase || !supabaseConnected) return;

  try {
    const now = new Date();

    const { data: devices, error } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('notifications_enabled', true);

    if (error || !devices || devices.length === 0) return;

    const tidbitsData = (await fetchTidbitsFromSupabase()) || {};
    const deckCardsCache = new Map();

    async function getDeckCardsForDevice(device) {
      const deckIds = device.selected_deck_ids || [];
      if (!deckIds.length) return [];
      const sectionFilter = device.selected_deck_sections || {};
      const key = `${device.user_id || 'anon'}:${[...deckIds].sort().join(',')}:${JSON.stringify(sectionFilter)}`;
      if (deckCardsCache.has(key)) return deckCardsCache.get(key);
      const cards = await fetchCardsForDeckIds(deckIds, device.user_id, sectionFilter);
      deckCardsCache.set(key, cards);
      return cards;
    }

    const messages = [];
    const todayUTC = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

    for (const device of devices) {
      // Derive local hour using stored timezone offset (fallback PST)
      const timezoneOffset = device.timezone_offset_minutes ?? -480;
      const localTime = getLocalTime(now, timezoneOffset);
      const { hour: localHour } = localTime;

      // Only fire at 22:xx local (10 PM)
      if (localHour !== 22) continue;

      // Only send once per calendar day
      if (device.bedtime_sent_date === todayUTC) continue;

      const selectedCategories = device.selected_categories || [];
      const selectedDeckIds = device.selected_deck_ids || [];
      if (selectedCategories.length === 0 && selectedDeckIds.length === 0) continue;

      const deckCards = await getDeckCardsForDevice(device);
      const availableTidbits = buildNotificationPool(tidbitsData, selectedCategories, deckCards);
      if (availableTidbits.length === 0) continue;

      const randomItem = availableTidbits[Math.floor(Math.random() * availableTidbits.length)];
      const tidbit = notificationPayloadFromPoolItem(randomItem);

      messages.push({
        to: device.token,
        sound: 'default',
        title: formatTidbitNotificationTitle({ bedtime: true }),
        body: formatTidbitNotificationBody(tidbit.text, tidbit.term),
        data: {
          tidbit: JSON.stringify({ text: tidbit.text, term: tidbit.term || null, category: tidbit.category, id: tidbit.id }),
          tidbitId: tidbit.id,
          category: tidbit.category,
        },
        categoryId: 'tidbit_feedback',
        priority: 'high',
      });

      // Mark this device as sent for today (fire-and-forget)
      supabase
        .from('device_tokens')
        .update({ bedtime_sent_date: todayUTC })
        .eq('id', device.id)
        .then(() => {})
        .catch(() => {});
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
        console.log(`[BEDTIME] Sent ${chunk.length} bedtime brief(s)`);
      } catch (err) {
        console.error('[BEDTIME] Error sending chunk:', err);
      }
    }
  } catch (err) {
    console.error('[BEDTIME] Unexpected error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity-post generation (W5)
// Runs every 15 minutes. Detects milestone crossings in user_stats and creates
// feed_posts so classmates see social signals in their group feeds.
// ─────────────────────────────────────────────────────────────────────────────

const TIDBITS_MILESTONES = [25, 50, 100, 250, 500, 1000];
const STREAK_MILESTONES  = [3, 7, 14, 30, 60, 100];

/**
 * Return the highest milestone value that `count` has crossed, or null.
 * e.g. highestCrossed([25,50,100], 73) → 50
 */
function highestCrossed(milestones, count) {
  return [...milestones].reverse().find((m) => count >= m) ?? null;
}

/**
 * Check whether this user has already received a post for this exact milestone.
 * Uses the `cs` (JSONB contains) operator against payload.
 */
async function milestoneAlreadyPosted(userId, eventKey, milestoneValue) {
  const { data } = await supabase
    .from('feed_posts')
    .select('id')
    .eq('author_id', userId)
    .eq('post_type', 'activity')
    .filter('payload', 'cs', JSON.stringify({ event: eventKey, milestone: milestoneValue }))
    .limit(1);
  return !!(data && data.length > 0);
}

/**
 * Post an activity into every group the user belongs to.
 */
async function postMilestoneToAllGroups(userId, eventKey, milestone, text) {
  // Already posted this milestone? Skip.
  if (await milestoneAlreadyPosted(userId, eventKey, milestone)) return;

  // Get all groups this user is a member of
  const { data: memberships } = await supabase
    .from('class_memberships')
    .select('class_id, groups!inner(id)')
    .eq('user_id', userId);

  if (!memberships || memberships.length === 0) return;

  const rows = memberships.map((m) => ({
    author_id: userId,
    group_id:  m.groups.id,
    post_type: 'activity',
    payload: {
      event:     eventKey,
      milestone: milestone,
      text,
    },
  }));

  const { error } = await supabase.from('feed_posts').insert(rows);
  if (error) {
    console.error(`[ACTIVITY_POSTS] insert error for user ${userId}:`, error.message);
  } else {
    console.log(`[ACTIVITY_POSTS] Posted "${eventKey}:${milestone}" for user ${userId} in ${rows.length} group(s)`);
  }
}

async function generateActivityPosts() {
  if (!supabase || !supabaseConnected) return;

  // Look at users whose stats were updated in the last 20 minutes (cron window + buffer)
  const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();

  const { data: activeStats, error } = await supabase
    .from('user_stats')
    .select('user_id, tidbits_seen, current_streak')
    .gt('updated_at', since);

  if (error) {
    console.error('[ACTIVITY_POSTS] Error fetching user_stats:', error.message);
    return;
  }
  if (!activeStats || activeStats.length === 0) return;

  console.log(`[ACTIVITY_POSTS] Checking ${activeStats.length} active user(s) for milestones`);

  for (const stats of activeStats) {
    const { user_id, tidbits_seen, current_streak } = stats;

    // Tidbits-seen milestone
    const tidbitMilestone = highestCrossed(TIDBITS_MILESTONES, tidbits_seen || 0);
    if (tidbitMilestone) {
      await postMilestoneToAllGroups(
        user_id,
        'milestone_tidbits',
        tidbitMilestone,
        `just studied their ${tidbitMilestone}th tidbit! 📚`
      );
    }

    // Study-streak milestone
    const streakMilestone = highestCrossed(STREAK_MILESTONES, current_streak || 0);
    if (streakMilestone) {
      await postMilestoneToAllGroups(
        user_id,
        'milestone_streak',
        streakMilestone,
        `is on a ${streakMilestone}-day study streak! 🔥`
      );
    }
  }
}

/**
 * Setup cron jobs for sending notifications
 * Runs every minute and checks if it's time to send based on user intervals
 */
function setupNotificationScheduler() {
  // Per-minute: send scheduled notifications
  cron.schedule('* * * * *', async () => {
    if (!supabase || !supabaseConnected) return;
    try {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentHour = now.getHours();
      const minutesSinceMidnight = currentHour * 60 + currentMinute;
      console.log(`[CRON] Running at ${currentHour}:${currentMinute.toString().padStart(2, '0')} (minute ${minutesSinceMidnight} since midnight)`);
      await sendScheduledNotifications();
    } catch (error) {
      console.error('[SCHEDULER] Error in cron job:', error);
    }
  });

  // Every 15 minutes: generate activity posts for milestone crossings
  cron.schedule('*/15 * * * *', async () => {
    if (!supabase || !supabaseConnected) return;
    try {
      await generateActivityPosts();
    } catch (error) {
      console.error('[ACTIVITY_POSTS] Error in cron job:', error);
    }
  });

  // Every minute: check if it's 10 PM local for any device and send bedtime brief
  cron.schedule('* * * * *', async () => {
    if (!supabase || !supabaseConnected) return;
    try {
      await sendBedtimeBriefs();
    } catch (error) {
      console.error('[BEDTIME] Error in cron job:', error);
    }
  });

  console.log('[SCHEDULER] Notification scheduler started (runs every minute)');
  console.log('[ACTIVITY_POSTS] Activity-post cron started (runs every 15 minutes)');
  console.log('[BEDTIME] Bedtime brief cron started (fires at 22:00 local per device)');
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

