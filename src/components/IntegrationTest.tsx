/**
 * Google Integration Test Console
 * 
 * Development utility component for testing Google API integrations.
 * This component provides a comprehensive interface for validating
 * OAuth setup, testing API endpoints, and debugging integration issues.
 */

import React, { useState, useEffect } from 'react';
import { googleIntegrationService, ApiTestResult, ValidationResult } from '../services/googleIntegrationService';

interface TestState {
  isRunning: boolean;
  results: ApiTestResult[];
  validation: ValidationResult | null;
  logs: string[];
}

export const IntegrationTest: React.FC = () => {
  const [testState, setTestState] = useState<TestState>({
    isRunning: false,
    results: [],
    validation: null,
    logs: []
  });
  
  const [authStatus, setAuthStatus] = useState(googleIntegrationService.getAuthStatus());

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestState(prev => ({
      ...prev,
      logs: [...prev.logs, `[${timestamp}] ${message}`]
    }));
  };

  useEffect(() => {
    addLog('Integration Test Console initialized');
    validateConfiguration();
  }, []);

  const validateConfiguration = async () => {
    addLog('🔍 Validating Google API configuration...');
    try {
      const validation = await googleIntegrationService.validateConfiguration();
      setTestState(prev => ({ ...prev, validation }));
      
      if (validation.isValid) {
        addLog('✅ Configuration validation passed');
      } else {
        addLog('❌ Configuration validation failed');
        validation.errors.forEach(error => addLog(`   ERROR: ${error}`));
      }
      
      validation.warnings.forEach(warning => addLog(`   WARNING: ${warning}`));
    } catch (error) {
      addLog(`❌ Configuration validation error: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    if (testState.isRunning) return;
    
    setTestState(prev => ({ 
      ...prev, 
      isRunning: true, 
      results: [],
      logs: [...prev.logs, '🚀 Starting comprehensive API tests...']
    }));

    try {
      const results = await googleIntegrationService.runAllTests();
      
      setTestState(prev => ({
        ...prev,
        isRunning: false,
        results
      }));

      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      addLog(`🏁 Tests completed: ${successCount} successful, ${errorCount} failed`);
      
      results.forEach(result => {
        if (result.status === 'success') {
          addLog(`✅ ${result.service} API: Connected (${result.executionTimeMs}ms)`);
        } else {
          addLog(`❌ ${result.service} API: ${result.details.error}`);
          if (result.details.suggestions) {
            result.details.suggestions.forEach((suggestion: string) => 
              addLog(`   💡 ${suggestion}`)
            );
          }
        }
      });
    } catch (error) {
      addLog(`❌ Test execution failed: ${error.message}`);
      setTestState(prev => ({ ...prev, isRunning: false }));
    }
  };

  const startOAuthFlow = () => {
    try {
      addLog('🔐 Starting OAuth 2.0 flow...');
      const { url, state } = googleIntegrationService.generateAuthUrl();
      
      // Store state for validation
      sessionStorage.setItem('google_oauth_state', state);
      
      addLog(`📋 OAuth state: ${state}`);
      addLog(`🌐 Opening authorization URL...`);
      
      // Open in new window
      const popup = window.open(url, 'google-oauth', 'width=500,height=600');
      
      if (!popup) {
        addLog('❌ Popup blocked. Please allow popups and try again.');
        return;
      }

      // Listen for OAuth completion
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'OAUTH_SUCCESS') {
          addLog('✅ OAuth flow completed successfully');
          setAuthStatus(googleIntegrationService.getAuthStatus());
          window.removeEventListener('message', messageListener);
          
          // Automatically run tests after successful auth
          setTimeout(() => runAllTests(), 1000);
        } else if (event.data.type === 'OAUTH_ERROR') {
          addLog(`❌ OAuth error: ${event.data.error}`);
          window.removeEventListener('message', messageListener);
        }
      };

      window.addEventListener('message', messageListener);
      
    } catch (error) {
      addLog(`❌ Failed to start OAuth flow: ${error.message}`);
    }
  };

  const clearTokens = () => {
    googleIntegrationService.clearTokens();
    setAuthStatus(googleIntegrationService.getAuthStatus());
    addLog('🗑️ Cleared all stored tokens');
  };

  const clearLogs = () => {
    setTestState(prev => ({ ...prev, logs: [] }));
  };

  const exportLogs = () => {
    const logContent = testState.logs.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timebeacon-integration-test-${Date.now()}.log`;
    link.click();
    URL.revokeObjectURL(url);
    addLog('📥 Logs exported successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '8px'
        }}>
          🔧 Google Integration Test Console
        </h1>
        <p style={{
          color: '#6b7280',
          fontSize: '16px',
          margin: 0
        }}>
          Validate your Google Cloud Console setup and test API connections
        </p>
      </div>

      {/* Status Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', margin: '0 0 8px 0' }}>
            Authentication
          </h3>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: authStatus.isAuthenticated ? '#10b981' : '#ef4444'
          }}>
            {authStatus.isAuthenticated ? '✅ Connected' : '❌ Not Connected'}
          </div>
          {authStatus.tokenExpiry && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Expires: {authStatus.tokenExpiry.toLocaleString()}
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', margin: '0 0 8px 0' }}>
            Configuration
          </h3>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: testState.validation?.isValid ? '#10b981' : '#ef4444'
          }}>
            {testState.validation?.isValid ? '✅ Valid' : '❌ Invalid'}
          </div>
          {testState.validation && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {testState.validation.errors.length} errors, {testState.validation.warnings.length} warnings
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', margin: '0 0 8px 0' }}>
            API Tests
          </h3>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: testState.results.length > 0 ? 
              (testState.results.every(r => r.status === 'success') ? '#10b981' : '#f59e0b') : '#6b7280'
          }}>
            {testState.results.length === 0 ? '⏳ Not Run' : 
             `${testState.results.filter(r => r.status === 'success').length}/${testState.results.length} Passed`}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={validateConfiguration}
          style={{
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          🔍 Validate Config
        </button>

        <button
          onClick={startOAuthFlow}
          disabled={!testState.validation?.isValid}
          style={{
            backgroundColor: testState.validation?.isValid ? '#10b981' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: testState.validation?.isValid ? 'pointer' : 'not-allowed'
          }}
        >
          🔐 Start OAuth
        </button>

        <button
          onClick={runAllTests}
          disabled={testState.isRunning || !authStatus.isAuthenticated}
          style={{
            backgroundColor: (testState.isRunning || !authStatus.isAuthenticated) ? '#9ca3af' : '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: (testState.isRunning || !authStatus.isAuthenticated) ? 'not-allowed' : 'pointer'
          }}
        >
          {testState.isRunning ? '⏳ Testing...' : '🧪 Run Tests'}
        </button>

        <button
          onClick={clearTokens}
          disabled={!authStatus.isAuthenticated}
          style={{
            backgroundColor: authStatus.isAuthenticated ? '#ef4444' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: authStatus.isAuthenticated ? 'pointer' : 'not-allowed'
          }}
        >
          🗑️ Clear Tokens
        </button>
      </div>

      {/* Configuration Details */}
      {testState.validation && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            📋 Configuration Details
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <strong>Client ID:</strong> {authStatus.config.clientId ? 
                `${authStatus.config.clientId.substring(0, 20)}...` : 'Not set'}
            </div>
            <div>
              <strong>Redirect URI:</strong> {authStatus.config.redirectUri || 'Not set'}
            </div>
          </div>

          {testState.validation.errors.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#ef4444' }}>Errors:</strong>
              <ul style={{ color: '#ef4444', marginTop: '8px' }}>
                {testState.validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {testState.validation.warnings.length > 0 && (
            <div>
              <strong style={{ color: '#f59e0b' }}>Warnings:</strong>
              <ul style={{ color: '#f59e0b', marginTop: '8px' }}>
                {testState.validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Test Results */}
      {testState.results.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            🧪 API Test Results
          </h3>
          
          {testState.results.map((result, index) => (
            <div key={index} style={{
              border: `1px solid ${getStatusColor(result.status)}20`,
              borderLeft: `4px solid ${getStatusColor(result.status)}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              backgroundColor: `${getStatusColor(result.status)}05`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                  {result.service} API
                </h4>
                <div style={{
                  backgroundColor: getStatusColor(result.status),
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {result.status.toUpperCase()} ({result.executionTimeMs}ms)
                </div>
              </div>
              
              {result.status === 'error' && result.details.suggestions && (
                <div>
                  <strong>Suggestions:</strong>
                  <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                    {result.details.suggestions.map((suggestion: string, i: number) => (
                      <li key={i} style={{ color: '#6b7280' }}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.status === 'success' && result.details.message && (
                <div style={{ color: '#6b7280' }}>
                  {result.details.message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Console Logs */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            📝 Console Logs
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={exportLogs}
              disabled={testState.logs.length === 0}
              style={{
                backgroundColor: testState.logs.length > 0 ? '#6366f1' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: testState.logs.length > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              📥 Export
            </button>
            <button
              onClick={clearLogs}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '12px',
          padding: '16px',
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {testState.logs.length === 0 ? (
            <div style={{ color: '#9ca3af' }}>No logs yet...</div>
          ) : (
            testState.logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationTest;