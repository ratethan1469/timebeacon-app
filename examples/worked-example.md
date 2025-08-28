# Worked Example: Day Input → Timesheet JSON Output

## Overview
This example shows how TimeBeacon processes a typical workday for a consultant working with multiple clients, demonstrating the complete flow from raw data capture through AI processing to final timesheet output.

## Input Data Sources

### Gmail Import (9:00 AM - 6:00 PM, March 15, 2024)

```json
{
  "gmail_messages": [
    {
      "id": "msg_001",
      "thread_id": "thread_001",
      "subject": "Salesforce integration requirements",
      "sender": "sarah.johnson@acmecorp.com",
      "recipients": ["consultant@timebeacon.io", "team@acmecorp.com"],
      "timestamp": "2024-03-15T09:15:00Z",
      "word_count": 450,
      "snippet": "Following up on our call yesterday, here are the detailed requirements for the Salesforce integration project...",
      "has_attachments": true,
      "thread_length": 3
    },
    {
      "id": "msg_002", 
      "thread_id": "thread_002",
      "subject": "Re: Monday.com workflow automation",
      "sender": "mike.chen@techstartup.io",
      "recipients": ["consultant@timebeacon.io"],
      "timestamp": "2024-03-15T11:30:00Z",
      "word_count": 180,
      "snippet": "Thanks for the proposal. Can we schedule a call to discuss the implementation timeline?",
      "thread_length": 2
    },
    {
      "id": "msg_003",
      "thread_id": "thread_003", 
      "subject": "Internal: Team standup notes",
      "sender": "consultant@timebeacon.io",
      "recipients": ["team@timebeacon.io"],
      "timestamp": "2024-03-15T10:45:00Z",
      "word_count": 120,
      "snippet": "Quick update from today's standup: Sprint progress, blockers, and next priorities...",
      "thread_length": 1
    },
    {
      "id": "msg_004",
      "thread_id": "thread_004",
      "subject": "Invoice #2024-045 - Zendesk Integration Phase 2",
      "sender": "consultant@timebeacon.io",
      "recipients": ["billing@zendesk.com"],
      "timestamp": "2024-03-15T16:20:00Z", 
      "word_count": 85,
      "snippet": "Please find attached invoice for Phase 2 of the Zendesk integration project...",
      "has_attachments": true,
      "thread_length": 1
    }
  ]
}
```

### Google Calendar Import (9:00 AM - 6:00 PM, March 15, 2024)

```json
{
  "calendar_events": [
    {
      "id": "event_001",
      "summary": "Daily standup - Internal team",
      "start": {
        "dateTime": "2024-03-15T09:00:00Z"
      },
      "end": {
        "dateTime": "2024-03-15T09:30:00Z"
      },
      "attendees": [
        {"email": "consultant@timebeacon.io"},
        {"email": "john@timebeacon.io"},
        {"email": "sarah@timebeacon.io"}
      ],
      "creator": {"email": "john@timebeacon.io"},
      "location": "Conference Room A"
    },
    {
      "id": "event_002", 
      "summary": "Acme Corp - Salesforce requirements review",
      "start": {
        "dateTime": "2024-03-15T14:00:00Z"
      },
      "end": {
        "dateTime": "2024-03-15T15:30:00Z"
      },
      "attendees": [
        {"email": "consultant@timebeacon.io"},
        {"email": "sarah.johnson@acmecorp.com"},
        {"email": "tech-lead@acmecorp.com"}
      ],
      "description": "Review technical requirements for Salesforce API integration. Discuss timeline and resource allocation.",
      "hangoutLink": "https://meet.google.com/abc-defg-hij"
    },
    {
      "id": "event_003",
      "summary": "Focus time - Development work", 
      "start": {
        "dateTime": "2024-03-15T10:00:00Z"
      },
      "end": {
        "dateTime": "2024-03-15T12:00:00Z"
      },
      "attendees": [
        {"email": "consultant@timebeacon.io"}
      ],
      "creator": {"email": "consultant@timebeacon.io"},
      "eventType": "focusTime"
    }
  ]
}
```

### Google Drive Activity (Documents edited during the day)

```json
{
  "drive_activities": [
    {
      "document_id": "doc_001",
      "title": "Salesforce Integration - Technical Specification v2.1",
      "type": "document",
      "last_modified": "2024-03-15T13:45:00Z",
      "edit_sessions": [
        {
          "start": "2024-03-15T10:30:00Z",
          "end": "2024-03-15T11:45:00Z",
          "changes_made": 47
        },
        {
          "start": "2024-03-15T15:45:00Z", 
          "end": "2024-03-15T16:15:00Z",
          "changes_made": 23
        }
      ],
      "collaborators": ["sarah.johnson@acmecorp.com", "tech-lead@acmecorp.com"],
      "word_count": 2850
    },
    {
      "document_id": "sheet_001",
      "title": "Project Timeline - Monday.com Implementation",
      "type": "spreadsheet",
      "last_modified": "2024-03-15T12:30:00Z",
      "edit_sessions": [
        {
          "start": "2024-03-15T12:15:00Z",
          "end": "2024-03-15T12:35:00Z", 
          "changes_made": 15
        }
      ],
      "collaborators": ["mike.chen@techstartup.io"]
    }
  ]
}
```

