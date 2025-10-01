/**
 * Email Time Tracking Service
 * Phase 1: Smart estimation with user confirmation
 * Phase 2: Browser extension integration ready
 * Phase 3: Cross-platform email client integrations
 */

export type TimeSource = 'estimated' | 'extension' | 'manual' | 'confirmed';

export interface EmailTimeData {
  id: string;
  emailId: string;
  subject: string;
  sender: string;
  recipients: string[];
  timestamp: Date;
  
  // Time tracking data
  estimatedMinutes: number;        // AI/rule-based estimate
  actualMinutes?: number;          // Real tracking from extension
  userConfirmedMinutes?: number;   // User override
  finalMinutes: number;            // What we actually use
  
  // Metadata
  source: TimeSource;
  confidence: number;              // 0-1 confidence in the time
  wordCount?: number;
  threadLength?: number;
  hasAttachments?: boolean;
  
  // User interaction
  needsReview: boolean;
  reviewedAt?: Date;
  
  // Extension data (when available)
  realTimeData?: {
    openedAt?: Date;
    closedAt?: Date;
    focusTimeSeconds?: number;
    composeTimeSeconds?: number;
    idleTimeSeconds?: number;
  };
}

export interface EmailTimePreferences {
  autoConfirmHighConfidence: boolean;  // Auto-confirm estimates >90% confidence
  autoConfirmThreshold: number;        // Minutes threshold for auto-confirm
  reviewLowConfidence: boolean;        // Flag low confidence estimates for review
  extensionEnabled: boolean;           // User has browser extension installed
  learningEnabled: boolean;           // Learn from user corrections
}

export class EmailTimeTrackingService {
  private preferences: EmailTimePreferences;
  private userCorrections: Map<string, number> = new Map(); // Learn from user patterns
  
  constructor() {
    this.preferences = this.loadPreferences();
    this.loadUserCorrections();
    this.setupExtensionBridge();
  }

  /**
   * PHASE 1: Process email with smart estimation
   */
  processEmailTime(emailData: {
    id: string;
    subject: string;
    sender: string;
    recipients: string[];
    timestamp: Date;
    wordCount?: number;
    threadLength?: number;
    hasAttachments?: boolean;
  }): EmailTimeData {
    
    console.log(`📧 Processing email time for: ${emailData.subject}`);
    
    // Check if we have real-time data from extension
    const extensionData = this.getExtensionData(emailData.id);
    
    let timeData: EmailTimeData;
    
    if (extensionData?.focusTimeSeconds) {
      // PHASE 2: Use real extension data
      timeData = this.processWithExtensionData(emailData, extensionData);
    } else {
      // PHASE 1: Use smart estimation
      timeData = this.processWithEstimation(emailData);
    }
    
    // Apply user preferences
    this.applyUserPreferences(timeData);
    
    // Store for learning
    this.storeForLearning(timeData);
    
    return timeData;
  }

  /**
   * PHASE 1: Smart estimation algorithm
   */
  private processWithEstimation(emailData: any): EmailTimeData {
    const estimate = this.calculateSmartEstimate(emailData);
    
    return {
      id: `email_time_${emailData.id}`,
      emailId: emailData.id,
      subject: emailData.subject,
      sender: emailData.sender,
      recipients: emailData.recipients,
      timestamp: emailData.timestamp,
      
      estimatedMinutes: estimate.minutes,
      finalMinutes: estimate.minutes,
      source: 'estimated',
      confidence: estimate.confidence,
      needsReview: estimate.confidence < 0.7,
      
      wordCount: emailData.wordCount,
      threadLength: emailData.threadLength,
      hasAttachments: emailData.hasAttachments
    };
  }

  /**
   * PHASE 2: Process with real extension data
   */
  private processWithExtensionData(emailData: any, extensionData: any): EmailTimeData {
    const actualMinutes = Math.round((extensionData.focusTimeSeconds + extensionData.composeTimeSeconds) / 60);
    
    return {
      id: `email_time_${emailData.id}`,
      emailId: emailData.id,
      subject: emailData.subject,
      sender: emailData.sender,
      recipients: emailData.recipients,
      timestamp: emailData.timestamp,
      
      estimatedMinutes: this.calculateSmartEstimate(emailData).minutes,
      actualMinutes: actualMinutes,
      finalMinutes: actualMinutes,
      source: 'extension',
      confidence: 0.95, // High confidence for real tracking
      needsReview: false,
      
      wordCount: emailData.wordCount,
      threadLength: emailData.threadLength,
      hasAttachments: emailData.hasAttachments,
      realTimeData: {
        openedAt: extensionData.openedAt,
        closedAt: extensionData.closedAt,
        focusTimeSeconds: extensionData.focusTimeSeconds,
        composeTimeSeconds: extensionData.composeTimeSeconds,
        idleTimeSeconds: extensionData.idleTimeSeconds
      }
    };
  }

