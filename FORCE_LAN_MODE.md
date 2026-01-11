# Force LAN Mode

## The Problem
The server is only showing `localhost:8081` instead of the LAN IP (`10.0.0.8:8081`). This means Expo Go can't discover it automatically.

## Solution: Use Tunnel Mode (Most Reliable)

Since LAN discovery isn't working, let's use tunnel mode which always works:

1. **Stop your current server** (Press `Ctrl+C` in terminal)

2. **Run this:**
   ```bash
   npx expo start --tunnel
   ```

3. **Wait for:**
   - "Tunnel connected"
   - "Tunnel ready"
   - A URL like `exp://xxxx-xxxx.anonymous.8081.exp.direct:80`

4. **In Expo Go:**
   - Pull down to refresh on Home tab
   - The tunnel server should appear automatically
   - Tap it to connect!

## Why Tunnel Mode?

- Works even if phone and computer are on different networks
- Always discoverable by Expo Go
- No network configuration needed
- Most reliable method

## Alternative: Manual Connection

If tunnel mode still doesn't show in Expo Go:

1. Look for the `exp://` URL in your terminal (starts with `exp://`)
2. In Expo Go, try:
   - Long press on the Home screen
   - Check Settings tab for "Enter URL"
   - Look for any text input field

Try tunnel mode - it's the most reliable way to connect!

