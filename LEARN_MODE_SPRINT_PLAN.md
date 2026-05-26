# Learn Mode Sprint Plan - 10 Days
**Goal**: Transform Tidbit from a passive notification app into an active learning tool that helps users improve grades and stay on track with classes.

---

## 🎯 Core Vision

**The Pitch**: "Tidbit doesn't just send you facts—it helps you actually learn and remember them. Study smarter with active recall, spaced repetition, and progress tracking that keeps you on schedule for your classes."

**Key Value Propositions**:
1. **Active Learning**: Not just reading—testing yourself, recalling information
2. **Class Integration**: Link categories to your actual classes, track progress per class
3. **Smart Review**: Focus on what you don't know, review what's due
4. **Progress Visibility**: See improvement over time, mastery per category
5. **Study Goals**: Set daily/weekly targets, stay accountable

---

## 💡 Feature Ideas (Prioritized)

### **Tier 1: Core Active Learning (Days 1-5)**
*Must-have features that transform the app into a learning tool*

#### 1. **Study Plan Card** ⭐ HIGHEST PRIORITY
**What**: A daily "Study Plan" card on the Home screen that generates a personalized study session.

**Features**:
- **Daily Plan Generation**: Every day, automatically creates a study plan:
  - "Do 6 due reviews + 4 new (10 min)"
  - Balances due tidbits (spaced repetition) with new learning
  - Estimates time based on tidbit count
- **One-Tap Start**: Tap the card to immediately start the session
- **Smart Mixing**: Combines:
  - Due tidbits (from spaced repetition)
  - New tidbits (from selected categories)
  - Ratio: ~60% due, ~40% new (adjustable)
- **Daily Refresh**: Plan regenerates each day based on current state
- **Progress Indicator**: Shows if plan is completed: "✅ Completed" or "0/10 done"

**Why**: Eliminates decision fatigue. Users know exactly what to do each day. Combines review + new learning in one actionable plan.

**UI Flow**:
- Prominent card at top of Home screen (below stats)
- Shows: "📚 Today's Study Plan: 6 due + 4 new (10 min)"
- Tap → Immediately starts study session with pre-selected tidbits
- After completion: Card shows "✅ Completed" or updates progress

**Technical**:
- New `StudyPlanService.js` to generate daily plans
- Algorithm: Get due tidbits, get new tidbits, mix them
- Store plan in AsyncStorage (daily reset)
- Integrate with Study Session Mode

**Study Plan Algorithm**:
```javascript
// Pseudo-code for plan generation
function generateDailyPlan() {
  // 1. Get due tidbits (from SpacedRepetitionService)
  const dueTidbits = await SpacedRepetitionService.getDueTidbits();
  
  // 2. Get new tidbits (from ContentService, not seen before)
  const newTidbits = await ContentService.getNewTidbits(selectedCategories);
  
  // 3. Calculate mix (60% due, 40% new)
  const dueCount = Math.min(dueTidbits.length, Math.ceil(totalCount * 0.6));
  const newCount = totalCount - dueCount;
  
  // 4. Select random subset
  const selectedDue = shuffle(dueTidbits).slice(0, dueCount);
  const selectedNew = shuffle(newTidbits).slice(0, newCount);
  
  // 5. Mix them together (shuffle order)
  const planTidbits = shuffle([...selectedDue, ...selectedNew]);
  
  // 6. Estimate time (assume ~1 min per tidbit)
  const estimatedMinutes = planTidbits.length;
  
  return {
    tidbits: planTidbits,
    dueCount,
    newCount,
    totalCount: planTidbits.length,
    estimatedMinutes,
    date: today(),
    completed: false
  };
}
```

**Plan Configuration**:
- Default total: 10 tidbits (adjustable in settings)
- Ratio: 60% due, 40% new (adjustable)
- Time estimate: ~1 minute per tidbit
- Daily reset: At midnight or first app open of new day

---

#### 2. **Study Session Mode** ⭐ HIGHEST PRIORITY
**What**: A dedicated "Study Mode" where users actively review tidbits in a focused session.

