# Tidbit Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the Expo development server:**
   ```bash
   npm start
   ```

3. **Run on your device:**
   - Install the **Expo Go** app on your phone
   - Scan the QR code that appears in your terminal/browser
   - The app will load on your device

## Assets Required

The app references some image assets in `app.json`. For a quick start, you can:

1. Create an `assets/` folder in the root directory
2. Add placeholder images (or skip for now - the app will work without them):
   - `icon.png` (1024x1024) - App icon
   - `splash.png` (1242x2436) - Splash screen
   - `adaptive-icon.png` (1024x1024) - Android adaptive icon
   - `favicon.png` (48x48) - Web favicon
   - `notification-icon.png` (96x96) - Notification icon

You can generate these later or use online tools like:
- [App Icon Generator](https://www.appicon.co/)
- [Splash Screen Generator](https://www.favicon-generator.org/)

## Testing Unlock Detection

Since unlock detection works by monitoring when the app comes to foreground:

1. Open the app
2. Press the home button (or switch apps)
3. Return to the app
4. A tidbit should appear (if conditions are met)

**Note:** On the first launch, you may need to:
- Select at least one category in the Categories tab
- Wait a moment for the app to initialize

## Development Tips

- The app uses AsyncStorage for local data persistence
- Daily stats reset at midnight (based on device time)
- Default daily limit is 20 tidbits (configurable in `src/services/UnlockService.js`)
- Minimum interval between tidbits is 30 seconds

## Building for Production

When ready to release:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Configure your app:**
   ```bash
   eas build:configure
   ```

3. **Build for iOS:**
   ```bash
   eas build --platform ios
   ```

4. **Build for Android:**
   ```bash
   eas build --platform android
   ```

## Troubleshooting

- **App not showing tidbits:** Make sure you've selected at least one category
- **Tidbits not appearing on unlock:** Check that you haven't hit the daily limit (20) or minimum interval (30 seconds)
- **Stats not updating:** The stats refresh automatically, but you can pull down to refresh manually

