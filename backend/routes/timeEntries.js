const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const {
  authenticateJWT,
  verifyCompanyAccess,
} = require('../middleware/auth');
const {
  processActivities,
  getTimeEntries,
  updateTimeEntryStatus,
  updateTimeEntry,
  getUnprocessedActivitiesCount,
} = require('../services/processingService');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Apply authentication to all routes
router.use(authenticateJWT);
router.use(verifyCompanyAccess);

/**
 * POST /api/time-entries/process
 * Trigger AI processing of unprocessed activities
 */
router.post('/process', async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Check if there are unprocessed activities
    const unprocessedCount = await getUnprocessedActivitiesCount(userId);

    if (unprocessedCount === 0) {
      return res.status(200).json({
        message: 'No unprocessed activities found',
        entries: [],
        count: 0,
      });
    }

    // Process activities and generate time entries
    const entries = await processActivities(userId, companyId);

    return res.status(200).json({
      message: 'Activities processed successfully',
      entries,
      count: entries.length,
    });
  } catch (error) {
    console.error('Failed to process activities:', error);
    return res.status(500).json({
      error: 'Failed to process activities',
      message: error.message,
    });
  }
});

/**
 * GET /api/time-entries/pending
 * Get time entries that need review
 */
router.get('/pending', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const entries = await getTimeEntries(userId, 'pending_review', limit);

    return res.status(200).json({
      entries,
      count: entries.length,
    });
  } catch (error) {
    console.error('Failed to fetch pending entries:', error);
    return res.status(500).json({
      error: 'Failed to fetch pending entries',
      message: error.message,
    });
  }
});

/**
 * GET /api/time-entries/approved
 * Get approved time entries
 */
router.get('/approved', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const entries = await getTimeEntries(userId, 'approved', limit);

    return res.status(200).json({
      entries,
      count: entries.length,
    });
  } catch (error) {
    console.error('Failed to fetch approved entries:', error);
    return res.status(500).json({
      error: 'Failed to fetch approved entries',
      message: error.message,
    });
  }
});

/**
 * GET /api/time-entries
 * Get all time entries (with optional status filter)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 50;

    const entries = await getTimeEntries(userId, status, limit);

    return res.status(200).json({
      entries,
      count: entries.length,
    });
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    return res.status(500).json({
      error: 'Failed to fetch entries',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/time-entries/:id
 * Edit a time entry
 */
router.patch('/:id', async (req, res) => {
  try {
    const entryId = req.params.id;
    const userId = req.user.id;
    const updates = req.body;

    // Verify the entry belongs to the user
    const { data: entry, error: fetchError } = await supabase
      .from('time_entries')
      .select('user_id, company_id')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow changing user_id or company_id
    delete updates.user_id;
    delete updates.company_id;
    delete updates.id;

    const updatedEntry = await updateTimeEntry(entryId, updates);

    return res.status(200).json({
      message: 'Time entry updated successfully',
      entry: updatedEntry,
    });
  } catch (error) {
    console.error('Failed to update entry:', error);
    return res.status(500).json({
      error: 'Failed to update entry',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/time-entries/:id/approve
 * Approve a time entry
 */
router.patch('/:id/approve', async (req, res) => {
  try {
    const entryId = req.params.id;
    const userId = req.user.id;

    // Verify the entry belongs to the user
    const { data: entry, error: fetchError } = await supabase
      .from('time_entries')
      .select('user_id')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await updateTimeEntryStatus(entryId, 'approved');

    return res.status(200).json({
      message: 'Time entry approved successfully',
    });
  } catch (error) {
    console.error('Failed to approve entry:', error);
    return res.status(500).json({
      error: 'Failed to approve entry',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/time-entries/:id
 * Reject/delete a time entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const entryId = req.params.id;
    const userId = req.user.id;

    // Verify the entry belongs to the user
    const { data: entry, error: fetchError } = await supabase
      .from('time_entries')
      .select('user_id')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Actually delete it
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId);

    if (deleteError) {
      throw new Error(`Failed to delete entry: ${deleteError.message}`);
    }

    return res.status(200).json({
      message: 'Time entry deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete entry:', error);
    return res.status(500).json({
      error: 'Failed to delete entry',
      message: error.message,
    });
  }
});

module.exports = router;
