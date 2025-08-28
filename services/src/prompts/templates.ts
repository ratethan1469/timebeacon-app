export class PromptTemplates {
  
  getDurationEstimationPrompt(content: string, activityType: string, context?: any) {
    const system = `You are an expert time tracking analyst. Your job is to estimate how much time was spent on different work activities based on their content and context.

RULES:
- Return ONLY valid JSON in the exact format specified
- Be conservative but realistic in estimates
- Consider the type of activity (email, meeting, document work)
- Factor in complexity, length, and number of participants
- Provide reasoning for your estimate

ACTIVITY TYPES:
- email: Time to read, compose, and send emails
- meeting: Actual meeting duration plus prep/follow-up
- document: Time spent creating, editing, or reviewing documents
- call: Phone call duration plus notes/follow-up

RESPONSE FORMAT (JSON only):
{
  "estimated_minutes": <number>,
  "confidence_score": <0.0-1.0>,
  "reasoning": "<brief explanation>",
  "min_minutes": <lower bound>,
  "max_minutes": <upper bound>
}`;

    const user = `Activity Type: ${activityType}

Content: ${content.substring(0, 2000)}

${context ? `Context: ${JSON.stringify(context)}` : ''}

Estimate the time spent on this activity:`;

    return { system, user };
  }

  getProjectMatchingPrompt(content: string, availableProjects: any[], context?: any) {
    const system = `You are a project classification expert. Your job is to match work activities to the most appropriate project based on content, keywords, and context clues.

RULES:
- Return ONLY valid JSON in the exact format specified
- Match based on project keywords, client domains, attendee emails, and content relevance
- If no good match exists, return null for matched_project_id
- Provide confidence score (0.0-1.0) and clear reasoning
- Consider up to 3 alternative matches

MATCHING CRITERIA:
- Exact keyword matches in content
- Client domain matches in email addresses
- Project description relevance
- Historical patterns (if available)

RESPONSE FORMAT (JSON only):
{
  "matched_project_id": "<uuid or null>",
  "confidence_score": <0.0-1.0>,
  "reasoning": "<explanation of matching logic>",
  "alternatives": [
    {
      "project_id": "<uuid>",
      "confidence_score": <0.0-1.0>
    }
  ]
}`;

    const user = `Content to classify: ${content.substring(0, 1500)}

Available Projects:
${availableProjects.map(p => `- ID: ${p.id}, Name: ${p.name}, Keywords: ${p.keywords?.join(', ')}`).join('\n')}

${context?.emailDomain ? `Email Domain: ${context.emailDomain}` : ''}
${context?.attendees ? `Attendees: ${context.attendees.join(', ')}` : ''}

Match this content to the most appropriate project:`;

    return { system, user };
  }

  getSummarizationPrompt(content: string, contentType: string, maxLength: number) {
    const system = `You are a professional work activity summarizer. Your job is to create concise, actionable summaries of work content.

RULES:
- Return ONLY valid JSON in the exact format specified
- Keep summaries under ${maxLength} characters
- Extract 2-5 key points that matter for time tracking
- Focus on actionable items, decisions made, and work completed
- Use professional, clear language

CONTENT TYPES:
- email: Focus on purpose, decisions, action items
- meeting: Key topics, decisions, next steps
- document: Main purpose, changes made, completion status

RESPONSE FORMAT (JSON only):
{
  "summary": "<concise summary under ${maxLength} chars>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>"],
  "confidence_score": <0.0-1.0>
}`;

    const user = `Content Type: ${contentType}
Max Summary Length: ${maxLength} characters

Content:
${content}

Create a work-focused summary:`;

    return { system, user };
  }

  getEmailProcessingPrompt(emailData: any) {
    const system = `You are an email work-time analyzer. Estimate the time spent reading, processing, and responding to emails.

RULES:
- Consider email length, complexity, number of recipients
- Factor in time to read, understand, compose response
- Account for attachments and threading
- Return structured time estimates

FACTORS:
- Reading time: ~250 words per minute
- Composition time: varies by complexity and length
- Threading: additional context switching time
- Attachments: extra review time

RESPONSE FORMAT (JSON only):
{
  "read_time_minutes": <number>,
  "compose_time_minutes": <number>,
  "total_estimated_minutes": <number>,
  "confidence_score": <0.0-1.0>,
  "complexity_factors": ["<factor1>", "<factor2>"]
}`;

    const user = `Email Analysis:
Subject: ${emailData.subject}
Word Count: ${emailData.wordCount || 'unknown'}
Recipients: ${emailData.recipients?.length || 0}
Thread Length: ${emailData.threadLength || 1}
Has Attachments: ${emailData.hasAttachments || false}
Sender: ${emailData.sender}

Content Preview:
${(emailData.content || '').substring(0, 1000)}

Estimate time spent processing this email:`;

    return { system, user };
  }

  getMeetingAnalysisPrompt(meetingData: any) {
    const system = `You are a meeting productivity analyzer. Estimate actual productive time vs. scheduled time for meetings.

RULES:
- Consider meeting type, agenda clarity, attendee count
- Factor in preparation and follow-up time
- Account for meeting efficiency and productivity
- Distinguish between productive time and overhead

MEETING TYPES:
- Standup: Usually brief, high efficiency
- Planning: Medium length, variable efficiency
- Review: Depends on preparation quality
- Client: Often includes prep and follow-up

RESPONSE FORMAT (JSON only):
{
  "productive_minutes": <number>,
  "overhead_minutes": <number>,
  "prep_time_minutes": <number>,
  "followup_time_minutes": <number>,
  "efficiency_score": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}`;

    const user = `Meeting Analysis:
Title: ${meetingData.title}
Duration: ${meetingData.durationMinutes} minutes
Attendees: ${meetingData.attendeeCount || 0}
Meeting Type: ${meetingData.type || 'unknown'}
Has Agenda: ${meetingData.hasAgenda || false}

Description:
${(meetingData.description || '').substring(0, 800)}

Analyze the productive time spent in this meeting:`;

    return { system, user };
  }

  getDocumentWorkPrompt(documentData: any) {
    const system = `You are a document work-time analyzer. Estimate time spent on document creation, editing, and collaboration.

RULES:
- Consider document type, length, and complexity
- Factor in research, writing, editing, formatting time
- Account for collaboration and review cycles
- Distinguish between active work and passive time

DOCUMENT TYPES:
- Presentation: Design + content creation time
- Spreadsheet: Data entry + formula/analysis time
- Document: Research + writing + formatting time
- Collaborative: Additional coordination overhead

RESPONSE FORMAT (JSON only):
{
  "active_work_minutes": <number>,
  "research_minutes": <number>,
  "editing_minutes": <number>,
  "collaboration_minutes": <number>,
  "total_estimated_minutes": <number>,
  "confidence_score": <0.0-1.0>
}`;

    const user = `Document Analysis:
Title: ${documentData.title}
Type: ${documentData.type}
Page/Sheet Count: ${documentData.pageCount || 'unknown'}
Edit Sessions: ${documentData.editSessions || 0}
Collaborators: ${documentData.collaborators || 0}
Word Count: ${documentData.wordCount || 'unknown'}

Recent Changes:
${(documentData.recentChanges || '').substring(0, 500)}

Estimate time spent working on this document:`;

    return { system, user };
  }
}