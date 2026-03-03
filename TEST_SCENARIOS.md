# Kịch Bản Test E2E Cho We-Grow App

Danh sách các kịch bản test chi tiết để agent-browser thực hiện E2E testing trên We-Grow application.

---

## Prerequisites

- App đang chạy: `pnpm run dev:web` (port 3001)
- MongoDB đang chạy
- Có tài khoản test hoặc flow sign up

---

## Kịch Bản 1: User Registration & Onboarding Flow

### Scenario 1.1: Sign Up with Email/Password

**Steps:**
1. Navigate to `http://localhost:3001`
2. Click "Sign Up" button
3. Fill email: `test@example.com`
4. Fill password: `Test123456!`
5. Fill confirm password: `Test123456!`
6. Click "Sign Up" button
7. Verify redirect to onboarding page

**Expected Results:**
- Redirect to `/onboarding`
- Display welcome message
- Show form để nhập user profile

**Screenshot:** `01-sign-up-success.png`

---

### Scenario 1.2: Complete Onboarding

**Steps:**
1. Navigate to `http://localhost:3001/onboarding` (hoặc sau sign up)
2. Fill display name: `Test User`
3. Select avatar (nếu có)
4. Set primary goal: `Build better habits`
5. Click "Complete Setup" button
6. Wait for redirect

**Expected Results:**
- Redirect to `/dashboard`
- Display "Welcome, Test User!"
- Show XP: 0, Level: 1
- Show empty habits list

**Screenshot:** `02-onboarding-complete.png`

---

## Kịch Bản 2: Habit Management

### Scenario 2.1: Create Daily Habit

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Click "Create Habit" button (hoặc "+ New Habit")
3. Fill habit name: `Morning Exercise`
4. Select frequency: `Daily`
5. Fill target: `30 minutes`
6. Click "Save" button
7. Wait for success toast

**Expected Results:**
- Success toast: "Habit created successfully"
- Habit appears in list with name "Morning Exercise"
- Display streak: 0 days
- Display frequency badge: "Daily"

**Screenshot:** `03-daily-habit-created.png`

---

### Scenario 2.2: Create Weekly Habit

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Click "Create Habit" button
3. Fill habit name: `Read Books`
4. Select frequency: `Weekly`
5. Select target days: Monday, Wednesday, Friday
6. Fill target: `1 hour`
7. Click "Save" button

**Expected Results:**
- Success toast appears
- Habit appears with "Weekly" badge
- Show selected days: Mon, Wed, Fri

**Screenshot:** `04-weekly-habit-created.png`

---

### Scenario 2.3: Create Specific Days Habit

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Click "Create Habit" button
3. Fill habit name: `Weekend Run`
4. Select frequency: `Specific Days`
5. Select days: Saturday, Sunday
6. Click "Save" button

**Expected Results:**
- Habit created successfully
- Show "Specific Days" badge
- Display: Sat, Sun

**Screenshot:** `05-specific-days-habit.png`

---

### Scenario 2.4: Complete a Habit

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Find habit "Morning Exercise"
3. Click completion checkbox/button
4. Wait for API response

**Expected Results:**
- Checkbox becomes checked
- Streak updates to 1 day
- XP toast appears: "+10 XP"
- Total XP increases by 10

**Screenshot:** `06-habit-completed.png`

---

### Scenario 2.5: Uncomplete a Habit

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Find completed habit
3. Click checkbox again to uncomplete
4. Wait for API response

**Expected Results:**
- Checkbox becomes unchecked
- Streak returns to 0
- XP deducted toast appears
- Total XP decreases

**Screenshot:** `07-habit-uncompleted.png`

---

### Scenario 2.6: Edit a Habit

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Click on habit "Morning Exercise"
3. Click "Edit" button
4. Change name to: `Morning Workout`
5. Change target to: `45 minutes`
6. Click "Save" button

**Expected Results:**
- Success toast appears
- Habit name updated to "Morning Workout"
- Target updated to "45 minutes"

**Screenshot:** `08-habit-edited.png`

---

### Scenario 2.7: Archive a Habit

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Click on habit to edit
3. Click "Archive" button
4. Confirm archive action

