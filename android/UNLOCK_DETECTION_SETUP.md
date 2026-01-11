# Android Unlock Detection - Setup Guide

## Important Note

Android unlock detection requires native code, which means:
- ✅ This will work in development builds (expo-dev-client)
- ❌ This will NOT work in Expo Go (native code required)
- ✅ Users will need to install a development build

## Implementation

For Android unlock detection, we need:

1. **BroadcastReceiver** - Listens for `ACTION_USER_PRESENT` and `SCREEN_ON` events
2. **NotificationService** - Sends notification when unlock detected
3. **React Native Bridge** - Connects native code to JavaScript

## Files Needed

1. `android/app/src/main/java/com/tidbit/app/UnlockReceiver.java` - BroadcastReceiver
2. `android/app/src/main/AndroidManifest.xml` - Register receiver and permissions
3. `android/app/src/main/res/values/strings.xml` - App name (if needed)

## Steps

### 1. Create Development Build

```bash
npx expo prebuild
npx expo run:android
```

### 2. Register BroadcastReceiver

Add to `AndroidManifest.xml`:
```xml
<receiver android:name=".UnlockReceiver"
    android:enabled="true"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.USER_PRESENT" />
        <action android:name="android.intent.action.SCREEN_ON" />
    </intent-filter>
</receiver>
```

### 3. Add Permissions

```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.DISABLE_KEYGUARD" />
```

## Alternative: Use Background Task (Works Now)

For now, we can use the AppState approach which works when app is opened.
True unlock detection requires native code and development build.

Would you like to:
1. Continue with current AppState approach (works in Expo Go)
2. Create native module (requires development build)
3. Test everything first, then add native module later

