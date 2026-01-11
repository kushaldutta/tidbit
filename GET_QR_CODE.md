# How to Get the QR Code

## Step 1: Stop any running servers
If you see the server running, press `Ctrl+C` in that terminal to stop it.

## Step 2: Start the server in interactive mode
Run this command in your terminal:

```bash
npx expo start
```

**Important:** Make sure you're running this directly in your terminal (not through a script), so it can be interactive.

## Step 3: What you should see

After running `npx expo start`, you should see:

1. **Metro Bundler starting**
2. **A large QR code** (ASCII art)
3. **Menu options** like:
   ```
   › Press a │ open Android
   › Press i │ open iOS simulator  
   › Press w │ open web
   › Press r │ reload app
   › Press m │ toggle menu
   ```

## Step 4: Scan the QR Code

- **Android**: Open Expo Go app → Tap "Scan QR code" → Scan the code
- **iOS**: Open Camera app → Point at QR code → Tap the notification

## Alternative: Use the URL

If the QR code doesn't appear, you can also:
1. Open `http://localhost:8081` (or whatever port it shows) in your browser
2. Look for the QR code in the Expo DevTools page

## Troubleshooting

**If you see JSON output instead of QR code:**
- The server might be in non-interactive mode
- Try: `npx expo start --tunnel` (uses Expo's tunnel service)
- Or: Open `http://localhost:8081` in browser to see DevTools

**If port is in use:**
- The server will automatically try the next port (8082, 8083, etc.)
- Just use whatever port it shows

