import React, { useState, useEffect } from 'react';
import { googleService } from '../services/googleIntegration';

interface GoogleAuthProps {
  service: 'gmail' | 'calendar' | 'docs' | 'sheets' | 'slides';
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
}

const serviceConfig = {
  gmail: {
    name: 'Gmail',
    icon: '📧',
    color: '#EA4335',
    features: [
      'Email reading time detection',
      'Automatic client identification',
      'Smart project categorization',
      'Billable time classification'
    ]
  },
  calendar: {
    name: 'Google Calendar',
    icon: '📅',
    color: '#4285F4',
    features: [
      'Automatic meeting time tracking',
      'Participant detection',
      'Meeting type classification',
      'Calendar block synchronization'
    ]
  },
  docs: {
    name: 'Google Docs',
    icon: '📝',
    color: '#4285F4',
    features: [
      'Document editing time tracking',
      'Collaboration time detection',
      'Project document categorization',
      'Client document identification'
    ]
  },
  sheets: {
    name: 'Google Sheets',
    icon: '📊',
    color: '#34A853',
    features: [
      'Spreadsheet analysis time tracking',
      'Data work categorization',
      'Project sheet identification',
      'Collaborative editing detection'
    ]
  },
  slides: {
    name: 'Google Slides',
    icon: '📈',
    color: '#FF6D01',
    features: [
      'Presentation creation time tracking',
      'Client presentation detection',
      'Design work categorization',
      'Collaboration time tracking'
    ]
  }
};

export const GoogleAuth: React.FC<GoogleAuthProps> = ({
  service,
  onAuthSuccess,
  onAuthError
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activityCount, setActivityCount] = useState(0);

  const config = serviceConfig[service];

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await googleService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        // Get activity count based on service
        await loadActivityCount();
      }
    } catch (error) {
      console.error('Failed to check Google auth status:', error);
    }
  };

  const loadActivityCount = async () => {
    try {
      let count = 0;
      switch (service) {
        case 'gmail':
          const messages = await googleService.getGmailMessages(5);
          count = messages.length;
          break;
        case 'calendar':
          const events = await googleService.getCalendarEvents();
          count = events.length;
          break;
        case 'docs':
        case 'sheets':
        case 'slides':
          const files = await googleService.getDriveFiles(service);
          count = files.length;
          break;
      }
      setActivityCount(count);
    } catch (error) {
      console.error(`Failed to load ${service} activity:`, error);
    }
  };

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    
    try {
      // Get OAuth URL from backend
      const response = await fetch('http://localhost:3003/auth/google/url');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Open OAuth flow in popup window
        const popup = window.open(data.authUrl, 'google-auth', 'width=500,height=600');
        
        // Poll for popup closure (successful auth redirects and closes popup)
        const pollTimer = setInterval(() => {
          try {
            if (popup?.closed) {
              clearInterval(pollTimer);
              // Check if auth was successful
              checkAuthStatus();
              setIsAuthenticating(false);
            }
          } catch (error) {
            // Handle cross-origin errors
            clearInterval(pollTimer);
            setIsAuthenticating(false);
          }
        }, 1000);
        
        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          if (popup && !popup.closed) {
            popup.close();
          }
          setIsAuthenticating(false);
          onAuthError('Authentication timeout');
        }, 120000);
        
      } else {
        onAuthError('Failed to get authentication URL');
      }
    } catch (error) {
      onAuthError(`Authentication error: ${error}`);
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    googleService.disconnect();
    setIsAuthenticated(false);
    setActivityCount(0);
  };

  if (isAuthenticated) {
    return (
      <div className="google-auth-success">
        <div className="auth-status">
          <div className="status-indicator connected"></div>
          <div className="status-info">
            <h4>{config.name} Connected</h4>
            <p>Tracking activity automatically</p>
            <small>{activityCount} recent items processed</small>
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
            {config.features.map((feature, index) => (
              <li key={index}>✓ {feature}</li>
            ))}
          </ul>
        </div>

        <div className="privacy-notice">
          <h5>🔒 Privacy & Security:</h5>
          <ul>
            <li>✅ Read-only access only</li>
            <li>✅ No content modification</li>
            <li>✅ Encrypted data transmission</li>
            <li>✅ You can disconnect anytime</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="google-auth-setup">
      <div className="auth-header">
        <div className="service-icon" style={{ color: config.color }}>
          {config.icon}
        </div>
        <div>
          <h4>Connect {config.name}</h4>
          <p>Automatically track time spent on {service === 'gmail' ? 'email' : service === 'calendar' ? 'meetings' : 'documents'}</p>
        </div>
      </div>
      
      <div className="auth-benefits">
        <h5>Smart Tracking Features:</h5>
        {config.features.map((feature, index) => (
          <div key={index} className="benefit-item">
            <span className="benefit-icon">🎯</span>
            <div>{feature}</div>
          </div>
        ))}
      </div>

      <div className="auth-permissions">
        <h5>Required Permissions:</h5>
        <ul>
          <li>Read {service === 'gmail' ? 'email headers and metadata' : service === 'calendar' ? 'calendar events and details' : 'document metadata and activity'}</li>
          <li>Access modification timestamps</li>
          <li>No content reading or modification</li>
        </ul>
      </div>
      
      <button 
        onClick={handleAuthenticate}
        disabled={isAuthenticating}
        className="btn btn-primary auth-button"
        style={{ backgroundColor: config.color }}
      >
        {isAuthenticating ? 'Connecting...' : `Connect ${config.name}`}
      </button>
      
      <div className="privacy-note">
        <small>
          We only access metadata for time tracking. Your {service === 'gmail' ? 'email content' : 'document content'} 
          remains private and is never stored or transmitted.
        </small>
      </div>
    </div>
  );
};