**Features**:
- Start a study session (5, 10, 15, or 30 minutes) OR from Study Plan
- Shows tidbits one at a time with flip-to-reveal
- After each tidbit, user must answer: "I knew it" or "I didn't know"
- Progress bar showing session completion
- End-of-session summary: "You reviewed 12 tidbits, 8 mastered, 4 need more practice"
- Prioritizes due tidbits, then saved, then random
- Can filter by category (study for specific class)
- **Study Plan Integration**: Can be started from Study Plan card with pre-selected tidbits

**Why**: This is the core active learning feature. Users actively engage instead of passively reading.

**UI Flow**:
- New "Study Mode" button on Home screen (prominent)
- OR: Tap Study Plan card → immediately starts session
- Session setup screen: duration, categories (if not from plan)
- Full-screen study interface (minimal distractions)
- Post-session stats screen

**Technical**:
- New `StudySessionService.js` to manage session state
- New `StudySessionScreen.js` component
- Integrate with existing `SpacedRepetitionService`
- Track session stats (tidbits reviewed, accuracy, time spent)
- Accept pre-selected tidbits from Study Plan

---

#### 3. **Quiz/Recall Mode** ⭐ HIGH PRIORITY
**What**: Test yourself on tidbits you've seen before—active recall practice.

**Features**:
- "Quiz Me" mode: Shows tidbit text, you try to recall the fact
- Multiple choice questions (generate distractors from other tidbits in same category)
- True/False questions
- Fill-in-the-blank (if tidbit structure allows)
- Immediate feedback: "Correct!" or "Incorrect, the answer is..."
- Tracks quiz accuracy per category
- Leaderboard-style: "You got 8/10 correct this week!"

**Why**: Active recall is one of the most effective learning techniques. Forces users to retrieve information from memory.

**UI Flow**:
- "Quiz Me" button on Home screen
- Select categories to quiz on
- Question → Answer → Feedback → Next
- End-of-quiz summary with accuracy stats

**Technical**:
- New `QuizService.js` for question generation
- New `QuizScreen.js` component
- Question generation logic (multiple choice, true/false)
- Accuracy tracking per tidbit/category

---

#### 4. **Category Progress Dashboard** ⭐ HIGH PRIORITY
**What**: See your learning progress per category (class).

**Features**:
- Progress card per category showing:
  - Total tidbits in category
  - Tidbits seen
  - Tidbits mastered (3+ correct in a row)
  - Mastery percentage
  - Due tidbits count
- Visual progress bar: "CS61A: 45/120 mastered (38%)"
- Weekly progress graph (tidbits learned per day)
- "On Track" indicator: "You're ahead of schedule!" or "Catch up: 5 tidbits due"

**Why**: Users need to see progress to stay motivated. Links learning to actual classes.

**UI Flow**:
- Enhanced "Your Categories" section on Home screen
- Tap category → Detailed progress screen
- Progress graphs/charts (simple bar charts)

**Technical**:
- New `CategoryProgressService.js` to aggregate stats
- Enhance `HomeScreen.js` with progress cards
- New `CategoryProgressScreen.js` for detailed view
- Simple charting library (or custom SVG charts)

---

### **Tier 2: Engagement & Motivation (Days 6-8)**
*Features that keep users coming back and motivated*

#### 5. **Daily Learning Goals**
**What**: Set and track daily learning targets.

**Features**:
- Set daily goal: "I want to learn 10 tidbits today"
- Progress indicator: "7/10 tidbits learned today"
- Streak tracking: "You've hit your goal 5 days in a row!"
- Weekly goals: "Learn 50 tidbits this week"
- Goal reminders: "You're 3 tidbits away from your daily goal!"

**Why**: Goals create accountability and motivation. Users feel accomplished when they hit targets.

**UI Flow**:
- Settings screen: "Daily Goal" section
- Home screen: Goal progress card
- Notification: "You're close to your goal!"

**Technical**:
- New `GoalService.js` for goal tracking
- Enhance `HomeScreen.js` with goal card
- Notification integration for goal reminders

---

#### 6. **Review Queue & Due Tidbits Focus**
**What**: Make it easy to review what's due and what needs attention.

