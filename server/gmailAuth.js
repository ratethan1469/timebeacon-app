const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gmail OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.metadata'
];

// Generate OAuth URL
app.get('/auth/google/url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  res.json({ authUrl });
});

// Handle OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  // Serve the callback HTML page
  res.sendFile(__dirname + '/public/oauth-callback.html');
});

// Exchange code for tokens (for frontend)
app.post('/auth/google/token', async (req, res) => {
  const { code } = req.body;
  
  try {
    const { tokens } = await oauth2Client.getTokens(code);
    oauth2Client.setCredentials(tokens);
    
    res.json({
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      }
    });
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(400).json({ error: 'Failed to exchange code for tokens' });
  }
});

// Get Gmail messages
app.get('/gmail/messages', async (req, res) => {
  const { access_token } = req.query;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    oauth2Client.setCredentials({ access_token });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Get recent messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'newer_than:7d'
    });
    
    if (!response.data.messages) {
      return res.json({ messages: [] });
    }
    
    // Get full message details
    const messages = await Promise.all(
      response.data.messages.slice(0, 5).map(async (msg) => {
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date', 'To']
        });
        return messageResponse.data;
      })
    );
    
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Refresh access token
app.post('/auth/google/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token required' });
  }
  
  try {
    oauth2Client.setCredentials({ refresh_token });
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    res.json({
      success: true,
      tokens: {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(400).json({ error: 'Failed to refresh token' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Gmail Auth API' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Gmail Auth API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});