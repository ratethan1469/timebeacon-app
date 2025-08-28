import { Router, Request, Response } from 'express';
import { ImportService } from '../services/ImportService';
import { validateRequest } from '../middleware/validation';
import { gmailImportSchema, calendarImportSchema, driveImportSchema } from '../schemas/import';
import { logger } from '../utils/logger';

const router = Router();
const importService = new ImportService();

// POST /api/v1/import/gmail
router.post('/gmail', validateRequest(gmailImportSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, max_emails, query } = req.body;

    const result = await importService.importGmailData(userId, {
      startDate: new Date(start_date),
      endDate: end_date ? new Date(end_date) : new Date(),
      maxEmails: max_emails || 100,
      query
    });

    res.json({
      imported_count: result.importedCount,
      processed_count: result.processedCount,
      failed_count: result.failedCount,
      time_entries_created: result.timeEntriesCreated,
      processing_time_ms: result.processingTimeMs,
      errors: result.errors
    });
  } catch (error) {
    logger.error('Error importing Gmail data:', error);
    res.status(500).json({ error: 'Failed to import Gmail data' });
  }
});

// POST /api/v1/import/calendar
router.post('/calendar', validateRequest(calendarImportSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, calendar_id } = req.body;

    const result = await importService.importCalendarData(userId, {
      startDate: new Date(start_date),
      endDate: end_date ? new Date(end_date) : new Date(),
      calendarId: calendar_id || 'primary'
    });

    res.json({
      imported_count: result.importedCount,
      processed_count: result.processedCount,
      failed_count: result.failedCount,
      time_entries_created: result.timeEntriesCreated,
      processing_time_ms: result.processingTimeMs,
      errors: result.errors
    });
  } catch (error) {
    logger.error('Error importing calendar data:', error);
    res.status(500).json({ error: 'Failed to import calendar data' });
  }
});

// POST /api/v1/import/drive
router.post('/drive', validateRequest(driveImportSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, folder_id } = req.body;

    const result = await importService.importDriveData(userId, {
      startDate: new Date(start_date),
      endDate: end_date ? new Date(end_date) : new Date(),
      folderId: folder_id
    });

    res.json({
      imported_count: result.importedCount,
      processed_count: result.processedCount,
      failed_count: result.failedCount,
      time_entries_created: result.timeEntriesCreated,
      processing_time_ms: result.processingTimeMs,
      errors: result.errors
    });
  } catch (error) {
    logger.error('Error importing Drive data:', error);
    res.status(500).json({ error: 'Failed to import Drive data' });
  }
});

// GET /api/v1/import/status/:jobId
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;

    const status = await importService.getImportStatus(userId, jobId);
    
    if (!status) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    res.json(status);
  } catch (error) {
    logger.error('Error getting import status:', error);
    res.status(500).json({ error: 'Failed to get import status' });
  }
});

// POST /api/v1/import/process-batch
router.post('/process-batch', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { time_entry_ids } = req.body;

    const result = await importService.processBatch(userId, time_entry_ids);

    res.json({
      processed_count: result.processedCount,
      failed_count: result.failedCount,
      processing_time_ms: result.processingTimeMs,
      errors: result.errors
    });
  } catch (error) {
    logger.error('Error processing batch:', error);
    res.status(500).json({ error: 'Failed to process batch' });
  }
});

export { router as importRouter };