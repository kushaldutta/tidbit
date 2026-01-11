# Quick Connection Guide

## Option 1: Tunnel Mode (Easiest - Works Anywhere)

Run this in your terminal:

```bash
npx expo start --tunnel
```

This creates a tunnel through Expo's servers and should display a QR code that works even if your phone and computer are on different networks.

## Option 2: Manual Connection (If QR Code Doesn't Show)

Your computer's IP address is: **10.0.0.8** (or 192.168.56.1)

### Steps:
1. **Open Expo Go app** on your phone
2. **Tap "Enter URL manually"** (or the text input at the top)
3. **Type this exactly:**
   ```
   exp://10.0.0.8:8081
   ```
4. **Tap "Connect"** or press Enter

**Important:** Make sure your phone and computer are on the **same Wi-Fi network** for this to work.

## Option 3: Try Different Terminal

If you're using Git Bash (MINGW64), try using:
- **Windows PowerShell** (search "PowerShell" in Start menu)
- **Windows Command Prompt** (cmd)

Then run: `npx expo start`

Sometimes different terminals display the QR code better.

## What to Expect

Once connected, you should see:
- The Tidbit app loading on your phone
- The Home screen with stats
- Ability to navigate between tabs

Let me know which method works for you!

