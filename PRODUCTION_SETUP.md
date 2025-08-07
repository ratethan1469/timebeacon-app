# 🚀 TimeBeacon Production Google Integration Setup

This guide will get you production-ready Google integration for multiple users by next week.

## 📋 Quick Setup Checklist

- [ ] 1. Google Cloud Console Setup (15 minutes)
- [ ] 2. Deploy Backend API (10 minutes)  
- [ ] 3. Configure Environment Variables (5 minutes)
- [ ] 4. Test Integration (5 minutes)
- [ ] 5. Enable for Users (Complete!)

---

## 🔐 Step 1: Google Cloud Console Setup

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: **"TimeBeacon Integration"**
3. Note your Project ID Number: 696202687856  ID: timebeacon-integrations

### 1.2 Enable Required APIs
Enable these APIs (click Enable for each):
- **Gmail API**: https://console.cloud.google.com/apis/library/gmail.googleapis.com
- **Google Calendar API**: https://console.cloud.google.com/apis/library/calendar.googleapis.com  
- **Google Drive API**: https://console.cloud.google.com/apis/library/drive.googleapis.com
- **Google Docs API**: https://console.cloud.google.com/apis/library/docs.googleapis.com
- **Google Sheets API**: https://console.cloud.google.com/apis/library/sheets.googleapis.com
- **Google Slides API**: https://console.cloud.google.com/apis/library/slides.googleapis.com
- **Google Apps Script API**: https://console.cloud.google.com/apis/library/script.googleapis.com

### 1.3 Configure OAuth Consent Screen
1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Choose **"External"** (for public users)
3. Fill out application details:
   ```
   App name: TimeBeacon
   User support email: [your email]
   Developer contact: [your email] 
   App domain: https://app.timebeacon.io
   Privacy Policy: https://timebeacon.io/privacy
   Terms of Service: https://timebeacon.io/tos
   ```
4. **Scopes**: Add these scopes:
   - `../auth/gmail.readonly`
   - `../auth/gmail.metadata` 
   - `../auth/calendar.readonly`
   - `../auth/drive.readonly`
   - `../auth/documents.readonly`
   - `../auth/spreadsheets.readonly`
   - `../auth/presentations.readonly`
   - `../auth/script.projects.readonly`

5. **Test Users**: Add your email for testing
6. **Submit for verification** (required for production):
   - Click **"Publish App"** in OAuth consent screen
   - **Fill out scope justifications** (copy these exactly):
     
     **Gmail scopes justification:**
     ```
     Timebeacon is a time tracking application that automatically tracks time spent on email tasks. We access Gmail metadata (subjects, timestamps, sender info) to identify when users are working on email-related activities and automatically create time entries. We never access email body content, only headers and metadata for time tracking purposes.
     ```
     
     **Drive scopes justification:**
     ```
     Timebeacon tracks time spent working on Google Drive documents, spreadsheets, and presentations. We access file metadata (names, modification times, access patterns) to automatically detect when users are actively working on documents and create accurate time entries. We do not access file content, only metadata for productivity tracking.
     ```
     
     **Calendar scopes justification:**
     ```
     Timebeacon integrates with Google Calendar to automatically track time spent in meetings and scheduled work blocks. We access calendar event metadata (titles, times, attendees) to create time entries and provide accurate productivity insights. This helps users understand how their scheduled time aligns with actual work patterns.
     ```
     
     **Apps Script scopes justification:**
     ```
     Timebeacon tracks time spent developing and managing Google Apps Script projects. We access project metadata (names, modification times) to automatically create time entries when users are working on automation scripts and workflows.
     ```
   
   - **Demo video requirements:**
     - Show login flow with Google OAuth
     - Demonstrate time tracking based on Gmail activity
     - Show calendar integration creating time entries
     - Highlight that only metadata is accessed, not content
     - Upload to YouTube as unlisted video
   
   - **Additional requirements:**
     - Domain verification for timebeacon.io
     - Privacy policy URL: https://timebeacon.io/privacy
     - Terms of service URL: https://timebeacon.io/tos
     - App screenshots showing the integration features
   
   - Wait 1-7 days for Google review
   - **Note**: Until verified, limited to 100 users in "Testing" mode

### 1.4 Create OAuth Credentials
1. Go to **"Credentials" > "Create Credentials" > "OAuth client ID"**
2. Application type: **"Web application"**
3. Name: **"TimeBeacon Google Integration"**
4. **Authorized redirect URIs**:
   ```
   https://your-api-domain.com/auth/google/callback
   http://localhost:3001/auth/google/callback (for testing)
   ```
