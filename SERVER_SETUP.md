# Server-Side Content Setup Guide

Your Tidbit app now supports server-side content! This allows you to update tidbits without releasing a new app version.

## 🎯 What Changed

- **Before**: Content bundled in app (`content/tidbits.json`)
- **Now**: Content served from server (with local caching + fallback)

## 🚀 Quick Start

### 1. Start the Server

```bash
npm run server
```

Server runs on `http://localhost:3000` by default.

### 2. Update App Config

Edit `src/config/api.js`:

**For Development (Physical Device):**
```javascript
BASE_URL: 'http://YOUR_LOCAL_IP:3000'  // e.g., 'http://192.168.1.100:3000'
```

**For Production:**
```javascript
BASE_URL: 'https://your-production-server.com'
```

### 3. Test It

1. Start server: `npm run server`
2. Start app: `npm start`
3. Check console logs - should see `[CONTENT_SERVICE] Successfully fetched tidbits from server`

## 📡 How It Works

### Content Loading Priority:
1. **Cache** (if valid, < 24 hours old) - Fastest
2. **Server** (if cache invalid/missing) - Fresh content
3. **Local File** (if server fails) - Fallback
4. **Hardcoded Fallback** (last resort)

### Version Checking:
- App checks for new content version every hour
- If new version detected, fetches fresh content
- All happens in background (non-blocking)

## 🔧 Server Endpoints

### `GET /api/tidbits`
Returns all tidbits with version info.

### `GET /api/version`
Lightweight version check (for background updates).

### `GET /health`
Health check endpoint.

## 📝 Updating Content

### Method 1: Edit JSON File
1. Edit `content/tidbits.json`
2. Server automatically serves new content (no restart needed)
3. App fetches new version on next check

### Method 2: Use CLI Tools
```bash
npm run content:add -- --category "math-54" --text "Your new tidbit"
npm run content:validate
```

## 🌐 Deployment Options

### Option 1: Heroku (Easiest)
```bash
cd server
heroku create tidbit-content-server
git subtree push --prefix server heroku main
```

### Option 2: Railway
1. Connect GitHub repo
2. Set root directory to `server`
3. Deploy

### Option 3: Render
1. Create new Web Service
2. Point to `server/index.js`
3. Set build command: `npm install`
4. Set start command: `node index.js`

### Option 4: AWS Lambda / Vercel
Use serverless functions (requires adapter).

## 🔒 Production Checklist

- [ ] Update `src/config/api.js` with production URL
- [ ] Set up CORS properly (server already configured)
- [ ] Add authentication if needed (future)
- [ ] Set up monitoring/logging
- [ ] Configure CDN for better performance (optional)

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is available
- Try: `PORT=3001 npm run server`

### App can't connect
- **Simulator**: Use `localhost:3000`
- **Physical Device**: Use your local IP (e.g., `192.168.1.100:3000`)
- Check firewall settings
- Use tunnel service (ngrok) for testing

### Content not updating
- Check server logs
- Verify `content/tidbits.json` is valid JSON
- Clear app cache: Settings → Clear Learning State

## 📊 Benefits

✅ **Update content without app update**
✅ **A/B testing ready** (can serve different content to different users)
✅ **Analytics ready** (can track which tidbits are popular)
✅ **Scalable** (can add more endpoints later)

## 🎯 Next Steps

1. **Test locally** - Make sure everything works
2. **Deploy server** - Choose hosting option
3. **Update app config** - Point to production URL
4. **Monitor** - Watch server logs for issues

---

**You're all set! Your content is now server-side.** 🚀

