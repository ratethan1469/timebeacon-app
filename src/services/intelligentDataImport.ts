/**
 * Intelligent Data Import Service
 * Fetches data from Gmail and Calendar APIs, processes with AI, and creates time entries
 */

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
  private backendUrl = 'http://localhost:3001';
  
  async importGmailData(tokens: any): Promise<ImportResult> {
    try {
      console.log('📧 Starting Gmail data import...');
      
      // Get this week's date range
      const { startDate, endDate } = this.getWeekDateRange();
      
      // Fetch Gmail messages from backend
      const emailResponse = await fetch(`${this.backendUrl}/api/google/gmail/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: JSON.stringify(tokens),
          startDate,
          endDate,
          maxResults: 50
        })
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
          errors.push(`Email ${email.subject}: ${error.message}`);
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
        errors: [error.message],
        timeEntries: []
      };
    }
  }
  
  async importCalendarData(tokens: any): Promise<ImportResult> {
    try {
      console.log('📅 Starting Calendar data import...');
      
      // Get this week's date range
      const { startDate, endDate } = this.getWeekDateRange();
      
      // Fetch Calendar events from backend
      const calendarResponse = await fetch(`${this.backendUrl}/api/google/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: JSON.stringify(tokens),
          timeMin: startDate,
          timeMax: endDate,
          maxResults: 50
        })
      });
      
      if (!calendarResponse.ok) {
        throw new Error(`Calendar API error: ${calendarResponse.statusText}`);
      }
      
      const calendarData = await calendarResponse.json();
      const events: CalendarEventData[] = calendarData.events || [];
      
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
          errors.push(`Meeting ${meeting.summary}: ${error.message}`);
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
        errors: [error.message],
        timeEntries: []
      };
    }
  }
  
  private async processEmailToTimeEntry(email: EmailData): Promise<any | null> {
    try {
      // Estimate time spent on email
      const estimatedMinutes = this.estimateEmailTime(email);
      
      // Determine project/client from email domain or content
      const { client, project } = this.matchEmailToProject(email);
      
      // Create time entry
      const timeEntry = {
        date: email.timestamp.split('T')[0],
        startTime: new Date(email.timestamp).toTimeString().slice(0, 5),
        duration: estimatedMinutes / 60, // Convert to hours
        client,
        project,
        description: `Email: ${email.subject}`,
        category: this.determineEmailCategory(email),
        source: 'gmail' as const,
        isAutomatic: true,
        tags: ['email', 'imported', 'ai-processed']
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
  
  private estimateEmailTime(email: EmailData): number {
    // Simple AI-like estimation based on word count and thread length
    const baseReadTime = Math.max(2, email.wordCount / 250); // ~250 words per minute reading
    const composeTime = email.threadLength > 1 ? baseReadTime * 0.5 : 0; // Estimate compose time for replies
    const complexityMultiplier = email.wordCount > 200 ? 1.5 : 1; // Complex emails take longer
    
    return Math.round((baseReadTime + composeTime) * complexityMultiplier);
  }
  
  private matchEmailToProject(email: EmailData): { client: string; project: string } {
    // Extract domain from sender
    const domain = email.sender.split('@')[1]?.toLowerCase();
    
    // Simple domain-based matching (in production, this would use AI/LLM)
    if (domain?.includes('acme') || domain?.includes('acmecorp')) {
      return { client: 'Acme Corp', project: 'Salesforce Integration' };
    } else if (domain?.includes('techstart') || domain?.includes('startup')) {
      return { client: 'TechStart Inc', project: 'Monday.com Implementation' };
    } else if (domain?.includes('zendesk')) {
      return { client: 'Zendesk Inc', project: 'Zendesk Integration' };
    } else if (domain?.includes('timebeacon.io')) {
      return { client: 'Internal', project: 'Internal Operations' };
    }
    
    // Default fallback
    return { client: 'External Client', project: 'Client Communication' };
  }
  
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
}

export const intelligentDataImportService = new IntelligentDataImportService();