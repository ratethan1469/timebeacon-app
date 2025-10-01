/**
 * Manual Calendar Demo - Shows how calendar integration would work
 * Without OAuth complications
 */

import React, { useState } from 'react';
import { useTimeTracker } from '../hooks/useTimeTracker';

export const ManualCalendarDemo: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { addTimeEntry } = useTimeTracker();

  // Sample calendar events that represent real meetings
  const todaysMeetings = [
    {
      title: "Salesforce Implementation - Weekly Check-in",
      start: "09:00",
      end: "10:00",
      attendees: ["john@salesforce.com", "sarah@timebeacon.io"],
      client: "Salesforce",
      project: "Salesforce Implementation"
    },
    {
      title: "Internal Team Standup",
      start: "10:30", 
      end: "11:00",
      attendees: ["team@timebeacon.io"],
      client: "Internal",
      project: "Internal Operations"
    },
    {
      title: "Monday.com Training Session",
      start: "14:00",
      end: "15:30", 
      attendees: ["maria@monday.com", "sarah@timebeacon.io"],
      client: "Monday.com",
      project: "Monday.com Rollout"
    },
    {
      title: "Client Discovery Call - New Project",
      start: "16:00",
      end: "17:00",
      attendees: ["prospect@newclient.com", "sarah@timebeacon.io"],
      client: "New Client",
      project: "Discovery & Sales"
    }
  ];

  const importCalendarMeetings = async () => {
    setIsProcessing(true);

    for (const meeting of todaysMeetings) {
      // Calculate duration
      const [startHour, startMin] = meeting.start.split(':').map(Number);
      const [endHour, endMin] = meeting.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const durationHours = (endMinutes - startMinutes) / 60;

      // Create time entry
      const timeEntry = {
        date: new Date().toISOString().split('T')[0],
        startTime: meeting.start,
        endTime: meeting.end,
        duration: durationHours,
        client: meeting.client,
        project: meeting.project,
        description: meeting.title,
        category: meeting.client === 'Internal' ? 'internal' as const : 'client' as const,
        status: 'pending' as const,
        automated: true,
        source: 'calendar' as const,
        meetingType: 'check-in' as const,
        billable: meeting.client !== 'Internal',
        tags: ['calendar', 'imported']
      };

      await addTimeEntry(timeEntry);
      console.log(`✅ Added: ${meeting.title} (${durationHours}h)`);
      
      // Small delay for smooth UX
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsProcessing(false);
    alert(`✅ Imported ${todaysMeetings.length} meetings from your calendar!`);
  };

  const totalHours = todaysMeetings.reduce((total, meeting) => {
    const [startHour, startMin] = meeting.start.split(':').map(Number);
    const [endHour, endMin] = meeting.end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return total + (endMinutes - startMinutes) / 60;
  }, 0);

  const billableHours = todaysMeetings
    .filter(m => m.client !== 'Internal')
    .reduce((total, meeting) => {
      const [startHour, startMin] = meeting.start.split(':').map(Number);
      const [endHour, endMin] = meeting.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return total + (endMinutes - startMinutes) / 60;
    }, 0);

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #4CAF50', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f9fff9'
    }}>
      <h3>📅 Calendar Time Tracking Demo</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Import today's meetings and automatically create time entries
      </p>

      {/* Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
            {todaysMeetings.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Meetings Today</div>
        </div>
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#388e3c' }}>
            {billableHours.toFixed(1)}h
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Billable Time</div>
        </div>
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fff3e0', 
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
            {totalHours.toFixed(1)}h
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Time</div>
        </div>
      </div>

      {/* Meeting List */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Today's Meetings:</h4>
        {todaysMeetings.map((meeting, index) => (
          <div key={index} style={{ 
            padding: '12px', 
            margin: '8px 0',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            borderLeft: `4px solid ${meeting.client === 'Internal' ? '#ff9800' : '#4caf50'}`
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {meeting.title}
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '14px',
              color: '#666'
            }}>
              <span>🕐 {meeting.start} - {meeting.end}</span>
              <span>👥 {meeting.attendees.length} attendees</span>
              <span style={{ 
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: meeting.client === 'Internal' ? '#fff3e0' : '#e8f5e8',
                color: meeting.client === 'Internal' ? '#f57c00' : '#388e3c',
                fontSize: '12px'
              }}>
                {meeting.client}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={importCalendarMeetings}
        disabled={isProcessing}
        style={{
          padding: '15px 30px',
          backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          width: '100%'
        }}
      >
        {isProcessing ? '⏳ Importing Meetings...' : '📅 Import Calendar Meetings'}
      </button>

      <div style={{ 
        marginTop: '15px', 
        fontSize: '13px', 
        color: '#666',
        textAlign: 'center'
      }}>
        This demonstrates how TimeBeacon automatically imports your calendar events and creates time entries
      </div>
    </div>
  );
};