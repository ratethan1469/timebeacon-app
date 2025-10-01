/**
 * REAL Gmail Integration - Actually connects and reads your emails
 */

import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../hooks/useTimeTracker';

declare global {
  interface Window {
    gapi: any;
  }
}

export const RealGmail: React.FC = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const { addTimeEntry } = useTimeTracker();

  const CLIENT_ID = '696202687856-c82e7prqdt00og14k6lp47hiutn7p9an.apps.googleusercontent.com';
  const API_KEY = 'AIzaSyBYourAPIKeyHere'; // You'll need to add this
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
  const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

  useEffect(() => {
    initializeGapi();
  }, []);

  const initializeGapi = async () => {
    // Load Google API
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => initGapi();
      document.head.appendChild(script);
    } else {
      initGapi();
    }
  };

  const initGapi = async () => {
    await window.gapi.load('client:auth2', async () => {
      await window.gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: [DISCOVERY_DOC],
        scope: SCOPES
      });

      const authInstance = window.gapi.auth2.getAuthInstance();
      setIsSignedIn(authInstance.isSignedIn.get());
      
      authInstance.isSignedIn.listen(setIsSignedIn);
    });
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      console.log('✅ Signed in to Gmail!');
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      alert('Sign in failed. Please try again.');
    }
    setIsLoading(false);
  };

  const getEmails = async () => {
    setIsLoading(true);
    try {
      console.log('📧 Fetching real Gmail messages...');
      
      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: 'in:inbox'
      });

      const messages = response.result.messages || [];
      console.log(`Found ${messages.length} messages`);

      // Get full details for each message
      const emailDetails = [];
      for (const message of messages.slice(0, 5)) { // Just get 5 for demo
        const detail = await window.gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });
        
        const headers = detail.result.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
        const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
        
        emailDetails.push({
          id: message.id,
          subject,
          from,
          date,
          snippet: detail.result.snippet
        });
      }

      setEmails(emailDetails);
      console.log('✅ Email details loaded:', emailDetails);

      // Automatically create time entries
      createTimeEntries(emailDetails);

    } catch (error) {
      console.error('❌ Failed to fetch emails:', error);
      alert('Failed to fetch emails. Check console for details.');
    }
    setIsLoading(false);
  };

  const createTimeEntries = async (emailList: any[]) => {
    console.log('⏱️ Creating time entries from real emails...');
    
    for (const email of emailList) {
      // Simple analysis - check if it's client or internal
      const isInternal = email.from.includes('@timebeacon.io') || 
                        email.subject.toLowerCase().includes('internal') ||
                        email.subject.toLowerCase().includes('team');
      
      // Estimate time based on email length (simple heuristic)
      const estimatedMinutes = Math.max(5, Math.min(30, email.snippet.length / 10));
      
      // Determine client/project from email domain
      let client = 'Unknown Client';
      let project = 'Email Communication';
      
      if (email.from.includes('@salesforce.com')) {
        client = 'Salesforce';
        project = 'Salesforce Implementation';
      } else if (email.from.includes('@monday.com')) {
        client = 'Monday.com';
        project = 'Monday.com Rollout';
      } else if (email.from.includes('@zendesk.com')) {
        client = 'Zendesk';
        project = 'Zendesk Integration';
      } else if (isInternal) {
        client = 'Internal';
        project = 'Internal Operations';
      }

      const timeEntry = {
        date: new Date().toISOString().split('T')[0],
        startTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
        endTime: new Date(Date.now() + estimatedMinutes * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
        duration: estimatedMinutes / 60, // Convert to hours
        client,
        project,
        description: `Email: ${email.subject}`,
        category: isInternal ? 'internal' as const : 'client' as const,
        status: 'pending' as const,
        automated: true,
        source: 'gmail' as const,
        meetingType: undefined,
        billable: !isInternal,
        tags: ['email', 'real-gmail']
      };

      await addTimeEntry(timeEntry);
      console.log(`✅ Created time entry: ${estimatedMinutes}min for ${client}`);
    }

    alert(`✅ Success! Created ${emailList.length} time entries from your real Gmail messages.`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #1a73e8', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f8fbff'
    }}>
      <h3>📧 Real Gmail Integration</h3>
      
      {!isSignedIn ? (
        <div>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Connect your actual Gmail account to automatically track email time
          </p>
          
          <button 
            onClick={handleSignIn}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: isLoading ? '#ccc' : '#1a73e8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isLoading ? '🔄 Connecting...' : '🔗 Connect Real Gmail'}
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
            ✅ Gmail connected successfully!
          </div>
          
          <button 
            onClick={getEmails}
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
            {isLoading ? '📧 Processing...' : '📧 Get My Emails & Create Time Entries'}
          </button>

          {emails.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4>Recent Emails Processed:</h4>
              {emails.map((email, index) => (
                <div key={index} style={{ 
                  padding: '10px', 
                  margin: '5px 0',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}>
                  <strong>{email.subject}</strong><br/>
                  <small>From: {email.from}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};