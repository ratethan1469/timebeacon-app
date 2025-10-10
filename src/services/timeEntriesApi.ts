/**
 * Time Entries API Service
 * Handles all API calls related to time entry management
 */

import { httpClient, ApiError } from './httpClient';

// TypeScript interfaces
export interface TimeEntry {
  id: string;
  user_id: string;
  company_id: string;
  customer_name?: string;
  category?: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  summary?: string;
  billable: boolean;
  status: 'pending_review' | 'approved' | 'rejected';
  ai_confidence?: number;
  source_activity_ids?: string[];
  created_at: string;
  approved_at?: string;
}

export interface ProcessActivitiesResponse {
  message: string;
  entries: TimeEntry[];
  count: number;
}

export interface TimeEntriesResponse {
  entries: TimeEntry[];
  count: number;
}

export interface UpdateEntryData {
  customer_name?: string;
  category?: string;
  start_time?: string;
  end_time?: string;
  summary?: string;
  billable?: boolean;
  status?: 'pending_review' | 'approved' | 'rejected';
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/**
 * Time Entries API Client
 */
class TimeEntriesApi {
  private readonly baseEndpoint = '/api/time-entries';

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('timebeacon_token') ||
           localStorage.getItem('auth_token') ||
           null;
  }

  /**
   * Get user and company IDs from localStorage
   */
  private getUserContext(): { userId: string; companyId: string } | null {
    try {
      const userData = localStorage.getItem('timebeacon_user') ||
                       localStorage.getItem('user_data');

      if (userData) {
        const user = JSON.parse(userData);
        return {
          userId: user.id,
          companyId: user.company_id || user.companyId,
        };
      }
    } catch (error) {
      console.error('Failed to get user context:', error);
    }
    return null;
  }

  /**
   * Process unprocessed activities and generate time entries using AI
   * POST /api/time-entries/process
   */
  async processActivities(): Promise<ProcessActivitiesResponse> {
    try {
      const response = await httpClient.post<ProcessActivitiesResponse>(
        `${this.baseEndpoint}/process`,
        {},
        { requireAuth: true }
      );

      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to process activities');
      }
      throw new Error('Failed to process activities');
    }
  }

  /**
   * Get pending time entries that need review
   * GET /api/time-entries/pending
   */
  async getPendingEntries(limit: number = 50): Promise<TimeEntry[]> {
    try {
      const response = await httpClient.get<TimeEntriesResponse>(
        `${this.baseEndpoint}/pending?limit=${limit}`,
        { requireAuth: true }
      );

      return response.data.entries;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to fetch pending entries');
      }
      throw new Error('Failed to fetch pending entries');
    }
  }

  /**
   * Get approved time entries
   * GET /api/time-entries/approved
   */
  async getApprovedEntries(limit: number = 50): Promise<TimeEntry[]> {
    try {
      const response = await httpClient.get<TimeEntriesResponse>(
        `${this.baseEndpoint}/approved?limit=${limit}`,
        { requireAuth: true }
      );

      return response.data.entries;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to fetch approved entries');
      }
      throw new Error('Failed to fetch approved entries');
    }
  }

  /**
   * Get all time entries with optional status filter
   * GET /api/time-entries
   */
  async getTimeEntries(
    status?: 'pending_review' | 'approved' | 'rejected',
    limit: number = 50
  ): Promise<TimeEntry[]> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', limit.toString());

      const response = await httpClient.get<TimeEntriesResponse>(
        `${this.baseEndpoint}?${params.toString()}`,
        { requireAuth: true }
      );

      return response.data.entries;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to fetch time entries');
      }
      throw new Error('Failed to fetch time entries');
    }
  }

  /**
   * Approve a time entry
   * PATCH /api/time-entries/:id/approve
   */
  async approveEntry(id: string): Promise<void> {
    try {
      await httpClient.patch(
        `${this.baseEndpoint}/${id}/approve`,
        {},
        { requireAuth: true }
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to approve entry');
      }
      throw new Error('Failed to approve entry');
    }
  }

  /**
   * Update a time entry
   * PATCH /api/time-entries/:id
   */
  async updateEntry(id: string, data: UpdateEntryData): Promise<TimeEntry> {
    try {
      const response = await httpClient.patch<{ entry: TimeEntry }>(
        `${this.baseEndpoint}/${id}`,
        data,
        { requireAuth: true }
      );

      return response.data.entry;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to update entry');
      }
      throw new Error('Failed to update entry');
    }
  }

  /**
   * Delete a time entry
   * DELETE /api/time-entries/:id
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      await httpClient.delete(
        `${this.baseEndpoint}/${id}`,
        { requireAuth: true }
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to delete entry');
      }
      throw new Error('Failed to delete entry');
    }
  }

  /**
   * Bulk approve multiple entries
   */
  async bulkApprove(ids: string[]): Promise<void> {
    try {
      await Promise.all(ids.map(id => this.approveEntry(id)));
    } catch (error) {
      throw new Error('Failed to approve some entries');
    }
  }

  /**
   * Bulk delete multiple entries
   */
  async bulkDelete(ids: string[]): Promise<void> {
    try {
      await Promise.all(ids.map(id => this.deleteEntry(id)));
    } catch (error) {
      throw new Error('Failed to delete some entries');
    }
  }
}

// Export singleton instance
export const timeEntriesApi = new TimeEntriesApi();

// Export class for testing
export default TimeEntriesApi;
