import React, { useState } from 'react';
import apiService, { isAuthenticated, getCurrentUserFromStorage } from '../services/apiService';

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('sarah.manager@acmecrm.com');
  const [password, setPassword] = useState('TempPass123!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already authenticated
  if (isAuthenticated()) {
    const user = getCurrentUserFromStorage();
    return (
      <div className="login-form">
        <div className="alert alert-success">
          <h3>Welcome back, {user.firstName} {user.lastName}!</h3>
          <p>Role: {user.role} at {user.companyName}</p>
          <button 
            className="btn btn-secondary"
            onClick={async () => {
              await apiService.logout();
              window.location.reload();
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await apiService.login(email, password);
      
      if (result.user) {
        onLoginSuccess(result.user);
      } else {
        setError('Login failed');
      }
    } catch (error: any) {
      setError(error.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-form" style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>TimeBeacon Login</h2>
      <p className="text-muted">ACMEcrm Demo Environment</p>
      
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading}
          style={{ width: '100%' }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <strong>Demo Accounts:</strong>
        <div>Manager: sarah.manager@acmecrm.com</div>
        <div>Employee: mike.developer@acmecrm.com</div>
        <div>Password: TempPass123!</div>
      </div>
    </div>
  );
};