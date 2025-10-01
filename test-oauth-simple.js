require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const app = express();

console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Found' : 'MISSING');
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Found' : 'MISSING');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3003/auth/google/callback'
);

app.get('/test', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.email'],
    prompt: 'consent'
  });
  
  res.json({ authUrl, clientId: process.env.GOOGLE_CLIENT_ID });
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    res.send('SUCCESS! OAuth is working.');
  } catch (error) {
    res.send(`ERROR: ${error.message}`);
  }
});

app.listen(3003, () => {
  console.log('Test server running on http://localhost:3003/test');
});