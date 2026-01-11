# How to Start Tidbit and Get QR Code

## Quick Start Command

Open your terminal in the project folder and run:

```bash
npm start
```

OR

```bash
npx expo start
```

## What You'll See

After running the command, you should see:

1. **A QR code** in your terminal
2. **Options** like:
   - Press `a` to open on Android
   - Press `i` to open on iOS simulator
   - Press `w` to open in web browser

## To Connect Your Phone

### Option 1: Scan QR Code
- **Android**: Open Expo Go app → Tap "Scan QR code" → Scan the code
- **iOS**: Open Camera app → Point at QR code → Tap the notification

### Option 2: Use Development Build
- Make sure your phone and computer are on the **same Wi-Fi network**
- The QR code should automatically work when scanned

## If QR Code Doesn't Appear

1. Make sure you're in the project directory: `C:\Users\kusha\projects\Cinnamiddles\tidbit`
2. Try clearing cache: `npx expo start -c`
3. Check for errors in the terminal

## Current Status

The server is already running! You should be able to see it in your terminal or browser at:
- **Metro Bundler**: http://localhost:8081
- **Expo DevTools**: Usually opens automatically in your browser

