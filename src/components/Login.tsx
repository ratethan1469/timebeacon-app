import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Simple direct approach - create mock auth state and navigate
    const mockUser = {
      id: Math.random().toString(36).substr(2, 9),
      visitorId: '12345',
      email: email,
      name: email.split('@')[0],
      companyId: 'demo-company',
      role: 'owner',
      permissions: [],
      profile: {
        firstName: email.split('@')[0],
        lastName: 'User',
        jobTitle: 'CEO',
        department: 'Executive',
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mfaEnabled: false,
    };

    const mockCompany = {
      id: 'demo-company',
      accountId: '12345',
      name: 'Demo Company',
      slug: 'demo',
      activeUsers: 1,
      maxUsers: 50,
    };

    // Store in localStorage for the app to pick up
    localStorage.setItem('timebeacon_user', JSON.stringify(mockUser));
    localStorage.setItem('timebeacon_company', JSON.stringify(mockCompany));
    localStorage.setItem('timebeacon_access_token', 'demo-token');
    
    // Navigate to regular dashboard with the new features available
    navigate('/dashboard');
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
        </form>
      </div>
    </div>
  );
};

export default Login;