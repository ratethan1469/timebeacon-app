const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateTimeEntriesFromActivities(activities, context = {}) {
  const { companyName, knownCustomers = [], knownProjects = [] } = context;

  const contextInfo = companyName
    ? `\n\nCompany Context:
- Company: ${companyName}
- Known Customers: ${knownCustomers.join(', ') || 'None listed'}
- Active Projects: ${knownProjects.join(', ') || 'None listed'}\n`
    : '';

  const prompt = `You are a time tracking assistant. Analyze the following activities and generate time entry suggestions.
${contextInfo}
Activities:
${JSON.stringify(activities, null, 2)}

CRITICAL: Only create time entries for WORK-RELATED activities. Automatically filter out and SKIP:

❌ Marketing/Promotional Content (Confidence should NEVER exceed 0.3):
- Sales emails, promotional offers, newsletters
- Marketing campaigns, product announcements, bulk sends
- Advertising, spam, automated marketing emails
- Unsubscribe notifications, promotional updates

❌ Personal Activities (Skip entirely):
- Shopping confirmations, delivery notifications, receipts
- Entertainment (streaming, games, social media)
- Personal appointments (doctor, dentist, gym)
- Social invitations, personal calendar events
- Food delivery, restaurant reservations

❌ System/Administrative (Skip entirely):
- Password resets, account notifications
- System updates, automated alerts
- Automated notifications not related to work

✅ ONLY Include Work-Related Activities:
- Customer communications (emails, calls, meetings)
- Internal team discussions, standup meetings
- Project/implementation work sessions
- Client meetings, training, onboarding
- Work product creation (code, docs, designs)
- Customer support, troubleshooting
- Code reviews, testing, QA work

Confidence Score Guidelines:
- Client meetings/calls: 0.85-0.95
- Direct customer emails (you wrote): 0.75-0.90
- Team meetings/standups: 0.70-0.85
- Work emails (replies to customers): 0.60-0.80
- Marketing/promotional emails: MAX 0.30 (usually skip these)
- Personal emails: 0.00 (always skip)

For each WORK activity, suggest a time entry with:
1. A clear, professional description (what work was done)
2. Duration in minutes
3. Category (meeting, email, documentation, development, support, training, etc.)
4. Confidence score (0-1) - BE CONSERVATIVE

Return ONLY a JSON array of suggestions in this exact format:
[
  {
    "description": "Client meeting - project planning",
    "duration": 60,
    "category": "meeting",
    "confidence": 0.95
  }
]

If an activity is not work-related, DO NOT include it in the output. Return an empty array [] if no work activities are found.`;

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

  return suggestions.map((suggestion, index) => ({
    ...suggestion,
    originalActivity: activities[index] || activities[0],
  }));
}

async function categorizeTimeEntry(description) {
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

module.exports = {
  generateTimeEntriesFromActivities,
  categorizeTimeEntry,
};