  /**
   * Smart estimation algorithm - learns from user patterns
   */
  private calculateSmartEstimate(emailData: any): { minutes: number; confidence: number } {
    let baseMinutes = 2; // Minimum email processing time
    let confidence = 0.6;
    
    // Word count factor
    if (emailData.wordCount) {
      const readingTime = Math.ceil(emailData.wordCount / 200); // ~200 words per minute
      const processingTime = Math.ceil(emailData.wordCount / 100); // Processing is slower
      baseMinutes = Math.max(baseMinutes, readingTime + processingTime);
      confidence += 0.2;
    }
    
    // Thread length factor (replies take more context switching)
    if (emailData.threadLength > 1) {
      baseMinutes += Math.min(emailData.threadLength * 2, 10); // Max 10 extra minutes
      confidence += 0.1;
    }
    
    // Attachments factor
    if (emailData.hasAttachments) {
      baseMinutes += 3; // Average 3 minutes to process attachments
      confidence += 0.1;
    }
    
    // Domain-based adjustments (learned patterns)
    const domain = emailData.sender.split('@')[1]?.toLowerCase();
    const domainAdjustment = this.getDomainTimeAdjustment(domain);
    baseMinutes = Math.round(baseMinutes * domainAdjustment.multiplier);
    confidence = Math.min(confidence + domainAdjustment.confidenceBoost, 0.95);
    
    // User learning adjustments
    const userAdjustment = this.getUserLearningAdjustment(emailData);
    baseMinutes = Math.round(baseMinutes * userAdjustment);
    
    // Apply reasonable bounds
    baseMinutes = Math.max(1, Math.min(baseMinutes, 60)); // 1-60 minutes
    confidence = Math.max(0.3, Math.min(confidence, 0.95));
    
    return { minutes: baseMinutes, confidence };
  }

  /**
   * User can confirm or adjust estimated times
   */
  confirmEmailTime(emailTimeId: string, confirmedMinutes: number): void {
    const emailTime = this.getEmailTimeData(emailTimeId);
    if (!emailTime) return;
    
    console.log(`✅ User confirmed email time: ${confirmedMinutes}min (was ${emailTime.finalMinutes}min)`);
    
    // Update the record
    emailTime.userConfirmedMinutes = confirmedMinutes;
    emailTime.finalMinutes = confirmedMinutes;
    emailTime.source = 'confirmed';
    emailTime.needsReview = false;
    emailTime.reviewedAt = new Date();
    
    // Learn from this correction
    this.learnFromUserCorrection(emailTime, confirmedMinutes);
    
    // Update stored data
    this.updateEmailTimeData(emailTime);
    
    // Create/update time entry
    this.createOrUpdateTimeEntry(emailTime);
  }

  /**
   * Get emails that need user review
   */
  getEmailsNeedingReview(): EmailTimeData[] {
    return this.getAllEmailTimeData().filter(email => 
      email.needsReview && !email.reviewedAt
    );
  }

