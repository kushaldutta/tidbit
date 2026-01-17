# Tidbit

A mobile app that delivers short, interesting, and personalized pieces of information ("tidbits") every time you unlock your phone. Instead of mindless scrolling, get a quick learning moment that takes under 3 seconds to read.

## ✨ Current Features

- **Personalized Content**: Choose from categories like tech, psychology, finance, history, fun facts, science, and health
- **Unlock Detection**: Automatically shows tidbits when you unlock your phone
- **Spaced Repetition**: Smart algorithm that shows tidbits you haven't mastered more frequently
- **Statistics Tracking**: Track total tidbits seen, daily unlocks, mastered tidbits, and learning progress
- **Server-Side Content**: Update tidbits without releasing a new app version
- **Content Management**: Easy-to-use CLI tools for adding and validating tidbits
- **Minimal & Fast**: Each tidbit can be dismissed instantly with a tap
- **Frictionless Learning**: Turn habitual phone unlocking into learning opportunities

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **Expo Go app** on your phone (for testing) OR **Expo Dev Client** (for development builds)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/kushaldutta/tidbit.git
cd tidbit
```

2. **Install dependencies:**
```bash
npm install
```

3. **Install server dependencies:**
```bash
cd server
npm install
cd ..
```

4. **Start the development server:**
```bash
npm start
```

5. **Scan the QR code with:**
   - **iOS**: Camera app
   - **Android**: Expo Go app

### Server Setup (Optional but Recommended)

The app works with local content, but for the best experience (and to update content without app updates), set up the server:

1. **Start the content server:**
```bash
npm run server
```

The server runs on `http://localhost:3000` by default.

2. **Configure the app to use the server:**

Edit `src/config/api.js`:

**For Development (Physical Device):**
```javascript
BASE_URL: 'http://YOUR_LOCAL_IP:3000'  // e.g., 'http://192.168.1.100:3000'
```

**For Development (Simulator/Emulator):**
```javascript
BASE_URL: 'http://localhost:3000'
```

**For Production:**
```javascript
BASE_URL: 'https://your-production-server.com'
```

3. **Test the connection:**
   - Start server: `npm run server`
   - Start app: `npm start`
   - Check console logs - should see `[CONTENT_SERVICE] Successfully fetched tidbits from server`

For detailed server setup instructions, see [SERVER_SETUP.md](./SERVER_SETUP.md).

### Content Management

#### Adding New Tidbits

Use the CLI tool to add tidbits:
```bash
npm run content:add -- --category "tech" --text "Your new tidbit text here"
```

#### Validating Content

Validate your content file for errors:
```bash
npm run content:validate
```

#### Manual Editing

