---
title: Privacy Policy
---

# Privacy Policy for Tidbit

**Last Updated:** [1/14/2026]

## Introduction

Tidbit is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application ("App").

## Information We Collect

### Personal Information
- **Email Address**: We collect your email address when you contact us for support (optional).
- **Device Information**: We collect device tokens for push notifications, device platform (iOS/Android), and app version.

### Usage Data
- **Learning Progress**: We store your learning progress locally on your device, including:
  - Tidbits you've seen
  - Your feedback on tidbits ("I knew it", "I didn't know", "Saved")
  - Spaced repetition scheduling data
  - Daily tidbit counts

### App Preferences
- Notification frequency settings
- Selected categories/topics
- Quiet hours preferences
- Notification enable/disable status

## How We Use Your Information

### Push Notifications
- We use device tokens to send you tidbit notifications based on your selected frequency and preferences.
- Device tokens are stored securely on our servers (Supabase) and are only used to deliver notifications.
- You can disable notifications at any time in the app settings.

### Learning Progress
- Your learning progress is stored locally on your device using AsyncStorage.
- This data is used to:
  - Prioritize tidbits you haven't seen
  - Schedule spaced repetition reviews
  - Track your learning statistics
  - Personalize your learning experience

### App Functionality
- Your preferences (categories, notification interval, quiet hours) are stored both locally and on our servers to:
  - Deliver notifications according to your schedule
  - Respect your quiet hours
  - Show only tidbits from your selected categories

## Data Storage

### Local Storage
- Learning progress, preferences, and statistics are stored locally on your device.
- This data remains on your device and is not transmitted to our servers except for notification preferences.

### Server Storage
- Device tokens and notification preferences are stored on Supabase (our database provider).
- This data is necessary to send you push notifications.
- We do not store your learning progress on our servers.

## Data Sharing

We do not sell, trade, or rent your personal information to third parties. We only share data with:
- **Supabase**: Our database provider, used solely for storing device tokens and notification preferences.
- **Expo**: Used for push notification delivery (device tokens only).

## Your Rights

You have the right to:
- **Access**: View your stored data in the app's Settings screen.
- **Delete**: Clear all learning state and data through the app settings (Developer Mode).
- **Opt-Out**: Disable notifications at any time in app settings.
- **Contact**: Email us at kushald@berkeley.edu with any privacy concerns.

## Data Security

- Device tokens are stored securely using Supabase's encrypted database.
- Local data is stored using React Native's AsyncStorage (encrypted on iOS, secure on Android).
- We use HTTPS for all server communications.

## Children's Privacy

Our App is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Posting the new Privacy Policy on this page
- Updating the "Last Updated" date
- Notifying you through the app (if significant changes)

## Contact Us

If you have questions about this Privacy Policy, please contact us at:
- **Email**: kushald@berkeley.edu
- **Subject**: Tidbit App Privacy Policy Inquiry

## Third-Party Services

### Supabase
- We use Supabase to store device tokens and preferences.
- Supabase's privacy policy: https://supabase.com/privacy

### Expo
- We use Expo's push notification service.
- Expo's privacy policy: https://expo.dev/privacy

---

**Note**: This is a basic privacy policy. For production apps, consider having a lawyer review it to ensure compliance with GDPR, CCPA, and other applicable regulations.


