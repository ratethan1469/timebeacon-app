/**
 * Working Google Calendar - Uses Google's Identity Services (new API)
 */

import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../hooks/useTimeTracker';

export const WorkingCalendar: React.FC = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { addTimeEntry } = useTimeTracker();

  const CLIENT_ID = '696202687856-c82e7prqdt00og14k6lp47hiutn7p9an.apps.googleusercontent.com';

  useEffect(() => {
    loadGoogleIdentityScript();
  }, []);

  const loadGoogleIdentityScript = () => {
    if (document.getElementById('google-identity-script')) return;

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = initializeGoogleIdentity;
    document.head.appendChild(script);
  };

  const initializeGoogleIdentity = () => {
    if (!(window as any).google) return;

    (window as any).google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse
    });

    console.log('✅ Google Identity Services initialized');
  };

  const handleCredentialResponse = (response: any) => {
    console.log('Got credential response:', response);
    // For now, we'll use a simple approach
    setIsSignedIn(true);
  };

  const signInWithGoogle = () => {
    setIsLoading(true);
    
    // Use Google OAuth2 popup flow
    const scope = 'https://www.googleapis.com/auth/calendar.readonly';
    const redirectUri = 'http://localhost:3000';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=token&` +
      `include_granted_scopes=true`;

    // Open popup
    const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');
    
    // Listen for popup to close
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
        
        // Check for access token in URL
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        
        if (token) {
          setAccessToken(token);
          setIsSignedIn(true);
          console.log('✅ Got access token:', token.substring(0, 10) + '...');
        } else {
          alert('No access token received. Please try again.');
        }
      }
    }, 1000);
  };

  const getTodaysEvents = async () => {
    if (!accessToken) {
      alert('Please sign in first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📅 Fetching calendar events...');

      const today = new Date();
      const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
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
        throw new Error(`Calendar API failed: ${response.status}`);
      }

      const data = await response.json();
      const todaysEvents = data.items || [];
      
      console.log(`Found ${todaysEvents.length} events`);

      // Filter relevant events
      const relevantEvents = todaysEvents.filter((event: any) => {
        if (!event.start.dateTime || !event.end.dateTime) return false;
        
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        
        return durationMinutes >= 15;
      });

      setEvents(relevantEvents);
      
      if (relevantEvents.length > 0) {
        await createTimeEntriesFromEvents(relevantEvents);
      } else {
        alert('No relevant meetings found (need 15+ minute meetings for today)');
      }

    } catch (error) {
      console.error('❌ Calendar error:', error);
      alert(`Failed to fetch calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setIsLoading(false);
  };

  const createTimeEntriesFromEvents = async (eventList: any[]) => {
    console.log('⏱️ Creating time entries...');
    
    for (const event of eventList) {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      // Simple client detection
      let client = 'Unknown Client';
      let project = 'Meeting';
      
      const title = event.summary?.toLowerCase() || '';
      
      if (title.includes('salesforce')) {
        client = 'Salesforce';
        project = 'Salesforce Implementation';
      } else if (title.includes('monday')) {
        client = 'Monday.com';
        project = 'Monday.com Rollout';
      } else if (title.includes('internal') || title.includes('standup')) {
        client = 'Internal';
        project = 'Internal Operations';
      } else {
        client = 'External Client';
        project = 'Client Meeting';
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
        tags: ['calendar']
      };

      await addTimeEntry(timeEntry);
      console.log(`✅ Added: ${Math.round(durationHours * 60)}min - ${client}`);
    }

    alert(`✅ Created ${eventList.length} time entries from your calendar!`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #4285f4', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f8fbff'
    }}>
      <h3>📅 Google Calendar (Working Version)</h3>
      
      {!isSignedIn ? (
        <div>
          <p style={{ marginBottom: '15px' }}>
            Connect your Google Calendar to import today's meetings as time entries
          </p>
          
          <button 
            onClick={signInWithGoogle}
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
              fontSize: '16px'
            }}
          >
            {isLoading ? '📅 Loading...' : '📅 Import Today\'s Meetings'}
          </button>

          {events.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4>Imported Meetings:</h4>
              {events.map((event, index) => (
                <div key={index} style={{ 
                  padding: '8px', 
                  margin: '5px 0',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
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