## AI Processing Pipeline

### Step 1: Duration Estimation

For each activity, the LLM estimates time spent:

**Email Processing Results:**
```json
{
  "msg_001": {
    "estimated_minutes": 25,
    "confidence_score": 0.85,
    "reasoning": "Complex technical email with attachments, 450 words, requires detailed reading and response composition",
    "bounds": {"min_minutes": 20, "max_minutes": 35}
  },
  "msg_002": {
    "estimated_minutes": 8,
    "confidence_score": 0.9,
    "reasoning": "Short response email, 180 words, straightforward scheduling request",
    "bounds": {"min_minutes": 5, "max_minutes": 12}
  },
  "msg_003": {
    "estimated_minutes": 12,
    "confidence_score": 0.8, 
    "reasoning": "Internal update email, 120 words, requires synthesis of meeting notes",
    "bounds": {"min_minutes": 8, "max_minutes": 18}
  },
  "msg_004": {
    "estimated_minutes": 5,
    "confidence_score": 0.95,
    "reasoning": "Simple invoice email, 85 words, standard business communication",
    "bounds": {"min_minutes": 3, "max_minutes": 8}
  }
}
```

**Meeting Analysis Results:**
```json
{
  "event_001": {
    "productive_minutes": 25,
    "overhead_minutes": 5,
    "efficiency_score": 0.85,
    "reasoning": "Daily standup, focused agenda, good attendance"
  },
  "event_002": {
    "productive_minutes": 75,
    "overhead_minutes": 15,
    "prep_time_minutes": 20,
    "followup_time_minutes": 10,
    "efficiency_score": 0.8,
    "reasoning": "Client requirements meeting, technical discussion, some prep and follow-up needed"
  },
  "event_003": {
    "productive_minutes": 105,
    "overhead_minutes": 15, 
    "efficiency_score": 0.9,
    "reasoning": "Focus time block, minimal interruptions, high productivity"
  }
}
```

**Document Work Analysis:**
```json
{
  "doc_001": {
    "active_work_minutes": 95,
    "research_minutes": 20,
    "editing_minutes": 15,
    "collaboration_minutes": 5,
    "total_estimated_minutes": 135,
    "confidence_score": 0.9
  },
  "sheet_001": {
    "active_work_minutes": 18,
    "research_minutes": 0,
    "editing_minutes": 2,
    "collaboration_minutes": 0,
    "total_estimated_minutes": 20,
    "confidence_score": 0.95
  }
}
```

### Step 2: Project Matching

The AI matches each activity to the appropriate project:

```json
{
  "project_matches": {
    "msg_001": {
      "matched_project_id": "proj_salesforce_001",
      "confidence_score": 0.95,
      "reasoning": "Email from acmecorp.com domain, subject contains 'Salesforce integration', matches project keywords"
    },
    "msg_002": {
      "matched_project_id": "proj_monday_001", 
      "confidence_score": 0.9,
      "reasoning": "Email from techstartup.io domain, subject mentions 'Monday.com workflow', matches client domain"
    },
    "msg_003": {
      "matched_project_id": "proj_internal_001",
      "confidence_score": 0.95,
      "reasoning": "Internal email to @timebeacon.io, subject indicates internal team communication"
    },
    "event_001": {
      "matched_project_id": "proj_internal_001",
      "confidence_score": 0.9,
      "reasoning": "Daily standup with internal team members only"
    },
    "event_002": {
      "matched_project_id": "proj_salesforce_001",
      "confidence_score": 0.95, 
      "reasoning": "Meeting with acmecorp.com attendees, title mentions Salesforce requirements"
    },
    "doc_001": {
      "matched_project_id": "proj_salesforce_001",
      "confidence_score": 0.95,
      "reasoning": "Document title contains 'Salesforce Integration', collaborators from acmecorp.com"
    }
  }
}
```

### Step 3: Content Summarization

