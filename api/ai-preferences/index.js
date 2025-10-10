const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Get or create preferences
      let { data: preferences, error } = await supabase
        .from('ai_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', userData.company_id)
        .single();

      // If preferences don't exist, create them with defaults
      if (error && error.code === 'PGRST116') {
        const { data: newPreferences, error: createError } = await supabase
          .from('ai_preferences')
          .insert({
            user_id: user.id,
            company_id: userData.company_id,
            confidence_threshold: 80,
            auto_approve_enabled: false,
            description_length: 'standard',
            only_opened_emails: true,
            skip_promotional: true,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        preferences = newPreferences;
      } else if (error) {
        throw error;
      }

      return res.status(200).json({ preferences });

    } else if (req.method === 'PATCH') {
      // Update preferences
      const updates = req.body;

      // Validate confidence_threshold
      if (updates.confidence_threshold !== undefined) {
        if (updates.confidence_threshold < 0 || updates.confidence_threshold > 100) {
          return res.status(400).json({ error: 'Confidence threshold must be between 0 and 100' });
        }
      }

      // Update in database
      const { data: preferences, error } = await supabase
        .from('ai_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('company_id', userData.company_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        message: 'Preferences updated successfully',
        preferences,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error with AI preferences:', error);
    return res.status(500).json({
      error: 'Failed to process AI preferences',
      message: error.message
    });
  }
};
