# How to Connect to Expo Go App

## The Problem
Browsers don't open `exp://` URLs - only the Expo Go app can handle them!

## Solution: Connect Through Expo Go App

### Method 1: Use the Tunnel URL in Expo Go

1. **Open Expo Go app** on your phone
2. **Look for one of these options:**
   - Tap the **"Projects"** tab at the bottom
   - Look for a **"+"** button or **"Add Project"** button
   - Look for a **search bar** or **text input** at the top
   - Some versions have a **"Enter URL"** or **"Connect"** option

3. **Enter this URL:**
   ```
   exp://o3pcnr8.anonymous.8081.exp.direct:80
   ```

### Method 2: Try HTTP Version

Sometimes you can use the HTTP version. Try this in Expo Go:
```
http://o3pcnr8.anonymous.8081.exp.direct:80
```

### Method 3: Use Local Network (If on Same WiFi)

If your phone and computer are on the same WiFi, try:
1. In your terminal, stop the server (Ctrl+C)
2. Run: `npx expo start --lan`
3. Look for a URL like: `exp://10.0.0.8:8081`
4. Enter that in Expo Go

### Method 4: Scan QR Code (If Available)

1. In your terminal where the server is running
2. Try pressing **`m`** to toggle menu
3. Or press **`?`** for help
4. This might show a QR code you can scan

## Finding the Input in Expo Go

The URL input might be in different places:
- **Home screen**: Swipe down or look for search bar
- **Projects tab**: Tap "+" or "Add Project"
- **Recent**: If you've connected before, tap the project
- **Settings**: Some versions have a "Connect to Server" option

## Quick Test

1. Open Expo Go app
2. Look around for any text input or search field
3. Paste: `exp://o3pcnr8.anonymous.8081.exp.direct:80`
4. Tap connect/go

What do you see when you open Expo Go? Can you describe the main screen?

