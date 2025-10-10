const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const { google } = require('googleapis');
require('dotenv').config();

// Import custom routes
const timeEntriesRouter = require('./backend/routes/timeEntries');
const aiPreferencesRouter = require('./backend/routes/aiPreferences');
const { storeGmailActivities, storeCalendarActivities } = require('./backend/services/processingService');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://apis.google.com", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://oauth2.googleapis.com", "https://www.googleapis.com", "https://accounts.google.com", "https://api.zoom.us", "http://localhost:*"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.disable('x-powered-by');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 auth requests per windowMs (generous for development)
  message: 'Too many authentication attempts, please try again later.',
});

app.use(limiter);
app.use('/api/auth', authLimiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://app.timebeacon.io',
  'https://timebeacon.io',
  'https://timebeacon-app.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow any localhost origin
    if (process.env.NODE_ENV !== 'production' && origin && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.error('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));

// =================
// GOOGLE OAUTH SETUP
// =================

const oauth2Client = new google.auth.OAuth2(
  process.env.VITE_GOOGLE_CLIENT_ID,
  process.env.VITE_GOOGLE_CLIENT_SECRET,
  `http://localhost:${PORT}/api/auth/google/callback`
);

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/presentations.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

// =================
// ZOOM OAUTH SETUP
// =================

const ZOOM_ACCOUNT_ID = process.env.VITE_ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.VITE_ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.VITE_ZOOM_CLIENT_SECRET;

// Generate Zoom JWT token for Server-to-Server OAuth
function generateZoomToken() {
  const payload = {
    iss: ZOOM_CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
  };
  
  return jwt.sign(payload, ZOOM_CLIENT_SECRET, { algorithm: 'HS256' });
}

// Get Zoom access token using Server-to-Server OAuth
async function getZoomAccessToken() {
  try {
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'account_credentials',
        account_id: ZOOM_ACCOUNT_ID,
      },
      auth: {
        username: ZOOM_CLIENT_ID,
        password: ZOOM_CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Zoom access token:', error.response?.data || error.message);
    throw error;
  }
}

// =================
// UTILITY FUNCTIONS
// =================

function encryptToken(token) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.VITE_GOOGLE_CLIENT_SECRET || 'fallback-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

function decryptToken(encryptedToken) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.VITE_GOOGLE_CLIENT_SECRET || 'fallback-key', 'salt', 32);
  const iv = Buffer.from(encryptedToken.iv, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(Buffer.from(encryptedToken.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedToken.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// =================
// HEALTH CHECK
// =================

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      google: !!process.env.VITE_GOOGLE_CLIENT_ID,
      zoom: !!process.env.VITE_ZOOM_CLIENT_ID
    }
  });
});

// =================
// GOOGLE OAUTH ENDPOINTS
// =================

app.get('/api/auth/google/url', (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SCOPES,
      state: state,
      prompt: 'consent',
      include_granted_scopes: true
    });

    res.json({ 
      authUrl,
      state,
      success: true 
    });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate authentication URL',
      success: false 
    });
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({ 
      error: `Authentication failed: ${error}`,
      success: false 
    });
  }

  if (!code) {
    return res.status(400).json({ 
      error: 'Authorization code not provided',
      success: false 
    });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    const encryptedTokens = {
      access_token: encryptToken(tokens.access_token),
      refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      expiry_date: tokens.expiry_date
    };

    // Send success message to popup parent and close popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Success</title>
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>✅ Connected Successfully!</h2>
            <p>You can now close this window.</p>
          </div>
          <script>
            // Send success message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                tokens: ${JSON.stringify(encryptedTokens)},
                userInfo: {
                  id: '${userInfo.id}',
                  email: '${userInfo.email}',
                  name: '${userInfo.name}',
                  picture: '${userInfo.picture}'
                }
              }, window.location.origin);
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>❌ Authentication Failed</h2>
            <p>Please try again or contact support.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: 'Failed to complete authentication'
              }, window.location.origin);
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  }
});

// =================
// ZOOM API ENDPOINTS
// =================

app.get('/api/zoom/meetings', async (req, res) => {
  try {
    const accessToken = await getZoomAccessToken();
    
    const response = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        type: 'scheduled',
        page_size: 30,
      },
    });

    res.json({
      success: true,
      meetings: response.data.meetings || [],
      total_records: response.data.total_records || 0
    });
  } catch (error) {
    console.error('Error fetching Zoom meetings:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch meetings',
      success: false 
    });
  }
});

app.get('/api/zoom/user', async (req, res) => {
  try {
    const accessToken = await getZoomAccessToken();
    
    const response = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    res.json({
      success: true,
      user: response.data
    });
  } catch (error) {
    console.error('Error fetching Zoom user:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch user information',
      success: false 
    });
  }
});

app.get('/api/zoom/recordings', async (req, res) => {
  try {
    const accessToken = await getZoomAccessToken();
    const { from, to } = req.query;
    
    const response = await axios.get('https://api.zoom.us/v2/users/me/recordings', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        to: to || new Date().toISOString().split('T')[0], // today
        page_size: 30,
      },
    });

    res.json({
      success: true,
      recordings: response.data.meetings || [],
      total_records: response.data.total_records || 0
    });
  } catch (error) {
    console.error('Error fetching Zoom recordings:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch recordings',
      success: false 
    });
  }
});

app.post('/api/zoom/meetings', async (req, res) => {
  try {
    const accessToken = await getZoomAccessToken();
    const meetingData = req.body;
    
    const response = await axios.post('https://api.zoom.us/v2/users/me/meetings', meetingData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    res.json({
      success: true,
      meeting: response.data
    });
  } catch (error) {
    console.error('Error creating Zoom meeting:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create meeting',
      success: false 
    });
  }
});

