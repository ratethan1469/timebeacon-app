# Google OAuth Verification Responses for TimeBeacon

## App Overview
TimeBeacon is a time tracking application that automatically analyzes user data from Google services (Gmail, Calendar, Drive, Docs) to create intelligent, contextualized time entries. It uses AI to process user data and generate meaningful time tracking summaries.

## Scope Justifications

### Gmail Scopes

#### `.../auth/gmail.readonly` - View your email messages and settings
**How will the scopes be used?**
TimeBeacon analyzes email content to automatically detect work-related activities and create time entries. The app reads email subjects, content, and metadata to identify:
- Meeting requests and responses
- Project-related communications 
- Client correspondence
- Task assignments via email

**Why more limited scopes aren't sufficient:**
The `gmail.metadata` scope only provides headers/labels but not email content. TimeBeacon needs full email content to perform AI analysis for accurate time categorization and project identification.

#### `.../auth/gmail.metadata` - View your email message metadata
**How will the scopes be used?**
Used to access email headers, labels, and timestamps for initial filtering before content analysis. Helps optimize API calls by pre-filtering relevant emails based on sender, subject patterns, and labels.

### Calendar Scopes

#### `.../auth/calendar.readonly` - See and download any calendar you can access
**How will the scopes be used?**
TimeBeacon analyzes calendar events to automatically create time entries for:
- Scheduled meetings and their duration
- Blocked time for focused work
- Project deadlines and milestones
- Travel time and location-based activities

**Why more limited scopes aren't sufficient:**
Calendar data is essential for accurate time tracking. Users need comprehensive calendar access to track time across all their work-related events, not just specific calendars.

### Drive Scopes

#### `.../auth/drive.readonly` - See and download all your Google Drive files
**How will the scopes be used?**
TimeBeacon analyzes Drive file activity to track:
- Document creation and editing time
- File sharing and collaboration activities
- Project file organization patterns
- Time spent on specific documents/projects

#### `.../auth/drive.meet.readonly` - See Google Drive files created/edited by Google Meet
**How will the scopes be used?**
Tracks time spent in Google Meet recordings, transcripts, and related documents to provide comprehensive meeting time tracking.

### Docs Scopes

#### `.../auth/documents.readonly` - See all your Google Docs documents
**How will the scopes be used?**
Analyzes Google Docs to track:
- Writing and editing time on documents
- Document collaboration activities
- Project documentation work
- Content creation time tracking

### Script Scopes

#### `.../auth/script.projects.readonly` - View Google Apps Script projects
**How will the scopes be used?**
For users who develop Google Apps Scripts, TimeBeacon tracks:
- Coding and development time
- Script deployment activities
- Automation project work

### Gmail Add-ons Scopes

#### `.../auth/gmail.addons.current.message.metadata` - View email metadata when add-on is running
**How will the scopes be used?**
Provides real-time email context when users are actively working in Gmail, enabling immediate time tracking suggestions based on current email context.

## Privacy and Security Commitments

1. **Data Minimization**: Only processes data necessary for time tracking analysis
2. **Local Processing**: AI analysis occurs locally when possible to minimize data transmission
3. **Temporary Storage**: User data is processed and summarized, with raw data deleted after analysis
4. **User Control**: Users can configure which data sources to include and exclude specific content
5. **Transparency**: Clear dashboard showing what data was accessed and how it was categorized

## Technical Implementation

- OAuth 2.0 with PKCE for secure authentication
- Encrypted data transmission (HTTPS)
- Local AI processing using Ollama/local LLMs when possible
- Minimal data retention policy
- User-configurable privacy settings