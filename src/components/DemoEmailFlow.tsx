/**
 * Demo Email Flow - Shows the complete Gmail → AI → TimeBeacon pipeline
 * Uses demo data so you can see exactly how it works without OAuth
 */

import React, { useState } from 'react';
import { aiService } from '../services/aiService';
import { useTimeTracker } from '../hooks/useTimeTracker';

export const DemoEmailFlow: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const { addTimeEntry } = useTimeTracker();

  // Realistic email data that shows various scenarios
  const demoEmails = [
    {
      id: "msg_001",
      subject: "RE: Salesforce Data Migration - Urgent Questions",
      snippet: "Hi Sarah, thanks for the detailed migration plan. I have a few critical questions about the data mapping for our custom objects and how we'll handle the API rate limits during the bulk transfer. Can we schedule a call this afternoon? This is blocking our go-live date. Best, John Smith, Salesforce Admin",
      from: "john.smith@salesforce.com",
      to: "sarah@timebeacon.io",
      date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      threadId: "thread_001",
      readTime: 3, // minutes spent reading
      responseTime: 12 // minutes spent responding
    },
    {
      id: "msg_002", 
      subject: "Monday.com Workflow Training - Department Head Session",
      snippet: "Team, I'd like to schedule our department head training for the new Monday.com workflows we discussed. Based on our pilot results, we need to cover board templates, automation rules, and integration with Slack. How does next Tuesday at 2 PM work for everyone? I'll prepare the training materials over the weekend. Maria",
      from: "maria.rodriguez@monday.com",
      to: "sarah@timebeacon.io",
      date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      threadId: "thread_002",
      readTime: 2,
      responseTime: 8
    },
    {
      id: "msg_003",
      subject: "Internal: Sprint Retrospective Notes & Action Items",
      snippet: "Hi everyone, here are the notes from today's sprint retro: What went well: API integrations completed ahead of schedule, team collaboration improved with new standup format. What to improve: Need better error handling in email service, should add more unit tests for AI analysis. Action items: Mike to refactor gmail service by Friday, Jessica to add test coverage metrics to CI pipeline. Next sprint starts Monday with focus on calendar integration. Thanks all! -Alex",
      from: "alex.chen@timebeacon.io",
      to: "team@timebeacon.io",
      date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      threadId: "thread_003",
      readTime: 4,
      responseTime: 0 // didn't respond
    },
    {
      id: "msg_004",
      subject: "Zendesk Integration Update - API Changes Needed",
      snippet: "Sarah, quick update on the Zendesk integration. Their latest API update requires us to modify our webhook handlers and update the authentication flow. I've reviewed the breaking changes and it looks like a 2-day effort. Should we prioritize this for the current sprint or push to next? Also, their support team mentioned we might need to update our app in their marketplace. Let me know your thoughts. Thanks, David",
      from: "support@zendesk.com",
      to: "sarah@timebeacon.io", 
      date: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      threadId: "thread_004",
      readTime: 2,
      responseTime: 5
    }
  ];

  const steps = [
    "📧 Fetching emails from Gmail",
    "🤖 AI analyzing email content", 
    "🎯 Identifying customers & projects",
    "⏱️ Estimating time spent",
    "📊 Creating time entries",
    "✅ Complete!"
  ];

  const runDemoFlow = async () => {
    setIsProcessing(true);
    setCurrentStep(0);
    setResults([]);

    const processedResults = [];

    try {
      // Step 1: Simulate Gmail fetch
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('📧 Demo: Fetched', demoEmails.length, 'emails');

      for (let i = 0; i < demoEmails.length; i++) {
        const email = demoEmails[i];
        
        // Step 2: AI Analysis
        setCurrentStep(2);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        console.log(`🤖 Analyzing email ${i + 1}:`, email.subject);

        // AI analysis would use the email data directly
        console.log('Email content:', {
          subject: email.subject,
          snippet: email.snippet,
          from: email.from,
          to: email.to,
          date: email.date
        });

        // Step 3: Get AI analysis
        setCurrentStep(3);
        const contentRequest = {
          title: email.subject,
          description: email.snippet,
          participants: [email.from, email.to],
          source: 'email' as const,
          timestamp: email.date
        };
        const analysis = await aiService.analyzeContent(contentRequest);
        
        // Step 4: Time estimation (combine AI + actual email metadata)
        setCurrentStep(4);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const totalTime = email.readTime + email.responseTime;
        const estimatedDuration = Math.max(totalTime / 60, 0.25); // Convert to hours, minimum 15 min

        if (analysis.confidence > 0.5) {
          const suggestion = analysis;
          
          // Step 5: Create time entry
          setCurrentStep(5);
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const emailDate = new Date(email.date);
          const startTime = emailDate.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
          const endTime = new Date(emailDate.getTime() + estimatedDuration * 60000).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
          
          const timeEntry = {
            date: emailDate.toISOString().split('T')[0],
            startTime,
            endTime,
            duration: estimatedDuration,
            client: suggestion.suggestedClient || 'Unknown Client',
            project: suggestion.suggestedProject || 'Email Communication',
            description: suggestion.suggestedDescription || `Email: ${email.subject.substring(0, 80)}${email.subject.length > 80 ? '...' : ''}`,
            category: suggestion.suggestedCategory || 'client' as const,
            status: 'pending' as const,
            automated: true,
            billable: suggestion.suggestedBillable !== undefined ? suggestion.suggestedBillable : true,
            source: 'ai_suggested' as const,
            meetingType: suggestion.meetingType,
            tags: ['email', 'ai-analyzed', ...(suggestion.tags || [])]
          };

          await addTimeEntry(timeEntry);
          
          processedResults.push({
            email: email.subject,
            client: suggestion.suggestedClient,
            project: suggestion.suggestedProject,
            readTime: email.readTime,
            responseTime: email.responseTime,
            totalTime: totalTime,
            duration: estimatedDuration,
            confidence: suggestion.confidence,
            reasoning: suggestion.reasoning,
            category: timeEntry.category,
            status: '✅ Time entry created'
          });
        } else {
          processedResults.push({
            email: email.subject,
            status: '⚠️ Could not categorize',
            reasoning: 'AI could not determine project/client'
          });
        }
      }

      // Step 6: Complete
      setCurrentStep(6);
      setResults(processedResults);
      console.log('✅ Demo flow complete!');

    } catch (error) {
      console.error('❌ Demo flow error:', error);
      setResults([{ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: '❌ Demo failed',
        reasoning: 'Check console for details'
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
      backgroundColor: '#f0fff0'
    }}>
      <h3>🎬 Demo: Complete Email → AI → TimeBeacon Flow</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        See exactly how TimeBeacon automatically converts emails into billable time entries using AI analysis
      </p>
      
      {/* Progress Steps */}
      {isProcessing && (
        <div style={{ marginBottom: '20px' }}>
          {steps.map((step, index) => (
            <div 
              key={index}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '8px',
                opacity: index <= currentStep ? 1 : 0.3,
                fontWeight: index === currentStep ? 'bold' : 'normal'
              }}
            >
              <span style={{ 
                marginRight: '8px',
                color: index < currentStep ? '#28a745' : index === currentStep ? '#007bff' : '#6c757d'
              }}>
                {index < currentStep ? '✅' : index === currentStep ? '🔄' : '⏳'}
              </span>
              {step}
            </div>
          ))}
        </div>
      )}
      
      <button 
        onClick={runDemoFlow}
        disabled={isProcessing}
        style={{
          padding: '12px 24px',
          backgroundColor: isProcessing ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          marginBottom: '20px'
        }}
      >
        {isProcessing ? '🔄 Processing...' : '🎬 Run Demo Flow'}
      </button>

      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>📊 Demo Results:</h4>
          {results.map((result, index) => (
            <div 
              key={index} 
              style={{ 
                padding: '15px', 
                margin: '10px 0', 
                backgroundColor: 'white', 
                border: '1px solid #ddd',
                borderRadius: '8px',
                borderLeft: `4px solid ${result.status?.includes('✅') ? '#28a745' : '#ffc107'}`
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
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                    <div>
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
                      {result.category && (
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                          <strong>Category:</strong> <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: '3px', 
                            fontSize: '12px',
                            backgroundColor: result.category === 'client' ? '#e6f3ff' : '#fff3e6',
                            color: result.category === 'client' ? '#0066cc' : '#cc6600'
                          }}>
                            {result.category}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      {result.readTime !== undefined && (
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                          <strong>Reading:</strong> {result.readTime} min
                        </div>
                      )}
                      {result.responseTime !== undefined && (
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                          <strong>Writing:</strong> {result.responseTime} min
                        </div>
                      )}
                      {result.duration && (
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                          <strong>Total Time:</strong> {(result.duration * 60).toFixed(0)} min
                        </div>
                      )}
                      {result.confidence && (
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                          <strong>AI Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                  
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
                    color: result.status?.includes('✅') ? '#28a745' : '#ffc107',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {result.status}
                  </div>
                </>
              )}
            </div>
          ))}
          
          <div style={{ 
            marginTop: '15px', 
            padding: '12px', 
            backgroundColor: '#e6f3ff', 
            borderRadius: '6px',
            fontSize: '14px',
            color: '#0066cc'
          }}>
            💡 <strong>Next:</strong> Connect your real Gmail to start automatically tracking your email time!
          </div>
        </div>
      )}
    </div>
  );
};