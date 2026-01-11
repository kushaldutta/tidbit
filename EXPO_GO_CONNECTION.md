# How to Connect in Expo Go App

## Finding the Manual URL Entry

In the **Expo Go app**, the manual URL entry is in different places depending on the version:

### Method 1: Projects Tab
1. Open **Expo Go** app
2. Tap the **"Projects"** tab at the bottom
3. Look for a **"+"** button or **"Add Project"** button
4. Tap it - you should see an option to "Enter URL manually" or a text field

### Method 2: Home Screen
1. Open **Expo Go** app
2. On the home screen, look for:
   - A search bar at the top
   - A "+" button
   - Or swipe down to reveal a URL input

### Method 3: Recent Projects
1. If you've connected before, your project might appear in "Recent"
2. Tap on it to reconnect

## Alternative: Use the Connection URL Directly

If you can't find manual entry, try this:

1. **In your terminal**, when you run `npx expo start`, look for a line like:
   ```
   Metro waiting on exp://192.168.x.x:8081
   ```
   or
   ```
   exp://10.0.0.8:8081
   ```

2. **Copy that entire URL** (starts with `exp://`)

3. **In Expo Go**, try:
   - Long-press on the home screen
   - Or look for a "Paste URL" option
   - Or try opening the URL in your phone's browser (it should open in Expo Go)

## Quick Test: Check if Server is Running

Run this to see your connection URL:
```bash
npx expo start --tunnel
```

Then look for a URL that starts with `exp://` - that's what you need to enter.

## Still Can't Find It?

Try updating Expo Go:
- **iOS**: App Store → Search "Expo Go" → Update
- **Android**: Play Store → Search "Expo Go" → Update

The manual URL entry feature should be available in recent versions.