  /**
   * PHASE 2: Extension bridge setup
   */
  private setupExtensionBridge(): void {
    // Listen for messages from browser extension
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        if (event.data.type === 'TIMEBEACON_EMAIL_TRACKING') {
          this.handleExtensionData(event.data);
        }
      });
      
      // Notify extension that TimeBeacon is ready
      window.postMessage({
        type: 'TIMEBEACON_READY',
        version: '1.0.0'
      }, '*');
    }
  }

  /**
   * Handle real-time data from browser extension
   */
  private handleExtensionData(data: any): void {
    console.log('🔌 Received real-time email data from extension:', data);
    
    // Store extension data for processing
    const extensionData = {
      emailId: data.emailId,
      openedAt: new Date(data.openedAt),
      closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
      focusTimeSeconds: data.focusTimeSeconds,
      composeTimeSeconds: data.composeTimeSeconds,
      idleTimeSeconds: data.idleTimeSeconds
    };
    
    this.storeExtensionData(data.emailId, extensionData);
    
    // If this email was already processed, update it with real data
    this.updateWithRealTimeData(data.emailId, extensionData);
  }

  /**
   * Learn from user corrections to improve estimates
   */
  private learnFromUserCorrection(emailTime: EmailTimeData, confirmedMinutes: number): void {
    const estimatedMinutes = emailTime.estimatedMinutes;
    const correctionRatio = confirmedMinutes / estimatedMinutes;
    
    // Learn domain-specific patterns
    const domain = emailTime.sender.split('@')[1]?.toLowerCase();
    if (domain) {
      const key = `domain_${domain}`;
      const currentCorrection = this.userCorrections.get(key) || 1;
      const newCorrection = (currentCorrection + correctionRatio) / 2; // Simple averaging
      this.userCorrections.set(key, newCorrection);
    }
    
    // Learn word count patterns
    if (emailTime.wordCount) {
      const wordCountBucket = Math.floor(emailTime.wordCount / 100) * 100; // 0, 100, 200, etc.
      const key = `wordcount_${wordCountBucket}`;
      const currentCorrection = this.userCorrections.get(key) || 1;
      const newCorrection = (currentCorrection + correctionRatio) / 2;
      this.userCorrections.set(key, newCorrection);
    }
    
    this.saveUserCorrections();
    console.log(`🧠 Learning: ${domain} emails adjusted by ${Math.round((correctionRatio - 1) * 100)}%`);
  }

  /**
   * Get domain-specific time adjustments
   */
  private getDomainTimeAdjustment(domain?: string): { multiplier: number; confidenceBoost: number } {
    if (!domain) return { multiplier: 1, confidenceBoost: 0 };
    
    // Known client domains typically take more time
    const clientDomains = {
      'acmecorp.com': { multiplier: 1.3, confidenceBoost: 0.2 }, // Client emails take longer
      'techstart.io': { multiplier: 1.2, confidenceBoost: 0.2 },
      'zendesk.com': { multiplier: 1.4, confidenceBoost: 0.2 }, // Support emails are complex
      'timebeacon.io': { multiplier: 0.8, confidenceBoost: 0.1 } // Internal emails are faster
    };
    
    return clientDomains[domain] || { multiplier: 1, confidenceBoost: 0 };
  }

  /**
   * Get user learning adjustments
   */
  private getUserLearningAdjustment(emailData: any): number {
    const domain = emailData.sender.split('@')[1]?.toLowerCase();
    let adjustment = 1;
    
    // Apply domain learning
    if (domain) {
      const domainAdjustment = this.userCorrections.get(`domain_${domain}`);
      if (domainAdjustment) {
        adjustment *= domainAdjustment;
      }
    }
    
    // Apply word count learning
    if (emailData.wordCount) {
      const wordCountBucket = Math.floor(emailData.wordCount / 100) * 100;
      const wordCountAdjustment = this.userCorrections.get(`wordcount_${wordCountBucket}`);
      if (wordCountAdjustment) {
        adjustment *= wordCountAdjustment;
      }
    }
    
    return adjustment;
  }

  private applyUserPreferences(timeData: EmailTimeData): void {
    // Auto-confirm high confidence estimates
    if (this.preferences.autoConfirmHighConfidence && 
        timeData.confidence > 0.9 && 
        timeData.finalMinutes <= this.preferences.autoConfirmThreshold) {
      timeData.needsReview = false;
      timeData.source = 'confirmed';
    }
    
    // Flag low confidence for review
    if (this.preferences.reviewLowConfidence && timeData.confidence < 0.7) {
      timeData.needsReview = true;
    }
  }

  // Storage methods
  private loadPreferences(): EmailTimePreferences {
    const stored = localStorage.getItem('timebeacon_email_preferences');
    return stored ? JSON.parse(stored) : {
      autoConfirmHighConfidence: true,
      autoConfirmThreshold: 15,
      reviewLowConfidence: true,
      extensionEnabled: false,
      learningEnabled: true
    };
  }

  private loadUserCorrections(): void {
    const stored = localStorage.getItem('timebeacon_email_corrections');
    if (stored) {
      this.userCorrections = new Map(JSON.parse(stored));
    }
  }

  private saveUserCorrections(): void {
    localStorage.setItem('timebeacon_email_corrections', 
      JSON.stringify(Array.from(this.userCorrections.entries())));
  }

  private getExtensionData(emailId: string): any {
    const stored = localStorage.getItem(`timebeacon_ext_${emailId}`);
    return stored ? JSON.parse(stored) : null;
  }

  private storeExtensionData(emailId: string, data: any): void {
    localStorage.setItem(`timebeacon_ext_${emailId}`, JSON.stringify(data));
  }

  private getEmailTimeData(id: string): EmailTimeData | null {
    const stored = localStorage.getItem(`timebeacon_email_time_${id}`);
    return stored ? JSON.parse(stored) : null;
  }

  private updateEmailTimeData(emailTime: EmailTimeData): void {
    localStorage.setItem(`timebeacon_email_time_${emailTime.id}`, JSON.stringify(emailTime));
  }

  private getAllEmailTimeData(): EmailTimeData[] {
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith('timebeacon_email_time_'));
    return allKeys.map(key => JSON.parse(localStorage.getItem(key)!)).filter(Boolean);
  }

  private storeForLearning(timeData: EmailTimeData): void {
    this.updateEmailTimeData(timeData);
  }

  private updateWithRealTimeData(emailId: string, extensionData: any): void {
    // Find existing email time records and update with real data
    const allEmailTimes = this.getAllEmailTimeData();
    const emailTime = allEmailTimes.find(et => et.emailId === emailId);
    
    if (emailTime && emailTime.source === 'estimated') {
      const actualMinutes = Math.round((extensionData.focusTimeSeconds + extensionData.composeTimeSeconds) / 60);
      
      emailTime.actualMinutes = actualMinutes;
      emailTime.finalMinutes = actualMinutes;
      emailTime.source = 'extension';
      emailTime.confidence = 0.95;
      emailTime.needsReview = false;
      emailTime.realTimeData = extensionData;
      
      this.updateEmailTimeData(emailTime);
      this.createOrUpdateTimeEntry(emailTime);
      
      console.log(`🔄 Updated email ${emailId} with real-time data: ${actualMinutes}min`);
    }
  }

  private createOrUpdateTimeEntry(emailTime: EmailTimeData): void {
    // Convert to TimeBeacon time entry format
    const timeEntry = {
      date: emailTime.timestamp.toISOString().split('T')[0],
      startTime: emailTime.timestamp.toTimeString().slice(0, 5),
      duration: emailTime.finalMinutes / 60, // Convert to hours
      client: this.inferClient(emailTime.sender),
      project: this.inferProject(emailTime.subject, emailTime.sender),
      description: `Email: ${emailTime.subject} (${emailTime.finalMinutes}min${emailTime.source === 'extension' ? ' tracked' : ' estimated'})`,
      category: 'client' as const,
      source: 'gmail' as const,
      isAutomatic: true,
      tags: ['email', emailTime.source]
    };
    
    // Store for processing by main app
    const pendingEntries = JSON.parse(localStorage.getItem('pending_email_time_entries') || '[]');
    const existingIndex = pendingEntries.findIndex((entry: any) => 
      entry.originalEmailId === emailTime.emailId
    );
    
    if (existingIndex >= 0) {
      pendingEntries[existingIndex] = { ...timeEntry, originalEmailId: emailTime.emailId };
    } else {
      pendingEntries.push({ ...timeEntry, originalEmailId: emailTime.emailId });
    }
    
    localStorage.setItem('pending_email_time_entries', JSON.stringify(pendingEntries));
    
    // Notify main app if possible
    window.dispatchEvent(new CustomEvent('timebeacon-email-entry-ready', {
      detail: timeEntry
    }));
  }

  private inferClient(senderEmail: string): string {
    const domain = senderEmail.split('@')[1]?.toLowerCase();
    
    if (domain?.includes('acme')) return 'Acme Corp';
    if (domain?.includes('techstart')) return 'TechStart Inc';
    if (domain?.includes('zendesk')) return 'Zendesk Inc';
    if (domain?.includes('timebeacon.io')) return 'Internal';
    
    return 'Email Client';
  }

  private inferProject(subject: string, _senderEmail: string): string {
    const content = subject.toLowerCase();
    
    if (content.includes('salesforce')) return 'Salesforce Integration';
    if (content.includes('monday')) return 'Monday.com Implementation';
    if (content.includes('zendesk')) return 'Zendesk Integration';
    
    return 'Email Communication';
  }
}

export const emailTimeTracker = new EmailTimeTrackingService();