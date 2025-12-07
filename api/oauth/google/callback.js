import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';

/**
 * Google OAuth Callback Handler
 *
 * This endpoint receives the OAuth code from Google after user authorizes,
 * exchanges it for access/refresh tokens, and stores them in Supabase.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/integrations?error=auth_failed`);
    }

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.redirect(`${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/integrations?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();

    // Get current user from Clerk session
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Get session token from cookie
    const sessionToken = req.cookies?.__session;
    if (!sessionToken) {
      return res.redirect(`${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/login?error=not_authenticated`);
    }

    // Verify the session and get user ID
    let clerkUserId;
    try {
      const session = await clerkClient.sessions.verifySession(sessionToken, {
        jwtKey: process.env.CLERK_JWT_KEY,
      });
      clerkUserId = session.userId;
    } catch (err) {
      console.error('Clerk session verification failed:', err);
      return res.redirect(`${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/login?error=session_invalid`);
    }

    if (!clerkUserId) {
      return res.redirect(`${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/login?error=no_user_id`);
    }

    // Store tokens in Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error: dbError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: clerkUserId,
        integration_id: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scopes: tokens.scope?.split(' ') || [],
        account_email: userInfo.email,
        account_name: userInfo.name,
        status: 'active',
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,integration_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return res.redirect(`${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/integrations?error=save_failed`);
    }

    // Success! Redirect back to integrations page
    return res.redirect(`${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/integrations?success=google_connected`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`${process.env.VITE_APP_URL || 'https://app.timebeacon.io'}/integrations?error=unknown`);
  }
}
