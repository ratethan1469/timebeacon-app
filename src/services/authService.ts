/**
 * Unified Authentication Service
 * Handles authentication logic for both email/password and OAuth providers
 */

import { supabase } from '../lib/supabase';
import { AuthResponse, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  company_id: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
  company_id: string | null;
}

/**
 * Handle authentication success - shared logic for all auth methods
 */
export async function handleAuthenticationSuccess(
  supabaseUser: User,
  accessToken: string
): Promise<{ user: AuthUser; needsCompany: boolean }> {
  // Check if user profile exists in our users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, role, company_id')
    .eq('id', supabaseUser.id)
    .single();

  if (profileError || !userProfile) {
    // User exists in Supabase Auth but not in our users table
    // This means they need to join/create a company
    return {
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0],
        role: null,
        company_id: null,
      },
      needsCompany: true,
    };
  }

  // User has a complete profile with company
  const authUser: AuthUser = {
    id: userProfile.id,
    email: userProfile.email,
    name: userProfile.full_name || userProfile.email.split('@')[0],
    role: userProfile.role,
    company_id: userProfile.company_id,
  };

  // Store session
  localStorage.setItem('timebeacon_token', accessToken);
  localStorage.setItem('timebeacon_user', JSON.stringify(authUser));

  // Trigger auth context update
  window.dispatchEvent(new CustomEvent('auth-change'));

  return {
    user: authUser,
    needsCompany: !userProfile.company_id,
  };
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: AuthUser; needsCompany: boolean }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user || !data.session) {
    throw new Error('Authentication failed - no user session');
  }

  return handleAuthenticationSuccess(data.user, data.session.access_token);
}

/**
 * Sign in with OAuth provider (Google, Microsoft, etc.)
 */
export async function signInWithOAuth(
  provider: 'google' | 'azure' | 'github'
): Promise<void> {
  const redirectUrl = `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // OAuth will redirect to callback URL
}

/**
 * Handle OAuth callback after redirect
 */
export async function handleOAuthCallback(): Promise<{
  user: AuthUser;
  needsCompany: boolean;
}> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw new Error('Failed to retrieve OAuth session');
  }

  return handleAuthenticationSuccess(data.session.user, data.session.access_token);
}

/**
 * Check if user with email already exists with different provider
 */
export async function checkEmailExists(email: string): Promise<{
  exists: boolean;
  hasPassword: boolean;
  providers: string[];
}> {
  // This requires admin access to check auth.users
  // For now, we'll handle this on the backend or rely on Supabase errors
  // when user tries to sign up with an existing email

  return {
    exists: false,
    hasPassword: false,
    providers: [],
  };
}

/**
 * Link OAuth provider to existing account
 */
export async function linkOAuthProvider(
  provider: 'google' | 'azure' | 'github'
): Promise<void> {
  const { error } = await supabase.auth.linkIdentity({
    provider,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Unlink OAuth provider from account
 */
export async function unlinkOAuthProvider(
  provider: 'google' | 'azure' | 'github'
): Promise<void> {
  const { error } = await supabase.auth.unlinkIdentity({
    provider,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get user's linked identities
 */
export async function getUserIdentities(): Promise<
  Array<{ provider: string; created_at: string }>
> {
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return [];
  }

  return (
    data.user.identities?.map((identity) => ({
      provider: identity.provider,
      created_at: identity.created_at,
    })) || []
  );
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem('timebeacon_token');
  localStorage.removeItem('timebeacon_user');
  localStorage.removeItem('timebeacon_remember');
  window.dispatchEvent(new CustomEvent('auth-change'));
}

/**
 * Create user profile after OAuth signup
 */
export async function createUserProfile(
  userId: string,
  email: string,
  fullName: string,
  companyId: string,
  role: string = 'CSM'
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      company_id: companyId,
      role,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create user profile: ' + error.message);
  }

  return data;
}

export const authService = {
  signInWithEmail,
  signInWithOAuth,
  handleOAuthCallback,
  handleAuthenticationSuccess,
  linkOAuthProvider,
  unlinkOAuthProvider,
  getUserIdentities,
  signOut,
  createUserProfile,
  checkEmailExists,
};
