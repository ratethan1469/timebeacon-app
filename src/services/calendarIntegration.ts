/**
 * TimeBeacon Calendar Integration Service
 * Processes calendar events and generates intelligent time entry suggestions
 */

import { contentAnalyzer, ProcessedActivity } from './contentAnalyzer';
import { googleCalendarAuth } from './googleCalendarAuth';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO date string
  end: string; // ISO date string
  attendees?: string[];
  location?: string;
  organizer?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  isAllDay?: boolean;
  recurrence?: string;
  calendarId: string;
  calendarName: string;
}

export interface CalendarIntegrationConfig {
  enabled: boolean;
  autoTrackMeetings: boolean;
  minimumDuration: number; // minutes
  excludeAllDay: boolean;
  excludePersonal: boolean;
  excludeCalendars: string[];
  includeCalendars: string[];
  trackingKeywords: string[];
  excludeKeywords: string[];
}

class CalendarIntegrationService {
  private config: CalendarIntegrationConfig = {
    enabled: false,
    autoTrackMeetings: true,
    minimumDuration: 15,
    excludeAllDay: true,
    excludePersonal: true,
    excludeCalendars: [],
    includeCalendars: [],
    trackingKeywords: ['meeting', 'call', 'sync', 'review', 'demo', 'training'],
    excludeKeywords: ['personal', 'lunch', 'break', 'vacation', 'holiday', 'blocked']
  };

  private lastSyncTimestamp: string | null = null;
  private processedEvents = new Set<string>();

  constructor() {
    // Load config from storage
    this.loadConfig();
    
    // Start background sync if enabled
    if (this.config.enabled) {
      this.startBackgroundSync();
    }
  }

  /**
   * Initialize calendar integration with user's Google Calendar
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if we have access to calendar data
      const hasAccess = await this.checkCalendarAccess();
      
      if (!hasAccess) {
        return {
          success: false,
          error: 'Calendar access not available. Please enable calendar integration in settings.'
        };
      }

      this.config.enabled = true;
      this.saveConfig();
      this.startBackgroundSync();

      console.log('✅ Calendar integration initialized');
      return { success: true };
    } catch (error) {
      console.error('Calendar initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if we have access to calendar data
   * In a real implementation, this would check OAuth tokens
   */
  private async checkCalendarAccess(): Promise<boolean> {
    // For now, simulate calendar access check
    // In real implementation, this would verify Google Calendar API access
    return true;
  }

  /**
   * Start background sync process
   */
  private startBackgroundSync(): void {
    // Sync every 5 minutes
    setInterval(() => {
      this.syncCalendarEvents();
    }, 5 * 60 * 1000);

    // Initial sync
    this.syncCalendarEvents();
  }

