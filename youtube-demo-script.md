# TimeBeacon OAuth Demo Video Script (Under 2 Minutes)

## Video Title: "TimeBeacon Google OAuth Integration Demo"

---

## INTRO & OAUTH CLIENT (0:00 - 0:20)
**[Screen: Google Cloud Console - Credentials page]**

"This is TimeBeacon's OAuth configuration. Client ID: 696202687856-c82e7prqdt00og14k6lp47hiutn7p9an.apps.googleusercontent.com, Web application, redirect URI localhost:3003/auth/google/callback."

**[Screen: TimeBeacon app]**
"TimeBeacon automatically tracks time by analyzing Google data with AI."

---

## OAUTH FLOW (0:20 - 0:50)
**[Click "Connect with Google"]**
"When users connect, they see Google's consent screen requesting these permissions:"

**[Screen: Google OAuth consent screen - show quickly]**
- Gmail readonly - for email analysis
- Calendar readonly - for meeting tracking  
- Drive readonly - for document activity
- Docs readonly - for editing time
- Gmail addons - for real-time suggestions

**[Click Allow/Continue]**
"Users grant permission and return to TimeBeacon."

---

## SCOPE USAGE DEMO (0:50 - 1:40)
**[Screen: TimeBeacon dashboard showing sync results]**

"Here's how each scope works:

**Gmail**: Analyzes emails to identify meetings and project work - created time entries for client communications and meeting requests.

**Calendar**: Imports scheduled events as time blocks - standup meetings, client calls, focus time.

**Drive/Docs**: Tracks document editing sessions - 2 hours on marketing strategy doc, collaboration on spreadsheets.

**Real-time**: Suggests time tracking when opening project emails."

**[Show final dashboard with AI-generated time entries]**
"AI correlates all data sources to create intelligent time entries with project context."

---

## CONCLUSION (1:40 - 2:00)
**[Screen: Privacy settings]**
"Data is processed locally when possible, raw content discarded after analysis, only summaries stored. Users control all data access."

**[Show OAuth client ID again]**
"Demo completed with OAuth Client: 696202687856-c82e7prqdt00og14k6lp47hiutn7p9an.apps.googleusercontent.com"

---

## TECHNICAL NOTES FOR RECORDING:

### Before Recording:
1. **Prepare test data**: Have sample emails, calendar events, and documents ready
2. **Clear browser cache**: Start with clean OAuth state
3. **Test OAuth flow**: Ensure it works end-to-end
4. **Prepare multiple browser tabs**: Google Console, TimeBeacon app, Gmail, Calendar

### During Recording:
1. **Zoom in**: Make sure OAuth client ID and app details are clearly visible
2. **Slow pace**: Read permissions slowly and clearly
3. **Highlight cursor**: Make mouse clicks obvious
4. **Clear audio**: Narrate what you're clicking and why

### Screen Resolution:
- Use 1920x1080 minimum
- Zoom browser to 125% for better visibility
- Use large cursor/highlighting

### Video Length:
- Target 8-10 minutes total
- Don't rush the OAuth consent screen - this is the most important part
- Show real data processing, not just mock screens