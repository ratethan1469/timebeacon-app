# Gmail Integration Setup Guide

This guide will help you set up real Gmail integration with OAuth authentication.

## Prerequisites

1. Google Cloud Console access
2. Node.js installed
3. TimeBeacon app running

## Step 1: Google Cloud Console Setup

### 1.1 Create a New Project (or use existing)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

### 1.2 Enable Gmail API
1. Go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click "Enable"

### 1.3 Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure OAuth consent screen first:
   - User Type: External (for testing) or Internal (for organization)
   - App name: "TimeBeacon"
   - User support email: your email
   - Developer contact: your email
   - Scopes: Add Gmail readonly scopes
4. Create OAuth client ID:
   - Application type: "Web application"
   - Name: "TimeBeacon Gmail Integration"
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback` (development)
     - `https://your-domain.com/auth/google/callback` (production)

### 1.4 Get Credentials
1. Copy the Client ID and Client Secret
2. Download the JSON file (optional, for backup)

## Step 2: Backend API Setup

### 2.1 Install Dependencies
```bash
cd server
npm install
```

### 2.2 Configure Environment
1. Copy `.env.example` to `.env`
2. Fill in your credentials:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
NODE_ENV=development
PORT=3001
```

### 2.3 Start Backend Server
```bash
npm run dev
```

The server should start on http://localhost:3001

## Step 3: Frontend Configuration

### 3.1 Update Environment Variables
Create/update `.env` in the main project root:
```env
REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
REACT_APP_API_URL=http://localhost:3001
```

### 3.2 Restart Frontend
```bash
npm start
```

## Step 4: Testing

1. Go to app.timebeacon.io/integrations
2. Click "Connect Gmail Account"
3. You should see a popup with Google OAuth
4. Sign in and grant permissions
5. The integration should show as connected

## Step 5: Production Deployment

### 5.1 Deploy Backend API
- Deploy the `server/` directory to your hosting platform
- Set environment variables in production
- Update redirect URI to production domain

### 5.2 Update Frontend Environment
```env
REACT_APP_API_URL=https://your-api-domain.com
```

### 5.3 Update Google Console
- Add production redirect URI
- Update OAuth consent screen for production

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch"**
   - Check that redirect URI in Google Console matches exactly
   - Include http:// or https://
   - No trailing slashes

2. **"Client ID not found"**
   - Verify GOOGLE_CLIENT_ID is correct
   - Check environment variables are loaded

3. **CORS errors**
   - Backend API includes CORS headers
   - Check API_URL is accessible from frontend

4. **Token refresh fails**
   - Check GOOGLE_CLIENT_SECRET is correct
   - Verify refresh_token is stored properly

### Testing Commands:

```bash
# Test backend health
curl http://localhost:3001/health

# Test OAuth URL generation
curl http://localhost:3001/auth/google/url

# Check frontend environment
console.log(process.env.REACT_APP_GOOGLE_CLIENT_ID)
```

## Security Notes

- Never expose Client Secret in frontend
- Use HTTPS in production
- Implement proper token storage (database) for production
- Consider token encryption
- Implement rate limiting
- Add proper error logging

## Next Steps

Once Gmail integration is working:
1. Add Google Docs integration
2. Add Google Sheets integration
3. Add Google Slides integration
4. Implement AI analysis for better categorization
5. Add webhook subscriptions for real-time updates