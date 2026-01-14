# Tidbit - Revised Weekly Roadmap (Ambitious but Achievable)

## 🎯 V1 Promise
**"Tidbit helps you learn tiny things daily through notifications you actually want to open."**

## 🎯 V1 Core Loop (Must Feel Good)
1. User picks frequency + topics
2. Phone notification shows a **real tidbit** (not just schedule info)
3. User taps → sees tidbit card
4. User can: **Got it / Didn't get it / Save / Next**
5. App adapts what it sends next (even simple rules)

**If you ship this loop, you're no longer a notification demo — you're a learning app.**

---

## 📅 7-Day Sprint Plan

### **Day 1 (Today) - Foundation ✅**
**Status:** Mostly complete
- ✅ Notification system working
- ✅ Basic UI/UX complete
- ✅ Settings and configuration
- ⚠️ Need: Real tidbit content in notifications (not just scheduling info)

### **Day 2 (Tomorrow) - Real Tidbit Content + Viewer** 🎯
**Deliverable: Notification shows real tidbit + In-app tidbit viewer**

**Morning:**
- Fix 15-min and 30-min interval scheduling bugs
- Replace notification content with actual tidbit text
- Ensure notifications show interesting content (not just "📚 Tidbit")

**Afternoon:**
- Build **Tidbit Viewer Screen** (tap notification → see tidbit card)
  - Front: Question or fact
  - Tap to reveal back (explanation/answer)
  - Buttons: "I knew it" / "I didn't" / "Save" / "Next" (can save to different folders)
- Add "Next tidbit now" button (manual pull) for immediate learning

**Evening:**
- Polish tidbit card UI
- Add smooth animations
- Test notification → app flow

**Key Decision:** Question-style notifications ("What does RSA stand for?") vs Fact-style ("RSA = Rivest–Shamir–Adleman")
- **Recommendation:** Question-style for stickiness (creates curiosity gap), maybe make the notification and the original tidbit a fact so it can easily be read, and later on make it into a flashcard for reinforced learning purposes (need both prepared for every tidbit, maybe only do the flashcard if the user clicks to save the tidbit)

---

### **Day 3 - Topics + Onboarding + Settings**
**Deliverable: Complete onboarding flow + topic selection**

**Morning:**
- Build onboarding flow for first-time users
  - Welcome screen
  - Frequency selection (15min, 30min, 1hr, 2hr)
  - Topic selection (5-7 categories: Tech, Psychology, Finance, History, Science, Health, Fun Facts)
  - Permission requests

**Afternoon:**
- Enhance Settings screen
  - Change frequency
  - Change topics
  - Quiet hours (no notifications 11pm-9am)
  - About page

**Evening:**
- Test onboarding flow
- Polish transitions
- Handle edge cases

---

### **Day 4 - Simple Spaced Repetition Brain**
**Deliverable: App adapts based on user feedback**

**Morning:**
- Implement simple spaced repetition logic:
  - "I didn't know" → Repeat in 1-3 hours
  - "I knew it" → Repeat tomorrow / in 3 days
  - "Save" → Prioritize occasionally
- Store per-tidbit state:
  - `lastSeen`
  - `correctStreak`
  - `nextDue`
  - `masteryLevel`

**Afternoon:**
- Update notification scheduling to use spaced repetition
- Prioritize tidbits based on user feedback
- Track learning progress

**Evening:**
- Test feedback loop
- Verify notifications adapt correctly
- Debug edge cases

**Why this matters:** You're not just showing random facts — you're scheduling memory. This competes with Quizlet conceptually.

---

### **Day 5 - Content Pipeline**
**Deliverable: Easy way to add tidbits without coding**

**Morning:**
- Set up content management system:
  - Option 1: Local JSON file (fastest)
  - Option 2: Google Sheet → JSON export
  - Option 3: Notion database → JSON
- Create tidbit data structure:
  ```json
  {
    "id": "unique-id",
    "front": "Question or fact",
    "back": "Explanation/answer",
    "topic": "tech",
    "source": "optional",
    "difficulty": "easy|medium|hard"
  }
  ```

**Afternoon:**
- Expand content library:
  - **100-200 tidbits minimum**
  - 3-5 topics well-covered (Berkeley fun facts, finance tips, health advice, specific course tidbits, etc)
  - Mix of question-style and fact-style (actually just make the tidbits fact style and work on having the question style equivalent later on in the flashcard mode)
  - Quality over quantity

**Evening:**
- Content review and curation
- Ensure variety and interest
- Test content display

**Note:** Content quality matters more than features. Better to have 100 great tidbits than 1000 mediocre ones.

---

