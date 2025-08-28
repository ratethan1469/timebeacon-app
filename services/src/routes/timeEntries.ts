import { Router, Request, Response } from 'express';
import { TimeEntryService } from '../services/TimeEntryService';
import { validateRequest } from '../middleware/validation';
import { createTimeEntrySchema, updateTimeEntrySchema } from '../schemas/timeEntry';
import { logger } from '../utils/logger';

const router = Router();
const timeEntryService = new TimeEntryService();

// GET /api/v1/time-entries
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, project_id, status, page = 1, limit = 50 } = req.query;

    const filters = {
      startDate: start_date as string,
      endDate: end_date as string,
      projectId: project_id as string,
      status: status as string,
    };

    const result = await timeEntryService.getTimeEntries(
      userId,
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      time_entries: result.entries,
      total_count: result.totalCount,
      page: parseInt(page as string),
      page_size: parseInt(limit as string)
    });
  } catch (error) {
    logger.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// POST /api/v1/time-entries
router.post('/', validateRequest(createTimeEntrySchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const timeEntry = await timeEntryService.createTimeEntry(userId, req.body);
    res.status(201).json(timeEntry);
  } catch (error) {
    logger.error('Error creating time entry:', error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

// GET /api/v1/time-entries/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const timeEntry = await timeEntryService.getTimeEntry(userId, req.params.id);
    
    if (!timeEntry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json(timeEntry);
  } catch (error) {
    logger.error('Error fetching time entry:', error);
    res.status(500).json({ error: 'Failed to fetch time entry' });
  }
});

// PUT /api/v1/time-entries/:id
router.put('/:id', validateRequest(updateTimeEntrySchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const timeEntry = await timeEntryService.updateTimeEntry(userId, req.params.id, req.body);
    
    if (!timeEntry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json(timeEntry);
  } catch (error) {
    logger.error('Error updating time entry:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

// DELETE /api/v1/time-entries/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const deleted = await timeEntryService.deleteTimeEntry(userId, req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting time entry:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

export { router as timeEntriesRouter };