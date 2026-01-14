# Tidbit Content Server

Simple Express server that serves tidbit content to the mobile app.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

Or from project root:
```bash
npm install --prefix server
```

## Running

### Development (with auto-reload):
```bash
npm run server:dev
```

### Production:
```bash
npm run server
```

Or directly:
```bash
node server/index.js
```

## Endpoints

### `GET /api/tidbits`
Returns all tidbits with version info.

**Response:**
```json
{
  "success": true,
  "tidbits": {
    "math-54": [...],
    "history": [...],
    ...
  },
  "version": "abc123",
  "lastModified": "2024-01-15T10:30:00Z",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### `GET /api/version`
Lightweight endpoint to check content version.

**Response:**
```json
{
  "success": true,
  "version": "abc123",
  "lastModified": "2024-01-15T10:30:00Z",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Configuration

- **Port**: Set via `PORT` environment variable (default: 3000)
- **Content File**: Reads from `../content/tidbits.json`

## Deployment

For production, deploy to:
- Heroku
- Railway
- Render
- AWS Lambda (with Express adapter)
- Any Node.js hosting service

Update `src/config/api.js` in the app with your production URL.

## Development Testing

For local device testing, update `src/config/api.js`:
- Use your local IP: `http://192.168.1.100:3000`
- Or use a tunnel service (ngrok, localtunnel)

