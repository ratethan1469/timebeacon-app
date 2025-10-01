import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type AuthMode = 'login' | 'register' | 'forgot-password';

export const AuthFlow: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="auth-flow">
      <div className="auth-container">
        <div className="auth-header">
          <div className="brand">
            <h1>⏰ TimeBeacon</h1>
            <p>Professional Time Tracking</p>
          </div>
        </div>

        <div className="auth-content">
          {mode === 'login' && (
            <LoginForm 
              onSwitchToRegister={() => setMode('register')}
              onSwitchToForgotPassword={() => setMode('forgot-password')}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}
          
          {mode === 'register' && (
            <RegisterForm 
              onSwitchToLogin={() => setMode('login')}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}
          
          {mode === 'forgot-password' && (
            <ForgotPasswordForm 
              onSwitchToLogin={() => setMode('login')}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}
        </div>

        <div className="auth-footer">
          <p>
            <a href="/privacy">Privacy Policy</a> • 
            <a href="/terms">Terms of Service</a>
          </p>
        </div>
      </div>

      <style>{`
        .auth-flow {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .auth-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          padding: 40px;
          width: 100%;
          max-width: 400px;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .brand h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #2d3748;
        }

        .brand p {
          margin: 4px 0 0 0;
          color: #718096;
          font-size: 14px;
        }

        .auth-footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .auth-footer p {
          margin: 0;
          font-size: 12px;
          color: #718096;
        }

        .auth-footer a {
          color: #667eea;
          text-decoration: none;
          margin: 0 4px;
        }

        .auth-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};