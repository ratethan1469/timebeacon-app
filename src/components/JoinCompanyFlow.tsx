/**
 * Join Company Flow
 * Handles new users joining or creating a company
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';

type FlowStep = 'choice' | 'join' | 'create';

export const JoinCompanyFlow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user;

  const [step, setStep] = useState<FlowStep>('choice');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Join company form
  const [companyCode, setCompanyCode] = useState('');

  // Create company form
  const [companyData, setCompanyData] = useState({
    name: '',
    subscriptionTier: 'free' as 'free' | 'pro' | 'enterprise',
  });

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement company code verification
      // For now, show error
      setError('Company code verification not yet implemented');
    } catch (err: any) {
      setError(err.message || 'Failed to join company');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!user) {
        throw new Error('User information not found');
      }

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyData.name,
          subscription_tier: companyData.subscriptionTier,
          storage_limit_mb: 10240, // 10GB default
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create user profile
      await authService.createUserProfile(
        user.id,
        user.email,
        user.name,
        company.id,
        'Admin' // Company creator is admin
      );

      // Update session with company_id
      const updatedUser = {
        ...user,
        company_id: company.id,
        role: 'Admin',
      };

      localStorage.setItem('timebeacon_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('auth-change'));

      // Navigate to dashboard
      navigate(`/${company.id}/${user.id}/dashboard`);
    } catch (err: any) {
      console.error('Create company error:', err);
      setError(err.message || 'Failed to create company');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Session expired. Please log in again.</p>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              margin: '0 0 8px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#2d3748',
            }}
          >
            Welcome, {user.name}! 👋
          </h1>
          <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>
            {user.email}
          </p>
        </div>

        {/* Choice Step */}
        {step === 'choice' && (
          <div>
            <p
              style={{
                textAlign: 'center',
                color: '#4a5568',
                marginBottom: '32px',
              }}
            >
              To get started, choose an option:
            </p>

            <button
              onClick={() => setStep('join')}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              📧 Join Existing Company
            </button>

            <button
              onClick={() => setStep('create')}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              🏢 Create New Company
            </button>
          </div>
        )}

        {/* Join Company Step */}
        {step === 'join' && (
          <form onSubmit={handleJoinCompany}>
            <button
              type="button"
              onClick={() => setStep('choice')}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                marginBottom: '20px',
                fontSize: '14px',
              }}
            >
              ← Back
            </button>

            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '20px',
              }}
            >
              Join Existing Company
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                Company Invitation Code
              </label>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
              <p
                style={{
                  fontSize: '12px',
                  color: '#718096',
                  marginTop: '8px',
                }}
              >
                Ask your admin for the company invitation code
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  color: '#c00',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !companyCode}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isLoading ? '#a0aec0' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Joining...' : 'Join Company'}
            </button>
          </form>
        )}

        {/* Create Company Step */}
        {step === 'create' && (
          <form onSubmit={handleCreateCompany}>
            <button
              type="button"
              onClick={() => setStep('choice')}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                marginBottom: '20px',
                fontSize: '14px',
              }}
            >
              ← Back
            </button>

            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '20px',
              }}
            >
              Create Your Company
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                Company Name
              </label>
              <input
                type="text"
                value={companyData.name}
                onChange={(e) =>
                  setCompanyData({ ...companyData, name: e.target.value })
                }
                placeholder="Enter company name"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                Subscription Tier
              </label>
              <select
                value={companyData.subscriptionTier}
                onChange={(e) =>
                  setCompanyData({
                    ...companyData,
                    subscriptionTier: e.target.value as any,
                  })
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="free">Free (Up to 3 users)</option>
                <option value="pro">Pro ($29/month)</option>
                <option value="enterprise">Enterprise (Contact sales)</option>
              </select>
            </div>

            {error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  color: '#c00',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !companyData.name}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isLoading ? '#a0aec0' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Creating...' : 'Create Company'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default JoinCompanyFlow;
