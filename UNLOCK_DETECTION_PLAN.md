# Screen Unlock Detection Implementation Plan

## The Solution

We'll use a combination of approaches to detect screen unlock:

### 1. Background Tasks (Primary Method)
- Use `expo-task-manager` + `expo-background-fetch`
- Runs periodically in background
- When screen turns on, the task can trigger a notification
- Works on both iOS and Android

### 2. AppState Monitoring (Current + Enhanced)
- Already detecting when app comes to foreground
- This works when user unlocks AND opens the app
- We'll enhance this to also send notifications

### 3. Native Module (Android - Advanced)
- For Android, we can create a native module that listens for screen on/off events
- Uses Android's `ScreenReceiver` or `PowerManager`
- More reliable for true unlock detection

### 4. Notification Scheduling
- Schedule notifications that appear when screen turns on
- User sees notification → taps it → sees tidbit
- Most reliable cross-platform approach

## Implementation Steps

1. **Install required packages:**
   - `expo-task-manager`
   - `expo-background-fetch`
   - Already have `expo-notifications`

2. **Create Background Task Service:**
   - Register background task
   - Check if should send notification
   - Schedule notification when appropriate

3. **Request Permissions:**
   - Notification permissions
   - Background refresh permissions
   - Battery optimization exemptions (Android)

4. **Enhance Unlock Detection:**
   - Combine AppState + Background tasks
   - Send notification when unlock detected

## What We'll Build

- `src/services/BackgroundTaskService.js` - Handles background tasks
- `src/services/NotificationService.js` - Manages notifications
- Update `App.js` - Request permissions, register tasks
- Update `UnlockService.js` - Integrate with notifications

This will give you true unlock detection! Ready to implement?

