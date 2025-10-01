/**
 * Simple AI Test Button
 * Tests the AI email analysis without requiring Gmail connection
 */

import React, { useState } from 'react';
import { aiService } from '../services/aiService';
import { useTimeTracker } from '../hooks/useTimeTracker';

export const AITestButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { addTimeEntry } = useTimeTracker();

  // Sample email data for testing
  const sampleEmails = [
    {
      subject: "RE: Salesforce Implementation - Data Migration Questions",
      snippet: "Thanks for the detailed timeline. I have a few questions about the data migration process and how we'll handle duplicate records...",
      from: "john.smith@salesforce.com",
      to: "sarah@timebeacon.io",
      date: new Date().toISOString()
    },
    {
      subject: "Monday.com Workflow Setup - Training Session",
      snippet: "Hi team, I'd like to schedule a training session for next week to walk through the new project management workflows we discussed...",
      from: "maria@monday.com", 
      to: "sarah@timebeacon.io",
      date: new Date().toISOString()
    },
    {
      subject: "Internal: Team Standup Notes",
      snippet: "Daily standup notes from today's meeting. Sprint progress looks good, few blockers to discuss in next retro...",
      from: "mike@timebeacon.io",
      to: "team@timebeacon.io", 
      date: new Date().toISOString()
    }
  ];

  const testAIFlow = async () => {
    setIsProcessing(true);
    setResults([]);

    try {
      console.log('🤖 Testing AI email analysis...');
      
      const processedResults = [];

      for (const email of sampleEmails) {
        console.log(`📧 Analyzing: ${email.subject}`);

        // Convert email to AI analysis format
        const contentRequest = {
          title: email.subject,
          description: email.snippet,
          participants: [email.from, email.to],
          source: 'email' as const,
          timestamp: email.date
        };

        // Use AI to analyze the email
        const analysis = await aiService.analyzeContent(contentRequest);

        console.log('🤖 AI Analysis:', analysis);

        // If AI suggests a time entry, create it
        if (analysis.confidence > 0.5) {
          const suggestion = analysis;
          
          const startTime = new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
          const endTime = new Date(Date.now() + 15 * 60000).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
          
          const timeEntry = {
            date: new Date().toISOString().split('T')[0],
            startTime,
            endTime,
            duration: 15, // Default 15 minutes for email processing
            client: suggestion.suggestedClient || 'Unknown Client',
            project: suggestion.suggestedProject || 'Email Communication',
            description: suggestion.suggestedDescription || `Email: ${email.subject}`,
            category: suggestion.suggestedCategory || 'client' as const,
            status: 'pending' as const,
            automated: true,
            billable: suggestion.suggestedBillable !== undefined ? suggestion.suggestedBillable : true,
            source: 'ai_suggested' as const,
            meetingType: suggestion.meetingType,
            tags: suggestion.tags || ['email', 'ai-analyzed']
          };

          // Add to TimeBeacon
          await addTimeEntry(timeEntry);
          
          processedResults.push({
            email: email.subject,
            client: suggestion.suggestedClient,
            project: suggestion.suggestedProject,
            duration: 15,
            description: suggestion.suggestedDescription,
            confidence: suggestion.confidence,
            reasoning: suggestion.reasoning,
            status: 'Added to TimeBeacon ✅'
          });
        } else {
          processedResults.push({
            email: email.subject,
            status: 'No time entry suggested',
            reasoning: 'AI could not determine project/client'
          });
        }
      }

      setResults(processedResults);
      console.log('✅ AI analysis complete!');

    } catch (error) {
      console.error('❌ Error testing AI:', error);
      setResults([{ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'AI Test Failed',
        reasoning: 'Check if Ollama is running locally'
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
      backgroundColor: '#f0f8ff'
    }}>
      <h3>🤖 Test AI Email Analysis</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Test how AI analyzes sample emails and creates smart time entries (no Gmail connection needed)
      </p>
      
      <button 
        onClick={testAIFlow}
        disabled={isProcessing}
        style={{
          padding: '12px 24px',
          backgroundColor: isProcessing ? '#ccc' : '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {isProcessing ? '🔄 Analyzing...' : '🧪 Test AI Analysis'}
      </button>

      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>🎯 AI Analysis Results:</h4>
          {results.map((result, index) => (
            <div 
              key={index} 
              style={{ 
                padding: '15px', 
                margin: '10px 0', 
                backgroundColor: 'white', 
                border: '1px solid #ddd',
                borderRadius: '8px',
                borderLeft: `4px solid ${result.status.includes('✅') ? '#28a745' : '#ffc107'}`
              }}
            >
              {result.error ? (
                <div>
                  <div style={{ color: 'red', fontWeight: 'bold' }}>❌ {result.status}</div>
                  <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                    {result.reasoning}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    📧 {result.email}
                  </div>
                  {result.client && (
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <strong>Client:</strong> {result.client}
                    </div>
                  )}
                  {result.project && (
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <strong>Project:</strong> {result.project}
                    </div>
                  )}
                  {result.duration && (
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <strong>Estimated Time:</strong> {result.duration} minutes
                    </div>
                  )}
                  {result.confidence && (
                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                      <strong>AI Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                  {result.reasoning && (
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#666', 
                      fontStyle: 'italic',
                      backgroundColor: '#f8f9fa',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}>
                      💭 AI Reasoning: {result.reasoning}
                    </div>
                  )}
                  <div style={{ 
                    color: result.status.includes('✅') ? '#28a745' : '#ffc107',
                    fontWeight: 'bold',
                    fontSize: '14px'
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