**Expected Results:**
- Habit removed from active list
- Success toast: "Habit archived"
- Habit available in archived section

**Screenshot:** `09-habit-archived.png`

---

### Scenario 2.8: Delete a Habit

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Go to archived section
3. Click on archived habit
4. Click "Delete" button
5. Confirm deletion

**Expected Results:**
- Habit permanently deleted
- Success toast: "Habit deleted"
- Habit no longer visible

**Screenshot:** `10-habit-deleted.png`

---

## Kịch Bản 3: Dashboard & Gamification

### Scenario 3.1: View Dashboard Stats

**Steps:**
1. Navigate to `http://localhost:3001/dashboard`
2. Observe dashboard components

**Expected Results:**
- Display current level (e.g., Level 1)
- Display total XP
- Display progress bar to next level
- Display current streak
- Show today's habits
- Show completion rate

**Screenshot:** `11-dashboard-stats.png`

---

### Scenario 3.2: XP Progression

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Complete 3 different habits
3. Return to dashboard

**Expected Results:**
- XP increased (3 × 10 = 30 XP)
- Progress bar updated
- If reaching 100 XP, level up to Level 2
- Level up toast/notification appears

**Screenshot:** `12-xp-progression.png`

---

### Scenario 3.3: View Leaderboard

**Steps:**
1. Navigate to `http://localhost:3001/dashboard`
2. Click "Leaderboard" tab
3. Observe leaderboard rankings

**Expected Results:**
- Display global leaderboard
- Show top users by XP
- Display user's rank
- Show user's position on leaderboard
- Each entry shows: rank, username, level, XP

**Screenshot:** `13-leaderboard.png`

---

### Scenario 3.4: Streak Bonuses

**Prerequisites:** Need to manipulate dates or wait

**Steps:**
1. Complete same habit for 7 consecutive days
2. Observe streak badge

**Expected Results:**
- Streak shows: 7 days
- Special badge/icon appears for 7-day streak
- Bonus XP awarded (e.g., +20 bonus XP)

**Screenshot:** `14-7day-streak.png`

---

## Kịch Bản 4: Todo Management

### Scenario 4.1: Create Todo

**Steps:**
1. Navigate to `http://localhost:3001/todos`
2. Click "Add Todo" button
3. Fill title: `Complete project documentation`
4. Select priority: `Important`
5. Click "Save" button

**Expected Results:**
- Todo appears in list
- Title: "Complete project documentation"
- Priority badge: "Important" (with color)
- Status: incomplete

**Screenshot:** `15-todo-created.png`

---

### Scenario 4.2: Complete Todo with XP

**Steps:**
1. Navigate to `http://localhost:3001/todos`
2. Click checkbox on todo
3. Wait for API response

**Expected Results:**
- Todo marked as complete (strikethrough)
- XP toast: "+5 XP"
- Todo moves to completed section
- Total XP increases

**Screenshot:** `16-todo-completed.png`

---

### Scenario 4.3: Filter Todos by Priority

**Steps:**
1. Navigate to `http://localhost:3001/todos`
2. Click filter: "Urgent"
3. Observe filtered list

**Expected Results:**
- Only show urgent todos
- Filter indicator visible
- Other todos hidden

**Screenshot:** `17-todos-filtered.png`

---

## Kịch Bản 5: Group Features

### Scenario 5.1: Create a Group

**Steps:**
1. Navigate to `http://localhost:3001/groups`
2. Click "Create Group" button
3. Fill group name: `Fitness Enthusiasts`
4. Fill description: `A group for fitness lovers`
5. Click "Create" button

**Expected Results:**
- Group created successfully
- Redirect to group page
- Show group name: "Fitness Enthusiasts"
- Show user as "Owner"
- Display group code/invite link

**Screenshot:** `18-group-created.png`

---

### Scenario 5.2: Add Habit to Group

**Steps:**
1. Navigate to group page
2. Click "Add Habit" button
3. Select existing habit: `Morning Exercise`
4. Click "Add" button

**Expected Results:**
- Habit added to group
- Visible in group habits list
- All members can see this habit

**Screenshot:** `19-group-habit-added.png`

---

