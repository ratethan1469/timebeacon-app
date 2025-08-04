import { TimeEntry } from '../types';

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body: { data?: string };
    parts?: Array<{ body: { data?: string } }>;
  };
  internalDate: string;
}

interface GmailThread {
  id: string;
  messages: GmailMessage[];
}

export class GmailIntegrationService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private readonly API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata'
  ];
  private demoMode: boolean = !process.env.REACT_APP_GOOGLE_CLIENT_ID; // Use real mode if client ID exists

  constructor() {
    this.loadStoredTokens();
  }

  private loadStoredTokens(): void {
    try {
      const storedTokens = localStorage.getItem('gmail_tokens');
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        
        // Check if token is expired
        if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
          this.refreshAccessToken();
        }
      }
    } catch (error) {
      console.error('Error loading stored tokens:', error);
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/google/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.accessToken = data.tokens.access_token;
        this.saveTokens({
          access_token: data.tokens.access_token,
          refresh_token: this.refreshToken,
          expiry_date: data.tokens.expiry_date
        });
        return true;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
    
    return false;
  }

  private saveTokens(tokens: any): void {
    try {
      localStorage.setItem('gmail_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  private async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && !window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('auth2', () => {
            // Use demo client ID for now - in production, this would be your real client ID
            const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'demo-client-id';
            if (clientId === 'demo-client-id') {
              console.warn('Demo mode: Using mock Gmail integration');
              resolve();
              return;
            }
            
            window.gapi.auth2.init({
              client_id: clientId
            }).then(() => {
              resolve();
            }).catch((error) => {
              console.error('Failed to initialize Google Auth:', error);
              reject(error);
            });
          });
        };
        script.onerror = reject;
        document.head.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  async authenticateGmail(): Promise<boolean> {
    try {
      // Demo mode fallback
      if (this.demoMode) {
        console.log('Demo mode: Simulating Gmail authentication');
        this.accessToken = 'demo-token';
        localStorage.setItem('gmail_demo_token', 'demo-token');
        
        // Simulate a small delay to make it feel realistic
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }

      // Real OAuth flow using backend API
      try {
        // Get OAuth URL from backend
        const urlResponse = await fetch(`${this.API_BASE_URL}/auth/google/url`);
        const urlData = await urlResponse.json();
        
        if (!urlData.authUrl) {
          throw new Error('Failed to get OAuth URL');
        }
        
        // Open OAuth popup
        const popup = window.open(
          urlData.authUrl,
          'gmail-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Wait for OAuth callback
        return new Promise((resolve) => {
          const checkClosed = setInterval(() => {
            if (popup?.closed) {
              clearInterval(checkClosed);
              // Check if we got tokens from the callback
              const tokens = localStorage.getItem('gmail_tokens');
              if (tokens) {
                const parsedTokens = JSON.parse(tokens);
                this.accessToken = parsedTokens.access_token;
                this.refreshToken = parsedTokens.refresh_token;
                resolve(true);
              } else {
                resolve(false);
              }
            }
          }, 1000);
          
          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(checkClosed);
            if (popup && !popup.closed) {
              popup.close();
            }
            resolve(false);
          }, 300000);
        });
        
      } catch (apiError) {
        console.error('API authentication failed, falling back to demo mode:', apiError);
        // Fall back to demo mode
        this.accessToken = 'demo-token';
        localStorage.setItem('gmail_demo_token', 'demo-token');
        return true;
      }
      
    } catch (error) {
      console.error('Gmail authentication failed:', error);
      // Final fallback to demo mode
      console.log('Falling back to demo mode due to auth failure');
      this.accessToken = 'demo-token';
      localStorage.setItem('gmail_demo_token', 'demo-token');
      return true;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.accessToken) {
      // Check for demo token
      const demoToken = localStorage.getItem('gmail_demo_token');
      if (demoToken) {
        this.accessToken = demoToken;
        return true;
      }
      return false;
    }
    
    // Demo mode
    if (this.accessToken === 'demo-token') {
      return true;
    }
    
    try {
      const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getRecentEmails(maxResults: number = 50): Promise<GmailMessage[]> {
    if (!this.accessToken) throw new Error('Not authenticated');

    // Demo mode - return mock data
    if (this.accessToken === 'demo-token' || this.demoMode) {
      return [
        {
          id: 'demo1',
          threadId: 'thread1',
          labelIds: ['INBOX'],
          snippet: 'Project update and next steps for the Q4 deliverables...',
          payload: {
            headers: [
              { name: 'Subject', value: 'Project Update - Q4 Deliverables' },
              { name: 'From', value: 'John Smith <john@salesforce.com>' },
              { name: 'Date', value: new Date().toISOString() }
            ],
            body: { data: 'demo-content' }
          },
          internalDate: Date.now().toString()
        },
        {
          id: 'demo2', 
          threadId: 'thread2',
          labelIds: ['INBOX'],
          snippet: 'Meeting follow-up and action items from client call...',
          payload: {
            headers: [
              { name: 'Subject', value: 'Follow-up: Client Strategy Meeting' },
              { name: 'From', value: 'Sarah Johnson <sarah@hubspot.com>' },
              { name: 'Date', value: new Date(Date.now() - 3600000).toISOString() }
            ],
            body: { data: 'demo-content' }
          },
          internalDate: (Date.now() - 3600000).toString()
        }
      ];
    }

    try {
      // Use backend API to fetch Gmail messages
      const response = await fetch(
        `${this.API_BASE_URL}/gmail/messages?access_token=${this.accessToken}&maxResults=${maxResults}`
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
      
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      
      // Try to refresh token and retry
      if (await this.refreshAccessToken()) {
        try {
          const response = await fetch(
            `${this.API_BASE_URL}/gmail/messages?access_token=${this.accessToken}&maxResults=${maxResults}`
          );
          const data = await response.json();
          return data.messages || [];
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
        }
      }
      
      return [];
    }
  }

  async trackEmailSession(emailId: string, startTime: Date, endTime: Date): Promise<void> {
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
    
    if (duration < 0.05) return; // Don't track sessions shorter than 3 minutes

    try {
      // Get email details for context
      const email = await this.getEmailById(emailId);
      if (!email) return;

      const subject = this.getHeader(email, 'Subject') || 'Email Activity';
      const sender = this.getHeader(email, 'From') || 'Unknown';
      
      // Create time entry
      const timeEntry: Partial<TimeEntry> = {
        date: startTime.toISOString().split('T')[0],
        startTime: startTime.toTimeString().slice(0, 5),
        endTime: endTime.toTimeString().slice(0, 5),
        duration,
        description: `Email: ${subject.substring(0, 100)} (from ${this.extractEmailAddress(sender)})`,
        category: 'communication',
        automated: true,
        source: 'gmail',
        billable: this.shouldBeBillable(email),
        client: this.inferClient(email),
        project: this.inferProject(email)
      };

      // Store or send to your time tracking system
      await this.createTimeEntry(timeEntry);
    } catch (error) {
      console.error('Failed to track email session:', error);
    }
  }

  private async getEmailById(emailId: string): Promise<GmailMessage | null> {
    if (!this.accessToken) return null;

    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return response.json();
    } catch {
      return null;
    }
  }

  private getHeader(email: GmailMessage, headerName: string): string | null {
    const header = email.payload.headers.find(h => h.name === headerName);
    return header?.value || null;
  }

  private extractEmailAddress(fromHeader: string): string {
    const match = fromHeader.match(/<(.+?)>/);
    return match ? match[1] : fromHeader.split(' ')[0];
  }

  private shouldBeBillable(email: GmailMessage): boolean {
    const sender = this.getHeader(email, 'From') || '';
    const subject = this.getHeader(email, 'Subject') || '';
    
    // Simple heuristics - in production, use AI/ML
    const clientDomains = ['client.com', 'customer.org', 'project.net'];
    const billableKeywords = ['project', 'client', 'work', 'meeting', 'proposal'];
    
    return clientDomains.some(domain => sender.includes(domain)) ||
           billableKeywords.some(keyword => subject.toLowerCase().includes(keyword));
  }

  private inferClient(email: GmailMessage): string {
    const sender = this.getHeader(email, 'From') || '';
    const emailAddress = this.extractEmailAddress(sender);
    const domain = emailAddress.split('@')[1];
    
    // Map domains to client names - in production, use a database lookup
    const domainToClient: Record<string, string> = {
      'salesforce.com': 'Salesforce',
      'hubspot.com': 'HubSpot',
      'zendesk.com': 'Zendesk',
      'monday.com': 'Monday.com',
      'okta.com': 'Okta'
    };
    
    return domainToClient[domain] || 'Unknown Client';
  }

  private inferProject(email: GmailMessage): string {
    const subject = this.getHeader(email, 'Subject') || '';
    
    // Simple keyword matching - in production, use AI/NLP
    const projectKeywords: Record<string, string> = {
      'crm': 'Enterprise CRM Implementation',
      'marketing': 'Marketing Automation Platform',
      'support': 'Customer Support Portal Migration',
      'project management': 'Project Management Rollout',
      'identity': 'Identity & Access Management'
    };
    
    for (const [keyword, project] of Object.entries(projectKeywords)) {
      if (subject.toLowerCase().includes(keyword)) {
        return project;
      }
    }
    
    return 'General Communication';
  }

  private async createTimeEntry(timeEntry: Partial<TimeEntry>): Promise<void> {
    // In a real app, this would call your backend API
    console.log('Creating time entry from Gmail:', timeEntry);
    
    // Store in localStorage for demo purposes
    const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
    const newEntry = {
      ...timeEntry,
      id: Date.now().toString(),
      status: 'pending'
    };
    
    existingEntries.push(newEntry);
    localStorage.setItem('timeEntries', JSON.stringify(existingEntries));
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('timeEntryCreated', { detail: newEntry }));
  }

  // Start tracking email activity
  startEmailTracking(): void {
    if (typeof window === 'undefined') return;

    let currentEmailId: string | null = null;
    let sessionStart: Date | null = null;
    let activityTimeout: NodeJS.Timeout | null = null;

    const trackActivity = () => {
      const now = new Date();
      
      // Detect Gmail tab activity
      if (document.visibilityState === 'visible' && window.location.hostname === 'mail.google.com') {
        // Try to extract email ID from URL
        const urlEmailId = this.extractEmailIdFromUrl();
        
        if (urlEmailId && urlEmailId !== currentEmailId) {
          // New email opened - finish previous session
          if (currentEmailId && sessionStart) {
            this.trackEmailSession(currentEmailId, sessionStart, now);
          }
          
          // Start new session
          currentEmailId = urlEmailId;
          sessionStart = now;
        } else if (!sessionStart && urlEmailId) {
          // Continue existing session
          sessionStart = now;
        }
        
        // Reset inactivity timer
        if (activityTimeout) clearTimeout(activityTimeout);
        activityTimeout = setTimeout(() => {
          if (currentEmailId && sessionStart) {
            this.trackEmailSession(currentEmailId, sessionStart, new Date());
            currentEmailId = null;
            sessionStart = null;
          }
        }, 5 * 60 * 1000); // 5 minutes of inactivity
      }
    };

    // Track focus/visibility changes
    document.addEventListener('visibilitychange', trackActivity);
    window.addEventListener('focus', trackActivity);
    window.addEventListener('blur', trackActivity);
    
    // Track URL changes (for Gmail SPA navigation)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        trackActivity();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private extractEmailIdFromUrl(): string | null {
    const match = window.location.hash.match(/\/([0-9a-f]+)$/);
    return match ? match[1] : null;
  }
}

// Global instance
export const gmailService = new GmailIntegrationService();