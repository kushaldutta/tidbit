# Step-by-Step Connection Guide

## Step 1: Get Your Connection URL

In your terminal, run:
```bash
npx expo start --tunnel
```

Wait for it to start, then look for a line that says:
```
exp://xxxx-xxxx.anonymous.exp.direct:80
```
or
```
exp://10.0.0.8:8081
```

**Copy that entire URL** (everything starting with `exp://`)

## Step 2: Connect in Expo Go

### Option A: Using Projects Tab
1. Open **Expo Go** app
2. Tap **"Projects"** tab (bottom navigation)
3. Look for a **"+"** or **"Add"** button (usually top right)
4. You should see a text field or "Enter URL" option
5. Paste the URL you copied

### Option B: Using Home Screen
1. Open **Expo Go** app  
2. On the home screen, **swipe down** or look for a search bar
3. Some versions have a URL input field at the top
4. Paste your URL there

### Option C: Open URL Directly (Easiest!)
1. **Copy the `exp://` URL** from your terminal
2. On your phone, open a **web browser** (Chrome, Safari, etc.)
3. **Paste the URL** in the address bar
4. It should automatically open in Expo Go!

### Option D: Share URL
1. **Copy the `exp://` URL**
2. **Send it to yourself** via:
   - Text message
   - Email
   - Notes app
   - Any messaging app
3. **Tap the link** on your phone - it should open in Expo Go

## Step 3: What to Look For

When the server starts, you should see something like:
```
› Metro waiting on exp://10.0.0.8:8081
```

That `exp://10.0.0.8:8081` is your connection URL!

## Still Having Issues?

Try this command to see all connection options:
```bash
npx expo start --tunnel --clear
```

The `--tunnel` flag creates a public URL that works from anywhere.

Let me know what URL you see in your terminal!

