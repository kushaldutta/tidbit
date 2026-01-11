# Final Implementation Plan - Unlock Notifications

## Platform-Specific Approach

### Android: True Unlock Detection
- **Native module** that listens for `SCREEN_ON` / `ACTION_USER_PRESENT` events
- **Send notification immediately** when phone is unlocked
- **True unlock detection** - works exactly as intended
- Requires permissions: Notification, Battery optimization exemption

### iOS: Time-Based Notifications
- **Schedule notifications** every 30 minutes throughout the day
- **User adjustable settings** - can change interval (15min, 30min, 1hr, etc.)
- **Appears when screen turns on** - achieves same effect
- Requires permissions: Notification, Background App Refresh

## Implementation Steps

### Phase 1: Notification Service (Both Platforms)
1. Create `src/services/NotificationService.js`
2. Request notification permissions
3. Handle notification display
4. Handle notification tap (open app, show tidbit)

### Phase 2: Android Unlock Detection
1. Create native Android module (`android/app/src/main/java/`)
2. BroadcastReceiver for `ACTION_USER_PRESENT` / `SCREEN_ON`
3. Bridge to React Native
4. Send notification when unlock detected

### Phase 3: iOS Time-Based Notifications
1. Schedule recurring notifications (every 30 min)
2. Add settings screen for interval adjustment
3. Reschedule when user changes settings
4. Handle daily reset

### Phase 4: Settings UI
1. Add settings to Categories or Stats screen
2. Toggle notifications on/off
3. Adjust interval (iOS): 15min, 30min, 1hr, 2hr
4. Show status (Android: Unlock detection active, iOS: Interval setting)

### Phase 5: Integration
1. Update `App.js` to request permissions on startup
2. Update `UnlockService.js` to work with notifications
3. Handle notification tap → show tidbit modal
4. Update daily limits and tracking

## Files to Create/Modify

### New Files:
- `src/services/NotificationService.js` - Handles all notifications
- `src/screens/SettingsScreen.js` - Notification settings (iOS interval, toggle)
- `android/app/src/main/java/com/tidbit/app/UnlockReceiver.java` - Android unlock detection

### Files to Modify:
- `App.js` - Add permission requests, handle notification taps
- `package.json` - Add expo-task-manager (if needed)
- `app.json` - Add notification config
- `src/services/UnlockService.js` - Integrate with notifications
- Navigation - Add Settings tab or add to existing screen

## Features

### Android:
- ✅ True unlock detection
- ✅ Notification appears immediately on unlock
- ✅ User taps notification → sees tidbit

### iOS:
- ✅ Time-based notifications (default 30 min)
- ✅ User can adjust interval (15min, 30min, 1hr, 2hr)
- ✅ Notification appears when screen turns on
- ✅ User taps notification → sees tidbit

### Both:
- ✅ Respect daily limits (20 tidbits/day)
- ✅ Track statistics
- ✅ Category-based tidbits
- ✅ Settings to enable/disable

## When You're Ready

I'll implement:
1. ✅ Notification service with permissions
2. ✅ Android native unlock detection
3. ✅ iOS time-based scheduling
4. ✅ Settings UI for iOS interval
5. ✅ Integration with existing unlock logic
6. ✅ Handle notification taps → show tidbit

Ready when you are! 🚀

