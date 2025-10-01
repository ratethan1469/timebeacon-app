/**
 * Google Data to AI Pipeline
 * Processes raw Google data and sends to AI for contextualization
 */

import { aiService, type ContentAnalysisRequest } from './aiService';
import type { TimeEntry, Project, Client } from '../types';

export interface GoogleDataItem {
  id: string;
  type: 'gmail' | 'calendar' | 'drive_doc' | 'drive_sheet' | 'drive_slide';
  title: string;
  timestamp: string;
  metadata: {
    participants?: string[];
    sender?: string;
    duration?: number;
    wordCount?: number;
    lastModified?: string;
  };
  source: 'google_api';
}

export interface ProcessedTimeEntry extends TimeEntry {
  aiAnalysis: {
    confidence: number;
    reasoning: string;
    suggestedTags: string[];
  };
}

export class GoogleDataProcessor {
  private projects: Project[] = [];
  private clients: Client[] = [];

  constructor() {
    this.loadContext();
  }

  /**
   * Main processing function: Google Data → AI → Time Entries
   */
  async processGoogleData(
    googleDataItems: GoogleDataItem[]
  ): Promise<ProcessedTimeEntry[]> {
    console.log(`🤖 Processing ${googleDataItems.length} Google data items with AI`);
    
    const processedEntries: ProcessedTimeEntry[] = [];
    
    for (const item of googleDataItems) {
      try {
        // Convert Google data to AI analysis request
        const analysisRequest = this.convertToAnalysisRequest(item);
        
        // Send to AI for contextualization
        const aiResult = await aiService.analyzeContent(analysisRequest);
        
        // Convert AI result to time entry
        const timeEntry = this.convertToTimeEntry(item, aiResult);
        
        processedEntries.push(timeEntry);
        
        console.log(`✅ Processed: ${item.title} → ${timeEntry.description}`);
        
      } catch (error) {
        console.error(`❌ Failed to process ${item.title}:`, error);
        
        // Create fallback entry without AI
        const fallbackEntry = this.createFallbackEntry(item);
        processedEntries.push(fallbackEntry);
      }
    }
    
    return processedEntries;
  }

  /**
   * Convert Google data to AI analysis request
   */
  private convertToAnalysisRequest(item: GoogleDataItem): ContentAnalysisRequest {
    let description = '';
    let participants: string[] = [];
    
    switch (item.type) {
      case 'gmail':
        description = `Email from ${item.metadata.sender}`;
        participants = [item.metadata.sender || ''];
        break;
        
      case 'calendar':
        description = `Meeting with ${item.metadata.participants?.join(', ')}`;
        participants = item.metadata.participants || [];
        break;
        
      case 'drive_doc':
      case 'drive_sheet': 
      case 'drive_slide':
        description = `Document work on ${item.title}`;
        break;
    }
    
    return {
      title: item.title,
      description,
      participants,
      source: item.type === 'gmail' ? 'email' : 
               item.type === 'calendar' ? 'calendar' : 'manual',
      timestamp: item.timestamp,
      context: {
        projects: this.projects,
        clients: this.clients,
        recentEntries: []
      }
    };
  }

  /**
   * Convert AI result to TimeBeacon time entry
   */
  private convertToTimeEntry(
    item: GoogleDataItem, 
    aiResult: any
  ): ProcessedTimeEntry {
    
    // Calculate duration based on item type
    let estimatedDuration = this.estimateDuration(item);
    
    // Use AI suggestions or fallback to estimates
    const client = aiResult.suggestedClient || this.inferClient(item);
    const project = aiResult.suggestedProject || this.inferProject(item);
    const category = aiResult.suggestedCategory || 'client';
    
    // Enhanced description with AI reasoning
    const description = this.enhanceDescription(item, aiResult);
    
    const startTime = new Date(item.timestamp).toTimeString().slice(0, 5);
    const endDate = new Date(new Date(item.timestamp).getTime() + estimatedDuration * 60 * 60 * 1000);
    const endTime = endDate.toTimeString().slice(0, 5);

    return {
      id: `google_${item.id}`,
      date: new Date(item.timestamp).toISOString().split('T')[0],
      startTime,
      endTime,
      duration: estimatedDuration,
      client,
      project,
      description,
      category,
      status: 'pending' as const,
      automated: true,
      source: 'ai_suggested',
      billable: aiResult.suggestedBillable || true,
      tags: [...(aiResult.tags || []), item.type, 'ai_processed'],
      meetingType: aiResult.meetingType,
      
      // AI analysis metadata
      aiAnalysis: {
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning || 'AI analysis completed',
        suggestedTags: aiResult.tags || []
      }
    };
  }

