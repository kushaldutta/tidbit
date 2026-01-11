# How to Connect Your Phone to Tidbit

## Method 1: Use Expo Tunnel (Recommended)

Run this command in your terminal:

```bash
npx expo start --tunnel
```

This will:
- Create a tunnel through Expo's servers
- Show a QR code that works even if your phone and computer are on different networks
- Display the connection URL

## Method 2: Get Connection URL from Terminal

Even if you don't see a QR code, look for a line like:
```
Metro waiting on exp://192.168.x.x:8081
```

You can manually enter this URL in Expo Go:
1. Open Expo Go app
2. Tap "Enter URL manually"
3. Type: `exp://YOUR_IP:8081` (replace with the IP shown)

## Method 3: Use LAN Connection

1. Make sure your phone and computer are on the **same Wi-Fi network**
2. Run: `npx expo start --lan`
3. This should show a QR code

## Method 4: Manual Connection

1. Find your computer's IP address:
   - Windows: Run `ipconfig` and look for "IPv4 Address"
   - Example: `192.168.1.100`
2. In Expo Go app, tap "Enter URL manually"
3. Enter: `exp://YOUR_IP:8081`
   - Example: `exp://192.168.1.100:8081`

## Quick Test Command

Try this to see all connection options:

```bash
npx expo start --clear
```

The `--clear` flag clears cache and might help show the QR code properly.

