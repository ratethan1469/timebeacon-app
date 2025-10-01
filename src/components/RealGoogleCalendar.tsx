/**
 * REAL Google Calendar Connection - Actually connects to your calendar
 */

import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../hooks/useTimeTracker';

export const RealGoogleCalendar: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { addTimeEntry } = useTimeTracker();


  useEffect(() => {
    // Check if we got a token from redirect
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    const state = params.get('state');
    
    console.log('🔍 Checking for OAuth callback...', { hash, token: token ? 'present' : 'missing', state });
    
    if (token && state === 'calendar_auth') {
      console.log('✅ Got access token from redirect:', token.substring(0, 20) + '...');
      setAccessToken(token);
      setIsAuthenticated(true);
      
      // Store token for future use
      localStorage.setItem('google_calendar_token', token);
      
      // Clean URL
      window.location.hash = '';
    } else {
      // Check if we have a stored token
      const storedToken = localStorage.getItem('google_calendar_token');
      if (storedToken) {
        console.log('✅ Found stored token');
        setAccessToken(storedToken);
        setIsAuthenticated(true);
      }
    }
  }, []);



  const getCalendarEvents = async () => {
    if (!accessToken) {
      alert('Please connect to Google Calendar first');
      return;
    }

    setIsLoading(true);
    try {
      // Get today's events
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${startOfDay.toISOString()}&` +
        `timeMax=${endOfDay.toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const calendarEvents = data.items || [];
      
      console.log(`📅 Found ${calendarEvents.length} calendar events`);

      // Filter to meetings only (not all-day events)
      const meetings = calendarEvents.filter((event: any) => {
        return event.start?.dateTime && event.end?.dateTime;
      });

      setEvents(meetings);

      if (meetings.length === 0) {
        alert('No meetings found for today. Try adding some calendar events and try again.');
        setIsLoading(false);
        return;
      }

      // Convert to time entries
      await convertEventsToTimeEntries(meetings);

    } catch (error) {
      console.error('❌ Calendar API error:', error);
      alert(`Failed to get calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setIsLoading(false);
  };

  const convertEventsToTimeEntries = async (eventList: any[]) => {
    console.log('⏱️ Converting calendar events to time entries...');
    
    for (const event of eventList) {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      // Smart client detection
      let client = 'Unknown Client';
      let project = 'Meeting';
      
      const title = (event.summary || '').toLowerCase();
      const attendees = event.attendees || [];
      
      // Check for known clients
      if (title.includes('salesforce') || attendees.some((a: any) => a.email?.includes('salesforce.com'))) {
        client = 'Salesforce';
        project = 'Salesforce Implementation';
      } else if (title.includes('monday') || attendees.some((a: any) => a.email?.includes('monday.com'))) {
        client = 'Monday.com';
        project = 'Monday.com Rollout';
      } else if (title.includes('zendesk') || attendees.some((a: any) => a.email?.includes('zendesk.com'))) {
        client = 'Zendesk';
        project = 'Zendesk Integration';
      } else if (title.includes('internal') || title.includes('standup') || title.includes('team')) {
        client = 'Internal';
        project = 'Internal Operations';
      } else {
        // Check if external attendees (not your domain)
        const externalAttendees = attendees.filter((a: any) => 
          a.email && !a.email.includes('@timebeacon.io')
        );
        if (externalAttendees.length > 0) {
          client = 'External Client';
          project = 'Client Meeting';
        }
      }

      const timeEntry = {
        date: start.toISOString().split('T')[0],
        startTime: start.toTimeString().slice(0, 5),
        endTime: end.toTimeString().slice(0, 5),
        duration: durationHours,
        client,
        project,
        description: event.summary || 'Calendar Event',
        category: client === 'Internal' ? 'internal' as const : 'client' as const,
        status: 'pending' as const,
        automated: true,
        source: 'calendar' as const,
        meetingType: 'check-in' as const,
        billable: client !== 'Internal',
        tags: ['google-calendar', 'real-calendar']
      };

      await addTimeEntry(timeEntry);
      console.log(`✅ Created time entry: ${event.summary} (${durationHours.toFixed(1)}h)`);
    }

    alert(`✅ Success! Created ${eventList.length} time entries from your Google Calendar.`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #4285F4', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f8fbff'
    }}>
      <h3>📅 Google Calendar Integration</h3>
      
      {!isAuthenticated ? (
        <div>
          <p style={{ marginBottom: '15px' }}>
            Use the main integrations page to connect your Google Calendar.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ 
            color: 'green', 
            backgroundColor: '#e6ffe6', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>✅ Connected to Google Calendar!</span>
            <button 
              onClick={() => {
                localStorage.removeItem('google_calendar_token');
                setAccessToken(null);
                setIsAuthenticated(false);
                setEvents([]);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              Disconnect
            </button>
          </div>
          
          <button 
            onClick={getCalendarEvents}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: isLoading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}
          >
            {isLoading ? '📅 Processing...' : '📅 Import Today\'s Meetings'}
          </button>

          {events.length > 0 && (
            <div>
              <h4>Imported Events:</h4>
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