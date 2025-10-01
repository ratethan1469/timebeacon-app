// Vercel serverless function for Google OAuth token exchange
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { code, codeVerifier, redirectUri } = req.body;

    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Check environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    console.log('Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length,
      clientSecretLength: clientSecret?.length,
      clientIdPreview: clientId?.substring(0, 20) + '...',
      clientSecretPreview: clientSecret?.substring(0, 12) + '...'
    });

    if (!clientId || !clientSecret) {
      return res.status(500).json({ 
        message: 'Server configuration error',
        error: 'Missing OAuth credentials',
        debug: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          nodeEnv: process.env.NODE_ENV
        }
      });
    }

    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokens);
      return res.status(400).json({ 
        message: 'Token exchange failed',
        error: tokens.error_description || tokens.error
      });
    }

    res.json({
      success: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      scope: tokens.scope
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}