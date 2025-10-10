import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  generateTimeEntriesFromActivities,
  Activity,
  TimeEntrySuggestion,
} from './aiService';

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

export interface ActivityRecord {
  id: string;
  user_id: string;
  company_id: string;
  type: 'email' | 'meeting' | 'message';
  source: 'gmail' | 'calendar' | 'slack';
  timestamp: string;
  metadata: Record<string, any>;
  content_summary?: string;
  content_hash?: string;
  processed: boolean;
  processed_at?: string;
  created_at: string;
}

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

/**
 * Store activities for processing
 */
export async function storeActivities(
  userId: string,
  companyId: string,
  activities: Activity[]
): Promise<ActivityRecord[]> {
  const activityRecords = activities.map((activity) => ({
    user_id: userId,
    company_id: companyId,
    type: activity.type === 'calendar' ? 'meeting' : activity.type === 'email' ? 'email' : 'message',
    source: activity.source as 'gmail' | 'calendar' | 'slack',
    timestamp: activity.startTime || new Date().toISOString(),
    metadata: {
      title: activity.title,
      description: activity.description,
      start_time: activity.startTime,
      end_time: activity.endTime,
      participants: activity.participants,
      duration: activity.duration,
    },
    content_summary: activity.description,
    content_hash: generateHash(activity),
    processed: false,
  }));

  const { data, error } = await supabase
    .from('activities')
    .insert(activityRecords)
    .select();

  if (error) {
    throw new Error(`Failed to store activities: ${error.message}`);
  }

  return data;
}

/**
 * Generate a simple hash for deduplication
 */
function generateHash(activity: Activity): string {
  const content = `${activity.title}-${activity.startTime}-${activity.source}`;
  return Buffer.from(content).toString('base64').substring(0, 32);
}

/**
 * Process unprocessed activities and generate time entries
 */
export async function processActivities(
  userId: string,
  companyId: string
): Promise<TimeEntry[]> {
  try {
    // Fetch unprocessed activities for this user
    const { data: activityRecords, error: fetchError } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .eq('processed', false)
      .order('timestamp', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch activities: ${fetchError.message}`);
    }

    if (!activityRecords || activityRecords.length === 0) {
      return [];
    }

    // Convert to Activity format for AI processing
    const activities: Activity[] = activityRecords.map((record) => ({
      type: record.type as 'calendar' | 'email' | 'document',
      title: record.metadata.title || '',
      description: record.content_summary,
      startTime: record.metadata.start_time,
      endTime: record.metadata.end_time,
      participants: record.metadata.participants,
      duration: record.metadata.duration,
      source: record.source,
    }));

    // Generate suggestions using AI
    const suggestions = await generateTimeEntriesFromActivities(activities);

    // Create time entries from suggestions
    const timeEntries = suggestions.map((suggestion, index) => {
      const activity = activityRecords[index];
      const startTime = activity.metadata.start_time || activity.timestamp;
      const endTime = activity.metadata.end_time ||
        new Date(new Date(startTime).getTime() + suggestion.duration * 60000).toISOString();

      return {
        user_id: userId,
        company_id: companyId,
        customer_name: extractCustomerName(activity.metadata),
        category: suggestion.category,
        start_time: startTime,
        end_time: endTime,
        summary: suggestion.description,
        billable: true,
        status: 'pending_review' as const,
        ai_confidence: Math.round(suggestion.confidence * 100),
        source_activity_ids: [activity.id],
      };
    });

    // Insert time entries
    const { data: createdEntries, error: insertError } = await supabase
      .from('time_entries')
      .insert(timeEntries)
      .select();

    if (insertError) {
      throw new Error(`Failed to create time entries: ${insertError.message}`);
    }

    // Mark activities as processed
    const activityIds = activityRecords.map(r => r.id);
    await supabase
      .from('activities')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .in('id', activityIds);

    return createdEntries;
  } catch (error) {
    console.error('Failed to process activities:', error);
    throw error;
  }
}

/**
 * Extract customer name from activity metadata
 */
function extractCustomerName(metadata: Record<string, any>): string | undefined {
  // Look for customer indicators in metadata
  if (metadata.customer) return metadata.customer;
  if (metadata.company) return metadata.company;
  if (metadata.participants && Array.isArray(metadata.participants)) {
    // Extract domain from email if available
    const emailMatch = metadata.participants[0]?.match(/@([^.]+)/);
    if (emailMatch) return emailMatch[1];
  }
  return undefined;
}

/**
 * Get time entries for a user
 */
export async function getTimeEntries(
  userId: string,
  status?: 'pending_review' | 'approved' | 'rejected',
  limit: number = 50
): Promise<TimeEntry[]> {
  let query = supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch time entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Update time entry status
 */
export async function updateTimeEntryStatus(
  entryId: string,
  status: 'pending_review' | 'approved' | 'rejected'
): Promise<void> {
  const updateData: any = { status };

  if (status === 'approved') {
    updateData.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('time_entries')
    .update(updateData)
    .eq('id', entryId);

  if (error) {
    throw new Error(`Failed to update time entry status: ${error.message}`);
  }
}

/**
 * Update time entry
 */
export async function updateTimeEntry(
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', entryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update time entry: ${error.message}`);
  }

  return data;
}

/**
 * Get unprocessed activities count
 */
export async function getUnprocessedActivitiesCount(
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('activities')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('processed', false);

  if (error) {
    throw new Error(`Failed to count activities: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get activities for a user
 */
export async function getActivities(
  userId: string,
  processed?: boolean,
  limit: number = 50
): Promise<ActivityRecord[]> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (processed !== undefined) {
    query = query.eq('processed', processed);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch activities: ${error.message}`);
  }

  return data || [];
}
