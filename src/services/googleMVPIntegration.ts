/**
 * Simplified Google Integration for MVP
 * Uses PKCE flow (client-side only, no server needed)
 */

import { contentAnalyzer, ProcessedActivity } from './contentAnalyzer';

interface GoogleTokens {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at?: number;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
  status?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
  };
}

export class GoogleMVPIntegration {
  private static instance: GoogleMVPIntegration;
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/gmail.readonly'
  ].join(' ');

  private readonly STORAGE_KEY = 'google_mvp_tokens';
  private tokens: GoogleTokens | null = null;

  private constructor() {
    this.loadTokens();
  }

  static getInstance(): GoogleMVPIntegration {
    if (!GoogleMVPIntegration.instance) {
      GoogleMVPIntegration.instance = new GoogleMVPIntegration();
    }
    return GoogleMVPIntegration.instance;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.tokens) return false;

    // Check if token is expired
    if (this.tokens.expires_at && Date.now() >= this.tokens.expires_at) {
      console.log('Token expired');
      this.clearTokens();
      return false;
    }

    return true;
  }

  /**
   * Initiate Google OAuth flow using Authorization Code + PKCE
   */
  async authenticate(): Promise<boolean> {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateCodeVerifier(); // Random state

      // Store verifier for callback (use localStorage - persists across redirects)
      localStorage.setItem('pkce_code_verifier', codeVerifier);
      localStorage.setItem('oauth_state', state);

      // Build OAuth URL - use authorization code flow
      const params = new URLSearchParams({
        client_id: this.CLIENT_ID,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
        response_type: 'code', // Request authorization code
        scope: this.SCOPES,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
        access_type: 'offline'
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      // Redirect to Google OAuth
      window.location.href = authUrl;

      return true;
    } catch (error) {
      console.error('Google authentication failed:', error);
      return false;
    }
  }

  /**
   * Check URL hash for OAuth tokens (implicit flow)
   */
  private checkForTokensInHash(): void {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const tokenType = params.get('token_type');
    const scope = params.get('scope');

    if (accessToken && expiresIn) {
      this.tokens = {
        access_token: accessToken,
        expires_in: parseInt(expiresIn),
        token_type: tokenType || 'Bearer',
        scope: scope || '',
        expires_at: Date.now() + (parseInt(expiresIn) * 1000)
      };
      this.saveTokens();

      // Clear hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      console.log('✅ Google OAuth successful');
    }
  }

  /**
   * Fetch calendar events from the last 7 days
   */
  async fetchCalendarEvents(daysBack: number = 7): Promise<CalendarEvent[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - daysBack);

      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: new Date().toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100'
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.tokens!.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      return [];
    }
  }

  /**
   * Fetch Gmail messages from the last 7 days
   */
  async fetchGmailMessages(daysBack: number = 7, maxResults: number = 50): Promise<GmailMessage[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Calculate date for query
      const after = new Date();
      after.setDate(after.getDate() - daysBack);
      const afterTimestamp = Math.floor(after.getTime() / 1000);

      // First, get list of message IDs
      const listParams = new URLSearchParams({
        q: `after:${afterTimestamp} -in:spam -in:trash`,
        maxResults: maxResults.toString()
      });

      const listResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?${listParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.tokens!.access_token}`
          }
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Gmail API error: ${listResponse.status}`);
      }

      const listData = await listResponse.json();
      const messageIds = (listData.messages || []).map((m: any) => m.id);

      // Fetch full message details in batch
      const messages: GmailMessage[] = [];
      for (const id of messageIds.slice(0, 20)) { // Limit to 20 for performance
        const msgResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.tokens!.access_token}`
            }
          }
        );

        if (msgResponse.ok) {
          messages.push(await msgResponse.json());
        }
      }

      return messages;
    } catch (error) {
      console.error('Failed to fetch Gmail messages:', error);
      return [];
    }
  }

  /**
   * Sync Google data and send to AI for processing
   */
  async syncAndProcess(): Promise<{ events: number; emails: number }> {
    console.log('🔄 Starting Google data sync...');

    const [events, emails] = await Promise.all([
      this.fetchCalendarEvents(),
      this.fetchGmailMessages()
    ]);

    console.log(`📅 Found ${events.length} calendar events`);
    console.log(`📧 Found ${emails.length} emails`);

    // Process calendar events
    for (const event of events) {
      await this.processCalendarEvent(event);
    }

    // Process emails
    for (const email of emails) {
      await this.processEmail(email);
    }

    return { events: events.length, emails: emails.length };
  }

  /**
   * Convert calendar event to ProcessedActivity
   */
  private async processCalendarEvent(event: CalendarEvent): Promise<void> {
    try {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;

      if (!start || !end) return;

      const startDate = new Date(start);
      const endDate = new Date(end);
      const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

      // Skip all-day events or very short events
      if (!event.start.dateTime || duration < 0.25) return;

      const activity: ProcessedActivity = {
        id: `cal-${event.id}`,
        title: event.summary || 'Untitled Meeting',
        description: event.description,
        startTime: start,
        endTime: end,
        duration,
        participants: event.attendees?.map(a => a.email),
        location: event.location,
        source: 'calendar',
        sourceId: event.id,
        timestamp: start,
        rawData: event
      };

      await contentAnalyzer.addActivity(activity);
      console.log(`✅ Processed calendar event: ${activity.title}`);
    } catch (error) {
      console.error('Failed to process calendar event:', error);
    }
  }

  /**
   * Convert email to ProcessedActivity
   */
  private async processEmail(email: GmailMessage): Promise<void> {
    try {
      const getHeader = (name: string) => {
        return email.payload.headers.find(h => h.name === name)?.value;
      };

      const subject = getHeader('Subject') || 'No Subject';
      const from = getHeader('From') || 'Unknown';
      const date = email.internalDate;

      const activity: ProcessedActivity = {
        id: `email-${email.id}`,
        title: `Email: ${subject}`,
        description: `From: ${from}\n\n${email.snippet}`,
        startTime: new Date(parseInt(date)).toISOString(),
        duration: 0.25, // Assume 15 minutes per email thread
        source: 'email',
        sourceId: email.id,
        timestamp: new Date(parseInt(date)).toISOString(),
        rawData: email
      };

      await contentAnalyzer.addActivity(activity);
      console.log(`✅ Processed email: ${subject}`);
    } catch (error) {
      console.error('Failed to process email:', error);
    }
  }

  /**
   * Sign out
   */
  signOut(): void {
    this.clearTokens();
    console.log('📤 Signed out from Google');
  }

  // PKCE helper methods
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  private base64URLEncode(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Storage methods
  private saveTokens(): void {
    if (this.tokens) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tokens));
    }
  }

  private loadTokens(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.tokens = JSON.parse(stored);
    }
  }

  private clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const googleMVP = GoogleMVPIntegration.getInstance();
