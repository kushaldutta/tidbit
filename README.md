# Tidbit

A mobile app that delivers short, interesting, and personalized pieces of information ("tidbits") every time you unlock your phone. Instead of mindless scrolling, get a quick learning moment that takes under 3 seconds to read.

## Features

- **Personalized Content**: Choose from categories like tech, psychology, finance, history, fun facts, science, and health
- **Unlock Detection**: Automatically shows tidbits when you unlock your phone
- **Daily Limits**: Up to 20 tidbits per day to avoid spam
- **Statistics Tracking**: Track total tidbits seen, daily unlocks, and progress
- **Minimal & Fast**: Each tidbit can be dismissed instantly with a tap
- **Frictionless Learning**: Turn habitual phone unlocking into learning opportunities

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

## Project Structure

```
tidbit/
├── App.js                 # Main app entry point
├── src/
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.js
│   │   ├── CategoriesScreen.js
│   │   └── StatsScreen.js
│   ├── components/       # Reusable components
│   │   └── TidbitModal.js
│   └── services/        # Business logic
│       ├── StorageService.js
│       ├── UnlockService.js
│       └── ContentService.js
├── package.json
└── app.json
```

## How It Works

1. **Category Selection**: Users choose their interests from available categories
2. **Unlock Detection**: The app monitors when the phone comes to foreground
3. **Tidbit Display**: Shows a random tidbit from selected categories
4. **Daily Caps**: Limits to 20 tidbits per day with 30-second minimum intervals
5. **Statistics**: Tracks learning progress and unlock patterns

## Configuration

- **Daily Tidbit Limit**: Set in `src/services/UnlockService.js` (default: 20)
- **Minimum Interval**: Set in `src/services/UnlockService.js` (default: 30 seconds)
- **Categories**: Manage in `src/services/ContentService.js`

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## Future Enhancements

- Backend API for dynamic content
- User accounts and sync
- More categories and tidbits
- Customizable daily limits
- Streak tracking
- Social sharing

## License

MIT

