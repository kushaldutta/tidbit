# Notification Scheduler Setup

## ✅ What's Been Implemented

1. **Database Schema Updated** - Added user preference columns to `device_tokens` table:
   - `notification_interval` (minutes)
   - `notifications_enabled` (boolean)
   - `quiet_hours_enabled` (boolean)
   - `quiet_hours_start` (0-23)
   - `quiet_hours_end` (0-23)
   - `selected_categories` (JSON array)

2. **Token Registration Enhanced** - Now sends user preferences when registering token

3. **Scheduler Function** - `sendScheduledNotifications()` that:
   - Fetches all active devices
   - Respects quiet hours
   - Uses selected categories
   - Sends push notifications with interactive buttons

4. **Cron Job** - Runs every minute and checks if it's time to send notifications

## 📋 Next Steps

### Step 1: Update Database Schema
Run the updated `server/supabase-schema.sql` in Supabase SQL Editor to add the preference columns.

**Important:** You'll need to add these columns to your existing `device_tokens` table. Run this SQL:

```sql
ALTER TABLE device_tokens
ADD COLUMN IF NOT EXISTS notification_interval INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiet_hours_start INTEGER DEFAULT 23,
ADD COLUMN IF NOT EXISTS quiet_hours_end INTEGER DEFAULT 9,
ADD COLUMN IF NOT EXISTS selected_categories JSONB DEFAULT '[]'::jsonb;
```

### Step 2: Restart App to Register Preferences
1. Restart your app (or reload)
2. The app will automatically send your current preferences to the server
3. Check Supabase `device_tokens` table - you should see your preferences saved

### Step 3: Restart Server
Restart your server to start the scheduler:
```bash
npm run server
```

You should see:
```
[SCHEDULER] Notification scheduler started (runs every minute)
```

### Step 4: Test
Wait for the next scheduled time (based on your interval). The scheduler will:
- Check every minute
- Send notifications when it's time (based on interval)
- Respect quiet hours
- Use your selected categories

## 🎯 How It Works

1. **Every Minute**: Cron job runs and checks all devices
2. **Interval Check**: If current time matches the interval (e.g., :00, :30 for 30 min interval)
3. **Send Notifications**: Calls `sendScheduledNotifications()` which:
   - Gets all active devices
   - Filters by quiet hours
   - Picks random tidbits from selected categories
   - Sends push notifications with interactive buttons

## 🔧 Current Limitations

- Sends at fixed times (e.g., 30 min interval = :00 and :30 every hour)
- Doesn't track "last sent" per device (will improve later)
- Sends to all devices at once (could be optimized)

## 🚀 Future Improvements

- Track last notification time per device
- More flexible scheduling (not just fixed intervals)
- Better tidbit selection (prioritize due tidbits from server)
- Batch notifications more efficiently

