# Making Your Server Discoverable

## The Problem
Expo Go is waiting for your server to appear automatically, but it's not showing up. This usually means:
1. The server isn't broadcasting properly
2. Phone and computer aren't on the same network
3. Firewall is blocking the connection

## Solution 1: Make Sure Server is Running Properly

In your terminal, make sure you see:
```
Metro waiting on http://localhost:8081
```

If not, restart the server:
```bash
npx expo start --lan
```

## Solution 2: Check Network Connection

1. **On your computer**: Check your Wi-Fi network name
2. **On your phone**: Make sure you're connected to the **exact same Wi-Fi network**
3. **Important**: Some networks have "Guest" networks that are separate - make sure you're not on a guest network

## Solution 3: Try Pull-to-Refresh

In Expo Go app:
1. On the Home tab where it says "Select the local server"
2. **Pull down** (swipe down from the top) to refresh
3. This might make your server appear

## Solution 4: Check Firewall

Windows Firewall might be blocking the connection:
1. When the server starts, Windows might ask "Allow access?" - click **Allow**
2. If you missed it, you might need to allow it manually in Windows Firewall settings

## Solution 5: Use Tunnel Mode (Most Reliable)

Since automatic discovery isn't working, let's use tunnel mode which works from anywhere:

1. **Stop your current server** (Ctrl+C in terminal)
2. **Run:**
   ```bash
   npx expo start --tunnel
   ```
3. **Wait for it to say "Tunnel ready"**
4. **Look for a URL** like: `exp://xxxx-xxxx.anonymous.8081.exp.direct:80`
5. **In Expo Go**, try pulling down to refresh - the tunnel server should appear

## Solution 6: Manual Entry (If Available)

Some versions of Expo Go let you manually enter:
1. **Long press** on the "Select the local server" area
2. Or **tap and hold** on the Home screen
3. Look for a menu that says "Enter URL manually" or similar

Let's try these solutions!

