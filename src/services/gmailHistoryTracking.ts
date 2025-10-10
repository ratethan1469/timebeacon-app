/**
 * Gmail History-Based Email Tracking
 * Tracks only when emails are OPENED, and estimates duration from consecutive actions
 */

import { TimeEntry } from '../types';

interface EmailOpenEvent {
  emailId: string;
  messageId: string;
  subject: string;
  sender: string;
  openedAt: Date;
  closedAt?: Date;
  estimatedDuration?: number; // in minutes
  nextAction?: 'opened_another_email' | 'closed_gmail' | 'timeout';
}

interface HistoryRecord {
  id: string;
  messagesAdded?: Array<{
    message: {
      id: string;
      threadId: string;
      labelIds: string[];
    };
  }>;
  messagesDeleted?: Array<{
    message: {
      id: string;
    };
  }>;
  labelsAdded?: Array<{
    message: {
      id: string;
    };
    labelIds: string[];
  }>;
  labelsRemoved?: Array<{
    message: {
      id: string;
    };
    labelIds: string[];
  }>;
}

export class GmailHistoryTrackingService {
  private accessToken: string | null = null;
  private historyId: string | null = null;
  private emailSessions: Map<string, EmailOpenEvent> = new Map();
  private readonly API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  private checkInterval: number | null = null;

  constructor() {
    this.loadStoredState();
  }

  /**
   * Initialize tracking with access token
   */
  async initialize(accessToken: string): Promise<void> {
    this.accessToken = accessToken;

    // Get initial history ID
    await this.getInitialHistoryId();

    // Start checking for email opens every 30 seconds
    this.startTracking();

    console.log('✅ Gmail History Tracking initialized');
  }

