const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const {
  authenticateJWT,
  verifyCompanyAccess,
} = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Apply authentication to all routes
router.use(authenticateJWT);
router.use(verifyCompanyAccess);

/**
 * GET /api/ai-preferences
 * Get current user's AI preferences
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Fetch preferences
    let { data: preferences, error } = await supabase
      .from('ai_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If no preferences exist, create defaults
    if (error && error.code === 'PGRST116') {
      const { data: newPrefs, error: insertError } = await supabase
        .from('ai_preferences')
        .insert({
          user_id: userId,
          company_id: companyId,
          confidence_threshold: 80,
          description_length: 'standard',
          auto_approve_enabled: false,
          only_opened_emails: true,
          skip_promotional: true,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create preferences: ${insertError.message}`);
      }

      preferences = newPrefs;
    } else if (error) {
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    return res.status(200).json({
      preferences,
    });
  } catch (error) {
    console.error('Failed to get AI preferences:', error);
    return res.status(500).json({
      error: 'Failed to get AI preferences',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/ai-preferences
 * Update current user's AI preferences
 */
router.patch('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Don't allow changing user_id or company_id
    delete updates.user_id;
    delete updates.company_id;
    delete updates.id;
    delete updates.created_at;
    delete updates.updated_at;

    // Validate updates
    if (updates.confidence_threshold !== undefined) {
      const threshold = parseInt(updates.confidence_threshold);
      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        return res.status(400).json({
          error: 'Invalid confidence_threshold (must be 0-100)',
        });
      }
      updates.confidence_threshold = threshold;
    }

    if (updates.description_length !== undefined) {
      if (!['brief', 'standard', 'detailed'].includes(updates.description_length)) {
        return res.status(400).json({
          error: 'Invalid description_length (must be brief, standard, or detailed)',
        });
      }
    }

    // Update preferences
    const { data: updatedPrefs, error } = await supabase
      .from('ai_preferences')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update preferences: ${error.message}`);
    }

    return res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: updatedPrefs,
    });
  } catch (error) {
    console.error('Failed to update AI preferences:', error);
    return res.status(500).json({
      error: 'Failed to update AI preferences',
      message: error.message,
    });
  }
});

module.exports = router;
