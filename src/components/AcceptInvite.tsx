import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';

/**
 * Accept Invite Page
 *
 * This page is reached after a user accepts a Clerk invitation.
 * It creates their user record in Supabase and redirects to dashboard.
 */
export const AcceptInvite: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { user: clerkUser, isLoaded } = useUser();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'creating' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const processInvitation = async () => {
      if (!isLoaded) return;

      if (!clerkUser) {
        setError('Please sign in to accept this invitation');
        setStatus('error');
        return;
      }

      if (!companyId) {
        setError('Invalid invitation link');
        setStatus('error');
        return;
      }

      try {
        setStatus('creating');

        // Get company info and metadata from Clerk
        const metadata = clerkUser.publicMetadata as {
          company_name?: string;
          role?: string;
          is_champion?: boolean;
        };

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', clerkUser.id)
          .single();

        if (existingUser) {
          // User already exists, just navigate to dashboard
          navigate(`/${companyId}/${clerkUser.id}/dashboard`);
          return;
        }

        // Create user record in Supabase
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            full_name: clerkUser.fullName || clerkUser.firstName || '',
            company_id: companyId,
            role: metadata.role || 'Member',
          });

        if (userError) {
          throw new Error(`Failed to create user profile: ${userError.message}`);
        }

        setStatus('success');

        // Redirect to dashboard after brief delay
        setTimeout(() => {
          navigate(`/${companyId}/${clerkUser.id}/dashboard`);
        }, 1500);

      } catch (err: any) {
        console.error('Invitation processing error:', err);
        setError(err.message || 'Failed to process invitation');
        setStatus('error');
      }
    };

    processInvitation();
  }, [clerkUser, isLoaded, companyId, navigate]);

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
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
              Loading...
            </h1>
            <p style={{ color: '#718096' }}>Please wait</p>
          </>
        )}

        {status === 'creating' && (
          <>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
              Setting up your account...
            </h1>
            <div style={{ margin: '32px 0' }}>
              <div className="spinner-wrapper">
                <div className="spinner">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="spinner-bar"></div>
                  ))}
                </div>
              </div>
            </div>
            <p style={{ color: '#718096' }}>Creating your profile</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
              Welcome to TimeBeacon!
            </h1>
            <p style={{ color: '#718096' }}>
              Redirecting to your dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#e00' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#718096', marginBottom: '24px' }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
