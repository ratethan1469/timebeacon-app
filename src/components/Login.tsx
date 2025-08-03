import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { inputValidator } from '../services/inputValidator';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    const emailValidation = inputValidator.validateField(email, {
      required: true,
      type: 'email',
      errorMessage: 'Please enter a valid email address'
    });

    const passwordValidation = inputValidator.validateField(password, {
      required: true,
      minLength: 8,
      errorMessage: 'Password must be at least 8 characters'
    });

    if (!emailValidation.isValid) {
      setError(emailValidation.errors[0]);
      return;
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  const fillDemoCredentials = (role: 'admin' | 'manager' | 'employee') => {
    const credentials = {
      admin: { email: 'admin@demo.com', password: 'Admin123!' },
      manager: { email: 'manager@demo.com', password: 'Manager123!' },
      employee: { email: 'employee@demo.com', password: 'Employee123!' },
    };
    
    setEmail(credentials[role].email);
    setPassword(credentials[role].password);
    setShowDemoCredentials(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>TimeBeacon</h1>
          <p>Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          
          <div className="demo-section">
            <button 
              type="button" 
              className="demo-toggle-button"
              onClick={() => setShowDemoCredentials(!showDemoCredentials)}
            >
              {showDemoCredentials ? 'Hide' : 'Show'} Demo Credentials
            </button>
            
            {showDemoCredentials && (
              <div className="demo-credentials">
                <p>Try these demo accounts:</p>
                <div className="demo-options">
                  <button 
                    type="button" 
                    className="demo-credential-button"
                    onClick={() => fillDemoCredentials('admin')}
                  >
                    Admin (Owner)
                  </button>
                  <button 
                    type="button" 
                    className="demo-credential-button"
                    onClick={() => fillDemoCredentials('manager')}
                  >
                    Manager
                  </button>
                  <button 
                    type="button" 
                    className="demo-credential-button"
                    onClick={() => fillDemoCredentials('employee')}
                  >
                    Employee
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
        
        <div className="security-notice">
          <p>🔒 This demo uses enhanced security features including:</p>
          <ul>
            <li>Input validation and sanitization</li>
            <li>Rate limiting protection</li>
            <li>Secure session management</li>
            <li>CSRF protection</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;