Edit `content/tidbits.json` directly. The structure is:
```json
{
  "tidbits": [
    {
      "id": "unique-id",
      "text": "Your tidbit text",
      "category": "tech",
      "source": "optional-source-url",
      "difficulty": "easy",
      "tags": ["tag1", "tag2"]
    }
  ],
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## 📁 Project Structure

```
tidbit/
├── App.js                      # Main app entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies and scripts
├── content/
│   ├── tidbits.json           # Content database
│   └── README.md              # Content guidelines
├── server/
│   ├── index.js               # Express server for content API
│   ├── package.json           # Server dependencies
│   └── README.md              # Server documentation
├── scripts/
│   ├── add-tidbit.js          # CLI tool to add tidbits
│   └── validate-content.js   # Content validation tool
├── src/
│   ├── screens/               # Screen components
│   │   ├── WelcomeScreen.js
│   │   ├── CategorySelectionScreen.js
│   │   ├── FrequencySelectionScreen.js
│   │   ├── PermissionRequestScreen.js
│   │   ├── HomeScreen.js
│   │   ├── CategoriesScreen.js
│   │   ├── StatsScreen.js
│   │   └── SettingsScreen.js
│   ├── components/            # Reusable components
│   │   ├── TidbitModal.js
│   │   ├── DueTidbitsViewer.js
│   │   ├── MasteredTidbitsViewer.js
│   │   └── SavedTidbitsViewer.js
│   ├── services/              # Business logic
│   │   ├── StorageService.js
│   │   ├── UnlockService.js
│   │   ├── ContentService.js
│   │   ├── NotificationService.js
│   │   └── SpacedRepetitionService.js
│   └── config/
│       └── api.js             # API configuration
└── assets/                    # Images and icons
```

## 🔧 How It Works

### Content Loading Priority

1. **Cache** (if valid, < 24 hours old) - Fastest, works offline
2. **Server** (if cache invalid/missing) - Fresh content from API
3. **Local File** (if server fails) - Fallback to bundled content
4. **Hardcoded Fallback** (last resort) - Ensures app always works

### Spaced Repetition Algorithm

The app uses a spaced repetition system to optimize learning:
- Tidbits you haven't seen recently are prioritized
- Tidbits you've "mastered" appear less frequently
- The system tracks your learning progress per tidbit
- Daily review of due tidbits helps retention

### User Flow

1. **Onboarding**: Users choose categories and notification frequency
2. **Permission Setup**: App requests notification permissions
3. **Unlock Detection**: App monitors when phone comes to foreground
4. **Tidbit Display**: Shows a random tidbit from selected categories
5. **Spaced Repetition**: System tracks which tidbits you've seen and adjusts frequency
6. **Statistics**: Track your learning progress and unlock patterns

### Notification Scheduling

- **Minimum Interval**: 30 seconds between tidbits
- **Smart Scheduling**: Respects your notification frequency preferences and quiet hours

## 🛠️ Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Start on Android emulator/device
- `npm run ios` - Start on iOS simulator/device
- `npm run web` - Start web version
- `npm run server` - Start content server
- `npm run server:dev` - Start server with auto-reload (nodemon)
- `npm run content:add` - Add a new tidbit via CLI
- `npm run content:validate` - Validate content file

### Configuration

- **Minimum Interval**: `src/services/UnlockService.js` (default: 30 seconds)
- **API Base URL**: `src/config/api.js`
- **Categories**: Managed in `src/services/ContentService.js` and `content/tidbits.json`

## 📦 Building for Production

### Using EAS Build (Recommended)

1. **Install EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Login:**
```bash
eas login
```

3. **Configure build:**
```bash
eas build:configure
```

4. **Build for iOS:**
```bash
eas build --platform ios
```

5. **Build for Android:**
```bash
eas build --platform android
```

### Using Expo CLI (Legacy)

```bash
# iOS
expo build:ios

# Android
expo build:android
```

## 🔮 Future Vision

Tidbit is designed to evolve from a passive notification app into a comprehensive learning platform. Here's what's coming:

### Phase 1: Flashcard System (Post-Launch)
- Convert tidbits into flashcards
- Spaced repetition algorithm (SM-2 like Anki)
- Study sessions with daily goals
- Card management and organization

### Phase 1.5: Interactive Notifications
- Quick feedback actions directly from notifications
- "I knew this" / "Didn't know" buttons
- Automatic spaced repetition adjustment
- Zero-friction learning feedback

### Phase 2: Quiz Mode
- Multiple choice questions from tidbits
- True/False format
- Fill-in-the-blank challenges
- Timed study sessions

### Phase 3: Gamification & Social
- Achievements and badges
- Learning streaks
- Progress visualization
- Share interesting tidbits
- Study groups (optional)

### Phase 4: Advanced Features
- AI-powered content recommendations
- Personalized learning paths
- Custom tidbit creation
- Import from articles/PDFs
- Community-driven content

For the complete future vision roadmap, see [FUTURE_VISION.md](./FUTURE_VISION.md).

## 📊 Current Status

✅ **Completed:**
- Core notification system
- Unlock detection
- Category selection
- Spaced repetition algorithm
- Server-side content management
- Content CLI tools
- Statistics tracking
- Settings and preferences

🚧 **In Progress:**
- Content library expansion (target: 100-200 tidbits)
- App store submission
- User feedback collection

📋 **Planned:**
- Flashcard system
- Interactive notifications
- Quiz mode
- Social features

## 🤝 Contributing

Contributions are welcome! Areas where help is especially appreciated:
- Adding quality tidbits to the content library
- Improving the spaced repetition algorithm
- UI/UX enhancements
- Bug fixes and performance improvements

## 📝 License

MIT

## 🙏 Acknowledgments

Built with [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/).

---

**Transform your phone unlocks into learning opportunities! 📚✨**
