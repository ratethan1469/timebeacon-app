/**
 * SIMPLE Google Calendar Integration - Just works!
 */

import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../hooks/useTimeTracker';

declare global {
  interface Window {
    gapi: any;
  }
}

export const SimpleCalendar: React.FC = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const { addTimeEntry } = useTimeTracker();

  const CLIENT_ID = '696202687856-c82e7prqdt00og14k6lp47hiutn7p9an.apps.googleusercontent.com';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

  useEffect(() => {
    loadGoogleAPI();
  }, []);

  const loadGoogleAPI = () => {
    if (window.gapi) {
      initializeGapi();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client:auth2', initializeGapi);
    };
    document.head.appendChild(script);
  };

  const initializeGapi = async () => {
    try {
      await window.gapi.client.init({
        clientId: CLIENT_ID,
        discoveryDocs: [DISCOVERY_DOC],
        scope: SCOPES
      });

      const authInstance = window.gapi.auth2.getAuthInstance();
      setIsSignedIn(authInstance.isSignedIn.get());
      
      authInstance.isSignedIn.listen(setIsSignedIn);
      console.log('✅ Google Calendar API initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google API:', error);
    }
  };

  const signIn = async () => {
    setIsLoading(true);
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      console.log('✅ Signed in to Google Calendar');
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      alert('Sign in failed. Please try again.');
    }
    setIsLoading(false);
  };

  const getTodaysEvents = async () => {
    setIsLoading(true);
    try {
      console.log('📅 Fetching today\'s calendar events...');

      const today = new Date();
      const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const todaysEvents = response.result.items || [];
      console.log(`Found ${todaysEvents.length} events for today`);

      // Filter out all-day events and very short events
      const relevantEvents = todaysEvents.filter((event: any) => {
        if (!event.start.dateTime || !event.end.dateTime) return false; // Skip all-day events
        
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        
        return durationMinutes >= 15; // Only track meetings 15+ minutes
      });

      setEvents(relevantEvents);
      
      if (relevantEvents.length > 0) {
        createTimeEntriesFromEvents(relevantEvents);
      } else {
        alert('No relevant meetings found for today (meetings must be 15+ minutes and not all-day)');
      }

    } catch (error) {
      console.error('❌ Failed to fetch calendar events:', error);
      alert('Failed to fetch calendar events. Make sure you have meetings scheduled for today.');
    }
    setIsLoading(false);
  };

  const createTimeEntriesFromEvents = async (eventList: any[]) => {
    console.log('⏱️ Creating time entries from calendar events...');
    
    for (const event of eventList) {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      // Smart client/project detection
      let client = 'Unknown Client';
      let project = 'Meeting';
      let category: 'client' | 'internal' | 'meeting' = 'meeting';

      const title = event.summary.toLowerCase();
      const attendeeEmails = event.attendees?.map((a: any) => a.email) || [];

      // Check if it's internal
      if (title.includes('internal') || 
          title.includes('standup') || 
          title.includes('team') ||
          attendeeEmails.every((email: string) => email.includes('@timebeacon.io'))) {
        client = 'Internal';
        project = 'Internal Operations';
        category = 'internal';
      }
      // Check for specific clients
      else if (title.includes('salesforce') || attendeeEmails.some((email: string) => email.includes('@salesforce.com'))) {
        client = 'Salesforce';
        project = 'Salesforce Implementation';
        category = 'client';
      }
      else if (title.includes('monday') || attendeeEmails.some((email: string) => email.includes('@monday.com'))) {
        client = 'Monday.com';
        project = 'Monday.com Rollout';
        category = 'client';
      }
      else if (title.includes('zendesk') || attendeeEmails.some((email: string) => email.includes('@zendesk.com'))) {
        client = 'Zendesk';
        project = 'Zendesk Integration';
        category = 'client';
      }
      // Default to client meeting if external attendees
      else if (attendeeEmails.some((email: string) => !email.includes('@timebeacon.io'))) {
        client = 'External Client';
        project = 'Client Meeting';
        category = 'client';
      }

      const timeEntry = {
        date: start.toISOString().split('T')[0],
        startTime: start.toTimeString().slice(0, 5),
        endTime: end.toTimeString().slice(0, 5),
        duration: durationHours,
        client,
        project,
        description: event.summary,
        category,
        status: 'pending' as const,
        automated: true,
        source: 'calendar' as const,
        meetingType: 'check-in' as const,
        billable: category !== 'internal',
        tags: ['calendar', 'google-calendar']
      };

      await addTimeEntry(timeEntry);
      console.log(`✅ Created time entry: ${Math.round(durationHours * 60)}min for ${client}`);
    }

    alert(`✅ Success! Created ${eventList.length} time entries from your Google Calendar events.`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #4285f4', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f8fbff'
    }}>
      <h3>📅 Google Calendar Integration</h3>
      
      {!isSignedIn ? (
        <div>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Connect your Google Calendar to automatically track meeting time
          </p>
          
          <button 
            onClick={signIn}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: isLoading ? '#ccc' : '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isLoading ? '🔄 Connecting...' : '🔗 Connect Google Calendar'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ 
            color: 'green', 
            backgroundColor: '#e6ffe6', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            ✅ Google Calendar connected!
          </div>
          
          <button 
            onClick={getTodaysEvents}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: isLoading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              marginBottom: '15px'
            }}
          >
            {isLoading ? '📅 Processing...' : '📅 Import Today\'s Meetings'}
          </button>

          {events.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4>Today's Meetings Imported:</h4>
              {events.map((event, index) => (
                <div key={index} style={{ 
                  padding: '10px', 
                  margin: '5px 0',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}>
                  <strong>{event.summary}</strong><br/>
                  <small>
                    {new Date(event.start.dateTime).toLocaleTimeString()} - 
                    {new Date(event.end.dateTime).toLocaleTimeString()}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};