### Scenario 5.3: View Group Leaderboard

**Steps:**
1. Navigate to group page
2. Click "Leaderboard" tab
3. Observe group rankings

**Expected Results:**
- Show group members ranked by XP
- Display member's level
- Show XP earned within group
- Highlight user's position

**Screenshot:** `20-group-leaderboard.png`

---

### Scenario 5.4: Invite Member to Group

**Steps:**
1. Navigate to group page
2. Click "Invite Members" button
3. Copy invite code/link
4. (Optional) Open new browser and test joining

**Expected Results:**
- Invite code displayed
- Invite link copied to clipboard
- Code can be shared

**Screenshot:** `21-group-invite.png`

---

## Kịch Bản 6: Authentication & Security

### Scenario 6.1: Sign In with Email/Password

**Steps:**
1. Navigate to `http://localhost:3001`
2. Click "Sign In" button
3. Fill email: `test@example.com`
4. Fill password: `Test123456!`
5. Click "Sign In" button

**Expected Results:**
- Successful authentication
- Redirect to dashboard
- User menu shows email/username
- Session established

**Screenshot:** `22-sign-in-success.png`

---

### Scenario 6.2: Sign In with Google OAuth

**Prerequisites:** Google OAuth configured

**Steps:**
1. Navigate to `http://localhost:3001`
2. Click "Sign In with Google" button
3. Complete Google OAuth flow
4. Grant permissions

**Expected Results:**
- Redirect to Google sign-in page
- After auth, redirect back to app
- User signed in with Google account
- Profile info synced

**Screenshot:** `23-google-sign-in.png`

---

### Scenario 6.3: Sign Out

**Steps:**
1. Navigate to any authenticated page
2. Click user menu
3. Click "Sign Out" button
4. Confirm sign out

**Expected Results:**
- Session cleared
- Redirect to home/login page
- User menu no longer visible
- Protected routes inaccessible

**Screenshot:** `24-sign-out.png`

---

### Scenario 6.4: Protected Route Redirect

**Steps:**
1. Sign out (if signed in)
2. Navigate directly to `http://localhost:3001/dashboard`

**Expected Results:**
- Redirect to login page
- Flash message: "Please sign in to continue"
- After sign in, redirect to intended page

**Screenshot:** `25-protected-redirect.png`

---

## Kịch Bản 7: User Settings

### Scenario 7.1: Update Profile

**Steps:**
1. Navigate to `http://localhost:3001/settings`
2. Change display name to: `Updated Name`
3. Change bio/description
4. Click "Save" button

**Expected Results:**
- Success toast: "Profile updated"
- Display name updated across app
- Changes visible in user menu

**Screenshot:** `26-profile-updated.png`

---

### Scenario 7.2: Change Preferences

**Steps:**
1. Navigate to `http://localhost:3001/settings`
2. Toggle dark mode (if available)
3. Change notification preferences
4. Click "Save" button

**Expected Results:**
- Theme changes immediately
- Preferences saved
- Persist across sessions

**Screenshot:** `27-preferences-updated.png`

---

## Kịch Bản 8: Edge Cases & Error Handling

### Scenario 8.1: Duplicate Habit Name

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Create habit with name: `Test Habit`
3. Create another habit with same name: `Test Habit`

**Expected Results:**
- Error toast: "Habit with this name already exists"
- Habit not created
- Validation message visible

**Screenshot:** `28-duplicate-habit-error.png`

---

### Scenario 8.2: Invalid Form Input

**Steps:**
1. Navigate to `http://localhost:3001/habits`
2. Click "Create Habit"
3. Leave name empty
4. Click "Save" button

**Expected Results:**
- Validation error: "Name is required"
- Form not submitted
- Error highlighting on field

**Screenshot:** `29-validation-error.png`

---

### Scenario 8.3: Network Error Handling

**Prerequisites:** Stop API server

**Steps:**
1. Stop API server
2. Navigate to `http://localhost:3001/habits`
3. Try to complete a habit

**Expected Results:**
- Error toast: "Network error. Please try again."
- Spinner stops
- UI returns to previous state
- No data corruption

**Screenshot:** `30-network-error.png`

