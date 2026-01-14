/**
 * Test script to send a push notification
 * 
 * Usage:
 *   node server/scripts/test-push-notification.js <token>
 * 
 * Or if you have the token in Supabase:
 *   node server/scripts/test-push-notification.js
 */

const { Expo } = require('expo-server-sdk');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

const expo = new Expo();

async function testPushNotification() {
  const tokenArg = process.argv[2];
  
  let pushToken = tokenArg;
  
  // If no token provided, try to get from Supabase
  if (!pushToken && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase
        .from('device_tokens')
        .select('token, platform')
        .order('last_active', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        console.error('❌ Could not get token from Supabase:', error?.message || 'No tokens found');
        console.log('\nUsage: node server/scripts/test-push-notification.js <ExpoPushToken>');
        process.exit(1);
      }
      
      pushToken = data.token;
      console.log(`📱 Found token from Supabase: ${data.platform} (${pushToken.substring(0, 20)}...)`);
    } catch (error) {
      console.error('❌ Error connecting to Supabase:', error.message);
      console.log('\nUsage: node server/scripts/test-push-notification.js <ExpoPushToken>');
      process.exit(1);
    }
  }
  
  if (!pushToken) {
    console.error('❌ No push token provided');
    console.log('\nUsage: node server/scripts/test-push-notification.js <ExpoPushToken>');
    console.log('   Or make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('❌ Invalid Expo push token format');
    console.log('Token should start with: ExponentPushToken[...]');
    process.exit(1);
  }
  
  // Get a random tidbit for the notification
  let tidbitText = 'This is a test notification! 🎉';
  try {
    const response = await fetch(`${API_BASE_URL}/api/tidbits`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.tidbits) {
        // Get a random tidbit from any category
        const categories = Object.keys(data.tidbits);
        if (categories.length > 0) {
          const randomCategory = categories[Math.floor(Math.random() * categories.length)];
          const tidbits = data.tidbits[randomCategory];
          if (tidbits && tidbits.length > 0) {
            tidbitText = tidbits[Math.floor(Math.random() * tidbits.length)];
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not fetch tidbit from server, using default message');
  }
  
  console.log('\n📤 Sending test push notification...');
  console.log(`   Token: ${pushToken.substring(0, 30)}...`);
  console.log(`   Message: ${tidbitText.substring(0, 50)}...`);
  
  // Send via server endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: pushToken,
        title: '📚 Tidbit',
        body: tidbitText,
        categoryId: 'tidbit_feedback',
        data: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ Push notification sent successfully!');
      console.log('   Check your phone - you should see the notification with interactive buttons!');
      console.log('\n   Try long-pressing or expanding the notification to see the buttons:');
      console.log('   - ✅ I knew it');
      console.log('   - ❓ I didn\'t');
      console.log('   - 💾 Save');
    } else {
      console.error('\n❌ Failed to send notification:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error sending notification:', error.message);
    console.log(`\nMake sure your server is running at ${API_BASE_URL}`);
    process.exit(1);
  }
}

testPushNotification();

