import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const SimpleAuth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // If already logged in, show logout option
  if (user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
        <h2>Welcome, {user.name}!</h2>
        <p>You are logged in as {user.email}</p>
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple validation
    if (!email || !password || (!isLogin && !name)) {
      alert('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create user and token
    const user = {
      id: Date.now().toString(),
      email: email.trim().toLowerCase(),
      name: isLogin ? email.split('@')[0] : name.trim()
    };
    
    const token = 'tb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Store in localStorage
    localStorage.setItem('timebeacon_token', token);
    localStorage.setItem('timebeacon_user', JSON.stringify(user));

    // Trigger auth update
    window.dispatchEvent(new CustomEvent('auth-change'));
    
    setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#2d3748' }}>
            ⏰ TimeBeacon
          </h1>
          <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>
            Professional Time Tracking
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '16px',
                marginBottom: '20px'
              }}
            >
              {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
          </div>

          {!isLogin && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};