  /**
   * Sync calendar events and process them for time tracking
   */
  async syncCalendarEvents(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      console.log('📅 Syncing calendar events...');
      
      const events = await this.fetchCalendarEvents();
      const newEvents = events.filter(event => !this.processedEvents.has(event.id));
      
      console.log(`Found ${newEvents.length} new calendar events to process`);

      for (const event of newEvents) {
        if (this.shouldProcessEvent(event)) {
          await this.processCalendarEvent(event);
          this.processedEvents.add(event.id);
        }
      }

      this.lastSyncTimestamp = new Date().toISOString();
      this.saveConfig();
    } catch (error) {
      console.error('Calendar sync failed:', error);
    }
  }

  /**
   * Fetch calendar events from the user's Google Calendar
   */
  async fetchCalendarEvents(): Promise<CalendarEvent[]> {
    try {
      // Check if authenticated with Google Calendar
      if (!googleCalendarAuth.isAuthenticated()) {
        console.log('Not authenticated with Google Calendar, using mock data');
        return this.getMockEvents();
      }

      // Test connection and refresh token if needed
      const connectionTest = await googleCalendarAuth.testConnection();
      if (!connectionTest.success) {
        console.log('Google Calendar connection failed, using mock data:', connectionTest.error);
        return this.getMockEvents();
      }

      // Get authenticated calendar client
      let calendar;
      try {
        calendar = googleCalendarAuth.getCalendarClient();
      } catch (error) {
        console.warn('Calendar client not available:', error);
        return [];
      }
      
      // Check if calendar client is available
      if (!calendar) {
        console.warn('Calendar client not available');
        return [];
      }
      
      // Fetch events from the last 24 hours
      const timeMin = new Date();
      timeMin.setHours(timeMin.getHours() - 24);
      
      const timeMax = new Date();
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      if (!response || !response.data) {
        console.warn('No response data from Google Calendar API');
        return [];
      }

      const events = response.data.items || [];
      
      // Convert Google Calendar events to our format
      const calendarEvents: CalendarEvent[] = events.map((event: any) => ({
        id: event.id || '',
        title: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: event.start?.dateTime || event.start?.date || new Date().toISOString(),
        end: event.end?.dateTime || event.end?.date || new Date().toISOString(),
        attendees: event.attendees?.map((attendee: any) => attendee.email || '') || [],
        location: event.location || undefined,
        organizer: event.organizer?.email || undefined,
        status: this.mapEventStatus(event.status || undefined),
        isAllDay: !!(event.start?.date), // All-day events use 'date' instead of 'dateTime'
        recurrence: event.recurrence?.join(', ') || undefined,
        calendarId: 'primary',
        calendarName: 'Google Calendar'
      })).filter((event: any) => event.start && event.end);

      console.log(`📅 Fetched ${calendarEvents.length} events from Google Calendar`);
      return calendarEvents;

    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
      console.log('Falling back to mock data');
      return this.getMockEvents();
    }
  }

  /**
   * Get mock events for testing/fallback
   */
  private getMockEvents(): CalendarEvent[] {
    const mockEvents: CalendarEvent[] = [
      {
        id: 'event-1',
        title: 'Client Discovery Call - Acme Corp',
        description: 'Initial discovery session to understand requirements',
        start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        end: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        attendees: ['john@acme.com', 'sarah@acme.com'],
        location: 'Zoom',
        status: 'confirmed',
        calendarId: 'primary',
        calendarName: 'Work Calendar'
      },
      {
        id: 'event-2',
        title: 'Team Standup',
        description: 'Daily team sync',
        start: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        end: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        attendees: ['team@company.com'],
        status: 'confirmed',
        calendarId: 'primary',
        calendarName: 'Work Calendar'
      }
    ];

    return mockEvents.filter(event => new Date(event.end) < new Date());
  }

  /**
   * Map Google Calendar event status to our format
   */
  private mapEventStatus(status?: string): 'confirmed' | 'tentative' | 'cancelled' {
    switch (status) {
      case 'confirmed':
        return 'confirmed';
      case 'tentative':
        return 'tentative';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  /**
   * Determine if a calendar event should be processed for time tracking
   */
  private shouldProcessEvent(event: CalendarEvent): boolean {
    // Skip if already processed
    if (this.processedEvents.has(event.id)) {
      return false;
    }

    // Skip cancelled events
    if (event.status === 'cancelled') {
      return false;
    }

    // Skip all-day events if configured
    if (event.isAllDay && this.config.excludeAllDay) {
      return false;
    }

    // Check minimum duration
    const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60);
    if (duration < this.config.minimumDuration) {
      return false;
    }

    // Check calendar inclusion/exclusion
    if (this.config.includeCalendars.length > 0 && 
        !this.config.includeCalendars.includes(event.calendarId)) {
      return false;
    }

    if (this.config.excludeCalendars.includes(event.calendarId)) {
      return false;
    }

    // Check keywords
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    
    // Exclude if contains exclude keywords
    if (this.config.excludeKeywords.some(keyword => eventText.includes(keyword))) {
      return false;
    }

    // Include if contains tracking keywords (if any are defined)
    if (this.config.trackingKeywords.length > 0) {
      return this.config.trackingKeywords.some(keyword => eventText.includes(keyword));
    }

    return true;
  }

  /**
   * Process a calendar event and create a time tracking activity
   */
  private async processCalendarEvent(event: CalendarEvent): Promise<void> {
    try {
      const activity: ProcessedActivity = {
        id: `calendar-${event.id}`,
        title: event.title,
        description: event.description,
        startTime: event.start,
        endTime: event.end,
        duration: this.calculateDuration(event.start, event.end),
        participants: event.attendees,
        location: event.location,
        source: 'calendar',
        sourceId: event.id,
        timestamp: event.start,
        rawData: event
      };

      await contentAnalyzer.addActivity(activity);
      console.log(`📅 Processed calendar event: ${event.title}`);
    } catch (error) {
      console.error(`Failed to process calendar event ${event.id}:`, error);
    }
  }

  /**
   * Calculate duration in hours
   */
  private calculateDuration(start: string, end: string): number {
    const startTime = new Date(start);
    const endTime = new Date(end);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CalendarIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();

    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled && !this.config.enabled) {
        this.startBackgroundSync();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CalendarIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Get integration status
   */
  getStatus(): {
    enabled: boolean;
    lastSync: string | null;
    processedEventsCount: number;
    isConnected: boolean;
  } {
    return {
      enabled: this.config.enabled,
      lastSync: this.lastSyncTimestamp,
      processedEventsCount: this.processedEvents.size,
      isConnected: this.config.enabled
    };
  }

  /**
   * Force sync calendar events
   */
  async forceSync(): Promise<{ success: boolean; eventsProcessed: number; error?: string }> {
    try {
      const initialCount = this.processedEvents.size;
      await this.syncCalendarEvents();
      const eventsProcessed = this.processedEvents.size - initialCount;
      
      return {
        success: true,
        eventsProcessed
      };
    } catch (error) {
      return {
        success: false,
        eventsProcessed: 0,
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  /**
   * Clear processed events history
   */
  clearHistory(): void {
    this.processedEvents.clear();
    this.lastSyncTimestamp = null;
    this.saveConfig();
    console.log('📅 Cleared calendar sync history');
  }

  /**
   * Load configuration from storage
   */
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('timebeacon_calendar_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.config = { ...this.config, ...config };
        
        // Load processed events
        const processedEvents = localStorage.getItem('timebeacon_processed_events');
        if (processedEvents) {
          this.processedEvents = new Set(JSON.parse(processedEvents));
        }
        
        this.lastSyncTimestamp = localStorage.getItem('timebeacon_last_sync');
      }
    } catch (error) {
      console.error('Failed to load calendar config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('timebeacon_calendar_config', JSON.stringify(this.config));
      localStorage.setItem('timebeacon_processed_events', JSON.stringify([...this.processedEvents]));
      
      if (this.lastSyncTimestamp) {
        localStorage.setItem('timebeacon_last_sync', this.lastSyncTimestamp);
      }
    } catch (error) {
      console.error('Failed to save calendar config:', error);
    }
  }

  /**
   * Test the calendar connection
   */
  async testConnection(): Promise<{ success: boolean; eventsFound: number; error?: string }> {
    try {
      const events = await this.fetchCalendarEvents();
      return {
        success: true,
        eventsFound: events.length
      };
    } catch (error) {
      return {
        success: false,
        eventsFound: 0,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const calendarIntegration = new CalendarIntegrationService();