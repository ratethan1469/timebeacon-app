const { createClient } = require('@supabase/supabase-js');
const { generateTimeEntriesFromActivities } = require('./aiService');

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Store activities for processing
 */
async function storeActivities(userId, companyId, activities) {
  const activityRecords = activities.map((activity) => ({
    user_id: userId,
    company_id: companyId,
    type: activity.type === 'calendar' ? 'meeting' : activity.type === 'email' ? 'email' : 'message',
    source: activity.source,
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
function generateHash(activity) {
  const content = `${activity.title}-${activity.startTime}-${activity.source}`;
  return Buffer.from(content).toString('base64').substring(0, 32);
}

/**
 * Process unprocessed activities and generate time entries
 */
async function processActivities(userId, companyId) {
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

    // Get company info for better AI context
    const { data: companyData } = await supabase
      .from('companies')
      .select('name, customers, projects')
      .eq('id', companyId)
      .single();

    // Convert to Activity format for AI processing
    const activities = activityRecords.map((record) => ({
      type: record.type,
      title: record.metadata.title || '',
      description: record.content_summary,
      startTime: record.metadata.start_time,
      endTime: record.metadata.end_time,
      participants: record.metadata.participants,
      duration: record.metadata.duration,
      source: record.source,
    }));

    console.log(`Processing ${activities.length} activities for AI analysis`);

    // Generate suggestions using AI with company context
    const suggestions = await generateTimeEntriesFromActivities(activities, {
      companyName: companyData?.name,
      knownCustomers: companyData?.customers || [],
      knownProjects: companyData?.projects || [],
    });

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
        status: 'pending_review',
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
function extractCustomerName(metadata) {
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
async function getTimeEntries(userId, status, limit = 50) {
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
async function updateTimeEntryStatus(entryId, status) {
  const updateData = { status };

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
async function updateTimeEntry(entryId, updates) {
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
async function getUnprocessedActivitiesCount(userId) {
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
async function getActivities(userId, processed, limit = 50) {
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

/**
 * Store Gmail messages as activities
 * Only stores work-related emails (sent by user OR emails that were read)
 */
async function storeGmailActivities(userId, companyId, messages) {
  // Get user's email to identify sent messages
  const { data: userData } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  const userEmail = userData?.email?.toLowerCase();

  // Filter messages: only store if user sent it OR if it was read
  const filteredMessages = messages.filter((message) => {
    // Keep if user is the sender (outgoing emails they wrote)
    if (message.sender && userEmail && message.sender.toLowerCase().includes(userEmail)) {
      return true;
    }

    // Keep if email has been read (labelIds doesn't include 'UNREAD')
    if (message.labelIds && !message.labelIds.includes('UNREAD')) {
      return true;
    }

    // Skip unread promotional/bulk emails
    return false;
  });

  console.log(`Filtered ${filteredMessages.length} work emails out of ${messages.length} total`);

  const activities = filteredMessages.map((message) => ({
    type: 'email',
    title: message.subject || '(No subject)',
    description: message.snippet,
    startTime: message.timestamp,
    endTime: message.timestamp,
    participants: [message.sender, ...message.recipients].filter(Boolean),
    duration: Math.max(Math.ceil(message.wordCount / 150), 1), // Estimate: 150 words per minute reading
    source: 'gmail',
  }));

  return storeActivities(userId, companyId, activities);
}

/**
 * Store Calendar events as activities
 */
async function storeCalendarActivities(userId, companyId, events) {
  const activities = events.map((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const durationMinutes = Math.max((end - start) / (1000 * 60), 1);

    return {
      type: 'calendar',
      title: event.summary || '(No title)',
      description: event.description || event.location || '',
      startTime: event.start,
      endTime: event.end,
      participants: event.attendees || [],
      duration: durationMinutes,
      source: 'calendar',
    };
  });

  return storeActivities(userId, companyId, activities);
}

module.exports = {
  storeActivities,
  storeGmailActivities,
  storeCalendarActivities,
  processActivities,
  getTimeEntries,
  updateTimeEntryStatus,
  updateTimeEntry,
  getUnprocessedActivitiesCount,
  getActivities,
};
