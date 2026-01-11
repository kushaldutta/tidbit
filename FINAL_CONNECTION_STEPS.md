# Final Steps to Connect

## Step 1: Clean Restart the Server

I just stopped all the old server processes. Now:

1. **In your terminal**, run:
   ```bash
   npx expo start --lan
   ```

2. **Wait for it to say:**
   ```
   Metro waiting on http://localhost:8081
   Metro waiting on exp://10.0.0.8:8081
   ```

## Step 2: In Expo Go App

1. **Go to the Home tab** (where it says "Select the local server")
2. **Pull down to refresh** (swipe down from the top of the screen)
3. **Your server should appear** as: `exp://10.0.0.8:8081` or just show "Tidbit"
4. **Tap on it** to connect!

## Step 3: If It Still Doesn't Appear

Try these in order:

### Option A: Pull-to-Refresh Multiple Times
- Pull down, release, pull down again
- Sometimes it takes a few tries

### Option B: Check Network
- Make absolutely sure your phone and computer are on the **same Wi-Fi**
- Not a guest network, not a different network

### Option C: Try Tunnel Mode
1. Stop server (Ctrl+C)
2. Run: `npx expo start --tunnel`
3. Wait for "Tunnel ready"
4. Pull down to refresh in Expo Go
5. The tunnel server should appear

### Option D: Restart Expo Go App
1. Close Expo Go completely
2. Reopen it
3. Go to Home tab
4. Pull down to refresh

## What Should Happen

When you pull down to refresh on the Home tab, you should see:
- Your server appear as `exp://10.0.0.8:8081`
- Or it might just show "Tidbit" or your project name
- Tap it to connect!

## Quick Checklist

- ✅ Server running? (Check terminal)
- ✅ Phone and computer on same WiFi?
- ✅ Pulled down to refresh in Expo Go?
- ✅ Server appeared in the list?

Try pulling down to refresh in Expo Go now - that's usually what makes it appear!

