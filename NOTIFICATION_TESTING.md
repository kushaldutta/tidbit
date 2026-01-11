# Notification Testing Guide

## Expo Go Limitations

⚠️ **Important:** Expo Go has limitations with scheduled notifications:
- Local notifications work but may have delays
- Scheduled notifications work but may not be 100% reliable
- For full notification support, you need a development build

## Testing Notifications in Expo Go

### Option 1: Test Immediate Notification

We can add a test button to send an immediate notification. This will help verify:
- ✅ Permissions are granted
- ✅ Notifications work in Expo Go
- ✅ Notification taps work

### Option 2: Check Scheduled Notifications

Scheduled notifications are set for 8 AM - 10 PM. If it's currently:
- **Before 8 AM:** First notification will be at 8 AM today
- **Between 8 AM - 10 PM:** Next notification should be at next interval
- **After 10 PM:** Notifications scheduled for tomorrow starting at 8 AM

### Option 3: Verify Permissions

Make sure notification permissions are granted:
1. Check iPhone Settings → Tidbit (or Expo Go) → Notifications
2. Make sure "Allow Notifications" is ON
3. Check notification styles

## Current Behavior

When you set interval to 15 minutes:
- Notifications scheduled every 15 min from 8 AM - 10 PM
- Maximum 20 notifications per day (daily limit)
- With 15 min interval: ~56 notifications possible, capped at 20

## Next Steps

Let me add a test button to send an immediate notification so we can verify it works!

