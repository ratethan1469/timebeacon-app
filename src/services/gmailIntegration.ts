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
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata'
  ];

  constructor() {
    this.loadGoogleAPI();
  }

  private async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && !window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('auth2', () => {
            window.gapi.auth2.init({
              client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID
            });
            resolve();
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
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn({
        scope: this.SCOPES.join(' ')
      });
      
      this.accessToken = user.getAuthResponse().access_token;
      return true;
    } catch (error) {
      console.error('Gmail authentication failed:', error);
      return false;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.accessToken) return false;
    
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

    try {
      // Get list of message IDs
      const listResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:unread OR newer_than:7d`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const listData = await listResponse.json();
      if (!listData.messages) return [];

      // Get full message details
      const messages = await Promise.all(
        listData.messages.slice(0, 10).map(async (msg: { id: string }) => {
          const msgResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`
              }
            }
          );
          return msgResponse.json();
        })
      );

      return messages;
    } catch (error) {
      console.error('Failed to fetch emails:', error);
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