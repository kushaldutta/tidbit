# Testing the Study Plan Feature

## Quick Start

1. **Start the app** (if not already running):
   ```powershell
   npm start
   # or
   npx expo start
   ```

2. **Open the app** on your device/simulator

3. **Navigate to Home screen** - You should see the Study Plan card below the stats

---

## Testing Checklist

### ✅ 1. Study Plan Card Appears
- [ ] Open Home screen
- [ ] See purple Study Plan card below stats
- [ ] Card shows: "📚 Today's Study Plan"
- [ ] Card shows plan details: "Do X due + Y new (Z min)"
- [ ] Card shows progress: "0/10 done" (or similar)

**Expected**: Card appears with a generated plan

**If it doesn't appear**:
- Check console for errors
- Make sure you have categories selected (Settings → Categories)
- Check if `StudyPlanService.getDailyPlan()` is being called

---

### ✅ 2. Study Plan Generation
- [ ] Plan should have tidbits (due + new)
- [ ] Check console logs for: `[STUDY_PLAN] Generated plan: X due + Y new (Z min)`

**Expected**: Plan generates with a mix of due and new tidbits

**If plan is empty**:
- Make sure you have categories selected
- You might not have any due tidbits yet (that's okay - it will use all new ones)
- Check console for errors in `generateDailyPlan()`

---

### ✅ 3. Start Study Session
- [ ] Tap "Start Session" button on Study Plan card
- [ ] Should navigate to Study Session screen
- [ ] Should see first tidbit card

**Expected**: Navigation works, first tidbit appears

**If it doesn't work**:
- Check navigation route is registered in `App.js`
- Check console for errors
- Verify `initialTidbits` are being passed correctly

---

### ✅ 4. Study Session Interface
- [ ] See progress bar at top: "0 / 10"
- [ ] See tidbit card with text
- [ ] Tap card to flip it
- [ ] See action buttons: "✅ I knew it" and "❓ I didn't"

**Expected**: Card flips, shows actions

**If card doesn't flip**:
- Check `flipAnim` animation
- Check console for errors

---

### ✅ 5. Complete Tidbits
- [ ] Tap "✅ I knew it" on a tidbit
- [ ] Card should flip back and load next tidbit
- [ ] Progress should update: "1 / 10"
- [ ] Repeat for a few tidbits

**Expected**: Actions work, progress updates, next tidbit loads

**If actions don't work**:
- Check `handleTidbitAction()` function
- Check `StudySessionService.recordTidbitFeedback()`
- Check console for errors

---

### ✅ 6. Complete Session
- [ ] Complete all tidbits in the plan
- [ ] Should see summary screen
- [ ] Summary shows:
  - "🎉 Session Complete!"
  - Tidbits Reviewed count
  - "I Knew It" count
  - "Need Practice" count
  - Accuracy percentage

**Expected**: Summary appears with correct stats

**If summary doesn't appear**:
- Check `completeSession()` function
- Check if all tidbits were processed
- Check console for errors

---

### ✅ 7. Return to Home
- [ ] Tap "Done" on summary screen
- [ ] Should return to Home screen
- [ ] Study Plan card should show "✅ Completed (X/10)"
- [ ] Card should be disabled (can't start again)

**Expected**: Plan marked as completed, card shows completion status

**If completion doesn't update**:
- Check `StudyPlanService.markPlanCompleted()`
- Check `loadStudyPlan()` is called when returning to Home
- Check console for errors

---

### ✅ 8. Progress Tracking
- [ ] Start a new session (or use "Get Tidbit Now" to create some due tidbits)
- [ ] Complete a few tidbits, then exit
- [ ] Return to Home
- [ ] Study Plan card should show progress: "3/10 done" (or similar)

**Expected**: Progress updates in real-time

**If progress doesn't update**:
- Check `StudyPlanService.updatePlanProgress()`
- Check if `loadStudyPlan()` refreshes on focus

---

### ✅ 9. Daily Reset
- [ ] Complete today's plan
- [ ] Wait until tomorrow (or manually clear plan for testing)
- [ ] Open app next day
- [ ] Should see new plan generated

**Expected**: Plan resets daily

**To test daily reset manually**:
```javascript
// In console or debug menu:
import { StudyPlanService } from './src/services/StudyPlanService';
await StudyPlanService.clearPlan();
// Then reload Home screen
```

---

## Debugging Tips

### Check Console Logs
Look for these log messages:
- `[STUDY_PLAN] Generating new daily plan...`
- `[STUDY_PLAN] Generated plan: X due + Y new (Z min)`
- `[STUDY_SESSION] Started session with X tidbits`
- `[STUDY_SESSION] Ended session: X/Y completed, Z min`

### Common Issues

1. **"No plan available" message**
   - Make sure categories are selected
   - Check if `getDailyPlan()` returns null
   - Check console for errors

2. **Plan has 0 tidbits**
   - You might not have any tidbits in selected categories
   - Check if categories have content
   - You might not have any due tidbits yet (normal for new users)

3. **Session doesn't start**
   - Check navigation route is registered
   - Check `initialTidbits` parameter
   - Check console for errors

4. **Actions don't work**
   - Check `handleTidbitAction()` is called
   - Check `StudySessionService.recordTidbitFeedback()`
   - Check console for errors

5. **Progress doesn't update**
   - Check `updatePlanProgress()` is called
   - Check `loadStudyPlan()` refreshes on Home screen focus
   - Check AsyncStorage is working

---

## Manual Testing Commands

### Clear Study Plan (for testing)
```javascript
// In React Native Debugger or console
const { StudyPlanService } = require('./src/services/StudyPlanService');
await StudyPlanService.clearPlan();
```

### Check Current Plan
```javascript
const { StudyPlanService } = require('./src/services/StudyPlanService');
const plan = await StudyPlanService.getDailyPlan();
console.log(plan);
```

### Check Session State
```javascript
const { StudySessionService } = require('./src/services/StudySessionService');
const session = await StudySessionService.getCurrentSession();
console.log(session);
```

---

## Expected Behavior

### First Time User (No Due Tidbits)
- Plan will be mostly/all new tidbits
- Example: "Do 0 due + 10 new (10 min)"

### User with Some Due Tidbits
- Plan will mix due and new
- Example: "Do 6 due + 4 new (10 min)"

### User with Many Due Tidbits
- Plan will prioritize due tidbits (60%)
- Example: "Do 6 due + 4 new (10 min)" (max 10 total)

### After Completing Plan
- Card shows: "✅ Completed (10/10)"
- Card is disabled (can't start again)
- Plan resets next day

---

## Testing on Different Scenarios

### Scenario 1: Brand New User
1. Fresh install
2. Complete onboarding
3. Select categories
4. Go to Home
5. Should see plan with all new tidbits

### Scenario 2: User with Some Learning History
1. User has seen some tidbits
2. Some are due for review
3. Plan should mix due + new

### Scenario 3: User Completes Plan
1. Start session
2. Complete all tidbits
3. Return to Home
4. Plan should show completed

### Scenario 4: User Partially Completes
1. Start session
2. Complete 3/10 tidbits
3. Exit session (close app or navigate away)
4. Return to Home
5. Plan should show "3/10 done"
6. Can resume by starting session again (will continue from where left off)

---

## Success Criteria

✅ Study Plan card appears on Home screen  
✅ Plan generates with tidbits  
✅ Can start study session  
✅ Can review tidbits (flip cards, mark actions)  
✅ Progress updates correctly  
✅ Session completes and shows summary  
✅ Plan marks as completed  
✅ Progress persists across app restarts  

---

## Next Steps After Testing

If everything works:
- ✅ Feature is ready!
- Consider adding more polish (animations, better UI)
- Consider adding settings (customize plan size, ratio)

If issues found:
- Check console logs
- Debug specific functions
- Fix errors
- Re-test

---

**Happy Testing! 🚀**