**Features**:
- "Review Queue" button on Home screen
- Shows all due tidbits in a swipeable list
- "Focus Mode": Only show tidbits you've marked "I didn't know" 2+ times
- "Mastery Challenge": Review all mastered tidbits to maintain retention
- Quick stats: "12 tidbits due, 5 need urgent review"

**Why**: Users need a clear path to review material. Makes spaced repetition actionable.

**UI Flow**:
- "Review Queue" button → List of due tidbits
- Swipe through, mark as known/unknown
- Progress indicator

**Technical**:
- Enhance existing `DueTidbitsViewer.js`
- New `ReviewQueueScreen.js` for focused review
- Filter logic for "needs review" tidbits

---

#### 7. **Performance Analytics**
**What**: Show learning trends and improvement over time.

**Features**:
- Weekly learning graph: "You learned 45 tidbits this week"
- Accuracy trend: "Your accuracy improved from 60% to 85%"
- Category comparison: "You're strongest in CS61A, weakest in Econ 1"
- Time spent learning: "You've studied 2.5 hours this week"
- Milestones: "You've mastered 100 tidbits! 🎉"

**Why**: Users want to see improvement. Analytics provide motivation and insights.

**UI Flow**:
- Enhanced Stats screen with graphs
- Weekly/monthly views
- Achievement badges/milestones

**Technical**:
- Enhance `StatsScreen.js` with charts
- New `AnalyticsService.js` for trend calculation
- Simple charting (react-native-svg or similar)

---

### **Tier 3: Polish & Enhancement (Days 9-10)**
*Nice-to-have features that enhance the experience*

#### 8. **Class Schedule Integration**
**What**: Link categories to actual class schedules.

**Features**:
- Add class: "CS61A" → Link to "cs-61a" category
- Set class schedule: "CS61A meets Mon/Wed/Fri at 10am"
- Smart notifications: "CS61A class in 1 hour—review 5 tidbits!"
- Weekly class progress: "You're ready for this week's CS61A material"

**Why**: Connects learning to real classes. Users see direct value.

**UI Flow**:
- Settings → "My Classes" section
- Add class, link to category, set schedule
- Home screen shows class reminders

**Technical**:
- New `ClassService.js` for class management
- Calendar integration (optional)
- Notification scheduling based on class times

---

#### 9. **Study Streaks & Achievements**
**What**: Gamification elements to boost engagement.

**Features**:
- Study streak: "7-day study streak 🔥"
- Achievements: "Mastered 50 tidbits", "Perfect quiz (10/10)", "Week warrior (7 days in a row)"
- Badge collection
- Leaderboard (optional, if multi-user later)

**Why**: Gamification increases engagement. Users love streaks and achievements.

**UI Flow**:
- Stats screen: Achievements section
- Home screen: Streak indicator
- Achievement popups when earned

**Technical**:
- New `AchievementService.js`
- Badge/achievement tracking
- Streak calculation (already partially exists)

---

#### 10. **Smart Study Recommendations**
**What**: AI-like suggestions for what to study next.

**Features**:
- "You should review CS61A—you haven't seen those tidbits in 3 days"
- "Focus on Econ 1—you're struggling with those (40% accuracy)"
- "Great job on CS61B! Try mastering CS61A next"
- Personalized study plan: "Today: Review 5 due tidbits, learn 3 new ones"

**Why**: Reduces decision fatigue. Users know exactly what to do.

**UI Flow**:
- Home screen: "Recommended for you" card
- Smart suggestions based on progress/accuracy

**Technical**:
- New `RecommendationService.js`
- Algorithm: prioritize due, low accuracy, untouched categories

---

#### 11. **Export & Share Progress**
**What**: Let users share achievements and export data.

**Features**:
- Share progress: "I've mastered 50 tidbits in CS61A! 📚"
- Export stats: CSV of learning history
- Study report: "This week you learned 30 tidbits, 85% accuracy"

**Why**: Social sharing increases engagement. Export useful for tracking.

**UI Flow**:
- Stats screen: "Share" button
- Settings: "Export Data" option

**Technical**:
- React Native Share API
- CSV generation
- Report formatting

---

## 📅 10-Day Sprint Breakdown

### **Days 1-2: Study Plan + Study Session Mode** (Core Feature)
**Goal**: Build the foundation for active learning with daily study plans.

