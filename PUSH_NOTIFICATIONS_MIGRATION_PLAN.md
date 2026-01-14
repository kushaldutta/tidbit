# Push Notifications Migration Plan

## Strategy
- **Beta Testing**: Use local notifications (current implementation)
- **Pre-Launch**: Migrate to push notifications
- **Launch**: Push notifications ready from day 1

## Why Push for Launch
- ✅ Better analytics and tracking
- ✅ Notification action buttons (should work with push)
- ✅ Centralized content updates
- ✅ Server-side spaced repetition logic
- ✅ Real-time features
- ✅ Better user experience

## What Needs to Be Done

### 1. Backend Server Setup
- [ ] Choose backend platform (Firebase, AWS, custom Node.js, etc.)
- [ ] Set up database (user preferences, learning state, tidbits)
- [ ] Set up push notification service
  - iOS: Apple Push Notification service (APNs)
  - Android: Firebase Cloud Messaging (FCM)
- [ ] API endpoints for:
  - User registration/authentication
  - Preference sync
  - Learning state sync
  - Content management

### 2. Features to Migrate

#### User Preferences (Easy)
- Notification frequency (15 min, 30 min, 1 hour, 2 hours)
- Selected categories
- Quiet hours settings
- Notification enabled/disabled

#### Spaced Repetition (Medium)
- Current implementation: Client-side (AsyncStorage)
- Migration: Move to server-side
- Benefits:
  - Sync across devices
  - Server can optimize scheduling
  - Better analytics on learning patterns

#### Notification Scheduling (Requires Rewrite)
- Current: `scheduleNotificationAsync()` on device
- New: Server sends push notifications at scheduled times
- Server needs to:
  - Calculate next notification time based on user's frequency
  - Respect quiet hours
  - Prioritize due tidbits
  - Send push notification at right time

#### Content Management (Easy)
- Current: Hardcoded in `ContentService.js`
- New: Server provides tidbits
- Benefits:
  - Update content without app update
  - A/B testing
  - Analytics on which tidbits perform best

### 3. Code Changes Needed

#### NotificationService.js
- Remove `scheduleRecurringNotifications()` (local scheduling)
- Add `registerForPushNotifications()` (get device token)
- Add `sendTokenToServer()` (register device)
- Update notification handler to work with push notifications
- Keep action button handling (should work with push!)

#### StorageService.js
- Add methods to sync preferences with server
- Keep local storage as cache/offline support

#### SpacedRepetitionService.js
- Add methods to sync learning state with server
- Keep local storage for offline support
- Server becomes source of truth

#### ContentService.js
- Fetch tidbits from server API
- Cache locally for offline support

### 4. Migration Path for Beta Users

When switching from local to push:
- [ ] Detect if user has local notifications scheduled
- [ ] Cancel local notifications
- [ ] Register for push notifications
- [ ] Sync user preferences to server
- [ ] Sync learning state to server
- [ ] Server takes over notification scheduling

### 5. Testing Checklist

Before launch:
- [ ] Push notifications work on iOS
- [ ] Push notifications work on Android
- [ ] Notification action buttons work (iOS)
- [ ] User preferences sync correctly
- [ ] Learning state syncs correctly
- [ ] Spaced repetition works server-side
- [ ] Quiet hours respected
- [ ] Due tidbits prioritized
- [ ] Content updates work
- [ ] Analytics tracking works
- [ ] Migration from local to push works smoothly

### 6. Server Requirements

#### Database Schema
```
Users:
- userId
- deviceToken (iOS/Android)
- notificationFrequency
- selectedCategories
- quietHoursEnabled
- quietHoursStart
- quietHoursEnd
- createdAt
- lastActive

LearningState:
- userId
- tidbitId
- lastSeen
- correctStreak
- nextDue
- masteryLevel
- saved
- totalViews
- totalCorrect

Tidbits:
- tidbitId
- text
- category
- createdAt
- updatedAt
```

#### API Endpoints Needed
- `POST /api/users/register` - Register device token
- `PUT /api/users/preferences` - Update user preferences
- `GET /api/users/preferences` - Get user preferences
- `POST /api/learning/feedback` - Record user feedback
- `GET /api/learning/state` - Get learning state
- `GET /api/tidbits/random` - Get random tidbit
- `GET /api/tidbits/due` - Get due tidbits for user

#### Background Jobs
- Notification scheduler (cron job or queue)
  - Check all users
  - Calculate next notification time
  - Send push notifications
  - Respect quiet hours
  - Prioritize due tidbits

### 7. Timeline Estimate

- **Backend Setup**: 1-2 weeks
- **API Development**: 1-2 weeks
- **Client Migration**: 1 week
- **Testing**: 1 week
- **Total**: 4-6 weeks before launch

### 8. Considerations

#### Cost
- Push notification service costs (usually free for reasonable volume)
- Server hosting costs
- Database costs

#### Complexity
- More moving parts
- Need to handle offline scenarios
- Need error handling for failed pushes
- Need to handle device token updates

#### Benefits
- Better analytics
- Action buttons work
- Content updates without app updates
- Centralized control
- Better user experience

## Current Status

✅ Local notifications working
✅ Spaced repetition working
✅ User preferences working
✅ Content management working (hardcoded)

⏳ Push notifications: Not implemented
⏳ Server: Not set up
⏳ Migration: Planned for pre-launch

## Notes

- Keep current local implementation during beta
- Plan migration 4-6 weeks before launch
- Test thoroughly before App Store submission
- Consider using Firebase for easier setup (handles both iOS and Android push)

