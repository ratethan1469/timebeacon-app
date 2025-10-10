/**
 * Intelligent Data Import Service
 * Phase 1: Smart estimation with user confirmation
 * Phase 2: Browser extension integration ready
 * Fetches data from Gmail and Calendar APIs, processes intelligently, and creates time entries
 */

import { emailTimeTracker } from './emailTimeTracking';

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
  timeEntries: any[];
}

export interface EmailData {
  id: string;
  subject: string;
  sender: string;
  recipients: string[];
  timestamp: string;
  wordCount: number;
  snippet: string;
  threadLength: number;
}

export interface CalendarEventData {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees: string[];
  description?: string;
  location?: string;
}

export class IntelligentDataImportService {

  async importGmailData(tokens: any): Promise<ImportResult> {
    try {
      console.log('📧 Starting Gmail data import...');

      // Get this week's date range
      const { startDate, endDate } = this.getWeekDateRange();

      // Fetch Gmail messages directly from Google API
      const emailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=after:${Math.floor(new Date(startDate).getTime() / 1000)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!emailResponse.ok) {
        throw new Error(`Gmail API error: ${emailResponse.statusText}`);
      }
      
      const emailData = await emailResponse.json();
      const messageIds = emailData.messages || [];

      console.log(`📧 Found ${messageIds.length} email IDs, fetching details...`);

      // Fetch full details for each message
      const emails: EmailData[] = [];
      for (const msg of messageIds.slice(0, 10)) { // Limit to 10 emails to avoid rate limits
        try {
          const msgResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
            }
          });

          if (msgResponse.ok) {
            const fullMessage = await msgResponse.json();
            const headers = fullMessage.payload?.headers || [];
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find((h: any) => h.name === 'From')?.value || '';
            const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

            emails.push({
              id: fullMessage.id,
              subject: subject,
              sender: from,
              recipients: [],
              timestamp: date,
              wordCount: 0,
              snippet: fullMessage.snippet || '',
              threadLength: 1
            });
          }
        } catch (error) {
          console.error(`Failed to fetch message ${msg.id}:`, error);
        }
      }

      console.log(`📧 Successfully fetched ${emails.length} full emails`);

      // Process each email and create time entries
      const timeEntries = [];
      const errors = [];

      for (const email of emails) {
        try {
          const timeEntry = await this.processEmailToTimeEntry(email);
          if (timeEntry) {
            timeEntries.push(timeEntry);
          }
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          errors.push(`Email ${email.subject}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      console.log(`✅ Gmail import completed: ${timeEntries.length} time entries created`);
      
      return {
        success: true,
        importedCount: timeEntries.length,
        errors,
        timeEntries
      };
      
    } catch (error) {
      console.error('❌ Gmail import failed:', error);
      return {
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        timeEntries: []
      };
    }
  }
  
  async importCalendarData(tokens: any): Promise<ImportResult> {
    try {
      console.log('📅 Starting Calendar data import...');
      
      // Get this week's date range
      const { startDate, endDate } = this.getWeekDateRange();
      
      // Fetch Calendar events directly from Google API
      const calendarResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date(startDate).toISOString()}&timeMax=${new Date(endDate).toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('📅 Calendar API error response:', errorText);
        throw new Error(`Calendar API error: ${calendarResponse.status} ${calendarResponse.statusText} - ${errorText}`);
      }

      const calendarData = await calendarResponse.json();
      const events: CalendarEventData[] = calendarData.items || [];

      console.log(`📅 Raw events from Google Calendar:`, events.length);
      console.log('📅 Sample events:', events.slice(0, 3));

      // Filter to only meetings (not all-day events)
      // Google Calendar events have start.dateTime for timed events, start.date for all-day
      const meetings = events.filter(event => {
        // Check if event has dateTime (not just date for all-day events)
        const hasDateTime = event.start?.dateTime && event.end?.dateTime;
        return hasDateTime;
      });

      console.log(`📅 Found ${meetings.length} meetings to process (filtered from ${events.length} total events)`);
      
      // Process each meeting and create time entries
      const timeEntries = [];
      const errors = [];
      
      for (const meeting of meetings) {
        try {
          const timeEntry = await this.processMeetingToTimeEntry(meeting);
          if (timeEntry) {
            timeEntries.push(timeEntry);
          }
        } catch (error) {
          console.error(`Error processing meeting ${meeting.id}:`, error);
          errors.push(`Meeting ${meeting.summary}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      console.log(`✅ Calendar import completed: ${timeEntries.length} time entries created`);
      
      return {
        success: true,
        importedCount: timeEntries.length,
        errors,
        timeEntries
      };
      
    } catch (error) {
      console.error('❌ Calendar import failed:', error);
      return {
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        timeEntries: []
      };
    }
  }
  
  private async processEmailToTimeEntry(email: EmailData): Promise<any | null> {
    try {
      // Use the new email time tracking service for intelligent processing
      const emailTimeData = emailTimeTracker.processEmailTime({
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        recipients: email.recipients,
        timestamp: new Date(email.timestamp),
        wordCount: email.wordCount,
        threadLength: email.threadLength,
        hasAttachments: email.snippet?.includes('attachment') || false
      });
      
      // Convert to time entry format
      const timeEntry = {
        date: emailTimeData.timestamp.toISOString().split('T')[0],
        startTime: emailTimeData.timestamp.toTimeString().slice(0, 5),
        duration: emailTimeData.finalMinutes / 60, // Convert to hours
        client: this.inferClient(email.sender),
        project: this.inferProject(email.subject, email.sender),
        description: `Email: ${email.subject} (${emailTimeData.finalMinutes}min, ${Math.round(emailTimeData.confidence * 100)}% confidence)`,
        category: this.determineEmailCategory(email),
        source: emailTimeData.source === 'extension' ? 'gmail-tracked' as const : 'gmail' as const,
        isAutomatic: true,
        needsReview: emailTimeData.needsReview,
        tags: ['email', 'imported', emailTimeData.source, `confidence-${Math.round(emailTimeData.confidence * 100)}`]
      };
      
      return timeEntry;
    } catch (error) {
      console.error('Error processing email to time entry:', error);
      return null;
    }
  }
  
  private async processMeetingToTimeEntry(meeting: any): Promise<any | null> {
    try {
      // Google Calendar events have start.dateTime and end.dateTime for timed events
      const startDateTime = meeting.start?.dateTime || meeting.start?.date;
      const endDateTime = meeting.end?.dateTime || meeting.end?.date;

      if (!startDateTime || !endDateTime) {
        console.log('⚠️ Skipping event without start/end time:', meeting.summary);
        return null;
      }

      // Calculate actual meeting duration
      const startTime = new Date(startDateTime);
      const endTime = new Date(endDateTime);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      // Skip very short meetings (< 5 minutes)
      if (durationHours < 0.08) {
        console.log('⚠️ Skipping very short meeting:', meeting.summary, durationHours);
        return null;
      }

      // Determine project/client from attendees or meeting title
      const attendeeEmails = (meeting.attendees || []).map((a: any) => a.email);
      const { client, project } = this.matchMeetingToProject({
        ...meeting,
        attendees: attendeeEmails
      });

      // Create time entry
      const timeEntry = {
        date: startDateTime.split('T')[0],
        startTime: startTime.toTimeString().slice(0, 5),
        duration: durationHours,
        client,
        project,
        description: meeting.summary || 'Meeting',
        category: this.determineMeetingCategory(meeting),
        source: 'calendar' as const,
        isAutomatic: true,
        meetingType: this.determineMeetingType(meeting),
        tags: ['meeting', 'imported', 'calendar']
      };

      console.log('✅ Created time entry for meeting:', meeting.summary, `(${durationHours.toFixed(2)}h)`);

      return timeEntry;
    } catch (error) {
      console.error('Error processing meeting to time entry:', error);
      return null;
    }
  }
  
  // Email time estimation moved to emailTimeTracking service
  
  // Email project matching moved to emailTimeTracking service
  
  private matchMeetingToProject(meeting: CalendarEventData): { client: string; project: string } {
    const title = meeting.summary?.toLowerCase() || '';
    const attendeeEmails = meeting.attendees.join(' ').toLowerCase();
    
    // Match by title keywords or attendee domains
    if (title.includes('salesforce') || attendeeEmails.includes('acmecorp.com')) {
      return { client: 'Acme Corp', project: 'Salesforce Integration' };
    } else if (title.includes('monday') || attendeeEmails.includes('techstart.io')) {
      return { client: 'TechStart Inc', project: 'Monday.com Implementation' };
    } else if (title.includes('standup') || title.includes('internal')) {
      return { client: 'Internal', project: 'Internal Operations' };
    } else if (attendeeEmails.includes('zendesk.com')) {
      return { client: 'Zendesk Inc', project: 'Zendesk Integration' };
    }
    
    // Check if external attendees (client meeting)
    const externalAttendees = meeting.attendees.filter(email => 
      !email.includes('timebeacon.io')
    );
    
    if (externalAttendees.length > 0) {
      return { client: 'External Client', project: 'Client Meeting' };
    }
    
    return { client: 'Internal', project: 'Internal Operations' };
  }
  
  private determineEmailCategory(email: EmailData): 'client' | 'internal' {
    const domain = email.sender.split('@')[1]?.toLowerCase();
    return domain?.includes('timebeacon.io') ? 'internal' : 'client';
  }
  
  private determineMeetingCategory(meeting: CalendarEventData): 'client' | 'internal' {
    const attendeeEmails = meeting.attendees.join(' ').toLowerCase();
    const hasExternalAttendees = meeting.attendees.some(email => 
      !email.includes('timebeacon.io')
    );
    return hasExternalAttendees ? 'client' : 'internal';
  }
  
  private determineMeetingType(meeting: CalendarEventData): 'check-in' | 'planning' | 'review' | 'workshop' {
    const title = meeting.summary?.toLowerCase() || '';
    
    if (title.includes('standup') || title.includes('check-in') || title.includes('sync')) {
      return 'check-in';
    } else if (title.includes('planning') || title.includes('roadmap') || title.includes('strategy')) {
      return 'planning';
    } else if (title.includes('review') || title.includes('demo') || title.includes('retrospective')) {
      return 'review';
    } else if (title.includes('workshop') || title.includes('training') || title.includes('deep dive')) {
      return 'workshop';
    }
    
    return 'check-in'; // Default
  }
  
  private getWeekDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days to go back to Monday
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    // Get Monday of this week
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Get Friday of this week
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    
    return {
      startDate: monday.toISOString(),
      endDate: friday.toISOString()
    };
  }

  private inferClient(senderEmail: string): string {
    const domain = senderEmail.split('@')[1]?.toLowerCase();
    
    if (domain?.includes('acme')) return 'Acme Corp';
    if (domain?.includes('techstart')) return 'TechStart Inc';
    if (domain?.includes('zendesk')) return 'Zendesk Inc';
    if (domain?.includes('timebeacon.io')) return 'Internal';
    
    return 'Email Client';
  }

  private inferProject(subject: string, senderEmail: string): string {
    const content = subject.toLowerCase();
    
    if (content.includes('salesforce')) return 'Salesforce Integration';
    if (content.includes('monday')) return 'Monday.com Implementation';
    if (content.includes('zendesk')) return 'Zendesk Integration';
    
    return 'Email Communication';
  }
}

export const intelligentDataImportService = new IntelligentDataImportService();