/**
 * OAuth Callback Handler
 * Handles the OAuth redirect after successful authentication
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      setStatus('loading');
      setMessage('Verifying your account...');

      const { user, needsCompany } = await authService.handleOAuthCallback();

      setMessage('Authentication successful!');
      setStatus('success');

      // Small delay to show success message
      setTimeout(() => {
        if (needsCompany) {
          // New user needs to join/create a company
          navigate('/join-company', {
            state: { user, fromOAuth: true },
          });
        } else if (user.company_id && user.id) {
          // Existing user with company
          navigate(`/${user.company_id}/${user.id}/dashboard`);
        } else {
          // Fallback to simple dashboard
          navigate('/dashboard');
        }
      }, 1000);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Authentication failed');

      // Redirect to login after error
      setTimeout(() => {
        navigate('/login', {
          state: { error: error.message },
        });
      }, 3000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        );
      case 'success':
        return (
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
            }}
          >
            ✓
          </div>
        );
      case 'error':
        return (
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
            }}
          >
            ✕
          </div>
        );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '20px' }}>{getStatusIcon()}</div>

        <h2
          style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '8px',
          }}
        >
          {status === 'loading' && 'Signing you in...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Authentication Failed'}
        </h2>

        <p
          style={{
            color: '#6b7280',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          {message}
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default OAuthCallback;
