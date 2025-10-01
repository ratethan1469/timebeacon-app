import React, { useState } from 'react';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSwitchToLogin,
  isLoading,
  setIsLoading
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send reset email');
        return;
      }

      setIsSubmitted(true);

    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="forgot-password-form">
        <div className="success-state">
          <div className="success-icon">✉️</div>
          <h2>Check Your Email</h2>
          <p>
            We've sent password reset instructions to <strong>{email}</strong>
          </p>
          <p className="help-text">
            Didn't receive the email? Check your spam folder or try again in a few minutes.
          </p>
          
          <button
            type="button"
            className="submit-btn"
            onClick={onSwitchToLogin}
          >
            Back to Sign In
          </button>
        </div>

        <style>{`
          .forgot-password-form {
            width: 100%;
          }

          .success-state {
            text-align: center;
          }

          .success-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }

          .success-state h2 {
            margin: 0 0 16px 0;
            font-size: 24px;
            font-weight: 600;
            color: #2d3748;
          }

          .success-state p {
            margin: 0 0 12px 0;
            color: #4a5568;
            line-height: 1.5;
          }

          .help-text {
            font-size: 14px;
            color: #718096;
            margin-bottom: 24px !important;
          }

          .submit-btn {
            width: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
          }

          .submit-btn:hover {
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="forgot-password-form">
      <div className="form-header">
        <h2>Reset Password</h2>
        <p>Enter your email and we'll send you reset instructions</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            className={error ? 'error' : ''}
            placeholder="Enter your email"
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
          {error && <span className="error-message">{error}</span>}
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Sending...
            </>
          ) : (
            'Send Reset Instructions'
          )}
        </button>

        <div className="form-footer">
          <p>
            Remember your password?{' '}
            <button
              type="button"
              className="link-btn"
              onClick={onSwitchToLogin}
              disabled={isLoading}
            >
              Back to Sign In
            </button>
          </p>
        </div>
      </form>

      <style>{`
        .forgot-password-form {
          width: 100%;
        }

        .form-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .form-header h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
          font-weight: 600;
          color: #2d3748;
        }

        .form-header p {
          margin: 0;
          color: #718096;
          font-size: 14px;
          line-height: 1.4;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input.error {
          border-color: #e53e3e;
        }

        .form-group input:disabled {
          background-color: #f7fafc;
          cursor: not-allowed;
        }

        .error-message {
          display: block;
          color: #e53e3e;
          font-size: 12px;
          margin-top: 4px;
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .form-footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .form-footer p {
          margin: 0;
          color: #718096;
          font-size: 14px;
        }

        .link-btn {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 14px;
          text-decoration: underline;
          padding: 0;
        }

        .link-btn:hover {
          color: #5a67d8;
        }

        .link-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};