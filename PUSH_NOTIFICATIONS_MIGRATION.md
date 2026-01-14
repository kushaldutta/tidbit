# Push Notifications Migration Plan

## Overview
Migrating from local scheduled notifications to push notifications will enable:
- ✅ Interactive action buttons on notifications (I knew it, I didn't, Save)
- ✅ Better analytics and tracking
- ✅ Server-side control over notification timing
- ✅ No iOS 64 notification limit
- ✅ Dynamic content updates

## Architecture

### Current (Local Notifications)
```
App → Schedule 64 notifications locally → iOS/Android shows them
```

### New (Push Notifications)
```
App → Register device token → Server
Server → Schedules notifications → Sends via Expo Push API → Device shows them
```

## Steps

### 1. Expo Push Notification Setup
- Get Expo push notification credentials
- Configure app.json/app.config.js
- No additional packages needed (expo-notifications already installed)

### 2. Device Token Registration
- Get device push token from Expo
- Send token to your server
- Store token in Supabase (new table: `device_tokens`)

### 3. Server-Side Notification Scheduler
- Create Express endpoint to schedule notifications
- Use node-cron or similar to schedule push notifications
- Send notifications via Expo Push API

### 4. Update NotificationService
- Remove local scheduling logic
- Add device token registration
- Keep notification category setup (for interactive buttons)
- Handle push notification receipt

### 5. Notification Actions
- Interactive buttons will now work (push notifications support them)
- Handle action responses in App.js

## Benefits
- Interactive buttons work reliably
- No 64 notification limit
- Server controls timing (can adjust based on user behavior)
- Better analytics (track delivery, opens, actions)
- Dynamic content (can change tidbits based on learning state)