**Tasks**:
- [ ] Create `StudyPlanService.js` (generate daily plans)
- [ ] Create `StudySessionService.js` (manage session state)
- [ ] Build `StudySessionScreen.js` (session setup + study interface)
- [ ] Build Study Plan card component for Home screen
- [ ] Integrate with `SpacedRepetitionService` (get due tidbits)
- [ ] Integrate with `ContentService` (get new tidbits)
- [ ] Plan generation algorithm: Mix due + new tidbits
- [ ] One-tap start from Study Plan card
- [ ] Session stats tracking
- [ ] End-of-session summary screen
- [ ] Daily plan reset logic

**Deliverable**: Users see a daily Study Plan card and can one-tap to start a focused study session.

---

### **Days 3-4: Category Progress Dashboard**
**Goal**: Show users their learning progress per category.

**Tasks**:
- [ ] Create `CategoryProgressService.js`
- [ ] Build `CategoryProgressScreen.js`
- [ ] Enhance Home screen with progress cards
- [ ] Calculate mastery percentages per category
- [ ] Visual progress bars
- [ ] Weekly progress tracking

**Deliverable**: Users can see how well they're learning each category/class.

---

### **Days 5-6: Quiz/Recall Mode**
**Goal**: Add active recall practice.

**Tasks**:
- [ ] Create `QuizService.js` (question generation)
- [ ] Build `QuizScreen.js` (quiz interface)
- [ ] Multiple choice question generation
- [ ] True/False question generation
- [ ] Immediate feedback system
- [ ] Accuracy tracking
- [ ] Add "Quiz Me" button to Home screen

**Deliverable**: Users can test themselves on tidbits they've learned.

---

### **Days 7-8: Daily Goals & Review Queue**
**Goal**: Add motivation and focus features.

**Tasks**:
- [ ] Create `GoalService.js`
- [ ] Daily goal setting UI
- [ ] Goal progress tracking
- [ ] Enhance Review Queue (due tidbits focus)
- [ ] "Focus Mode" for struggling tidbits
- [ ] Goal reminders/notifications

**Deliverable**: Users can set goals and easily review what's due.

---

### **Days 9-10: Polish & Analytics**
**Goal**: Add analytics and polish the experience.

**Tasks**:
- [ ] Create `AnalyticsService.js`
- [ ] Enhance Stats screen with graphs
- [ ] Weekly/monthly learning trends
- [ ] Performance analytics (accuracy over time)
- [ ] Achievement system (basic)
- [ ] UI polish and animations
- [ ] Bug fixes and testing

**Deliverable**: Polished app with analytics and achievements.

---

## 🎨 UI/UX Considerations

### **Home Screen Redesign**
**Current**: Stats cards, categories preview, "Get Tidbit Now" button

**New Layout**:
```
┌─────────────────────────────┐
│  Tidbit                     │
│  Learn something new        │
├─────────────────────────────┤
│  [Stats: Total | Today | Streak] │
├─────────────────────────────┤
│  📚 Today's Study Plan      │
│  Do 6 due + 4 new (10 min)  │
│  [Start Session]            │
├─────────────────────────────┤
│  🎯 Daily Goal: 7/10        │
├─────────────────────────────┤
│  📚 Study Mode              │
│  [Start Custom Session]     │
├─────────────────────────────┤
│  🧠 Quiz Me                 │
│  [Test Your Knowledge]      │
├─────────────────────────────┤
│  📋 Review Queue            │
│  12 tidbits due for review  │
├─────────────────────────────┤
│  Your Categories            │
│  [CS61A: 45/120 mastered]   │
│  [CS61B: 30/100 mastered]   │
└─────────────────────────────┘
```

### **Study Session UI**
- Full-screen, minimal distractions
- Large, readable tidbit text
- Flip animation (already exists)
- Progress bar at top
- Timer (optional)
- Swipe gestures: swipe right = knew it, swipe left = didn't know

### **Quiz UI**
- Card-based interface
- Large question text
- Multiple choice buttons (A, B, C, D)
- Immediate feedback with animation
- Score counter: "5/10 correct"

---

## 🔧 Technical Architecture

