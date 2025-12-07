import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clerkUserId, email, fullName, companyName, subscriptionTier } = req.body;

    // Validate required fields
    if (!clerkUserId || !email || !companyName) {
      return res.status(400).json({
        error: 'Missing required fields: clerkUserId, email, companyName'
      });
    }

    // Create Supabase admin client (uses service role key)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({
        error: 'Server configuration error',
        debug: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey,
          urlPrefix: supabaseUrl?.substring(0, 20),
          keyPrefix: supabaseServiceKey?.substring(0, 10)
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Created Supabase client with:', {
      url: supabaseUrl,
      keyPrefix: supabaseServiceKey.substring(0, 20)
    });

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        subscription_tier: subscriptionTier || 'free',
        storage_limit_mb: 10240, // 10GB default
      })
      .select()
      .single();

    if (companyError) {
      console.error('Company creation error:', companyError);
      return res.status(500).json({
        error: companyError.message,
        details: companyError.details,
        hint: companyError.hint,
        code: companyError.code
      });
    }

    // Create user profile
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: clerkUserId,
        email: email,
        full_name: fullName || email,
        company_id: company.id,
        role: 'Admin',
      });

    if (userError) {
      console.error('User creation error:', userError);
      // If user creation fails, try to delete the company
      await supabase.from('companies').delete().eq('id', company.id);
      return res.status(500).json({ error: userError.message });
    }

    // Note: We no longer update Clerk metadata
    // Supabase is the single source of truth for user data
    // AuthContext fetches directly from Supabase

    // Return success with company data
    return res.status(200).json({
      success: true,
      company: company
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred'
    });
  }
}
