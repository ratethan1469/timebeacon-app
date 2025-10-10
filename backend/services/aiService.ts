import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface Activity {
  type: 'calendar' | 'email' | 'document';
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  participants?: string[];
  duration?: number;
  source: string;
}

export interface TimeEntrySuggestion {
  description: string;
  duration: number;
  category?: string;
  confidence: number;
  originalActivity: Activity;
}

export async function generateTimeEntriesFromActivities(
  activities: Activity[]
): Promise<TimeEntrySuggestion[]> {
  const prompt = `You are a time tracking assistant. Analyze the following activities and generate time entry suggestions.

Activities:
${JSON.stringify(activities, null, 2)}

For each activity, determine if it represents billable work and suggest a time entry with:
1. A clear, professional description (what work was done)
2. Duration in minutes
3. Category (meeting, email, documentation, development, etc.)
4. Confidence score (0-1) indicating how certain you are this should be a time entry

Return ONLY a JSON array of suggestions in this exact format:
[
  {
    "description": "Client meeting - project planning",
    "duration": 60,
    "category": "meeting",
    "confidence": 0.95
  }
]

Skip activities that are clearly personal or non-work related. Only include work-related activities.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  const responseText = content.text;
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse AI response');
  }

  const suggestions = JSON.parse(jsonMatch[0]);

  return suggestions.map((suggestion: any, index: number) => ({
    ...suggestion,
    originalActivity: activities[index] || activities[0],
  }));
}

export async function categorizeTimeEntry(
  description: string
): Promise<string> {
  const prompt = `Categorize this time entry into one of these categories: meeting, email, documentation, development, design, testing, review, admin, other.

Time entry: "${description}"

Return ONLY the category name, nothing else.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 50,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    return 'other';
  }

  return content.text.trim().toLowerCase();
}
