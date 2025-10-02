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
      const emails: EmailData[] = emailData.messages || [];
      
      console.log(`📧 Found ${emails.length} emails to process`);
      
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
        throw new Error(`Calendar API error: ${calendarResponse.statusText}`);
      }
      
      const calendarData = await calendarResponse.json();
      const events: CalendarEventData[] = calendarData.items || [];
      
      // Filter to only meetings (not all-day events)
      const meetings = events.filter(event => 
        event.start && event.end && 
        !event.start.includes('T00:00:00') // Skip all-day events
      );
      
      console.log(`📅 Found ${meetings.length} meetings to process`);
      
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
  
  private async processMeetingToTimeEntry(meeting: CalendarEventData): Promise<any | null> {
    try {
      // Calculate actual meeting duration
      const startTime = new Date(meeting.start);
      const endTime = new Date(meeting.end);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // Determine project/client from attendees or meeting title
      const { client, project } = this.matchMeetingToProject(meeting);
      
      // Create time entry
      const timeEntry = {
        date: meeting.start.split('T')[0],
        startTime: startTime.toTimeString().slice(0, 5),
        duration: durationHours,
        client,
        project,
        description: meeting.summary || 'Meeting',
        category: this.determineMeetingCategory(meeting),
        source: 'calendar' as const,
        isAutomatic: true,
        meetingType: this.determineMeetingType(meeting),
        tags: ['meeting', 'imported', 'ai-processed']
      };
      
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