  /**
   * Start tracking email open events
   */
  private startTracking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check for new email opens every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkForEmailOpens();
    }, 30000) as unknown as number;

    // Initial check
    this.checkForEmailOpens();
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get initial history ID from Gmail
   */
  private async getInitialHistoryId(): Promise<void> {
    if (!this.accessToken) return;

    try {
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const data = await response.json();
      this.historyId = data.historyId;
      this.saveState();

      console.log('📧 Initial history ID:', this.historyId);
    } catch (error) {
      console.error('Failed to get initial history ID:', error);
    }
  }

  /**
   * Check Gmail History API for email open events
   */
  private async checkForEmailOpens(): Promise<void> {
    if (!this.accessToken || !this.historyId) return;

    try {
      // Get history changes since last check
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/history?startHistoryId=${this.historyId}&historyTypes=labelAdded&historyTypes=labelRemoved`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // History ID is too old, reset
          await this.getInitialHistoryId();
          return;
        }
        throw new Error(`History API failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.history && data.history.length > 0) {
        await this.processHistory(data.history);

        // Update history ID for next check
        this.historyId = data.historyId;
        this.saveState();
      }
    } catch (error) {
      console.error('Error checking email opens:', error);
    }
  }

  /**
   * Process history records to detect email opens
   */
  private async processHistory(history: HistoryRecord[]): Promise<void> {
    for (const record of history) {
      // Email was opened when UNREAD label is removed
      if (record.labelsRemoved) {
        for (const change of record.labelsRemoved) {
          if (change.labelIds.includes('UNREAD')) {
            await this.handleEmailOpened(change.message.id);
          }
        }
      }
    }
  }

  /**
   * Handle when an email is opened (UNREAD label removed)
   */
  private async handleEmailOpened(messageId: string): Promise<void> {
    console.log('📧 Email opened:', messageId);

    // Close any previous session when a new email is opened
    this.closeAllActiveSessions('opened_another_email');

    // Get email details
    const emailDetails = await this.getEmailDetails(messageId);
    if (!emailDetails) return;

    // Start new session
    const session: EmailOpenEvent = {
      emailId: messageId,
      messageId: messageId,
      subject: emailDetails.subject,
      sender: emailDetails.sender,
      openedAt: new Date()
    };

    this.emailSessions.set(messageId, session);
    this.saveState();

    console.log(`📖 Started tracking: "${emailDetails.subject}"`);
  }

  /**
   * Close all active sessions with estimated duration
   */
  private closeAllActiveSessions(reason: EmailOpenEvent['nextAction']): void {
    const now = new Date();

    for (const [emailId, session] of this.emailSessions.entries()) {
      if (!session.closedAt) {
        // Calculate duration from when opened to now
        const durationMinutes = (now.getTime() - session.openedAt.getTime()) / (1000 * 60);

        // Only track if longer than 30 seconds
        if (durationMinutes >= 0.5) {
          session.closedAt = now;
          session.estimatedDuration = Math.round(durationMinutes);
          session.nextAction = reason;

          console.log(`✅ Closed session: "${session.subject}" - ${session.estimatedDuration}min`);

          // Create time entry
          this.createTimeEntry(session);
        } else {
          // Too short, remove the session
          this.emailSessions.delete(emailId);
        }
      }
    }

    this.saveState();
  }

  /**
   * Get email details from Gmail API
   */
  private async getEmailDetails(messageId: string): Promise<{
    subject: string;
    sender: string;
  } | null> {
    if (!this.accessToken) return null;

    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const data = await response.json();

      const headers = data.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';

      return { subject, sender: from };
    } catch (error) {
      console.error('Error getting email details:', error);
      return null;
    }
  }

  /**
   * Create time entry from email session
   */
  private async createTimeEntry(session: EmailOpenEvent): Promise<void> {
    if (!session.estimatedDuration || session.estimatedDuration < 1) return;

    try {
      const timeEntry: Partial<TimeEntry> = {
        date: session.openedAt.toISOString().split('T')[0],
        startTime: session.openedAt.toTimeString().slice(0, 5),
        duration: session.estimatedDuration / 60, // Convert to hours
        description: `Email: ${session.subject.substring(0, 100)} (from ${this.extractEmail(session.sender)})`,
        category: 'communication',
        automated: true,
        source: 'gmail-history',
        billable: this.shouldBeBillable(session.sender),
        client: this.inferClient(session.sender),
        project: this.inferProject(session.subject)
      };

      console.log('📝 Creating time entry:', timeEntry);

      // Store for processing by main app
      const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
      const newEntry = {
        ...timeEntry,
        id: `email-${session.messageId}`,
        status: 'pending'
      };

      existingEntries.push(newEntry);
      localStorage.setItem('timeEntries', JSON.stringify(existingEntries));

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('timeEntryCreated', { detail: newEntry }));
    } catch (error) {
      console.error('Failed to create time entry:', error);
    }
  }

  /**
   * Manually close active sessions (when user closes Gmail or app)
   */
  closeActiveSessions(): void {
    this.closeAllActiveSessions('closed_gmail');
  }

  /**
   * Get active email sessions
   */
  getActiveSessions(): EmailOpenEvent[] {
    return Array.from(this.emailSessions.values()).filter(s => !s.closedAt);
  }

  /**
   * Get today's email activity
   */
  getTodayActivity(): {
    emailsRead: number;
    totalMinutes: number;
    sessions: EmailOpenEvent[];
  } {
    const today = new Date().toDateString();
    const todaySessions = Array.from(this.emailSessions.values()).filter(
      s => s.openedAt.toDateString() === today && s.estimatedDuration
    );

    return {
      emailsRead: todaySessions.length,
      totalMinutes: todaySessions.reduce((sum, s) => sum + (s.estimatedDuration || 0), 0),
      sessions: todaySessions
    };
  }

  // Helper methods
  private extractEmail(fromHeader: string): string {
    const match = fromHeader.match(/<(.+?)>/);
    return match ? match[1] : fromHeader.split(' ')[0];
  }

  private shouldBeBillable(sender: string): boolean {
    const clientDomains = ['client.com', 'customer.org', 'acme.com'];
    return clientDomains.some(domain => sender.includes(domain));
  }

  private inferClient(sender: string): string {
    const email = this.extractEmail(sender);
    const domain = email.split('@')[1];

    const domainToClient: Record<string, string> = {
      'salesforce.com': 'Salesforce',
      'hubspot.com': 'HubSpot',
      'zendesk.com': 'Zendesk',
      'acme.com': 'Acme Corp'
    };

    return domainToClient[domain] || 'Email Client';
  }

  private inferProject(subject: string): string {
    const content = subject.toLowerCase();

    const keywords: Record<string, string> = {
      'crm': 'CRM Project',
      'marketing': 'Marketing Campaign',
      'support': 'Support Portal',
      'integration': 'Integration Project'
    };

    for (const [keyword, project] of Object.entries(keywords)) {
      if (content.includes(keyword)) return project;
    }

    return 'Email Communication';
  }

  // State persistence
  private loadStoredState(): void {
    try {
      const stored = localStorage.getItem('gmail_history_tracking');
      if (stored) {
        const state = JSON.parse(stored);
        this.historyId = state.historyId;

        // Restore sessions
        if (state.sessions) {
          this.emailSessions = new Map(
            state.sessions.map((s: any) => [
              s.emailId,
              {
                ...s,
                openedAt: new Date(s.openedAt),
                closedAt: s.closedAt ? new Date(s.closedAt) : undefined
              }
            ])
          );
        }
      }
    } catch (error) {
      console.error('Error loading tracking state:', error);
    }
  }

  private saveState(): void {
    try {
      const state = {
        historyId: this.historyId,
        sessions: Array.from(this.emailSessions.values())
      };
      localStorage.setItem('gmail_history_tracking', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving tracking state:', error);
    }
  }
}

export const gmailHistoryTracker = new GmailHistoryTrackingService();
