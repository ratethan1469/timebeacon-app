require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3003/auth/google/callback'
);

// Generate auth URL
app.get('/auth/google/url', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent',
    state: state
  });
  
  res.json({ success: true, authUrl, state });
});

// Handle callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);
    
    // Store tokens globally for API access
    global.googleTokens = tokens;
    
    res.send(`
      <html>
        <body>
          <h1>✅ Connected!</h1>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                tokens: { access_token: '${tokens.access_token}' },
                userInfo: { connected: true }
              }, 'http://localhost:3000');
            }
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.send(`<h1>Error: ${error.message}</h1>`);
  }
});

// Gmail API endpoint
app.get('/gmail/messages', async (req, res) => {
  try {
    if (!global.googleTokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    oauth2Client.setCredentials(global.googleTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'in:inbox newer_than:1d'
    });
    
    res.json({ messages: response.data.messages || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calendar API endpoint
app.get('/calendar/events', async (req, res) => {
  try {
    if (!global.googleTokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    oauth2Client.setCredentials(global.googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: yesterday.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    res.json({ events: response.data.items || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3003, () => console.log('OAuth server running on http://localhost:3003'));