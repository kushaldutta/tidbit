# Development Build Setup Guide

## What You Need

For iOS development build:
- Apple ID (free - can use personal Apple ID)
- EAS Build account (free tier is fine)
- Expo account (free)

## Steps

### 1. Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure EAS Build
```bash
eas build:configure
```

### 4. Build for iOS (Development)
```bash
eas build --profile development --platform ios
```

### 5. Install on Your Phone
- EAS will give you a link
- Open link on your iPhone
- Install the development build
- It will appear on your home screen like a real app

## Alternative: Local Build (Faster for Testing)

If you have Xcode installed:
```bash
npx expo prebuild
npx expo run:ios --device
```

This builds locally and installs directly on your connected iPhone.

## What to Expect

- Build takes 10-20 minutes (first time)
- You'll get a link to install on your phone
- App will have full notification support
- Scheduled notifications will work properly!

Let me help you set this up!