5. **Copy Client ID and Client Secret** - you'll need these!
[CLIENT_ID] - Replace with your actual Client ID
[CLIENT_SECRET] - Replace with your actual Client Secret

KEEP THOSE SECURE!!!
---

## 🖥️ Step 2: Deploy Backend API

### 2.1 Deploy to Render/Railway/Heroku

**Option A: Render (Recommended)**
1. Connect your GitHub repo to Render
2. Create new Web Service
3. Build Command: `cd server && npm install`
4. Start Command: `cd server && npm start`
5. Environment: Node.js

**Option B: Railway**
1. Connect GitHub repo to Railway
2. Set Root Directory: `server`
3. Start Command: `npm start`

**Option C: Heroku**
```bash
cd server
heroku create timebeacon-api
git subtree push --prefix server heroku main
```

### 2.2 Set Environment Variables
Add these to your hosting platform:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://your-api-domain.com/auth/google/callback
NODE_ENV=production
PORT=3001
ENCRYPTION_KEY=your_random_32_char_key_here
FRONTEND_URL=https://app.timebeacon.io
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ⚙️ Step 3: Configure Frontend

### 3.1 Update Environment Variables
In your main app deployment (Vercel/Netlify), add:
```env
REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
REACT_APP_API_URL=https://your-api-domain.com
```

### 3.2 Update CORS Origins
Make sure your API backend includes your frontend domain in allowed origins.

---

## 🧪 Step 4: Test Integration

### 4.1 Test Backend Health
```bash
curl https://your-api-domain.com/health
```
Should return: `{"status":"OK","service":"Gmail Auth API"}`

### 4.2 Test Frontend Integration
1. Go to app.timebeacon.io/integrations
2. Click "Connect Gmail Account"
3. Should open Google OAuth popup
4. Grant permissions
5. Should show "Gmail Connected" ✅

---

## 🔒 Security Features Included

### ✅ **Enterprise-Grade Security**
- **Helmet.js**: Security headers protection
- **Rate Limiting**: 100 requests/15min, 5 auth/15min
- **CORS Protection**: Strict origin validation
- **Input Validation**: Token format validation
- **Audit Logging**: All API calls logged
- **Encryption**: Sensitive data encrypted at rest
- **CSRF Protection**: State parameter validation

### ✅ **Privacy Compliance**
- **Read-only access**: No data modification
- **Minimal scopes**: Only necessary permissions
- **No content access**: Only metadata (subjects, headers)
- **User consent**: Explicit permission for each scope
- **Data retention**: Tokens stored securely, can be revoked

### ✅ **Scalability**
- **Multi-user**: Unlimited users, one OAuth app
- **Auto-refresh**: Tokens automatically refreshed
- **Error handling**: Graceful failures with retry logic
- **Monitoring**: Request logging and error tracking

---

## 📊 Step 5: Monitor & Scale

### 5.1 Production Monitoring
- Monitor API response times
- Track authentication success rates
- Watch for error patterns
- Monitor rate limit usage

### 5.2 User Management
Once live, each user can:
1. Click "Connect" on any Google service
2. Sign in with their Google account
3. Grant permissions
4. Start automatic time tracking

### 5.3 Support Users
Common user issues:
- **"Permission denied"**: User needs to grant all scopes
- **"Token expired"**: Will auto-refresh, no action needed
- **"Can't connect"**: Check OAuth consent screen status

---

## 🚨 Emergency Procedures

### If OAuth Stops Working:
1. Check Google Cloud Console quotas
2. Verify OAuth consent screen status
3. Check if Client ID/Secret changed
4. Review audit logs for errors

### If API Goes Down:
1. Check hosting platform status
2. Review error logs
3. Verify environment variables
4. Test backend health endpoint

---

## 🎯 Success Metrics

After setup, you should see:
- ✅ Users can connect all Google services
- ✅ Real-time data sync from Gmail, Calendar, Drive
- ✅ Automatic time entry creation
- ✅ No authentication errors
- ✅ All security headers present
- ✅ Audit logs recording all activity

**Estimated Setup Time: 35 minutes**
**Users can start connecting: Immediately after setup**

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section in GMAIL_SETUP.md
2. Review audit logs for specific errors
3. Test with different Google accounts
4. Verify all environment variables are set

The integration supports unlimited users once properly configured!