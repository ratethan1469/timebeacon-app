/**
 * Real-Time Email Activity Tracking Service
 * Tracks actual time spent reading, composing, and processing emails
 */

export interface EmailSession {
  id: string;
  emailId: string;
  type: 'reading' | 'composing' | 'replying';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  focusTime: number; // actual focused time (excluding idle)
  subject?: string;
  sender?: string;
  recipients?: string[];
  wordCount?: number;
}

export interface EmailActivity {
  sessions: EmailSession[];
  totalReadingTime: number;
  totalComposingTime: number;
  emailsProcessed: number;
  averageReadingTime: number;
  averageComposingTime: number;
}

class RealTimeEmailTrackingService {
  private currentSession: EmailSession | null = null;
  private sessions: EmailSession[] = [];
  private isTracking = false;
  private lastActivityTime = Date.now();
  private idleThreshold = 30000; // 30 seconds
  private focusTimeAccumulator = 0;
  private activityCheckInterval: number | null = null;

  constructor() {
    this.setupEventListeners();
    this.loadSessionsFromStorage();
  }

  /**
   * Start tracking when user opens/focuses on an email
   */
  startEmailSession(emailId: string, type: 'reading' | 'composing' | 'replying', metadata?: {
    subject?: string;
    sender?: string;
    recipients?: string[];
    wordCount?: number;
  }): void {
    // End any existing session first
    if (this.currentSession) {
      this.endCurrentSession();
    }

    console.log(`📧 Starting ${type} session for email:`, emailId);

    this.currentSession = {
      id: this.generateSessionId(),
      emailId,
      type,
      startTime: new Date(),
      focusTime: 0,
      ...metadata
    };

    this.isTracking = true;
    this.lastActivityTime = Date.now();
    this.focusTimeAccumulator = 0;
    
    // Start monitoring user activity
    this.startActivityMonitoring();

    // Track Gmail-specific events if available
    this.setupGmailEventListeners();
  }

  /**
   * End current email session
   */
  endCurrentSession(): EmailSession | null {
    if (!this.currentSession) {
      return null;
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - this.currentSession.startTime.getTime()) / 1000;

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;
    this.currentSession.focusTime = this.focusTimeAccumulator;

    console.log(`✅ Ended ${this.currentSession.type} session:`, {
      duration: `${Math.round(duration)}s`,
      focusTime: `${Math.round(this.focusTimeAccumulator)}s`,
      subject: this.currentSession.subject
    });

    // Save completed session
    this.sessions.push(this.currentSession);
    this.saveSessionsToStorage();

    // Create time entry if session was substantial
    if (duration > 10) { // Only track sessions longer than 10 seconds
      this.createTimeEntry(this.currentSession);
    }

    const completedSession = this.currentSession;
    this.currentSession = null;
    this.isTracking = false;
    
    this.stopActivityMonitoring();
    
    return completedSession;
  }

  /**
   * Pause tracking when user switches away from email
   */
  pauseCurrentSession(): void {
    if (this.isTracking && this.currentSession) {
      console.log('⏸️ Pausing email session (user switched away)');
      this.isTracking = false;
    }
  }

  /**
   * Resume tracking when user returns to email
   */
  resumeCurrentSession(): void {
    if (!this.isTracking && this.currentSession) {
      console.log('▶️ Resuming email session (user returned)');
      this.isTracking = true;
      this.lastActivityTime = Date.now();
    }
  }

  /**
   * Get today's email activity summary
   */
  getTodayActivity(): EmailActivity {
    const today = new Date().toDateString();
    const todaySessions = this.sessions.filter(session => 
      session.startTime.toDateString() === today && session.duration && session.duration > 10
    );

    const readingSessions = todaySessions.filter(s => s.type === 'reading');
    const composingSessions = todaySessions.filter(s => s.type === 'composing' || s.type === 'replying');

    const totalReadingTime = readingSessions.reduce((sum, s) => sum + (s.focusTime || 0), 0);
    const totalComposingTime = composingSessions.reduce((sum, s) => sum + (s.focusTime || 0), 0);

    return {
      sessions: todaySessions,
      totalReadingTime,
      totalComposingTime,
      emailsProcessed: todaySessions.length,
      averageReadingTime: readingSessions.length > 0 ? totalReadingTime / readingSessions.length : 0,
      averageComposingTime: composingSessions.length > 0 ? totalComposingTime / composingSessions.length : 0
    };
  }

