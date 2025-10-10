/**
 * AI Preferences API Service
 * Handles all API calls related to AI preferences management
 */

import { httpClient, ApiError } from './httpClient';

// TypeScript interfaces
export interface AIPreferences {
  id: string;
  user_id: string;
  company_id: string;
  confidence_threshold: number;
  auto_approve_enabled: boolean;
  description_length: 'brief' | 'standard' | 'detailed';
  only_opened_emails: boolean;
  skip_promotional: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesData {
  confidence_threshold?: number;
  auto_approve_enabled?: boolean;
  description_length?: 'brief' | 'standard' | 'detailed';
  only_opened_emails?: boolean;
  skip_promotional?: boolean;
}

export interface PreferencesResponse {
  preferences: AIPreferences;
}

export interface UpdatePreferencesResponse {
  message: string;
  preferences: AIPreferences;
}

/**
 * AI Preferences API Client
 */
class AIPreferencesApi {
  private readonly baseEndpoint = '/api/ai-preferences';

  /**
   * Get current user's AI preferences
   * GET /api/ai-preferences
   */
  async getPreferences(): Promise<AIPreferences> {
    try {
      const response = await httpClient.get<PreferencesResponse>(
        this.baseEndpoint,
        { requireAuth: true }
      );

      return response.data.preferences;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to fetch AI preferences');
      }
      throw new Error('Failed to fetch AI preferences');
    }
  }

  /**
   * Update current user's AI preferences
   * PATCH /api/ai-preferences
   */
  async updatePreferences(data: UpdatePreferencesData): Promise<AIPreferences> {
    try {
      // Validate confidence_threshold if provided
      if (data.confidence_threshold !== undefined) {
        if (data.confidence_threshold < 0 || data.confidence_threshold > 100) {
          throw new Error('Confidence threshold must be between 0 and 100');
        }
      }

      // Validate description_length if provided
      if (data.description_length !== undefined) {
        if (!['brief', 'standard', 'detailed'].includes(data.description_length)) {
          throw new Error('Description length must be brief, standard, or detailed');
        }
      }

      const response = await httpClient.patch<UpdatePreferencesResponse>(
        this.baseEndpoint,
        data,
        { requireAuth: true }
      );

      return response.data.preferences;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.data?.message || 'Failed to update AI preferences');
      }
      throw new Error('Failed to update AI preferences');
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(): Promise<AIPreferences> {
    const defaults: UpdatePreferencesData = {
      confidence_threshold: 80,
      auto_approve_enabled: false,
      description_length: 'standard',
      only_opened_emails: true,
      skip_promotional: true,
    };

    return this.updatePreferences(defaults);
  }

  /**
   * Update single preference
   */
  async updateSinglePreference<K extends keyof UpdatePreferencesData>(
    key: K,
    value: UpdatePreferencesData[K]
  ): Promise<AIPreferences> {
    return this.updatePreferences({ [key]: value } as UpdatePreferencesData);
  }
}

// Export singleton instance
export const aiPreferencesApi = new AIPreferencesApi();

// Export class for testing
export default AIPreferencesApi;
