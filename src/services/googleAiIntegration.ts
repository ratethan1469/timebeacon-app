/**
 * Google AI Integration Service
 * Main orchestrator: Fetches Google data → Processes with AI → Updates Dashboard
 */

import { googleDataProcessor, type GoogleDataItem, type ProcessedTimeEntry } from './googleDataProcessor';
import type { TimeEntry } from '../types';

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  entries: ProcessedTimeEntry[];
  error?: string;
}

export interface SyncOptions {
  sources: ('gmail' | 'calendar' | 'drive')[];
  timeRange: 'today' | 'week' | 'month';
  autoConfirm: boolean; // Auto-confirm high confidence AI suggestions
}

export class GoogleAiIntegrationService {
  private accessToken: string | null = null;
  private isProcessing = false;

  /**
   * Set access token for Google API calls
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Main sync function: Google → AI → Dashboard
   */
  async syncGoogleDataWithAI(options: SyncOptions): Promise<SyncResult> {
    if (!this.accessToken) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        entries: [],
        error: 'No access token provided'
      };
    }

    if (this.isProcessing) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        entries: [],
        error: 'Sync already in progress'
      };
    }

    this.isProcessing = true;
    
    try {
      console.log('🚀 Starting Google → AI → Dashboard sync');
      
      // Step 1: Fetch raw data from Google APIs
      const googleData = await this.fetchGoogleData(options);
      console.log(`📥 Fetched ${googleData.length} items from Google`);
      
      // Step 2: Process with AI
      const processedEntries = await googleDataProcessor.processGoogleData(googleData);
      console.log(`🤖 AI processed ${processedEntries.length} entries`);
      
      // Step 3: Filter high confidence entries for auto-confirm
      const { confirmed, needsReview } = this.filterByConfidence(processedEntries, options.autoConfirm);
      
      // Step 4: Save to dashboard
      await this.saveToDashboard(confirmed);
      await this.saveForReview(needsReview);
      
      console.log(`✅ Sync complete: ${confirmed.length} confirmed, ${needsReview.length} need review`);
      
      return {
        success: true,
        processed: processedEntries.length,
        failed: googleData.length - processedEntries.length,
        entries: processedEntries
      };
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return {
        success: false,
        processed: 0,
        failed: 0,
        entries: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch raw data from Google APIs
   */
  private async fetchGoogleData(options: SyncOptions): Promise<GoogleDataItem[]> {
    const allData: GoogleDataItem[] = [];
    const baseUrl = 'http://localhost:3003'; // Your backend
    
    try {
      // Gmail data
      if (options.sources.includes('gmail')) {
        const gmailData = await this.fetchGmailData(baseUrl);
        allData.push(...gmailData);
      }
      
      // Calendar data
      if (options.sources.includes('calendar')) {
        const calendarData = await this.fetchCalendarData(baseUrl);
        allData.push(...calendarData);
      }
      
      // Drive data (Docs, Sheets, Slides)
      if (options.sources.includes('drive')) {
        const driveData = await this.fetchDriveData(baseUrl);
        allData.push(...driveData);
      }
      
    } catch (error) {
      console.error('Failed to fetch Google data:', error);
    }
    
    return this.filterByTimeRange(allData, options.timeRange);
  }

  /**
   * Fetch Gmail messages and convert to GoogleDataItem
   */
  private async fetchGmailData(baseUrl: string): Promise<GoogleDataItem[]> {
    const response = await fetch(`${baseUrl}/gmail/messages?access_token=${this.accessToken}`);
    
    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.messages || []).map((message: any) => ({
      id: message.id,
      type: 'gmail' as const,
      title: this.extractSubject(message),
      timestamp: this.extractTimestamp(message),
      metadata: {
        sender: this.extractSender(message),
        wordCount: this.estimateWordCount(message)
      },
      source: 'google_api' as const
    }));
  }

  /**
   * Fetch Calendar events and convert to GoogleDataItem
   */
  private async fetchCalendarData(baseUrl: string): Promise<GoogleDataItem[]> {
    const response = await fetch(`${baseUrl}/calendar/events?access_token=${this.accessToken}`);
    
    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.events || []).map((event: any) => ({
      id: event.id,
      type: 'calendar' as const,
      title: event.summary || 'Untitled Event',
      timestamp: event.start?.dateTime || event.start?.date,
      metadata: {
        participants: this.extractAttendees(event),
        duration: this.calculateDuration(event)
      },
      source: 'google_api' as const
    }));
  }

  /**
   * Fetch Drive files and convert to GoogleDataItem
   */
  private async fetchDriveData(baseUrl: string): Promise<GoogleDataItem[]> {
    const allFiles: GoogleDataItem[] = [];
    const fileTypes = ['docs', 'sheets', 'slides'];
    
    for (const type of fileTypes) {
      try {
        const response = await fetch(`${baseUrl}/drive/files?access_token=${this.accessToken}&type=${type}`);
        
        if (response.ok) {
          const data = await response.json();
          
          const files = (data.files || []).map((file: any) => ({
            id: file.id,
            type: `drive_${type.slice(0, -1)}` as const, // 'docs' -> 'drive_doc'
            title: file.name,
            timestamp: file.modifiedTime,
            metadata: {
              lastModified: file.modifiedTime
            },
            source: 'google_api' as const
          }));
          
          allFiles.push(...files);
        }
      } catch (error) {
        console.error(`Failed to fetch ${type}:`, error);
      }
    }
    
    return allFiles;
  }

  /**
   * Filter entries by AI confidence for auto-confirmation
   */
  private filterByConfidence(entries: ProcessedTimeEntry[], autoConfirm: boolean): {
    confirmed: ProcessedTimeEntry[];
    needsReview: ProcessedTimeEntry[];
  } {
    if (!autoConfirm) {
      return { confirmed: [], needsReview: entries };
    }
    
    const confirmed = entries.filter(entry => entry.aiAnalysis.confidence >= 0.8);
    const needsReview = entries.filter(entry => entry.aiAnalysis.confidence < 0.8);
    
    return { confirmed, needsReview };
  }

  /**
   * Save confirmed entries directly to dashboard
   */
  private async saveToDashboard(entries: ProcessedTimeEntry[]): Promise<void> {
    if (entries.length === 0) return;
    
    // Get existing time entries
    const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
    
    // Add new entries
    const updatedEntries = [...existingEntries, ...entries];
    
    // Save back to localStorage
    localStorage.setItem('timeEntries', JSON.stringify(updatedEntries));
    
    // Dispatch event to update UI
    window.dispatchEvent(new CustomEvent('timebeacon-entries-updated', {
      detail: { newEntries: entries, source: 'google_ai' }
    }));
    
    console.log(`💾 Saved ${entries.length} confirmed entries to dashboard`);
  }

  /**
   * Save entries that need review
   */
  private async saveForReview(entries: ProcessedTimeEntry[]): Promise<void> {
    if (entries.length === 0) return;
    
    // Store in separate review queue
    const reviewQueue = JSON.parse(localStorage.getItem('timebeacon_review_queue') || '[]');
    const updatedQueue = [...reviewQueue, ...entries];
    
    localStorage.setItem('timebeacon_review_queue', JSON.stringify(updatedQueue));
    
    // Dispatch event for review notification
    window.dispatchEvent(new CustomEvent('timebeacon-review-needed', {
      detail: { count: entries.length, entries }
    }));
    
    console.log(`⏳ Queued ${entries.length} entries for review`);
  }

  /**
   * Filter data by time range
   */
  private filterByTimeRange(data: GoogleDataItem[], timeRange: string): GoogleDataItem[] {
    const now = new Date();
    let cutoff: Date;
    
    switch (timeRange) {
      case 'today':
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }
    
    return data.filter(item => new Date(item.timestamp) >= cutoff);
  }

  // Helper methods for data extraction
  private extractSubject(message: any): string {
    const headers = message.payload?.headers || [];
    const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
    return subjectHeader?.value || 'No Subject';
  }

  private extractSender(message: any): string {
    const headers = message.payload?.headers || [];
    const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
    return fromHeader?.value || 'Unknown Sender';
  }

  private extractTimestamp(message: any): string {
    const headers = message.payload?.headers || [];
    const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
    return dateHeader?.value || new Date().toISOString();
  }

  private estimateWordCount(message: any): number {
    // Estimate based on message size (rough approximation)
    const size = message.sizeEstimate || 0;
    return Math.round(size / 6); // ~6 characters per word average
  }

  private extractAttendees(event: any): string[] {
    return (event.attendees || []).map((attendee: any) => attendee.email).filter(Boolean);
  }

  private calculateDuration(event: any): number {
    if (!event.start?.dateTime || !event.end?.dateTime) return 1;
    
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 100)) / 100; // Hours with 2 decimal places
  }

  /**
   * Get review queue for user approval
   */
  getReviewQueue(): ProcessedTimeEntry[] {
    return JSON.parse(localStorage.getItem('timebeacon_review_queue') || '[]');
  }

  /**
   * Approve a reviewed entry
   */
  async approveReviewedEntry(entryId: string, modifications?: Partial<TimeEntry>): Promise<void> {
    const reviewQueue = this.getReviewQueue();
    const entryIndex = reviewQueue.findIndex(entry => entry.id === entryId);
    
    if (entryIndex === -1) return;
    
    const entry = reviewQueue[entryIndex];
    
    // Apply modifications if provided
    if (modifications) {
      Object.assign(entry, modifications);
    }
    
    // Move to dashboard
    await this.saveToDashboard([entry]);
    
    // Remove from review queue
    reviewQueue.splice(entryIndex, 1);
    localStorage.setItem('timebeacon_review_queue', JSON.stringify(reviewQueue));
    
    console.log(`✅ Approved entry: ${entry.description}`);
  }
}

export const googleAiIntegration = new GoogleAiIntegrationService();