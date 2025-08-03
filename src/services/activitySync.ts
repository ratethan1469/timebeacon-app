/**
 * Activity Sync Service
 * Automatically syncs Google activities and creates time entries
 */

import { googleIntegrationsService, GoogleActivity } from './googleIntegrations';

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  clientId: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  source: 'manual' | 'google-gmail' | 'google-calendar' | 'google-docs' | 'google-sheets';
  sourceId?: string;
  tags: string[];
  billable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncSettings {
  enabled: boolean;
  autoCreateEntries: boolean;
  requireApproval: boolean;
  minDuration: number; // minimum minutes to create entry
  excludePatterns: string[]; // regex patterns to exclude
  defaultProject: string;
  defaultClient: string;
  services: {
    gmail: boolean;
    calendar: boolean;
    docs: boolean;
    sheets: boolean;
  };
}

export interface PendingEntry extends Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> {
  tempId: string;
  approved: boolean;
  confidence: number;
  originalActivity: GoogleActivity;
}

class ActivitySyncService {
  private syncSettings: SyncSettings;
  private lastSyncTime: Date | null = null;
  private syncInterval: number | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'timebeacon_sync_settings';
  private readonly LAST_SYNC_KEY = 'timebeacon_last_sync';
  private readonly PENDING_ENTRIES_KEY = 'timebeacon_pending_entries';

  constructor() {
    this.syncSettings = this.loadSyncSettings();
    this.loadLastSyncTime();
  }