// =================
// GOOGLE API ENDPOINTS
// =================

app.post('/api/google/gmail/messages', async (req, res) => {
  try {
    const { tokens, startDate, endDate, maxResults } = req.body;
    
    if (!tokens) {
      return res.status(401).json({ 
        error: 'No authentication tokens provided',
        success: false 
      });
    }

    const parsedTokens = JSON.parse(tokens);
    const decryptedTokens = {
      access_token: decryptToken(parsedTokens.access_token),
      refresh_token: parsedTokens.refresh_token ? decryptToken(parsedTokens.refresh_token) : null,
      expiry_date: parsedTokens.expiry_date
    };

    oauth2Client.setCredentials(decryptedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Build search query for date range
    let query = '';
    if (startDate && endDate) {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      query = `after:${start.replace(/-/g, '/')} before:${end.replace(/-/g, '/')}`;
    }
    
    // Get list of messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults || 50
    });

    const messages = [];
    const messageIds = listResponse.data.messages || [];
    
    // Get details for each message (in batches to avoid rate limits)
    for (const messageRef of messageIds) {
      try {
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageRef.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });

        const message = messageResponse.data;
        const headers = message.payload.headers;
        
        const getHeader = (name) => {
          const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
          return header ? header.value : '';
        };

        // Get snippet for word count estimation
        const snippetResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageRef.id,
          format: 'full'
        });

        const snippet = snippetResponse.data.snippet || '';
        const wordCount = snippet.split(' ').length * 3; // Rough estimate
        
        messages.push({
          id: message.id,
          subject: getHeader('Subject'),
          sender: getHeader('From'),
          recipients: getHeader('To').split(',').map(r => r.trim()),
          timestamp: new Date(parseInt(message.internalDate)).toISOString(),
          wordCount,
          snippet,
          threadLength: 1 // Simplified for now
        });
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (msgError) {
        console.error(`Error fetching message ${messageRef.id}:`, msgError);
      }
    }

    // Store Gmail messages as activities (if user and company info available)
    if (req.body.userId && req.body.companyId && messages.length > 0) {
      try {
        await storeGmailActivities(req.body.userId, req.body.companyId, messages);
        console.log(`Stored ${messages.length} Gmail messages as activities`);
      } catch (storeError) {
        console.error('Error storing Gmail activities:', storeError);
        // Don't fail the request if storage fails
      }
    }

    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    res.status(500).json({
      error: 'Failed to fetch Gmail messages',
      success: false
    });
  }
});

app.post('/api/google/calendar/events', async (req, res) => {
  try {
    const { tokens, timeMin, timeMax, maxResults } = req.body;
    
    if (!tokens) {
      return res.status(401).json({ 
        error: 'No authentication tokens provided',
        success: false 
      });
    }

    const parsedTokens = JSON.parse(tokens);
    const decryptedTokens = {
      access_token: decryptToken(parsedTokens.access_token),
      refresh_token: parsedTokens.refresh_token ? decryptToken(parsedTokens.refresh_token) : null,
      expiry_date: parsedTokens.expiry_date
    };

    oauth2Client.setCredentials(decryptedTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      maxResults: maxResults || 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || []).map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      attendees: (event.attendees || []).map(a => a.email).filter(Boolean),
      description: event.description,
      location: event.location
    }));

    // Store Calendar events as activities (if user and company info available)
    if (req.body.userId && req.body.companyId && events.length > 0) {
      try {
        await storeCalendarActivities(req.body.userId, req.body.companyId, events);
        console.log(`Stored ${events.length} Calendar events as activities`);
      } catch (storeError) {
        console.error('Error storing Calendar activities:', storeError);
        // Don't fail the request if storage fails
      }
    }

    res.json({
      success: true,
      events: events
    });
  } catch (error) {
    console.error('Error fetching Calendar events:', error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      success: false
    });
  }
});

app.get('/api/google/calendar/events', async (req, res) => {
  try {
    const { tokens } = req.query;
    
    if (!tokens) {
      return res.status(401).json({ 
        error: 'No authentication tokens provided',
        success: false 
      });
    }

    const parsedTokens = JSON.parse(tokens);
    const decryptedTokens = {
      access_token: decryptToken(parsedTokens.access_token),
      refresh_token: parsedTokens.refresh_token ? decryptToken(parsedTokens.refresh_token) : null,
      expiry_date: parsedTokens.expiry_date
    };

    oauth2Client.setCredentials(decryptedTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json({
      success: true,
      events: response.data.items || []
    });
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calendar events',
      success: false 
    });
  }
});

// =================
// CUSTOM API ROUTES
// =================

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.json({ token });
});

// Mount time entries router
app.use('/api/time-entries', timeEntriesRouter);

// Mount AI preferences router
app.use('/api/ai-preferences', aiPreferencesRouter);

// =================
// STATIC FILE SERVING (after API routes)
// =================

// Serve static files, but not for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return next(); // Skip static file serving for API routes
  }
  express.static(path.join(__dirname, 'dist'))(req, res, next);
});

// Handle client-side routing - serve index.html for non-API routes
app.get('*', (req, res) => {
  // Don't serve SPA for API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// =================
// START SERVER
// =================

app.listen(PORT, () => {
  console.log(`🚀 TimeBeacon Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Google OAuth: http://localhost:${PORT}/api/auth/google/url`);
  console.log(`📹 Zoom API ready: ${!!ZOOM_CLIENT_ID}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});