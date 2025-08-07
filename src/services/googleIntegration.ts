import { TimeEntry } from '../types';

export interface GoogleFile {
  id: string;
  name: string;
  modifiedTime: string;
  lastModifyingUser?: {
    displayName: string;
    emailAddress: string;
  };
  webViewLink: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  creator?: { email: string; displayName?: string };
  organizer?: { email: string; displayName?: string };
}

export class GoogleIntegrationService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private readonly API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  private demoMode: boolean = !import.meta.env.VITE_GOOGLE_CLIENT_ID;

  constructor() {
    this.loadStoredTokens();
  }

  private loadStoredTokens(): void {
    try {
      const storedTokens = localStorage.getItem('google_tokens');
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
      localStorage.setItem('google_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  async authenticateGoogle(): Promise<boolean> {
    try {
      // Demo mode fallback
      if (this.demoMode) {
        console.log('Demo mode: Simulating Google authentication');
        this.accessToken = 'demo-token';
        localStorage.setItem('google_demo_token', 'demo-token');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }

      // Real OAuth flow
      try {
        const urlResponse = await fetch(`${this.API_BASE_URL}/auth/google/url`);
        const urlData = await urlResponse.json();
        
        if (!urlData.authUrl) {
          throw new Error('Failed to get OAuth URL');
        }
        
        // Open OAuth popup
        const popup = window.open(
          urlData.authUrl,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Wait for OAuth callback
        return new Promise((resolve) => {
          const checkClosed = setInterval(() => {
            if (popup?.closed) {
              clearInterval(checkClosed);
              const tokens = localStorage.getItem('google_tokens');
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
        this.accessToken = 'demo-token';
        localStorage.setItem('google_demo_token', 'demo-token');
        return true;
      }
      
    } catch (error) {
      console.error('Google authentication failed:', error);
      this.accessToken = 'demo-token';
      localStorage.setItem('google_demo_token', 'demo-token');
      return true;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.accessToken) {
      const demoToken = localStorage.getItem('google_demo_token');
      if (demoToken) {
        this.accessToken = demoToken;
        return true;
      }
      return false;
    }
    
    if (this.accessToken === 'demo-token' || this.demoMode) {
      return true;
    }
    
    // For real tokens, we could validate with Google, but for now trust stored tokens
    return true;
  }

  // Gmail Integration
  async getGmailMessages(maxResults: number = 10): Promise<any[]> {
    if (!this.accessToken) throw new Error('Not authenticated');

    if (this.accessToken === 'demo-token' || this.demoMode) {
      return [
        {
          id: 'demo1',
          payload: {
            headers: [
              { name: 'Subject', value: 'Project Update - Q4 Deliverables' },
              { name: 'From', value: 'John Smith <john@salesforce.com>' },
              { name: 'Date', value: new Date().toISOString() }
            ]
          },
          snippet: 'Project update and next steps for the Q4 deliverables...'
        },
        {
          id: 'demo2',
          payload: {
            headers: [
              { name: 'Subject', value: 'Follow-up: Client Strategy Meeting' },
              { name: 'From', value: 'Sarah Johnson <sarah@hubspot.com>' },
              { name: 'Date', value: new Date(Date.now() - 3600000).toISOString() }
            ]
          },
          snippet: 'Meeting follow-up and action items from client call...'
        }
      ];
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/gmail/messages?access_token=${this.accessToken}&maxResults=${maxResults}`
      );
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to fetch Gmail messages:', error);
      return [];
    }
  }

  // Calendar Integration
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    if (!this.accessToken) throw new Error('Not authenticated');

    if (this.accessToken === 'demo-token' || this.demoMode) {
      return [
        {
          id: 'demo-event-1',
          summary: 'Client Strategy Meeting',
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
          attendees: [
            { email: 'client@company.com', displayName: 'Client Name' }
          ]
        },
        {
          id: 'demo-event-2', 
          summary: 'Project Review',
          start: { dateTime: new Date(Date.now() + 7200000).toISOString() },
          end: { dateTime: new Date(Date.now() + 10800000).toISOString() },
          creator: { email: 'team@company.com', displayName: 'Team Lead' }
        }
      ];
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/calendar/events?access_token=${this.accessToken}`
      );
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      return [];
    }
  }

  // Google Drive Integration
  async getDriveFiles(type: 'docs' | 'sheets' | 'slides'): Promise<GoogleFile[]> {
    if (!this.accessToken) throw new Error('Not authenticated');

    if (this.accessToken === 'demo-token' || this.demoMode) {
      const mockFiles = {
        docs: [
          {
            id: 'demo-doc-1',
            name: 'Client Proposal - Q4 2024',
            modifiedTime: new Date().toISOString(),
            lastModifyingUser: { displayName: 'You', emailAddress: 'you@company.com' },
            webViewLink: 'https://docs.google.com/document/d/demo-doc-1'
          }
        ],
        sheets: [
          {
            id: 'demo-sheet-1',
            name: 'Project Timeline & Budget',
            modifiedTime: new Date(Date.now() - 1800000).toISOString(),
            lastModifyingUser: { displayName: 'Team Member', emailAddress: 'team@company.com' },
            webViewLink: 'https://docs.google.com/spreadsheets/d/demo-sheet-1'
          }
        ],
        slides: [
          {
            id: 'demo-slides-1',
            name: 'Client Presentation - Strategy Overview',
            modifiedTime: new Date(Date.now() - 3600000).toISOString(),
            lastModifyingUser: { displayName: 'You', emailAddress: 'you@company.com' },
            webViewLink: 'https://docs.google.com/presentation/d/demo-slides-1'
          }
        ]
      };
      return mockFiles[type] || [];
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/drive/files?access_token=${this.accessToken}&type=${type}`
      );
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error(`Failed to fetch ${type} files:`, error);
      return [];
    }
  }

  // Activity Tracking
  async trackActivity(service: string, activity: any, duration: number): Promise<void> {
    if (duration < 0.05) return; // Don't track less than 3 minutes

    const timeEntry: Partial<TimeEntry> = {
      date: new Date().toISOString().split('T')[0],
      startTime: new Date(Date.now() - duration * 60 * 60 * 1000).toTimeString().slice(0, 5),
      endTime: new Date().toTimeString().slice(0, 5),
      duration,
      description: this.generateDescription(service, activity),
      category: this.categorizeActivity(service, activity),
      automated: true,
      source: service,
      billable: this.shouldBeBillable(activity),
      client: this.inferClient(activity),
      project: this.inferProject(activity)
    };

    await this.createTimeEntry(timeEntry);
  }

  private generateDescription(service: string, activity: any): string {
    switch (service) {
      case 'gmail':
        return `Email: ${activity.subject || 'Email Activity'}`;
      case 'calendar':
        return `Meeting: ${activity.summary || 'Calendar Event'}`;
      case 'docs':
        return `Document: ${activity.name || 'Google Doc'}`;
      case 'sheets':
        return `Spreadsheet: ${activity.name || 'Google Sheet'}`;
      case 'slides':
        return `Presentation: ${activity.name || 'Google Slides'}`;
      default:
        return `${service} activity`;
    }
  }

  private categorizeActivity(service: string, activity: any): string {
    const categoryMap = {
      gmail: 'communication',
      calendar: 'meeting',
      docs: 'documentation',
      sheets: 'analysis',
      slides: 'presentation'
    };
    return categoryMap[service as keyof typeof categoryMap] || 'productivity';
  }

  private shouldBeBillable(activity: any): boolean {
    // Simple heuristics - in production, use AI/ML
    const billableKeywords = ['client', 'project', 'meeting', 'proposal', 'deliverable'];
    const text = JSON.stringify(activity).toLowerCase();
    return billableKeywords.some(keyword => text.includes(keyword));
  }

  private inferClient(activity: any): string {
    // Extract client info from activity context
    const text = JSON.stringify(activity).toLowerCase();
    
    if (text.includes('salesforce')) return 'Salesforce';
    if (text.includes('hubspot')) return 'HubSpot';
    if (text.includes('zendesk')) return 'Zendesk';
    
    return 'Unknown Client';
  }

  private inferProject(activity: any): string {
    // Extract project info from activity context
    const text = JSON.stringify(activity).toLowerCase();
    
    if (text.includes('implementation')) return 'Implementation Project';
    if (text.includes('strategy')) return 'Strategy Consulting';
    if (text.includes('review')) return 'Project Review';
    
    return 'General Work';
  }

  private async createTimeEntry(timeEntry: Partial<TimeEntry>): Promise<void> {
    console.log('Creating time entry from Google activity:', timeEntry);
    
    const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
    const newEntry = {
      ...timeEntry,
      id: Date.now().toString(),
      status: 'pending'
    };
    
    existingEntries.push(newEntry);
    localStorage.setItem('timeEntries', JSON.stringify(existingEntries));
    
    window.dispatchEvent(new CustomEvent('timeEntryCreated', { detail: newEntry }));
  }

  disconnect(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('google_tokens');
    localStorage.removeItem('google_demo_token');
  }
}

// Global instance
export const googleService = new GoogleIntegrationService();