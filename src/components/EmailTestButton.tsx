/**
 * Simple test button to demonstrate Gmail → AI → TimeBeacon flow
 * This shows how emails get analyzed and turned into time entries
 */

import React, { useState } from 'react';
import { gmailService } from '../services/gmailIntegration';
import { aiService } from '../services/aiService';
import { useTimeTracker } from '../hooks/useTimeTracker';

export const EmailTestButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { addTimeEntry } = useTimeTracker();

  const testEmailFlow = async () => {
    setIsProcessing(true);
    setResults([]);

    try {
      console.log('🔍 Step 1: Getting recent emails...');
      
      // Get last 5 emails from Gmail
      const emails = await gmailService.getRecentEmails(5);
      
      console.log('📧 Found emails:', emails.length);

      const processedResults = [];

      for (const email of emails) {
        console.log(`📬 Processing email: ${email.snippet}`);

        // Step 2: Use AI to analyze the email
        const contentRequest = {
          title: email.snippet || 'Email Communication',
          description: email.snippet,
          participants: [email.payload?.headers?.find(h => h.name === 'From')?.value || 'unknown', 
                        email.payload?.headers?.find(h => h.name === 'To')?.value || 'unknown'],
          source: 'email' as const,
          timestamp: new Date(parseInt(email.internalDate || '0')).toISOString()
        };
        const analysis = await aiService.analyzeContent(contentRequest);

        console.log('🤖 AI Analysis:', analysis);

        // Step 3: If AI suggests a time entry, create it
        if (analysis.confidence > 0.5) {
          const suggestion = analysis;
          
          const timeEntry = {
            date: new Date().toISOString().split('T')[0],
            startTime: new Date(email.internalDate || Date.now()).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
            duration: 15, // Default 15 minutes
            client: suggestion.suggestedClient || 'Unknown Client',
            project: suggestion.suggestedProject || 'Email Communication',
            description: suggestion.suggestedDescription || `Email: ${email.snippet}`,
            endTime: new Date(Date.now() + 15 * 60000).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
            status: 'pending' as const,
            automated: true,
            billable: suggestion.suggestedBillable !== undefined ? suggestion.suggestedBillable : true,
            category: 'client' as const,
            source: 'gmail' as const,
            meetingType: suggestion.meetingType,
            tags: suggestion.tags || ['email']
          };

          // Add to TimeBeacon
          await addTimeEntry(timeEntry);
          
          processedResults.push({
            email: email.snippet,
            client: suggestion.suggestedClient,
            project: suggestion.suggestedProject,
            duration: 15,
            description: suggestion.suggestedDescription,
            confidence: suggestion.confidence,
            status: 'Added to TimeBeacon ✅'
          });
        } else {
          processedResults.push({
            email: email.snippet,
            status: 'No time entry suggested'
          });
        }
      }

      setResults(processedResults);
      console.log('✅ All emails processed!');

    } catch (error) {
      console.error('❌ Error processing emails:', error);
      setResults([{ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'Failed' 
      }]);
    }

    setIsProcessing(false);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #e0e0e0', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🧪 Test Gmail → AI → TimeBeacon Flow</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        This will grab your last 5 emails, analyze them with AI, and automatically create time entries
      </p>
      
      <button 
        onClick={testEmailFlow}
        disabled={isProcessing}
        style={{
          padding: '12px 24px',
          backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {isProcessing ? '🔄 Processing Emails...' : '📧 Test Email Processing'}
      </button>

      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Results:</h4>
          {results.map((result, index) => (
            <div 
              key={index} 
              style={{ 
                padding: '10px', 
                margin: '10px 0', 
                backgroundColor: 'white', 
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              {result.error ? (
                <div style={{ color: 'red' }}>
                  <strong>Error:</strong> {result.error}
                </div>
              ) : (
                <>
                  <div><strong>Email:</strong> {result.email}</div>
                  {result.client && <div><strong>Client:</strong> {result.client}</div>}
                  {result.project && <div><strong>Project:</strong> {result.project}</div>}
                  {result.duration && <div><strong>Time:</strong> {result.duration} minutes</div>}
                  {result.confidence && <div><strong>AI Confidence:</strong> {(result.confidence * 100).toFixed(1)}%</div>}
                  <div style={{ 
                    color: result.status.includes('✅') ? 'green' : 'orange',
                    fontWeight: 'bold'
                  }}>
                    {result.status}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};