```json
{
  "summaries": {
    "msg_001": {
      "summary": "Detailed Salesforce integration requirements including API specifications, data mapping requirements, and security protocols",
      "key_points": [
        "API integration scope defined",
        "Data mapping requirements specified", 
        "Security protocols outlined"
      ]
    },
    "event_002": {
      "summary": "Technical requirements review for Salesforce integration covering API scope, timeline, and resource allocation",
      "key_points": [
        "Requirements finalized",
        "Timeline approved",
        "Resource allocation confirmed"
      ]
    },
    "doc_001": {
      "summary": "Updated technical specification document with API endpoints, authentication methods, and integration architecture",
      "key_points": [
        "API endpoints documented",
        "Authentication methods defined",
        "Integration architecture updated"
      ]
    }
  }
}
```

## Final Timesheet JSON Output

```json
{
  "timesheet": {
    "user_id": "user_12345",
    "date": "2024-03-15",
    "total_hours": 8.25,
    "billable_hours": 7.0,
    "entries": [
      {
        "id": "entry_001",
        "start_time": "2024-03-15T09:00:00Z",
        "end_time": "2024-03-15T09:30:00Z", 
        "duration_minutes": 30,
        "title": "Daily standup - Internal team",
        "description": "Sprint progress review, blocker discussions, and priority planning for the day",
        "project": {
          "id": "proj_internal_001",
          "name": "Internal Operations", 
          "client": "TimeBeacon Internal"
        },
        "activity_type": "meeting",
        "source": "calendar",
        "is_billable": false,
        "confidence_score": 0.9,
        "tags": ["standup", "internal", "meeting"]
      },
      {
        "id": "entry_002",
        "start_time": "2024-03-15T09:15:00Z",
        "end_time": "2024-03-15T09:40:00Z",
        "duration_minutes": 25, 
        "title": "Salesforce integration requirements review",
        "description": "Detailed requirements including API specifications, data mapping requirements, and security protocols",
        "project": {
          "id": "proj_salesforce_001",
          "name": "Salesforce CRM Integration",
          "client": "Acme Corp"
        },
        "activity_type": "email",
        "source": "gmail",
        "is_billable": true,
        "confidence_score": 0.85,
        "tags": ["requirements", "api", "integration"]
      },
      {
        "id": "entry_003",
        "start_time": "2024-03-15T10:00:00Z", 
        "end_time": "2024-03-15T12:00:00Z",
        "duration_minutes": 120,
        "title": "Development work - Focus time",
        "description": "Concentrated development work on technical implementation",
        "project": {
          "id": "proj_salesforce_001", 
          "name": "Salesforce CRM Integration",
          "client": "Acme Corp"
        },
        "activity_type": "development",
        "source": "calendar",
        "is_billable": true,
        "confidence_score": 0.9,
        "tags": ["development", "focus-time", "implementation"]
      },
      {
        "id": "entry_004",
        "start_time": "2024-03-15T10:30:00Z",
        "end_time": "2024-03-15T11:45:00Z", 
        "duration_minutes": 75,
        "title": "Technical specification documentation",
        "description": "Updated technical specification document with API endpoints, authentication methods, and integration architecture",
        "project": {
          "id": "proj_salesforce_001",
          "name": "Salesforce CRM Integration", 
          "client": "Acme Corp"
        },
        "activity_type": "document",
        "source": "drive",
        "is_billable": true,
        "confidence_score": 0.9,
        "tags": ["documentation", "technical-spec", "api"]
      },
      {
        "id": "entry_005",
        "start_time": "2024-03-15T10:45:00Z",
        "end_time": "2024-03-15T10:57:00Z",
        "duration_minutes": 12,
        "title": "Team standup notes distribution",
        "description": "Quick update from today's standup: Sprint progress, blockers, and next priorities",
        "project": {
          "id": "proj_internal_001",
          "name": "Internal Operations",
          "client": "TimeBeacon Internal"
        },
        "activity_type": "email",
        "source": "gmail", 
        "is_billable": false,
        "confidence_score": 0.8,
        "tags": ["standup", "internal", "communication"]
      },
      {
        "id": "entry_006",
        "start_time": "2024-03-15T11:30:00Z",
        "end_time": "2024-03-15T11:38:00Z",
        "duration_minutes": 8,
        "title": "Monday.com implementation scheduling",
        "description": "Thanks for the proposal. Can we schedule a call to discuss the implementation timeline?",
        "project": {
          "id": "proj_monday_001",
          "name": "Monday.com Workflow Automation",
          "client": "TechStart Inc"
        },
        "activity_type": "email",
        "source": "gmail",
        "is_billable": true,
        "confidence_score": 0.9,
        "tags": ["scheduling", "monday.com", "client-communication"]
      },
      {
        "id": "entry_007", 
        "start_time": "2024-03-15T12:15:00Z",
        "end_time": "2024-03-15T12:35:00Z",
        "duration_minutes": 20,
        "title": "Project timeline planning",
        "description": "Updated project timeline spreadsheet with milestones and resource allocation for Monday.com implementation",
        "project": {
          "id": "proj_monday_001",
          "name": "Monday.com Workflow Automation",
          "client": "TechStart Inc"
        },
        "activity_type": "document",
        "source": "drive",
        "is_billable": true,
        "confidence_score": 0.95,
        "tags": ["planning", "timeline", "project-management"]
      },
      {
        "id": "entry_008",
        "start_time": "2024-03-15T14:00:00Z",
        "end_time": "2024-03-15T15:30:00Z",
        "duration_minutes": 90,
        "title": "Acme Corp - Salesforce requirements review",
        "description": "Technical requirements review for Salesforce integration covering API scope, timeline, and resource allocation", 
        "project": {
          "id": "proj_salesforce_001",
          "name": "Salesforce CRM Integration",
          "client": "Acme Corp"
        },
        "activity_type": "meeting",
        "source": "calendar",
        "is_billable": true,
        "confidence_score": 0.95,
        "tags": ["requirements", "client-meeting", "technical-review"]
      },
      {
        "id": "entry_009",
        "start_time": "2024-03-15T15:45:00Z", 
        "end_time": "2024-03-15T16:15:00Z",
        "duration_minutes": 30,
        "title": "Technical specification updates",
        "description": "Post-meeting updates to technical specification based on client feedback and requirements clarification",
        "project": {
          "id": "proj_salesforce_001",
          "name": "Salesforce CRM Integration",
          "client": "Acme Corp"
        },
        "activity_type": "document",
        "source": "drive", 
        "is_billable": true,
        "confidence_score": 0.9,
        "tags": ["documentation", "client-feedback", "updates"]
      },
      {
        "id": "entry_010",
        "start_time": "2024-03-15T16:20:00Z",
        "end_time": "2024-03-15T16:25:00Z",
        "duration_minutes": 5,
        "title": "Invoice submission - Zendesk project",
        "description": "Invoice #2024-045 for Phase 2 of Zendesk integration project submitted to client",
        "project": {
          "id": "proj_zendesk_001",
          "name": "Zendesk Integration Phase 2", 
          "client": "Zendesk Inc"
        },
        "activity_type": "email",
        "source": "gmail",
        "is_billable": false,
        "confidence_score": 0.95,
        "tags": ["billing", "invoice", "administrative"]
      }
    ],
    "summary": {
      "by_project": [
        {
          "project": {
            "id": "proj_salesforce_001",
            "name": "Salesforce CRM Integration", 
            "client": "Acme Corp"
          },
          "total_minutes": 340,
          "billable_minutes": 340,
          "activities": ["email", "meeting", "document", "development"],
          "percentage": 68.7
        },
        {
          "project": {
            "id": "proj_monday_001",
            "name": "Monday.com Workflow Automation",
            "client": "TechStart Inc"
          },
          "total_minutes": 28,
          "billable_minutes": 28, 
          "activities": ["email", "document"],
          "percentage": 5.7
        },
        {
          "project": {
            "id": "proj_internal_001",
            "name": "Internal Operations",
            "client": "TimeBeacon Internal"
          },
          "total_minutes": 42,
          "billable_minutes": 0,
          "activities": ["meeting", "email"],
          "percentage": 8.5
        },
        {
          "project": {
            "id": "proj_zendesk_001",
            "name": "Zendesk Integration Phase 2",
            "client": "Zendesk Inc"
          },
          "total_minutes": 5,
          "billable_minutes": 0,
          "activities": ["email"],
          "percentage": 1.0
        }
      ],
      "by_activity_type": {
        "meeting": {"total_minutes": 120, "billable_minutes": 90},
        "email": {"total_minutes": 50, "billable_minutes": 33},
        "document": {"total_minutes": 125, "billable_minutes": 125}, 
        "development": {"total_minutes": 120, "billable_minutes": 120}
      },
      "productivity_insights": [
        "High focus time allocation (29% of day)",
        "Strong client work ratio (84% billable)",
        "Balanced activity mix across communication, documentation, and development"
      ]
    },
    "ai_processing_stats": {
      "total_items_processed": 10,
      "high_confidence_items": 8,
      "needs_review_items": 0,
      "processing_time_ms": 2847,
      "estimated_cost_usd": 0.23
    }
  }
}
```

## Data Flow Summary

1. **Raw Data Capture**: TimeBeacon APIs capture email metadata, calendar events, and document activity
2. **AI Processing**: LLM analyzes content to estimate durations, match projects, and generate summaries
3. **Time Entry Creation**: System creates structured time entries with confidence scores
4. **Dashboard Display**: Frontend receives organized JSON data for clean dashboard presentation

This example demonstrates how TimeBeacon transforms scattered productivity data into actionable timesheet insights, maintaining privacy while providing detailed work analytics.