---

### Scenario 8.4: Session Expiry

**Prerequisites:** Manual session invalidation

**Steps:**
1. Sign in
2. Manually expire session (clear cookies/localStorage)
3. Try to access protected route

**Expected Results:**
- Redirect to login
- Message: "Session expired. Please sign in again."
- Graceful handling, no errors

**Screenshot:** `31-session-expiry.png`

---

## Kịch Bản 9: Responsive Design

### Scenario 9.1: Mobile View (375px)

**Steps:**
1. Set viewport to 375x667 (iPhone SE)
2. Navigate to `http://localhost:3001/dashboard`
3. Test all interactions

**Expected Results:**
- Layout adapts to mobile
- Navigation converts to hamburger menu
- Touch targets ≥44px
- No horizontal scroll
- All features accessible

**Screenshot:** `32-mobile-dashboard.png`

---

### Scenario 9.2: Tablet View (768px)

**Steps:**
1. Set viewport to 768x1024 (iPad)
2. Navigate to `http://localhost:3001/habits`
3. Test habit creation

**Expected Results:**
- 2-column layout if appropriate
- Touch-friendly UI
- No horizontal scroll
- Readable text sizes

**Screenshot:** `33-tablet-habits.png`

---

## Kịch Bản 10: Performance

### Scenario 10.1: Initial Page Load

**Steps:**
1. Open browser DevTools Performance tab
2. Navigate to `http://localhost:3001`
3. Record page load

**Expected Results:**
- Time to Interactive < 3 seconds
- First Contentful Paint < 1.5 seconds
- No layout shifts
- Smooth animations

**Screenshot:** `34-performance-metrics.png`

---

### Scenario 10.2: Large List Performance

**Prerequisites:** Create 50+ habits

**Steps:**
1. Create 50 habits via API
2. Navigate to `http://localhost:3001/habits`
3. Scroll through list
4. Test filtering

**Expected Results:**
- Smooth scrolling (60fps)
- No lag on scroll
- Filters work quickly
- Virtualization if needed

**Screenshot:** `35-large-list-scroll.png`

---

## Test Execution Summary Template

```
Test Run Date: ____________
Tester: ____________
Browser: ____________

Results:
✅ Passed: ___/___
❌ Failed: ___/___
⚠️ Skipped: ___/___

Failed Tests:
1. [Scenario Name] - [Reason]
2. [Scenario Name] - [Reason]

Issues Found:
1. [Description]
2. [Description]

Screenshots Folder: ./screenshots/[date]/
```

---

## Notes for Agent-Browser

- **Wait Times**: Add appropriate waits after each action (1-3 seconds)
- **Screenshots**: Capture screenshot after each major action
- **Error Handling**: Log any errors or unexpected behaviors
- **Cleanup**: Consider cleanup between test runs
- **Test Data**: Use consistent test data for reproducibility
- **Parallel**: Some scenarios can run in parallel (e.g., different users)
- **Report**: Generate HTML report with all screenshots and results

---

## Priority Execution Order

**Critical (Must Pass):**
1. Scenario 1.1, 1.2 - Registration & Onboarding
2. Scenario 2.1, 2.4 - Create & Complete Habit
3. Scenario 6.1, 6.3 - Sign In/Out
4. Scenario 3.1 - Dashboard Display

**High Priority:**
5. Scenario 2.6, 2.7 - Edit & Archive Habits
6. Scenario 3.2 - XP Progression
7. Scenario 4.1, 4.2 - Todo Management
8. Scenario 5.1, 5.2 - Group Creation

**Medium Priority:**
9. Scenario 3.3 - Leaderboard
10. Scenario 7.1 - User Settings
11. Scenario 8.1, 8.2 - Validation Errors
12. Scenario 9.1 - Mobile Responsive

**Low Priority:**
13. Scenario 6.2 - Google OAuth
14. Scenario 10.1, 10.2 - Performance Tests
15. Scenario 8.3, 8.4 - Edge Cases

---

Total Scenarios: **35+ test scenarios**
Estimated Execution Time: **45-60 minutes** (with screenshots)
Recommended Browsers: **Chrome, Firefox, Safari**
