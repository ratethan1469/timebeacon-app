import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  authenticateJWT,
  verifyCompanyAccess,
} from '../middleware/auth';
import {
  processActivities,
  getTimeEntries,
  updateTimeEntryStatus,
  updateTimeEntry,
  getUnprocessedActivitiesCount,
} from '../services/processingService';
import { createClient } from '@supabase/supabase-js';

const router = Router();

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
router.post(
  '/process',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const companyId = req.user!.company_id;

      // Check if there are unprocessed activities
      const unprocessedCount = await getUnprocessedActivitiesCount(userId);

      if (unprocessedCount === 0) {
        res.status(200).json({
          message: 'No unprocessed activities found',
          entries: [],
          count: 0,
        });
        return;
      }

      // Process activities and generate time entries
      const entries = await processActivities(userId, companyId);

      res.status(200).json({
        message: 'Activities processed successfully',
        entries,
        count: entries.length,
      });
    } catch (error) {
      console.error('Failed to process activities:', error);
      res.status(500).json({
        error: 'Failed to process activities',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/time-entries/pending
 * Get time entries that need review
 */
router.get(
  '/pending',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const entries = await getTimeEntries(userId, 'pending_review', limit);

      res.status(200).json({
        entries,
        count: entries.length,
      });
    } catch (error) {
      console.error('Failed to fetch pending entries:', error);
      res.status(500).json({
        error: 'Failed to fetch pending entries',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/time-entries/approved
 * Get approved time entries
 */
router.get(
  '/approved',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const entries = await getTimeEntries(userId, 'approved', limit);

      res.status(200).json({
        entries,
        count: entries.length,
      });
    } catch (error) {
      console.error('Failed to fetch approved entries:', error);
      res.status(500).json({
        error: 'Failed to fetch approved entries',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/time-entries
 * Get all time entries (with optional status filter)
 */
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const status = req.query.status as
        | 'pending_review'
        | 'approved'
        | 'rejected'
        | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const entries = await getTimeEntries(userId, status, limit);

      res.status(200).json({
        entries,
        count: entries.length,
      });
    } catch (error) {
      console.error('Failed to fetch entries:', error);
      res.status(500).json({
        error: 'Failed to fetch entries',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PATCH /api/time-entries/:id
 * Edit a time entry
 */
router.patch(
  '/:id',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const entryId = req.params.id;
      const userId = req.user!.id;
      const updates = req.body;

      // Verify the entry belongs to the user
      const { data: entry, error: fetchError } = await supabase
        .from('time_entries')
        .select('user_id, company_id')
        .eq('id', entryId)
        .single();

      if (fetchError || !entry) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }

      if (entry.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Don't allow changing user_id or company_id
      delete updates.user_id;
      delete updates.company_id;
      delete updates.id;

      const updatedEntry = await updateTimeEntry(entryId, updates);

      res.status(200).json({
        message: 'Time entry updated successfully',
        entry: updatedEntry,
      });
    } catch (error) {
      console.error('Failed to update entry:', error);
      res.status(500).json({
        error: 'Failed to update entry',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PATCH /api/time-entries/:id/approve
 * Approve a time entry
 */
router.patch(
  '/:id/approve',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const entryId = req.params.id;
      const userId = req.user!.id;

      // Verify the entry belongs to the user
      const { data: entry, error: fetchError } = await supabase
        .from('time_entries')
        .select('user_id')
        .eq('id', entryId)
        .single();

      if (fetchError || !entry) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }

      if (entry.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await updateTimeEntryStatus(entryId, 'approved');

      res.status(200).json({
        message: 'Time entry approved successfully',
      });
    } catch (error) {
      console.error('Failed to approve entry:', error);
      res.status(500).json({
        error: 'Failed to approve entry',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/time-entries/:id
 * Reject/delete a time entry
 */
router.delete(
  '/:id',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const entryId = req.params.id;
      const userId = req.user!.id;

      // Verify the entry belongs to the user
      const { data: entry, error: fetchError } = await supabase
        .from('time_entries')
        .select('user_id')
        .eq('id', entryId)
        .single();

      if (fetchError || !entry) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }

      if (entry.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Option 1: Mark as rejected
      // await updateTimeEntryStatus(entryId, 'rejected');

      // Option 2: Actually delete it (more intuitive for users)
      const { error: deleteError } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);

      if (deleteError) {
        throw new Error(`Failed to delete entry: ${deleteError.message}`);
      }

      res.status(200).json({
        message: 'Time entry deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      res.status(500).json({
        error: 'Failed to delete entry',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
