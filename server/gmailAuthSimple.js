// Simple OAuth flow with minimal scopes for development testing
require('dotenv').config({ path: './.env' });
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// OAuth client with minimal scopes (no verification required)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Minimal scopes that don't require verification
const MINIMAL_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Generate auth URL with minimal scopes
app.get('/auth/google/url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: MINIMAL_SCOPES,
    prompt: 'consent'
  });

  res.json({
    success: true,
    authUrl,
    message: 'Minimal scope OAuth URL generated'
  });
});

// Handle OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.send(`
      <html>
        <body>
          <h1>❌ No authorization code received</h1>
          <p>The OAuth flow was cancelled or failed.</p>
        </body>
      </html>
    `);
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info to verify the token works
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    res.send(`
      <html>
        <head>
          <title>OAuth Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; padding: 15px; border-radius: 4px; margin: 10px 0; }
            .info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ OAuth Flow Successful!</h1>
            <p>Successfully connected to Google with minimal scopes.</p>
          </div>
          
          <div class="info">
            <h3>User Info Retrieved:</h3>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Picture:</strong> <img src="${data.picture}" style="width: 50px; border-radius: 25px;"></p>
          </div>
          
          <div class="info">
            <h3>✅ This proves OAuth is working!</h3>
            <p>The issue with your main app is the verification requirement for sensitive scopes.</p>
            <p>Once you get Google verification or use test users, the full scope OAuth will work.</p>
          </div>
          
          <script>
            // Auto-close after 10 seconds
            setTimeout(() => {
              window.close();
            }, 10000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Error in minimal OAuth flow:', error);
    res.send(`
      <html>
        <body>
          <h1>❌ OAuth Error</h1>
          <p>Error: ${error.message}</p>
          <p>This might indicate a client secret issue or other OAuth configuration problem.</p>
        </body>
      </html>
    `);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Simple OAuth server running',
    scopes: MINIMAL_SCOPES 
  });
});

const PORT = 3004; // Different port to avoid conflicts
app.listen(PORT, () => {
  console.log(`Simple OAuth server running on port ${PORT}`);
  console.log(`Test at: http://localhost:${PORT}/auth/google/url`);
});