# Build Development Build - Quick Reference

## Commands (Run in Order)

```bash
# 1. Login (if not already logged in)
eas login

# 2. Build development build for iOS
eas build --profile development --platform ios

# 3. Wait for build (10-20 minutes)

# 4. Install on iPhone (link will be provided)
```

## What Happens

1. **`eas login`** - Authenticates with Expo (free account needed)
2. **`eas build:configure`** - Creates eas.json (already done!)
3. **`eas build`** - Builds the app in the cloud
4. **Install** - Link provided to install on your phone

## After Installation

- App appears on home screen like a real app
- Full notification support ✅
- Scheduled notifications work! ✅
- Can still develop with `npm start`

## Troubleshooting

**"No Apple Developer account"**
- Use your personal Apple ID (it's free!)
- EAS will guide you through this

**"Build failed"**
- Check that all dependencies are installed: `npm install`
- Make sure app.json is valid

**"Can't install on phone"**
- Go to Settings → General → VPN & Device Management
- Trust the developer certificate
- Try the install link again

Ready to build! 🚀

