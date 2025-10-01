# Google Calendar Setup - Step by Step

## CRITICAL: Do this FIRST before anything else works

### 1. Go to Google Cloud Console
https://console.cloud.google.com/

### 2. Create/Select Project
- If no project exists, create one called "TimeBeacon"
- Select the project

### 3. Enable Google Calendar API
- Go to "APIs & Services" → "Library"
- Search "Google Calendar API"  
- Click it and press "ENABLE"

### 4. Create OAuth Credentials
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth 2.0 Client ID"
- Choose "Web application"
- Name: "TimeBeacon Local"
- Under "Authorized redirect URIs" add EXACTLY:
  - `http://localhost:3000`
- Click "Create"

### 5. Copy the Client ID
- You'll see a popup with Client ID and Client Secret
- Copy the Client ID (starts with numbers, ends with .apps.googleusercontent.com)

### 6. Update .env file
Replace the VITE_GOOGLE_CLIENT_ID in your .env file with the new one

THAT'S IT. Then the calendar will work.

Current Client ID: 696202687856-c82e7prqdt00og14k6lp47hiutn7p9an.apps.googleusercontent.com
Make sure this is configured in Google Cloud Console with redirect URI: http://localhost:3000