### **New Services**
1. **`StudyPlanService.js`**
   - Generate daily study plans (due + new tidbits)
   - Calculate time estimates
   - Store plan state (daily reset)
   - Mix algorithm: 60% due, 40% new (configurable)

2. **`StudySessionService.js`**
   - Manage session state (duration, start time, tidbits reviewed)
   - Track session stats (accuracy, time spent)
   - Persist session history
   - Accept pre-selected tidbits from Study Plan

3. **`QuizService.js`**
   - Generate questions from tidbits
   - Create multiple choice options (distractors)
   - Track quiz accuracy per tidbit/category

4. **`CategoryProgressService.js`**
   - Aggregate stats per category
   - Calculate mastery percentages
   - Track weekly progress

5. **`GoalService.js`**
   - Store daily/weekly goals
   - Track goal progress
   - Calculate streaks

6. **`AnalyticsService.js`**
   - Calculate learning trends
   - Generate weekly/monthly reports
   - Performance metrics

### **New Screens**
1. **`StudySessionScreen.js`** - Study session interface
2. **`QuizScreen.js`** - Quiz interface
3. **`CategoryProgressScreen.js`** - Detailed category progress
4. **`ReviewQueueScreen.js`** - Focused review of due tidbits

### **Enhanced Screens**
1. **`HomeScreen.js`** - Add study mode, quiz, review queue buttons, progress cards
2. **`StatsScreen.js`** - Add analytics graphs, achievements
3. **`SettingsScreen.js`** - Add goal settings, class management

---

## 📊 Success Metrics

**What success looks like after 10 days**:
1. Users see a daily Study Plan card and can one-tap to start studying
2. Users can actively study tidbits in focused sessions
3. Users can quiz themselves on learned material
4. Users can see progress per category/class
5. Users can set and track daily learning goals
6. Users have a clear path to review due tidbits
7. Users see analytics showing improvement over time

**User Feedback to Track**:
- "I love the daily Study Plan—I know exactly what to do"
- "I use Study Mode daily"
- "I can see my progress improving"
- "The quiz feature helps me remember better"
- "I'm more motivated to learn with goals"

---

## 🚀 Post-Sprint Ideas (Future)

**If time allows or for next sprint**:
- Class schedule integration
- Social features (share progress, compete with friends)
- Advanced spaced repetition algorithm (Anki-style)
- Custom tidbit creation (user-generated content)
- Offline mode improvements
- Dark mode
- Widget support (iOS/Android)

---

## 💭 Key Design Principles

1. **Active > Passive**: Every feature should require user engagement, not just reading
2. **Progress Visibility**: Users should always see how they're improving
3. **Class Connection**: Link learning to actual classes whenever possible
4. **Quick & Focused**: Study sessions should be short (5-30 min), not overwhelming
5. **Gamification**: Use streaks, goals, achievements to motivate
6. **Smart Defaults**: App should suggest what to study, reduce decision fatigue (Study Plan is the perfect example!)

---

## 🎯 Final Pitch (After Sprint)

**"Tidbit: Your Active Learning Companion"**

*"Stop passively reading facts. Start actively learning. Tidbit helps you master course material through study sessions, quizzes, and spaced repetition. See your progress, set goals, and stay on track for your classes. Study smarter, not harder."*

**Key Features**:
- 📚 **Daily Study Plan**: Personalized plan every day—"Do 6 due + 4 new (10 min)"—one tap to start
- 📚 Study Sessions: Focused 5-30 minute learning sessions
- 🧠 Quiz Mode: Test yourself with active recall
- 📊 Progress Tracking: See mastery per category/class
- 🎯 Daily Goals: Set and hit learning targets
- 🔄 Smart Review: Focus on what you don't know
- 📈 Analytics: Track improvement over time

---

## 📝 Notes

- **Build on existing**: Leverage `SpacedRepetitionService`, `ContentService`, existing UI components
- **Incremental**: Ship features daily, get feedback, iterate
- **Test with users**: Have your 10 friends test each feature as it's built
- **Keep it simple**: Don't over-engineer. Focus on core value first.
- **Mobile-first**: All features should work great on phone (primary use case)

---

**Ready to build? Let's start with Study Plan + Study Session Mode on Day 1! 🚀**

