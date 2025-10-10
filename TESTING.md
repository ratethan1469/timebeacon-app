# Testing Guide - AI Time Entry Generation

Complete testing checklist before deploying to production.

## Prerequisites

### 1. Add Required Environment Variables

Add to your `.env` file:

```bash
# Anthropic AI API Key (required)
ANTHROPIC_API_KEY=sk-ant-api03-xxx  # Get from https://console.anthropic.com/

# Supabase (already configured)
SUPABASE_URL=https://pfdhudkhqghiwowfihzv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Get from Supabase dashboard

# Backend port
BACKEND_PORT=3001
```

### 2. Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

## Testing Steps

### Step 1: Run Database Migrations ✅

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard
2. Select your project: `pfdhudkhqghiwowfihzv`
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy contents of `supabase/migrations/001_initial_schema.sql`
6. Click "Run"
7. Repeat for `supabase/migrations/002_ai_preferences.sql`

**Option B: Using Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push
```

**Verify Migrations:**
```sql
-- Run this query in Supabase SQL editor to verify tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'users', 'activities', 'time_entries', 'ai_preferences');
```

Expected output: All 5 tables should be listed.

---

### Step 2: Start Backend Server 🚀

```bash
# Terminal 1: Start backend
node server-unified.js
```

**Expected output:**
```
✓ Server running on port 3001
✓ Environment: development
```

**Verify routes are registered:**
```bash
# Should see these routes in startup logs:
- POST   /api/time-entries/process
- GET    /api/time-entries/pending
- GET    /api/time-entries/approved
- PATCH  /api/time-entries/:id
- DELETE /api/time-entries/:id
- GET    /api/ai-preferences
- PATCH  /api/ai-preferences
```

---

### Step 3: Start Frontend 🎨

```bash
# Terminal 2: Start frontend
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

---

### Step 4: Test API Endpoints Directly 🔧

**Test 1: Check AI Preferences (should auto-create defaults)**
```bash
curl -X GET http://localhost:3001/api/ai-preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: 200 OK with preferences object

**Test 2: Test Process Activities (dry run)**
```bash
curl -X POST http://localhost:3001/api/time-entries/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Expected: 200 OK with message "No unprocessed activities found" (if no activities exist)

---

### Step 5: Test Full Workflow in Browser 🌐

1. **Open Dashboard**
   - Navigate to: `http://localhost:5173/dashboard`
   - Login if needed

2. **Verify AI Section Loads**
   - Open browser DevTools Console (F12)
   - Look for console logs:
     ```
     Should show generate button - showAISection: true
     ```

3. **Sync Some Calendar/Gmail Data**
   - Go to Integrations page
   - Connect Google Calendar
   - Connect Gmail
   - Sync recent data (last 7 days)

4. **Check Activities Stored**
   - Open Supabase dashboard
   - Go to "Table Editor" → "activities"
   - Verify rows were inserted with `processed = false`

5. **Generate AI Time Entries**
   - Return to Dashboard
   - Click "Generate New Time Entries from Activities" button
   - Watch DevTools Console for:
     ```
     Processing X activities for AI analysis
     ```

6. **Review Generated Entries**
   - AI section should appear with pending entries
   - Each entry should show:
     - ✅ Description
     - ✅ Date, time, duration
     - ✅ AI confidence meter (color-coded bar)
     - ✅ Customer name (if detected)
     - ✅ Category badge

7. **Test Entry Actions**
   - **Edit**: Click edit button → modify description
   - **Approve**: Click approve → entry disappears from AI section
   - **Delete**: Click delete → entry removed
   - **Bulk Approve**: Click "Approve All" → all entries approved

8. **Verify in Database**
   - Check Supabase "time_entries" table
   - Approved entries should have `status = 'approved'`
   - Deleted entries should be removed

---

### Step 6: Test Edge Cases 🧪

**Test with No Activities:**
- Click "Generate" button with no synced data
- Should show: "No unprocessed activities found"

**Test with Only Personal Emails:**
- Sync Gmail with only promotional/personal emails
- Click "Generate"
- Should create 0 or very few entries (high filtering)

**Test with Work Meeting:**
- Create a calendar event with client name
- Sync calendar
- Click "Generate"
- Should create high-confidence entry (85%+)

**Test AI Preferences:**
- Open browser console
- Run:
  ```javascript
  // Test getting preferences
  fetch('/api/ai-preferences', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('timebeacon_token') }
  }).then(r => r.json()).then(console.log)

  // Test updating threshold
  fetch('/api/ai-preferences', {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('timebeacon_token'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ confidence_threshold: 90 })
  }).then(r => r.json()).then(console.log)
  ```

---

### Step 7: Performance Testing ⚡

**Test with Large Dataset:**
1. Sync 30+ calendar events
2. Sync 50+ emails
3. Click "Generate New Entries"
4. Verify:
   - ✅ Completes within 10-15 seconds
   - ✅ No browser freeze
   - ✅ Proper loading state shown
   - ✅ No duplicate entries created

---

## Common Issues & Solutions 🔧

### Issue: "Failed to process activities"
**Solution:** Check ANTHROPIC_API_KEY is set correctly in .env

### Issue: "Authentication failed"
**Solution:** Ensure SUPABASE_SERVICE_ROLE_KEY is set (not just anon key)

### Issue: No activities stored after sync
**Solution:** Check server logs - ensure storeGmailActivities/storeCalendarActivities are being called

### Issue: All emails creating time entries (including spam)
**Solution:** AI should filter these - check aiService.js prompt is updated with filtering rules

### Issue: Database error "relation does not exist"
**Solution:** Run migrations in Supabase dashboard SQL editor

---

## Final Checklist Before Production ✅

- [ ] Database migrations run successfully
- [ ] ANTHROPIC_API_KEY environment variable set
- [ ] Backend starts without errors
- [ ] All API endpoints return 200 OK
- [ ] AI section appears in Dashboard
- [ ] Generate button is visible
- [ ] Can sync Calendar/Gmail data
- [ ] Activities stored in database
- [ ] AI generates time entries
- [ ] Confidence scores are reasonable (60-95%)
- [ ] Can approve/edit/delete entries
- [ ] Only work-related activities create entries
- [ ] Personal/promotional emails filtered out
- [ ] No console errors in browser
- [ ] No server errors in terminal

---

## Ready to Deploy! 🚀

Once all tests pass:

```bash
# Commit changes
git add .
git commit -m "Add AI-powered time entry generation with filtering"

# Push to production
git push origin main
```

Your hosting platform (Vercel/Heroku/etc) will auto-deploy.

**Don't forget to set environment variables in production:**
- ANTHROPIC_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