  /**
   * Start automatic syncing
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (!this.syncSettings.enabled) {
      return;
    }

    // Initial sync
    this.performSync();

    // Set up recurring sync
    this.syncInterval = window.setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform a manual sync
   */
  async performSync(): Promise<{ created: number; pending: number; errors: number }> {
    if (!googleIntegrationsService.isConnected()) {
      return { created: 0, pending: 0, errors: 0 };
    }

    try {
      const since = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours if no previous sync
      const activities = await googleIntegrationsService.fetchAllActivities(since);
      
      let created = 0;
      let pending = 0;
      let errors = 0;

      for (const activity of activities) {
        try {
          if (!this.shouldSyncActivity(activity)) {
            continue;
          }

          const timeEntry = this.convertActivityToTimeEntry(activity);
          
          if (this.syncSettings.autoCreateEntries && !this.syncSettings.requireApproval) {
            await this.createTimeEntry(timeEntry);
            created++;
          } else {
            await this.addPendingEntry(timeEntry, activity);
            pending++;
          }
        } catch (error) {
          console.error('Error processing activity:', activity.id, error);
          errors++;
        }
      }

      this.lastSyncTime = new Date();
      this.saveLastSyncTime();

      return { created, pending, errors };
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync settings
   */
  getSyncSettings(): SyncSettings {
    return { ...this.syncSettings };
  }

  /**
   * Update sync settings
   */
  updateSyncSettings(settings: Partial<SyncSettings>): void {
    this.syncSettings = { ...this.syncSettings, ...settings };
    this.saveSyncSettings();

    // Restart sync if enabled/disabled
    if (settings.enabled !== undefined) {
      if (settings.enabled) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }
  }

  /**
   * Get pending entries for approval
   */
  getPendingEntries(): PendingEntry[] {
    try {
      const stored = localStorage.getItem(this.PENDING_ENTRIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Approve a pending entry
   */
  async approvePendingEntry(tempId: string): Promise<void> {
    const pendingEntries = this.getPendingEntries();
    const entry = pendingEntries.find(e => e.tempId === tempId);
    
    if (!entry) {
      throw new Error('Pending entry not found');
    }

    // Convert to time entry and create
    const timeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: entry.userId,
      projectId: entry.projectId,
      clientId: entry.clientId,
      description: entry.description,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      source: entry.source,
      sourceId: entry.sourceId,
      tags: entry.tags,
      billable: entry.billable,
    };

    await this.createTimeEntry(timeEntry);

    // Remove from pending
    const updated = pendingEntries.filter(e => e.tempId !== tempId);
    localStorage.setItem(this.PENDING_ENTRIES_KEY, JSON.stringify(updated));
  }

  /**
   * Reject a pending entry
   */
  rejectPendingEntry(tempId: string): void {
    const pendingEntries = this.getPendingEntries();
    const updated = pendingEntries.filter(e => e.tempId !== tempId);
    localStorage.setItem(this.PENDING_ENTRIES_KEY, JSON.stringify(updated));
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Check if an activity should be synced
   */
  private shouldSyncActivity(activity: GoogleActivity): boolean {
    // Check if service is enabled
    if (!this.syncSettings.services[activity.type]) {
      return false;
    }

    // Check minimum duration
    if ((activity.duration || 0) < this.syncSettings.minDuration) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of this.syncSettings.excludePatterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(activity.title) || regex.test(activity.description)) {
          return false;
        }
      } catch {
        // Invalid regex, skip
      }
    }

    return true;
  }

  /**
   * Convert Google activity to time entry
   */
  private convertActivityToTimeEntry(activity: GoogleActivity): Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> {
    const startTime = new Date(activity.startTime);
    const endTime = activity.endTime 
      ? new Date(activity.endTime) 
      : new Date(startTime.getTime() + (activity.duration || 0) * 60 * 1000);

    return {
      userId: 'current-user', // Would be populated from auth context
      projectId: activity.suggestedProject || this.syncSettings.defaultProject,
      clientId: activity.suggestedClient || this.syncSettings.defaultClient,
      description: this.generateDescription(activity),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: activity.duration || Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
      source: `google-${activity.type}` as any,
      sourceId: activity.id,
      tags: this.generateTags(activity),
      billable: this.shouldBeBillable(activity),
    };
  }

  /**
   * Generate description for time entry
   */
  private generateDescription(activity: GoogleActivity): string {
    switch (activity.type) {
      case 'gmail':
        return `Email: ${activity.title.replace('Email: ', '')}`;
      case 'calendar':
        return `Meeting: ${activity.title}`;
      case 'docs':
        return `Document work: ${activity.title.replace('Document: ', '')}`;
      case 'sheets':
        return `Spreadsheet work: ${activity.title.replace('Spreadsheet: ', '')}`;
      default:
        return activity.title;
    }
  }

  /**
   * Generate tags for time entry
   */
  private generateTags(activity: GoogleActivity): string[] {
    const tags = [activity.type];
    
    if (activity.participants && activity.participants.length > 0) {
      tags.push('collaboration');
    }
    
    if (activity.type === 'calendar' && activity.duration && activity.duration > 60) {
      tags.push('long-meeting');
    }
    
    return tags;
  }

  /**
   * Determine if activity should be billable
   */
  private shouldBeBillable(activity: GoogleActivity): boolean {
    // Default logic - could be made configurable
    return activity.confidence > 0.7 && 
           activity.suggestedClient !== 'Internal' &&
           (activity.duration || 0) >= 15; // At least 15 minutes
  }

  /**
   * Add entry to pending approval list
   */
  private async addPendingEntry(timeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>, activity: GoogleActivity): Promise<void> {
    const pendingEntries = this.getPendingEntries();
    
    const pendingEntry: PendingEntry = {
      ...timeEntry,
      tempId: crypto.randomUUID(),
      approved: false,
      confidence: activity.confidence,
      originalActivity: activity,
    };

    pendingEntries.push(pendingEntry);
    localStorage.setItem(this.PENDING_ENTRIES_KEY, JSON.stringify(pendingEntries));
  }

  /**
   * Create a time entry (mock implementation)
   */
  private async createTimeEntry(timeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry> {
    // This would integrate with your actual time tracking API
    const created: TimeEntry = {
      ...timeEntry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in localStorage for demo
    const entries = this.getStoredTimeEntries();
    entries.push(created);
    localStorage.setItem('timebeacon_time_entries', JSON.stringify(entries));

    return created;
  }

  /**
   * Get stored time entries (for demo)
   */
  private getStoredTimeEntries(): TimeEntry[] {
    try {
      const stored = localStorage.getItem('timebeacon_time_entries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Load sync settings from storage
   */
  private loadSyncSettings(): SyncSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch {
      // Invalid stored settings, use defaults
    }
    return this.getDefaultSettings();
  }

  /**
   * Save sync settings to storage
   */
  private saveSyncSettings(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.syncSettings));
  }

  /**
   * Load last sync time from storage
   */
  private loadLastSyncTime(): void {
    try {
      const stored = localStorage.getItem(this.LAST_SYNC_KEY);
      if (stored) {
        this.lastSyncTime = new Date(stored);
      }
    } catch {
      this.lastSyncTime = null;
    }
  }

  /**
   * Save last sync time to storage
   */
  private saveLastSyncTime(): void {
    if (this.lastSyncTime) {
      localStorage.setItem(this.LAST_SYNC_KEY, this.lastSyncTime.toISOString());
    }
  }

  /**
   * Get default sync settings
   */
  private getDefaultSettings(): SyncSettings {
    return {
      enabled: false,
      autoCreateEntries: false,
      requireApproval: true,
      minDuration: 5, // 5 minutes minimum
      excludePatterns: [
        'spam',
        'junk',
        'unsubscribe',
        'newsletter',
        'automated',
      ],
      defaultProject: 'General Work',
      defaultClient: 'Internal',
      services: {
        gmail: true,
        calendar: true,
        docs: true,
        sheets: true,
      },
    };
  }
}

export const activitySyncService = new ActivitySyncService();