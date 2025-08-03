/**
 * Google OAuth Callback Handler
 * Handles the OAuth callback flow for Google integrations
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleIntegrationsService } from '../services/googleIntegrations';

export default function GoogleOAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Google authentication...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
          throw new Error(`Authentication failed: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for tokens
        const account = await googleIntegrationsService.exchangeCodeForTokens(code);
        
        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            account
          }, window.location.origin);
          window.close();
        } else {
          // If not in popup, redirect to integrations page
          setStatus('success');
          setMessage('Google account connected successfully! Redirecting...');
          setTimeout(() => {
            navigate('/integrations');
          }, 2000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: error instanceof Error ? error.message : 'Authentication failed'
          }, window.location.origin);
          window.close();
        } else {
          // If not in popup, redirect to integrations page after delay
          setTimeout(() => {
            navigate('/integrations');
          }, 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting to Google
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-900 mb-2">
              Success!
            </h2>
            <p className="text-green-600">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-red-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/integrations')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Integrations
            </button>
          </>
        )}
      </div>
    </div>
  );
}