### **Day 6 - Polish + Trust**
**Deliverable: App feels real and trustworthy**

**Morning:**
- App icon + splash screen
- "About" page with version info
- Privacy policy link (hosted page)
- "Contact support" email link
- Handle notification permission denial gracefully

**Afternoon:**
- Remove/hide debug-only UI
  - "Check scheduled notifications" → dev-only
  - Clean up test buttons
- Reduce friction:
  - Default frequency: 1 hour (15min might feel spammy)
  - Quiet hours: 11pm-9am (no notifications)
  - Better error messages

**Evening:**
- Final UI polish pass
- Accessibility check
- Performance optimization
- Test on multiple devices

---

### **Day 7 - Ship Pipeline**
**Deliverable: TestFlight build + App Store-ready**

**Morning:**
- EAS Build for iOS (production)
- TestFlight upload
- App Store Connect listing:
  - Screenshots (all required sizes)
  - App description
  - Keywords
  - Category selection
  - Age rating

**Afternoon:**
- Beta testing setup
- Invite 10+ beta testers
- Gather initial feedback
- Fix critical bugs

**Evening:**
- Submit to App Store (if ready)
- Prepare marketing materials
- Document known issues
- Plan post-launch updates

**Success Metric:** TestFlight build + beta users + feedback loop established

---

## 🎯 Tomorrow's Revised Deliverable (End of Day 2)

### **Must Have:**
1. ✅ **Real Tidbit Content in Notifications**
   - Notifications show actual tidbit text, make sure to easily show full tidbit from just the notification (not just "📚 Tidbit")
   - Question-style or fact-style format
   - Interesting and engaging

2. ✅ **Tidbit Viewer Screen**
   - Tap notification → opens tidbit card
   - Front/back reveal (tap to flip)
   - Action buttons: "I knew it" / "I didn't" / "Save" / "Next"
   - "Next tidbit now" button for manual learning

3. ✅ **Fixed Notification Scheduling**
   - All intervals working (15-min, 30-min, 1-hour, 2-hour)
   - Notifications start from next interval today
   - Proper iOS 64 notification limit handling

### **Nice to Have:**
- Basic onboarding flow
- Topic selection UI
- Quiet hours setting

---

## 📊 Current vs. Target State

### **Current (Notification Demo):**
- ✅ Schedules notifications
- ✅ Shows "📚 Tidbit" in notification
- ✅ Basic settings
- ❌ No real content
- ❌ No learning loop
- ❌ No adaptation

### **Target (Learning App):**
- ✅ Real tidbit content in notifications
- ✅ Tap → see tidbit card
- ✅ Feedback loop (Got it / Didn't get it)
- ✅ App adapts based on feedback
- ✅ Progress tracking
- ✅ Feels like a real product

---

## 🚀 Future Vision: "Better Than Quizlet"

### **Phase 1: Notification-First Microlearning** (This Week)
- Personalized topics
- Question-style notifications
- Tap-to-reveal
- Simple spaced repetition
- Streak + stats

### **Phase 2: User-Generated Decks** (Post-Launch)
- Create decks quickly (paste list / import)
- AI auto-generates Q/A pairs
- Daily schedule per deck
- Share decks with friends

### **Phase 3: "Lock Screen Tutor"** (Killer Feature)
- Choose what you're learning (midterms / language / interview prep)
- Tidbit creates daily plan
- Quizzes you in tiny bursts across the day
- Competes with Quizlet because it's behavior + spaced repetition + distribution

---

## 💡 Key Insights from ChatGPT's Plan

1. **Content is King**: 100-200 quality tidbits > 1000 mediocre ones
2. **Question-Style > Fact-Style**: Creates curiosity gap, more engaging
3. **Simple Spaced Repetition**: Don't need full Anki algorithm, basic rules work
4. **Adaptive Learning**: App must respond to user feedback
5. **Ship Pipeline Matters**: TestFlight + beta users = real product

---

## 🎯 Success Metrics

### **End of Week:**
- ✅ TestFlight build live
- ✅ 10+ beta testers
- ✅ Core learning loop working
- ✅ Zero critical bugs
- ✅ App feels like a real product (not a demo)

### **Post-Launch:**
- 100+ downloads in first week
- 4+ star rating
- Users completing learning loops
- Feedback collected for Phase 2

---

## 🚨 Critical Path Items

1. **Day 2**: Tidbit Viewer + Real content (blocks everything else)
2. **Day 4**: Spaced repetition (makes it a learning app, not just notifications)
3. **Day 5**: Content library (quality matters more than features)
4. **Day 7**: Ship pipeline (TestFlight = real product)

---

**Let's build a real learning app, not just a notification demo! 🚀**

