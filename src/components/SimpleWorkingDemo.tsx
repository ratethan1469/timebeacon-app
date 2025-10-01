/**
 * SIMPLE EMAIL TIME TRACKING DEMO
 * Just works. No OAuth, no AI errors, no complexity.
 */

import React, { useState } from 'react';
import { useTimeTracker } from '../hooks/useTimeTracker';

export const SimpleWorkingDemo: React.FC = () => {
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const { addTimeEntry } = useTimeTracker();

  const runSimpleDemo = async () => {
    setIsDemoRunning(true);

    // Simulate processing 3 emails
    const emails = [
      {
        subject: "Salesforce Implementation - Data Migration Review",
        from: "john@salesforce.com",
        timeSpent: 25, // minutes
        project: "Salesforce CRM Project",
        client: "Salesforce"
      },
      {
        subject: "Monday.com Training Session Planning", 
        from: "maria@monday.com",
        timeSpent: 15,
        project: "Monday.com Rollout",
        client: "Monday.com"
      },
      {
        subject: "Internal: Sprint Planning Notes",
        from: "team@timebeacon.io", 
        timeSpent: 10,
        project: "Internal Operations",
        client: "Internal"
      }
    ];

    for (const email of emails) {
      // Show processing
      await new Promise(resolve => setTimeout(resolve, 800));

      // Create time entry
      const timeEntry = {
        date: new Date().toISOString().split('T')[0],
        startTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
        endTime: new Date(Date.now() + email.timeSpent * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
        duration: email.timeSpent / 60, // Convert to hours
        client: email.client,
        project: email.project,
        description: `Email: ${email.subject}`,
        category: email.client === 'Internal' ? 'internal' as const : 'client' as const,
        status: 'pending' as const,
        automated: true,
        source: 'gmail' as const,
        meetingType: undefined,
        billable: email.client !== 'Internal',
        tags: ['email', 'auto-tracked']
      };

      await addTimeEntry(timeEntry);
      console.log(`✅ Added time entry: ${email.timeSpent}min for ${email.client}`);
    }

    setIsDemoRunning(false);
    alert('✅ Demo complete! Check your dashboard - 3 time entries were automatically created from your emails.');
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #4CAF50', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f9fff9'
    }}>
      <h3>📧 Email Time Tracking Demo</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        See how TimeBeacon automatically creates time entries from your emails
      </p>
      
      <button 
        onClick={runSimpleDemo}
        disabled={isDemoRunning}
        style={{
          padding: '15px 30px',
          backgroundColor: isDemoRunning ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isDemoRunning ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {isDemoRunning ? '⏳ Processing Emails...' : '▶️ Run Demo (3 Emails)'}
      </button>

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <strong>This demo will create time entries for:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>📧 Salesforce email (25 min) → Billable client work</li>
          <li>📧 Monday.com email (15 min) → Billable client work</li>
          <li>📧 Internal email (10 min) → Non-billable internal work</li>
        </ul>
      </div>
    </div>
  );
};