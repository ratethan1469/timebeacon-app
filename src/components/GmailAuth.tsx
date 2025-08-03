import React, { useState, useEffect } from 'react';
import { gmailService } from '../services/gmailIntegration';

interface GmailAuthProps {
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
}

export const GmailAuth: React.FC<GmailAuthProps> = ({
  onAuthSuccess,
  onAuthError
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailCount, setEmailCount] = useState(0);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await gmailService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        // Get recent email count for display
        const emails = await gmailService.getRecentEmails(10);
        setEmailCount(emails.length);
      }
    } catch (error) {
      console.error('Failed to check Gmail auth status:', error);
    }
  };

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    
    try {
      const success = await gmailService.authenticateGmail();
      
      if (success) {
        setIsAuthenticated(true);
        onAuthSuccess();
        
        // Start tracking email activity
        gmailService.startEmailTracking();
        
        // Get initial email count
        const emails = await gmailService.getRecentEmails(10);
        setEmailCount(emails.length);
      } else {
        onAuthError('Failed to authenticate with Gmail');
      }
    } catch (error) {
      onAuthError(`Authentication error: ${error}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    // In a real app, you'd revoke the token
    setIsAuthenticated(false);
    setEmailCount(0);
    // Clear stored token if any
    localStorage.removeItem('gmail_token');
  };

  if (isAuthenticated) {
    return (
      <div className="gmail-auth-success">
        <div className="auth-status">
          <div className="status-indicator connected"></div>
          <div className="status-info">
            <h4>Gmail Connected</h4>
            <p>Tracking email activity automatically</p>
            <small>{emailCount} recent emails processed</small>
          </div>
        </div>
        
        <div className="auth-actions">
          <button 
            onClick={handleDisconnect}
            className="btn btn-secondary btn-sm"
          >
            Disconnect
          </button>
        </div>
        
        <div className="tracking-info">
          <h5>Active Tracking Features:</h5>
          <ul className="feature-list">
            <li>✓ Email reading time detection</li>
            <li>✓ Automatic client identification</li>
            <li>✓ Smart project categorization</li>
            <li>✓ Billable time classification</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="gmail-auth-setup">
      <div className="auth-header">
        <h4>Connect Gmail</h4>
        <p>Automatically track time spent reading and writing emails</p>
      </div>
      
      <div className="auth-benefits">
        <div className="benefit-item">
          <span className="benefit-icon">📧</span>
          <div>
            <strong>Smart Email Tracking</strong>
            <p>Automatically detects when you're reading or composing emails</p>
          </div>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">🤖</span>
          <div>
            <strong>AI-Powered Categorization</strong>
            <p>Intelligently categorizes emails by client and project</p>
          </div>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">⏱️</span>
          <div>
            <strong>Precise Time Tracking</strong>
            <p>Tracks exact time spent on each email thread</p>
          </div>
        </div>
      </div>

      <div className="auth-permissions">
        <h5>Required Permissions:</h5>
        <ul>
          <li>Read email metadata (sender, subject, date)</li>
          <li>Access recent email activity</li>
          <li>No access to email content or attachments</li>
        </ul>
      </div>
      
      <button 
        onClick={handleAuthenticate}
        disabled={isAuthenticating}
        className="btn btn-primary auth-button"
      >
        {isAuthenticating ? 'Connecting...' : 'Connect Gmail Account'}
      </button>
      
      <div className="privacy-note">
        <small>
          We only access email metadata for time tracking. Your email content 
          remains private and is never stored or transmitted.
        </small>
      </div>
    </div>
  );
};