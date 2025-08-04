const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
});

app.use(limiter);
app.use('/auth', authLimiter);

// CORS with strict origin checking
const allowedOrigins = [
  'http://localhost:3000',
  'https://app.timebeacon.io',
  'https://timebeacon.io',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public', {
  maxAge: '1d',
  etag: false
}));

// Google OAuth configuration for all services
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
);

// Comprehensive scopes for all Google services
const SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.metadata',
  
  // Google Calendar
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  
  // Google Drive (for Docs, Sheets, Slides)
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  
  // Google Docs
  'https://www.googleapis.com/auth/documents.readonly',
  
  // Google Sheets  
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  
  // Google Slides
  'https://www.googleapis.com/auth/presentations.readonly'
];

// Security utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Input validation and sanitization
function validateAccessToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  // Basic format validation for Google access tokens
  return /^ya29\.[a-zA-Z0-9_-]+$/.test(token) || token === 'demo-token';
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>\"']/g, '').substring(0, 1000);
}

// Audit logging
function auditLog(action, userId, details) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userId: userId || 'anonymous',
    ip: details?.ip,
    userAgent: details?.userAgent,
    success: details?.success,
    error: details?.error
  };
  
  // In production, send to secure logging service
  console.log('AUDIT:', JSON.stringify(logEntry));
}

// Middleware to extract user info and add security headers
function secureEndpoint(req, res, next) {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Extract and validate access token
  const token = req.query.access_token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!validateAccessToken(token)) {
    auditLog('INVALID_TOKEN', null, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      error: 'Invalid access token format'
    });
    return res.status(401).json({ error: 'Invalid access token' });
  }
  
  req.accessToken = token;
  next();
}

// Generate OAuth URL
app.get('/auth/google/url', (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: crypto.randomBytes(32).toString('hex') // CSRF protection
    });
    
    auditLog('AUTH_URL_REQUESTED', null, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });
    
    res.json({ authUrl });
  } catch (error) {
    auditLog('AUTH_URL_ERROR', null, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
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
app.get('/gmail/messages', secureEndpoint, async (req, res) => {
  try {
    auditLog('GMAIL_MESSAGES_REQUESTED', req.accessToken, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });
    
    oauth2Client.setCredentials({ access_token: req.accessToken });
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

// Get Google Calendar events
app.get('/calendar/events', async (req, res) => {
  const { access_token } = req.query;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    oauth2Client.setCredentials({ access_token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: weekAgo.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    res.json({ events: response.data.items || [] });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Get Google Drive files (Docs, Sheets, Slides)
app.get('/drive/files', async (req, res) => {
  const { access_token, type } = req.query;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    oauth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Map file types
    const mimeTypes = {
      'docs': 'application/vnd.google-apps.document',
      'sheets': 'application/vnd.google-apps.spreadsheet', 
      'slides': 'application/vnd.google-apps.presentation'
    };
    
    const mimeType = mimeTypes[type] || mimeTypes.docs;
    
    const response = await drive.files.list({
      q: `mimeType='${mimeType}' and modifiedTime > '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`,
      fields: 'files(id,name,modifiedTime,lastModifyingUser,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 10
    });
    
    res.json({ files: response.data.files || [] });
  } catch (error) {
    console.error('Error fetching Drive files:', error);
    res.status(500).json({ error: 'Failed to fetch Drive files' });
  }
});

// Get specific Google Doc content
app.get('/docs/:docId', async (req, res) => {
  const { access_token } = req.query;
  const { docId } = req.params;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    oauth2Client.setCredentials({ access_token });
    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    
    const response = await docs.documents.get({
      documentId: docId
    });
    
    res.json({ document: response.data });
  } catch (error) {
    console.error('Error fetching Google Doc:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Get specific Google Sheet data
app.get('/sheets/:sheetId', async (req, res) => {
  const { access_token } = req.query;
  const { sheetId } = req.params;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    oauth2Client.setCredentials({ access_token });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      includeGridData: false
    });
    
    res.json({ spreadsheet: response.data });
  } catch (error) {
    console.error('Error fetching Google Sheet:', error);
    res.status(500).json({ error: 'Failed to fetch spreadsheet' });
  }
});

// Get specific Google Slides presentation
app.get('/slides/:presentationId', async (req, res) => {
  const { access_token } = req.query;
  const { presentationId } = req.params;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    oauth2Client.setCredentials({ access_token });
    const slides = google.slides({ version: 'v1', auth: oauth2Client });
    
    const response = await slides.presentations.get({
      presentationId: presentationId
    });
    
    res.json({ presentation: response.data });
  } catch (error) {
    console.error('Error fetching Google Slides:', error);
    res.status(500).json({ error: 'Failed to fetch presentation' });
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