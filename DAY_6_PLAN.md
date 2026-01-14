# Day 6: Polish + Trust - Pre-Launch Checklist

## ✅ What We've Already Done (Days 1-5)
- ✅ Real tidbit content in notifications
- ✅ Tidbit viewer with flip animation
- ✅ Interactive buttons (I knew it, I didn't, Save)
- ✅ Spaced repetition logic
- ✅ Onboarding flow
- ✅ Settings screen
- ✅ Content management (Supabase)
- ✅ Push notifications with interactive buttons
- ✅ Server-side notification scheduler
- ✅ About page (basic version exists)

## 🎯 Day 6 Tasks

### **Morning: Trust & Polish**

#### 1. App Icon + Splash Screen
- [ ] Create app icon (all required sizes for iOS/Android)
- [ ] Update splash screen configuration
- [ ] Test on device

#### 2. About Page Enhancement
- [x] Version info (already exists: 1.0.0)
- [ ] Privacy policy link (hosted page or in-app)
- [x] Contact support email (already exists: support@tidbit.app)
- [ ] Make contact email clickable (opens email client)

#### 3. Permission Handling
- [ ] Review notification permission denial flow
- [ ] Ensure graceful handling (user can still use app)
- [ ] Add helpful messaging if permissions denied

### **Afternoon: Remove Debug UI**

#### 4. Hide Debug Sections
- [ ] "Testing" section in Settings (make dev-only or remove)
  - "Send Test Notification" button
  - "Check Scheduled Notifications" button
- [ ] "Spaced Repetition Debug" section (make dev-only or remove)
  - Debug stats display
  - "View Due Tidbits" button
  - "View Scheduled Tidbits" button
  - "View Saved Tidbits" button
  - "Clear All Learning State" button
- [ ] "Test Tidbit (Dev)" button on HomeScreen

**Options:**
- **Option A:** Remove completely (cleanest for launch)
- **Option B:** Hide behind dev mode (shake device or secret tap)
- **Option C:** Move to separate "Developer" section at bottom

#### 5. Default Settings
- [ ] Change default notification interval from 30 min → 60 min (1 hour)
- [x] Quiet hours default: 11pm-9am (already correct)
- [ ] Review all default values

#### 6. Error Messages
- [ ] Review error messages throughout app
- [ ] Make them user-friendly (not technical)
- [ ] Add helpful guidance

### **Evening: Final Polish**

#### 7. UI Polish Pass
- [ ] Consistent spacing and padding
- [ ] Color consistency
- [ ] Typography review
- [ ] Button styles consistency
- [ ] Loading states
- [ ] Empty states

#### 8. Accessibility
- [ ] Test with VoiceOver (iOS) / TalkBack (Android)
- [ ] Ensure all buttons have proper labels
- [ ] Color contrast check
- [ ] Touch target sizes (min 44x44pt)

#### 9. Performance
- [ ] Check for memory leaks
- [ ] Optimize image loading
- [ ] Review AsyncStorage usage
- [ ] Check network request efficiency

#### 10. Multi-Device Testing
- [ ] Test on different iPhone models
- [ ] Test on different screen sizes
- [ ] Test on Android (if available)
- [ ] Test notification delivery
- [ ] Test interactive buttons

---

## 🚨 Critical for Launch

### Must Have:
1. ✅ App icon + splash screen
2. ✅ Privacy policy (can be simple hosted page)
3. ✅ Remove/hide debug UI
4. ✅ Default interval = 1 hour
5. ✅ Graceful permission handling

### Nice to Have:
- Enhanced About page
- Dev mode for debug tools
- Performance optimizations
- Accessibility improvements

---

## 📝 Notes

- **Debug UI:** Recommend Option B (dev mode) - keeps tools available for you but hidden from users
- **Privacy Policy:** Can be a simple GitHub Pages site or Notion page for now
- **App Icon:** Can use a simple design tool or AI generator, then export all sizes
- **Testing:** Focus on your primary device first, then expand

---

## 🎯 Success Criteria

By end of Day 6:
- App looks professional (no debug UI visible)
- Users can trust the app (privacy policy, contact info)
- Default settings are sensible (1 hour interval)
- No obvious bugs or crashes
- Ready for TestFlight build