  /**
   * Estimate duration based on Google data type
   */
  private estimateDuration(item: GoogleDataItem): number {
    switch (item.type) {
      case 'gmail':
        // Use email time tracking logic
        const wordCount = item.metadata.wordCount || 0;
        const baseTime = Math.max(0.1, wordCount / 200); // Reading time
        return Math.min(baseTime, 1); // Max 1 hour for emails
        
      case 'calendar':
        // Use actual meeting duration if available
        return item.metadata.duration || 1; // Default 1 hour
        
      case 'drive_doc':
      case 'drive_sheet':
      case 'drive_slide':
        // Estimate based on last modified time
        const hoursSinceModified = this.getHoursSinceModified(item);
        return Math.min(hoursSinceModified, 4); // Max 4 hours per document session
        
      default:
        return 0.5; // 30 minutes default
    }
  }

  /**
   * Enhanced description with AI context
   */
  private enhanceDescription(item: GoogleDataItem, aiResult: any): string {
    let base = item.title;
    
    // Add AI insights to description
    if (aiResult.confidence > 0.8) {
      base += ` (AI: ${aiResult.reasoning})`;
    }
    
    // Add source context
    switch (item.type) {
      case 'gmail':
        base = `📧 ${base}`;
        if (item.metadata.sender) {
          base += ` from ${item.metadata.sender}`;
        }
        break;
        
      case 'calendar':
        base = `📅 ${base}`;
        if (item.metadata.participants?.length) {
          base += ` with ${item.metadata.participants.slice(0, 2).join(', ')}`;
          if (item.metadata.participants.length > 2) {
            base += ` +${item.metadata.participants.length - 2} others`;
          }
        }
        break;
        
      case 'drive_doc':
        base = `📄 ${base}`;
        break;
        
      case 'drive_sheet':
        base = `📊 ${base}`;
        break;
        
      case 'drive_slide':
        base = `📽️ ${base}`;
        break;
    }
    
    return base;
  }

  /**
   * Fallback entry creation when AI fails
   */
  private createFallbackEntry(item: GoogleDataItem): ProcessedTimeEntry {
    const startTime = new Date(item.timestamp).toTimeString().slice(0, 5);
    const duration = this.estimateDuration(item);
    const endDate = new Date(new Date(item.timestamp).getTime() + duration * 60 * 60 * 1000);
    const endTime = endDate.toTimeString().slice(0, 5);

    return {
      id: `google_fallback_${item.id}`,
      date: new Date(item.timestamp).toISOString().split('T')[0],
      startTime,
      endTime,
      duration,
      client: this.inferClient(item),
      project: this.inferProject(item),
      description: `${item.title} (fallback processing)`,
      category: 'client',
      status: 'pending' as const,
      automated: true,
      source: 'imported',
      billable: true,
      tags: [item.type, 'fallback'],
      
      aiAnalysis: {
        confidence: 0.3,
        reasoning: 'AI processing failed, using fallback logic',
        suggestedTags: []
      }
    };
  }

  private inferClient(item: GoogleDataItem): string {
    // Extract domain from email or use filename
    if (item.type === 'gmail' && item.metadata.sender) {
      const domain = item.metadata.sender.split('@')[1];
      if (domain?.includes('acme')) return 'Acme Corp';
      if (domain?.includes('techstart')) return 'TechStart Inc';
    }
    
    if (item.title.toLowerCase().includes('internal')) return 'Internal';
    
    return 'Unknown Client';
  }

  private inferProject(item: GoogleDataItem): string {
    const title = item.title.toLowerCase();
    
    if (title.includes('salesforce')) return 'Salesforce Integration';
    if (title.includes('monday')) return 'Monday.com Implementation';
    if (title.includes('standup') || title.includes('team')) return 'Internal Project';
    
    return 'General Project';
  }

  private getHoursSinceModified(item: GoogleDataItem): number {
    if (!item.metadata.lastModified) return 1;
    
    const modified = new Date(item.metadata.lastModified);
    const now = new Date();
    const diffMs = now.getTime() - modified.getTime();
    return Math.max(0.25, diffMs / (1000 * 60 * 60)); // Min 15 minutes
  }

  private loadContext(): void {
    // Load from localStorage or API
    try {
      const stored = localStorage.getItem('timebeacon_context');
      if (stored) {
        const context = JSON.parse(stored);
        this.projects = context.projects || [];
        this.clients = context.clients || [];
      }
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  }

  /**
   * Update context (projects/clients) for better AI analysis
   */
  updateContext(projects: Project[], clients: Client[]): void {
    this.projects = projects;
    this.clients = clients;
    
    localStorage.setItem('timebeacon_context', JSON.stringify({
      projects,
      clients,
      updatedAt: new Date().toISOString()
    }));
  }
}

export const googleDataProcessor = new GoogleDataProcessor();