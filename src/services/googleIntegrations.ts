/**
 * Google Integrations Service
 * Handles OAuth authentication and activity tracking for Gmail, Sheets, Docs, Calendar
 */

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleAccount {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface GoogleActivity {
  id: string;
  type: 'gmail' | 'calendar' | 'docs' | 'sheets' | 'drive';
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  participants?: string[];
  documentId?: string;
  emailId?: string;
  calendarEventId?: string;
  suggestedProject?: string;
  suggestedClient?: string;
  confidence: number;
  metadata: any;
}

class GoogleIntegrationsService {
  private config: GoogleAuthConfig;
  private authWindow: Window | null = null;

  constructor() {
    this.config = {
      clientId: import.meta.env.REACT_APP_GOOGLE_CLIENT_ID || 'demo-client-id',
      clientSecret: import.meta.env.REACT_APP_GOOGLE_CLIENT_SECRET || 'demo-secret',
      redirectUri: `${import.meta.env.REACT_APP_API_URL || 'http://localhost:3001'}/auth/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.activity.readonly',
      ]
    };
  }

  /**
   * Initiate Google OAuth flow
   */
  async authenticate(): Promise<GoogleAccount> {
    return new Promise(async (resolve, reject) => {
      // For demo purposes, return mock authentication
      if (this.config.clientId === 'demo-client-id') {
        setTimeout(() => {
          const mockAccount: GoogleAccount = {
            email: 'user@company.com',
            name: 'John Doe',
            picture: 'https://via.placeholder.com/100',
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: Date.now() + 3600 * 1000,
          };
          this.storeAccount(mockAccount);
          resolve(mockAccount);
        }, 1000);
        return;
      }

      try {
        // Get OAuth URL from backend
        const apiUrl = import.meta.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/auth/google/url`);
        const data = await response.json();
        
        if (!data.authUrl) {
          throw new Error('Failed to get OAuth URL');
        }

        // Open OAuth popup
        this.authWindow = window.open(
          data.authUrl,
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for auth completion
        const authListener = (event: MessageEvent) => {
          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            window.removeEventListener('message', authListener);
            this.authWindow?.close();
            
            // Extract user info from tokens and create account
            const account: GoogleAccount = {
              email: 'user@example.com', // Will be updated after token validation
              name: 'User', // Will be updated after token validation
              picture: '', // Will be updated after token validation
              accessToken: event.data.tokens.access_token,
              refreshToken: event.data.tokens.refresh_token,
              expiresAt: event.data.tokens.expiry_date || (Date.now() + 3600 * 1000),
            };
            
            this.storeAccount(account);
            resolve(account);
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            window.removeEventListener('message', authListener);
            this.authWindow?.close();
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', authListener);

        // Handle window closed manually
        const checkClosed = setInterval(() => {
          if (this.authWindow?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', authListener);
            
            // Check if tokens were stored (popup might have closed after success)
            const storedTokens = localStorage.getItem('google_tokens');
            if (storedTokens) {
              const tokens = JSON.parse(storedTokens);
              const account: GoogleAccount = {
                email: 'user@example.com',
                name: 'User', 
                picture: '',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expiry_date || (Date.now() + 3600 * 1000),
              };
              this.storeAccount(account);
              resolve(account);
            } else {
              reject(new Error('Authentication cancelled'));
            }
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (this.authWindow && !this.authWindow.closed) {
            this.authWindow.close();
            window.removeEventListener('message', authListener);
            reject(new Error('Authentication timeout'));
          }
        }, 300000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Build Google OAuth URL
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: crypto.randomUUID(),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  /**
   * Exchange auth code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleAccount> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        }),
      });

      const tokens = await response.json();
      
      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      
      const userInfo = await userResponse.json();

      const account: GoogleAccount = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
      };

      this.storeAccount(account);
      return account;
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error;
    }
  }

  /**
   * Store Google account securely
   */
  private storeAccount(account: GoogleAccount): void {
    localStorage.setItem('google_account', JSON.stringify(account));
  }

  /**
   * Get stored Google account
   */
  getStoredAccount(): GoogleAccount | null {
    try {
      const stored = localStorage.getItem('google_account');
      if (!stored) return null;
      
      const account = JSON.parse(stored);
      
      // Check if token is expired
      if (Date.now() > account.expiresAt) {
        this.refreshToken(account);
      }
      
      return account;
    } catch {
      return null;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshToken(account: GoogleAccount): Promise<void> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: account.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const tokens = await response.json();
      
      account.accessToken = tokens.access_token;
      account.expiresAt = Date.now() + (tokens.expires_in * 1000);
      
      this.storeAccount(account);
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.disconnect();
    }
  }

  /**
   * Disconnect Google account
   */
  disconnect(): void {
    localStorage.removeItem('google_account');
  }

  /**
   * Check if Google account is connected
   */
  isConnected(): boolean {
    const account = this.getStoredAccount();
    return account !== null && Date.now() < account.expiresAt;
  }

  /**
   * Fetch Gmail activities
   */
  async fetchGmailActivities(account: GoogleAccount, since?: Date): Promise<GoogleActivity[]> {
    if (this.config.clientId === 'demo-client-id') {
      return this.getMockGmailActivities();
    }

    try {
      const query = since ? `after:${Math.floor(since.getTime() / 1000)}` : 'in:sent OR in:inbox';
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
        {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }
      );

      const data = await response.json();
      const activities: GoogleActivity[] = [];

      // Fetch details for each message
      for (const message of data.messages || []) {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: { Authorization: `Bearer ${account.accessToken}` },
          }
        );
        
        const msgData = await msgResponse.json();
        const activity = this.parseGmailMessage(msgData);
        if (activity) activities.push(activity);
      }

      return activities;
    } catch (error) {
      console.error('Gmail fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch Google Calendar activities
   */
  async fetchCalendarActivities(account: GoogleAccount, since?: Date): Promise<GoogleActivity[]> {
    if (this.config.clientId === 'demo-client-id') {
      return this.getMockCalendarActivities();
    }

    try {
      const timeMin = since ? since.toISOString() : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&singleEvents=true&orderBy=startTime`,
        {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }
      );

      const data = await response.json();
      return (data.items || []).map(this.parseCalendarEvent).filter(Boolean);
    } catch (error) {
      console.error('Calendar fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch Google Docs activities
   */
  async fetchDocsActivities(account: GoogleAccount, since?: Date): Promise<GoogleActivity[]> {
    if (this.config.clientId === 'demo-client-id') {
      return this.getMockDocsActivities();
    }

    try {
      // Use Drive API to get recent document activities
      const timeFilter = since ? `modifiedTime > '${since.toISOString()}'` : '';
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document'${timeFilter ? ` and ${timeFilter}` : ''}&fields=files(id,name,modifiedTime,lastModifyingUser)&orderBy=modifiedTime desc`,
        {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }
      );

      const data = await response.json();
      return (data.files || []).map(this.parseDocsActivity).filter(Boolean);
    } catch (error) {
      console.error('Docs fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch Google Sheets activities
   */
  async fetchSheetsActivities(account: GoogleAccount, since?: Date): Promise<GoogleActivity[]> {
    if (this.config.clientId === 'demo-client-id') {
      return this.getMockSheetsActivities();
    }

    try {
      const timeFilter = since ? `modifiedTime > '${since.toISOString()}'` : '';
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'${timeFilter ? ` and ${timeFilter}` : ''}&fields=files(id,name,modifiedTime,lastModifyingUser)&orderBy=modifiedTime desc`,
        {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }
      );

      const data = await response.json();
      return (data.files || []).map(this.parseSheetsActivity).filter(Boolean);
    } catch (error) {
      console.error('Sheets fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch all Google activities
   */
  async fetchAllActivities(since?: Date): Promise<GoogleActivity[]> {
    const account = this.getStoredAccount();
    if (!account) return [];

    const [gmail, calendar, docs, sheets] = await Promise.all([
      this.fetchGmailActivities(account, since),
      this.fetchCalendarActivities(account, since),
      this.fetchDocsActivities(account, since),
      this.fetchSheetsActivities(account, since),
    ]);

    return [...gmail, ...calendar, ...docs, ...sheets]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  // Parser methods
  private parseGmailMessage(message: any): GoogleActivity | null {
    try {
      const headers = message.payload.headers;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value;

      return {
        id: `gmail-${message.id}`,
        type: 'gmail',
        title: `Email: ${subject}`,
        description: `From: ${from}, To: ${to}`,
        startTime: new Date(date).toISOString(),
        duration: 5, // Assume 5 minutes for email
        participants: [from, to].filter(Boolean),
        emailId: message.id,
        suggestedProject: this.suggestProject(subject),
        suggestedClient: this.suggestClient(from + ' ' + to),
        confidence: 0.7,
        metadata: { subject, from, to, threadId: message.threadId },
      };
    } catch {
      return null;
    }
  }

  private parseCalendarEvent = (event: any): GoogleActivity | null => {
    try {
      const start = new Date(event.start?.dateTime || event.start?.date);
      const end = new Date(event.end?.dateTime || event.end?.date);
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

      return {
        id: `calendar-${event.id}`,
        type: 'calendar',
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
        participants: (event.attendees || []).map((a: any) => a.email),
        calendarEventId: event.id,
        suggestedProject: this.suggestProject(event.summary || ''),
        suggestedClient: this.suggestClient((event.attendees || []).map((a: any) => a.email).join(' ')),
        confidence: 0.9,
        metadata: { location: event.location, hangoutLink: event.hangoutLink },
      };
    } catch {
      return null;
    }
  };

  private parseDocsActivity = (file: any): GoogleActivity | null => {
    try {
      const modifiedTime = new Date(file.modifiedTime);
      
      return {
        id: `docs-${file.id}`,
        type: 'docs',
        title: `Document: ${file.name}`,
        description: `Edited document`,
        startTime: modifiedTime.toISOString(),
        duration: 30, // Assume 30 minutes for document editing
        documentId: file.id,
        suggestedProject: this.suggestProject(file.name),
        suggestedClient: this.suggestClient(file.name),
        confidence: 0.6,
        metadata: { fileName: file.name, lastModifyingUser: file.lastModifyingUser },
      };
    } catch {
      return null;
    }
  };

  private parseSheetsActivity = (file: any): GoogleActivity | null => {
    try {
      const modifiedTime = new Date(file.modifiedTime);
      
      return {
        id: `sheets-${file.id}`,
        type: 'sheets',
        title: `Spreadsheet: ${file.name}`,
        description: `Updated spreadsheet`,
        startTime: modifiedTime.toISOString(),
        duration: 20, // Assume 20 minutes for spreadsheet work
        documentId: file.id,
        suggestedProject: this.suggestProject(file.name),
        suggestedClient: this.suggestClient(file.name),
        confidence: 0.6,
        metadata: { fileName: file.name, lastModifyingUser: file.lastModifyingUser },
      };
    } catch {
      return null;
    }
  };

  // AI suggestion methods
  private suggestProject(text: string): string {
    const projectKeywords = {
      'project alpha': 'Project Alpha',
      'beta': 'Project Beta',
      'website': 'Website Development',
      'mobile': 'Mobile App',
      'api': 'API Development',
      'design': 'Design Work',
      'meeting': 'Client Meetings',
      'planning': 'Project Planning',
    };

    const lowerText = text.toLowerCase();
    for (const [keyword, project] of Object.entries(projectKeywords)) {
      if (lowerText.includes(keyword)) {
        return project;
      }
    }
    
    return 'General Work';
  }

  private suggestClient(text: string): string {
    const clientKeywords = {
      'acme': 'Acme Corp',
      'tech': 'TechCorp',
      'global': 'Global Industries',
      'startup': 'Startup Inc',
      'enterprise': 'Enterprise Solutions',
    };

    const lowerText = text.toLowerCase();
    for (const [keyword, client] of Object.entries(clientKeywords)) {
      if (lowerText.includes(keyword)) {
        return client;
      }
    }
    
    return 'Internal';
  }

  // Mock data for demo
  private getMockGmailActivities(): GoogleActivity[] {
    return [
      {
        id: 'gmail-1',
        type: 'gmail',
        title: 'Email: Project Alpha Status Update',
        description: 'From: client@acme.com, To: me@company.com',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        duration: 5,
        participants: ['client@acme.com', 'me@company.com'],
        emailId: 'msg-123',
        suggestedProject: 'Project Alpha',
        suggestedClient: 'Acme Corp',
        confidence: 0.8,
        metadata: { subject: 'Project Alpha Status Update' },
      },
      {
        id: 'gmail-2',
        type: 'gmail',
        title: 'Email: Meeting Follow-up',
        description: 'From: me@company.com, To: team@techcorp.com',
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        duration: 3,
        participants: ['me@company.com', 'team@techcorp.com'],
        emailId: 'msg-124',
        suggestedProject: 'Client Meetings',
        suggestedClient: 'TechCorp',
        confidence: 0.7,
        metadata: { subject: 'Meeting Follow-up' },
      },
    ];
  }

  private getMockCalendarActivities(): GoogleActivity[] {
    return [
      {
        id: 'calendar-1',
        type: 'calendar',
        title: 'Project Alpha Planning Meeting',
        description: 'Quarterly planning session for Project Alpha',
        startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 0 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        participants: ['john@acme.com', 'sarah@acme.com'],
        calendarEventId: 'cal-123',
        suggestedProject: 'Project Alpha',
        suggestedClient: 'Acme Corp',
        confidence: 0.9,
        metadata: { location: 'Conference Room A' },
      },
    ];
  }

  private getMockDocsActivities(): GoogleActivity[] {
    return [
      {
        id: 'docs-1',
        type: 'docs',
        title: 'Document: Project Specification',
        description: 'Edited document',
        startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        duration: 45,
        documentId: 'doc-123',
        suggestedProject: 'Project Alpha',
        suggestedClient: 'Acme Corp',
        confidence: 0.8,
        metadata: { fileName: 'Project Specification' },
      },
    ];
  }

  private getMockSheetsActivities(): GoogleActivity[] {
    return [
      {
        id: 'sheets-1',
        type: 'sheets',
        title: 'Spreadsheet: Budget Tracking',
        description: 'Updated spreadsheet',
        startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        duration: 25,
        documentId: 'sheet-123',
        suggestedProject: 'Project Planning',
        suggestedClient: 'Internal',
        confidence: 0.6,
        metadata: { fileName: 'Budget Tracking' },
      },
    ];
  }
}

export const googleIntegrationsService = new GoogleIntegrationsService();