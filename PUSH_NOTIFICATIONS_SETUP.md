# Push Notifications Setup Guide

## ✅ What's Been Done

1. **App Configuration** - Added push notification config to `app.json`
2. **Database Schema** - Added `device_tokens` table to Supabase schema
3. **Server Endpoints** - Added `/api/register-token` and `/api/send-notification`
4. **Dependencies** - Installed `expo-server-sdk`, `node-cron`, `expo-constants`
5. **NotificationService** - Added device token registration

## 📋 Next Steps

### 1. Update Supabase Schema
Run the updated `server/supabase-schema.sql` in Supabase SQL Editor to create the `device_tokens` table.

### 2. Add StorageService Method
Add this to `src/services/StorageService.js`:

```javascript
static async setItem(key, value) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
  }
}
```

### 3. Test Token Registration
1. Start your server: `npm run server`
2. Start your app: `npx expo start`
3. Check server logs - you should see: `[PUSH_NOTIFICATIONS] Device token registered successfully`
4. Check Supabase `device_tokens` table - your token should be there

### 4. Create Notification Scheduler
The server needs a cron job to send scheduled push notifications. This will replace the local scheduling.

### 5. Test Push Notification
You can test by calling:
```bash
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_EXPO_PUSH_TOKEN",
    "title": "Test",
    "body": "This is a test notification",
    "categoryId": "tidbit_feedback"
  }'
```

## 🎯 Benefits

- ✅ Interactive buttons will work (push notifications support them)
- ✅ No 64 notification limit
- ✅ Server controls timing
- ✅ Better analytics
- ✅ Dynamic content based on learning state

## ⚠️ Important Notes

- **Expo Push Tokens**: You'll get an Expo push token (starts with `ExponentPushToken[...]`)
- **Development vs Production**: In development, Expo handles push notifications. For production, you need proper APNs/FCM credentials.
- **Interactive Buttons**: Will only work with push notifications, not local notifications.

## 🔄 Migration Path

1. **Phase 1** (Current): Register tokens, test sending
2. **Phase 2**: Create server-side scheduler to replace local scheduling
3. **Phase 3**: Remove local notification scheduling code
4. **Phase 4**: Add analytics and tracking

