# Tidbit - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the App
```bash
npm start
```

### 3. Open on Your Phone
- Install **Expo Go** from App Store (iOS) or Play Store (Android)
- Scan the QR code shown in your terminal
- The app will load on your device!

## 📱 First Time Setup

1. **Select Categories**: Tap the "Categories" tab and choose at least one category you're interested in
2. **Test It Out**: Switch away from the app and come back - a tidbit should appear!
3. **Check Stats**: View your learning progress in the "Stats" tab

## 🎯 How It Works

- **Unlock Detection**: When you unlock your phone and open Tidbit, a tidbit appears
- **Daily Limit**: Up to 20 tidbits per day (prevents spam)
- **Quick Dismiss**: Tap anywhere to dismiss and continue using your phone
- **Categories**: Choose what you want to learn about (tech, psychology, finance, etc.)

## 🛠️ Development

- **Test Tidbit Button**: On the Home screen, there's a "Test Tidbit" button for development
- **Daily Reset**: Stats reset at midnight (device time)
- **Minimum Interval**: 30 seconds between tidbits

## 📦 Building for Release

When ready to publish:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android  
eas build --platform android
```

## 🐛 Troubleshooting

**Tidbits not showing?**
- Make sure you've selected at least one category
- Check that you haven't hit the daily limit (20 tidbits)
- Wait 30 seconds between unlocks

**App crashes?**
- Make sure all dependencies are installed: `npm install`
- Clear cache: `expo start -c`
- Check that you're using a compatible Node version (14+)

## 📝 Next Steps

- Add your app icons to the `assets/` folder
- Customize tidbits in `src/services/ContentService.js`
- Adjust daily limits in `src/services/UnlockService.js`
- Add more categories and content!

Happy learning! 🎓