  /**
   * Get email sessions for a specific date range
   */
  getSessionsInRange(startDate: Date, endDate: Date): EmailSession[] {
    return this.sessions.filter(session => 
      session.startTime >= startDate && session.startTime <= endDate
    );
  }

  private setupEventListeners(): void {
    // Track window focus/blur
    window.addEventListener('focus', () => {
      if (this.currentSession) {
        this.resumeCurrentSession();
      }
    });

    window.addEventListener('blur', () => {
      if (this.currentSession) {
        this.pauseCurrentSession();
      }
    });

    // Track mouse movement and keyboard activity
    ['mousedown', 'mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
      document.addEventListener(event, this.onUserActivity.bind(this), true);
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.endCurrentSession();
    });
  }

  private onUserActivity(): void {
    if (this.isTracking) {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivityTime;
      
      // If user was idle, don't count the idle time
      if (timeSinceLastActivity < this.idleThreshold) {
        this.focusTimeAccumulator += timeSinceLastActivity / 1000;
      }
      
      this.lastActivityTime = now;
    }
  }

  private startActivityMonitoring(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }

    // Check every 5 seconds if user is idle
    this.activityCheckInterval = setInterval(() => {
      if (this.isTracking) {
        const timeSinceLastActivity = Date.now() - this.lastActivityTime;
        
        if (timeSinceLastActivity >= this.idleThreshold) {
          console.log('💤 User appears idle, pausing tracking');
          this.pauseCurrentSession();
        }
      }
    }, 5000);
  }

  private stopActivityMonitoring(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  private setupGmailEventListeners(): void {
    // Gmail-specific event detection
    if (window.location.hostname.includes('mail.google.com')) {
      this.setupGmailObserver();
    }
  }

  private setupGmailObserver(): void {
    // Observer for Gmail interface changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Detect when compose window opens
        if (mutation.type === 'childList') {
          const composeWindows = document.querySelectorAll('[role="dialog"][aria-label*="compose"]');
          if (composeWindows.length > 0 && !this.isComposeSessionActive()) {
            this.startEmailSession('compose-' + Date.now(), 'composing', {
              subject: 'New Email'
            });
          }
        }
        
        // Detect email thread changes
        const emailContent = document.querySelector('[role="main"] [data-message-id]');
        if (emailContent && !this.isReadingSessionActive()) {
          const messageId = emailContent.getAttribute('data-message-id');
          const subject = document.querySelector('[data-legacy-thread-id] h2')?.textContent || 'Email';
          
          this.startEmailSession(messageId || 'email-' + Date.now(), 'reading', {
            subject
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private isComposeSessionActive(): boolean {
    return this.currentSession?.type === 'composing';
  }

  private isReadingSessionActive(): boolean {
    return this.currentSession?.type === 'reading';
  }

  private async createTimeEntry(session: EmailSession): Promise<void> {
    try {
      // Create time entry in TimeBeacon
      const timeEntry = {
        date: session.startTime.toISOString().split('T')[0],
        startTime: session.startTime.toTimeString().slice(0, 5),
        duration: (session.focusTime || 0) / 3600, // Convert to hours
        client: this.inferClientFromEmail(session),
        project: this.inferProjectFromEmail(session),
        description: this.formatEmailDescription(session),
        category: 'client' as const,
        source: 'gmail-realtime' as const,
        isAutomatic: true,
        tags: ['email', 'real-time-tracked', session.type]
      };

      // Import useTimeTracker dynamically to avoid circular dependencies
      const { useTimeTracker } = await import('../hooks/useTimeTracker');
      // Note: This is a simplified approach. In a real implementation,
      // you'd need to access the hook through a context or service
      
      console.log('📝 Creating time entry for email session:', timeEntry);
      
      // Store for later processing or send to backend
      this.storeTimeEntryForProcessing(timeEntry);
      
    } catch (error) {
      console.error('❌ Error creating time entry for email session:', error);
    }
  }

  private inferClientFromEmail(session: EmailSession): string {
    const email = session.sender || session.recipients?.[0] || '';
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (domain?.includes('acme')) return 'Acme Corp';
    if (domain?.includes('techstart')) return 'TechStart Inc';
    if (domain?.includes('zendesk')) return 'Zendesk Inc';
    if (domain?.includes('timebeacon.io')) return 'Internal';
    
    return 'Client Email';
  }

  private inferProjectFromEmail(session: EmailSession): string {
    const content = (session.subject || '').toLowerCase();
    
    if (content.includes('salesforce')) return 'Salesforce Integration';
    if (content.includes('monday')) return 'Monday.com Implementation';
    if (content.includes('zendesk')) return 'Zendesk Integration';
    
    return session.type === 'composing' ? 'Email Communication' : 'Email Processing';
  }

  private formatEmailDescription(session: EmailSession): string {
    const action = session.type === 'reading' ? 'Read' : 
                   session.type === 'composing' ? 'Composed' : 'Replied to';
    const subject = session.subject || 'Email';
    const duration = Math.round((session.focusTime || 0) / 60);
    
    return `${action}: ${subject} (${duration}min active time)`;
  }

  private storeTimeEntryForProcessing(timeEntry: any): void {
    // Store pending time entries for batch processing
    const pending = JSON.parse(localStorage.getItem('pending_email_time_entries') || '[]');
    pending.push({
      ...timeEntry,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('pending_email_time_entries', JSON.stringify(pending));
  }

  private generateSessionId(): string {
    return 'email_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private loadSessionsFromStorage(): void {
    try {
      const stored = localStorage.getItem('email_tracking_sessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.sessions = parsed.map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading email sessions:', error);
    }
  }

  private saveSessionsToStorage(): void {
    try {
      localStorage.setItem('email_tracking_sessions', JSON.stringify(this.sessions));
    } catch (error) {
      console.error('Error saving email sessions:', error);
    }
  }
}

export const realTimeEmailTracker = new RealTimeEmailTrackingService();

// Browser extension integration helper
export class EmailTrackingExtension {
  /**
   * Initialize email tracking for Gmail web interface
   */
  static initializeGmailTracking(): void {
    if (window.location.hostname.includes('mail.google.com')) {
      console.log('🔧 Initializing Gmail real-time tracking...');
      
      // Wait for Gmail to load
      const checkGmailLoaded = setInterval(() => {
        if (document.querySelector('[role="main"]')) {
          clearInterval(checkGmailLoaded);
          this.setupGmailHooks();
        }
      }, 1000);
    }
  }

  private static setupGmailHooks(): void {
    // Hook into Gmail's interface
    console.log('⚡ Setting up Gmail hooks for real-time tracking');
    
    // Monitor compose button clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Compose new email
      if (target.matches('[data-tooltip="Compose"]') || 
          target.closest('[data-tooltip="Compose"]')) {
        setTimeout(() => {
          realTimeEmailTracker.startEmailSession(
            'compose-' + Date.now(), 
            'composing',
            { subject: 'New Email' }
          );
        }, 500);
      }
      
      // Reply/Forward buttons
      if (target.matches('[data-tooltip*="Reply"]') || 
          target.closest('[data-tooltip*="Reply"]')) {
        const subject = document.querySelector('h2[data-legacy-thread-id]')?.textContent || 'Reply';
        setTimeout(() => {
          realTimeEmailTracker.startEmailSession(
            'reply-' + Date.now(),
            'replying',
            { subject: `Re: ${subject}` }
          );
        }, 500);
      }
    });

    // Monitor email thread selection
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const emailRow = target.closest('[role="row"]');
      
      if (emailRow && emailRow.querySelector('[email]')) {
        const subject = emailRow.querySelector('[data-tooltip]')?.getAttribute('data-tooltip') || 'Email';
        const sender = emailRow.querySelector('[email]')?.getAttribute('email') || '';
        
        setTimeout(() => {
          realTimeEmailTracker.startEmailSession(
            'read-' + Date.now(),
            'reading',
            { subject, sender }
          );
        }, 100);
      }
    });
  }
}

// Auto-initialize if on Gmail
if (typeof window !== 'undefined') {
  EmailTrackingExtension.initializeGmailTracking();
}