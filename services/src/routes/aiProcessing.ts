import { Router, Request, Response } from 'express';
import { AIService } from '../services/AIService';
import { validateRequest } from '../middleware/validation';
import { durationEstimationSchema, projectMatchingSchema, summarizationSchema } from '../schemas/ai';
import { logger } from '../utils/logger';

const router = Router();
const aiService = new AIService();

// POST /api/v1/ai/estimate-duration
router.post('/estimate-duration', validateRequest(durationEstimationSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { content, activity_type, context } = req.body;

    const result = await aiService.estimateDuration({
      content,
      activityType: activity_type,
      context,
      userId
    });

    res.json({
      estimated_minutes: result.estimatedMinutes,
      confidence_score: result.confidenceScore,
      reasoning: result.reasoning,
      bounds: {
        min_minutes: result.bounds.minMinutes,
        max_minutes: result.bounds.maxMinutes
      }
    });
  } catch (error) {
    logger.error('Error estimating duration:', error);
    res.status(500).json({ error: 'Failed to estimate duration' });
  }
});

// POST /api/v1/ai/match-project
router.post('/match-project', validateRequest(projectMatchingSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { content, email_domain, attendees, available_projects } = req.body;

    const result = await aiService.matchProject({
      content,
      emailDomain: email_domain,
      attendees,
      availableProjects: available_projects,
      userId
    });

    res.json({
      matched_project_id: result.matchedProjectId,
      confidence_score: result.confidenceScore,
      reasoning: result.reasoning,
      alternatives: result.alternatives
    });
  } catch (error) {
    logger.error('Error matching project:', error);
    res.status(500).json({ error: 'Failed to match project' });
  }
});

// POST /api/v1/ai/summarize
router.post('/summarize', validateRequest(summarizationSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { content, content_type, max_length } = req.body;

    const result = await aiService.summarizeContent({
      content,
      contentType: content_type,
      maxLength: max_length || 100,
      userId
    });

    res.json({
      summary: result.summary,
      key_points: result.keyPoints,
      confidence_score: result.confidenceScore
    });
  } catch (error) {
    logger.error('Error summarizing content:', error);
    res.status(500).json({ error: 'Failed to summarize content' });
  }
});

// GET /api/v1/ai/processing-logs
router.get('/processing-logs', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, processing_type } = req.query;

    const logs = await aiService.getProcessingLogs(userId, {
      startDate: start_date as string,
      endDate: end_date as string,
      processingType: processing_type as string
    });

    res.json({ logs });
  } catch (error) {
    logger.error('Error fetching processing logs:', error);
    res.status(500).json({ error: 'Failed to fetch processing logs' });
  }
});

export { router as aiProcessingRouter };