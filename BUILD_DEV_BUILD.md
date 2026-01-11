# Building Development Build - Step by Step

## Quick Guide

### Step 1: Login to EAS
Run this in your terminal (it will ask for your email/password):
```bash
eas login
```

**Need an Expo account?** 
- Create one at https://expo.dev/signup (free!)
- Or use your existing Expo account

### Step 2: Configure EAS Build
```bash
eas build:configure
```

This creates an `eas.json` file with build configurations.

### Step 3: Build for iOS (Development)
```bash
eas build --profile development --platform ios
```

**Note:** You'll be asked about Apple Developer account:
- **Option 1:** Use your Apple ID (free, for personal testing)
- **Option 2:** Use your Apple Developer account (if you have one)
- For development builds, your personal Apple ID is fine!

### Step 4: Install on Your Phone

After the build completes (takes 10-20 minutes):
1. EAS will give you a link (look for "Install" link in terminal)
2. Open the link on your iPhone
3. Follow the prompts to install
4. Go to iPhone Settings → General → VPN & Device Management
5. Trust the developer certificate
6. Open the app on your home screen!

## What You'll Get

✅ **Development Build** - Full notification support
✅ **Scheduled notifications will work!**
✅ **All features enabled**
✅ **Can still use `expo start` for development**

## Alternative: Local Build (Faster, but requires Xcode)

If you have Xcode installed and want to build locally:

```bash
npx expo prebuild
npx expo run:ios --device
```

This builds locally and installs directly on your connected iPhone (much faster!).

## Next Steps

1. **Run `eas login`** (when ready)
2. **Run `eas build:configure`** 
3. **Run `eas build --profile development --platform ios`**
4. **Wait 10-20 minutes**
5. **Install on your phone!**

Ready when you are! 🚀

