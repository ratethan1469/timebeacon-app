import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { Database } from '../database/connection';
import { PromptTemplates } from '../prompts/templates';

interface DurationEstimationRequest {
  content: string;
  activityType: string;
  context?: any;
  userId: string;
}

interface DurationEstimationResponse {
  estimatedMinutes: number;
  confidenceScore: number;
  reasoning: string;
  bounds: {
    minMinutes: number;
    maxMinutes: number;
  };
}

interface ProjectMatchingRequest {
  content: string;
  emailDomain?: string;
  attendees?: string[];
  availableProjects: any[];
  userId: string;
}

interface ProjectMatchingResponse {
  matchedProjectId: string | null;
  confidenceScore: number;
  reasoning: string;
  alternatives: Array<{
    projectId: string;
    confidenceScore: number;
  }>;
}

interface SummarizationRequest {
  content: string;
  contentType: 'email' | 'meeting' | 'document';
  maxLength: number;
  userId: string;
}

interface SummarizationResponse {
  summary: string;
  keyPoints: string[];
  confidenceScore: number;
}

export class AIService {
  private openai: OpenAI;
  private promptTemplates: PromptTemplates;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.promptTemplates = new PromptTemplates();
  }

  async estimateDuration(request: DurationEstimationRequest): Promise<DurationEstimationResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = this.promptTemplates.getDurationEstimationPrompt(
        request.content,
        request.activityType,
        request.context
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const result = this.parseDurationResponse(response.choices[0].message.content || '');
      
      // Log the processing
      await this.logProcessing(request.userId, null, 'duration_estimation', {
        model: 'gpt-4-turbo-preview',
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        processingTimeMs: Date.now() - startTime,
        input: { content: request.content, activityType: request.activityType },
        output: result
      });

      return result;
    } catch (error) {
      logger.error('Error in duration estimation:', error);
      
      // Fallback to rule-based estimation
      return this.fallbackDurationEstimation(request);
    }
  }

  async matchProject(request: ProjectMatchingRequest): Promise<ProjectMatchingResponse> {
    const startTime = Date.now();
    
    try {
      // First try rule-based matching
      const ruleBasedMatch = await this.ruleBasedProjectMatching(request);
      
      if (ruleBasedMatch.confidenceScore > 0.8) {
        return ruleBasedMatch;
      }

      // Use LLM for complex matching
      const prompt = this.promptTemplates.getProjectMatchingPrompt(
        request.content,
        request.availableProjects,
        {
          emailDomain: request.emailDomain,
          attendees: request.attendees
        }
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.1,
        max_tokens: 800,
      });

      const result = this.parseProjectMatchResponse(response.choices[0].message.content || '');
      
      // Log the processing
      await this.logProcessing(request.userId, null, 'project_matching', {
        model: 'gpt-4-turbo-preview',
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        processingTimeMs: Date.now() - startTime,
        input: { content: request.content, availableProjects: request.availableProjects.length },
        output: result
      });

      return result;
    } catch (error) {
      logger.error('Error in project matching:', error);
      
      // Return rule-based result as fallback
      return ruleBasedMatch || {
        matchedProjectId: null,
        confidenceScore: 0,
        reasoning: 'Could not match to any project',
        alternatives: []
      };
    }
  }

  async summarizeContent(request: SummarizationRequest): Promise<SummarizationResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = this.promptTemplates.getSummarizationPrompt(
        request.content,
        request.contentType,
        request.maxLength
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.1,
        max_tokens: Math.min(request.maxLength * 2, 800),
      });

      const result = this.parseSummarizationResponse(response.choices[0].message.content || '');
      
      // Log the processing
      await this.logProcessing(request.userId, null, 'summarization', {
        model: 'gpt-4-turbo-preview',
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        processingTimeMs: Date.now() - startTime,
        input: { contentType: request.contentType, contentLength: request.content.length },
        output: result
      });

      return result;
    } catch (error) {
      logger.error('Error in content summarization:', error);
      
      // Fallback to simple truncation
      return {
        summary: request.content.substring(0, request.maxLength) + '...',
        keyPoints: [],
        confidenceScore: 0.1
      };
    }
  }

  async getProcessingLogs(userId: string, filters: any) {
    const db = Database.getInstance();
    
    const query = `
      SELECT * FROM ai_processing_logs 
      WHERE user_id = $1
      ${filters.startDate ? 'AND created_at >= $2' : ''}
      ${filters.endDate ? 'AND created_at <= $3' : ''}
      ${filters.processingType ? 'AND processing_type = $4' : ''}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    const params = [userId];
    if (filters.startDate) params.push(filters.startDate);
    if (filters.endDate) params.push(filters.endDate);
    if (filters.processingType) params.push(filters.processingType);
    
    const result = await db.query(query, params);
    return result.rows;
  }

  private async logProcessing(
    userId: string, 
    timeEntryId: string | null, 
    processingType: string, 
    data: any
  ) {
    const db = Database.getInstance();
    
    await db.query(`
      INSERT INTO ai_processing_logs (
        user_id, time_entry_id, model_name, processing_type,
        input_data, output_data, confidence_score, processing_time_ms,
        input_tokens, output_tokens, estimated_cost_usd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      userId,
      timeEntryId,
      data.model,
      processingType,
      JSON.stringify(data.input),
      JSON.stringify(data.output),
      data.output.confidenceScore || 0,
      data.processingTimeMs,
      data.inputTokens,
      data.outputTokens,
      this.calculateTokenCost(data.inputTokens, data.outputTokens, data.model)
    ]);
  }

  private calculateTokenCost(inputTokens: number, outputTokens: number, model: string): number {
    // GPT-4 pricing as of 2024
    const inputCost = (inputTokens / 1000) * 0.03;
    const outputCost = (outputTokens / 1000) * 0.06;
    return inputCost + outputCost;
  }

  private parseDurationResponse(content: string): DurationEstimationResponse {
    // Parse JSON response from LLM
    try {
      const parsed = JSON.parse(content);
      return {
        estimatedMinutes: parsed.estimated_minutes || 0,
        confidenceScore: parsed.confidence_score || 0,
        reasoning: parsed.reasoning || '',
        bounds: {
          minMinutes: parsed.min_minutes || 0,
          maxMinutes: parsed.max_minutes || 0
        }
      };
    } catch (error) {
      logger.error('Error parsing duration response:', error);
      return {
        estimatedMinutes: 30,
        confidenceScore: 0.1,
        reasoning: 'Failed to parse LLM response',
        bounds: { minMinutes: 15, maxMinutes: 60 }
      };
    }
  }

  private parseProjectMatchResponse(content: string): ProjectMatchingResponse {
    try {
      const parsed = JSON.parse(content);
      return {
        matchedProjectId: parsed.matched_project_id || null,
        confidenceScore: parsed.confidence_score || 0,
        reasoning: parsed.reasoning || '',
        alternatives: parsed.alternatives || []
      };
    } catch (error) {
      return {
        matchedProjectId: null,
        confidenceScore: 0,
        reasoning: 'Failed to parse LLM response',
        alternatives: []
      };
    }
  }

  private parseSummarizationResponse(content: string): SummarizationResponse {
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || '',
        keyPoints: parsed.key_points || [],
        confidenceScore: parsed.confidence_score || 0.8
      };
    } catch (error) {
      return {
        summary: content.substring(0, 100) + '...',
        keyPoints: [],
        confidenceScore: 0.1
      };
    }
  }

  private fallbackDurationEstimation(request: DurationEstimationRequest): DurationEstimationResponse {
    // Simple rule-based estimation
    let minutes = 30;
    
    switch (request.activityType) {
      case 'email':
        minutes = Math.max(5, Math.min(60, request.content.length / 100));
        break;
      case 'meeting':
        minutes = request.context?.duration || 60;
        break;
      case 'document':
        minutes = Math.max(15, Math.min(180, request.content.length / 200));
        break;
    }
    
    return {
      estimatedMinutes: Math.round(minutes),
      confidenceScore: 0.3,
      reasoning: 'Rule-based estimation (LLM unavailable)',
      bounds: {
        minMinutes: Math.round(minutes * 0.5),
        maxMinutes: Math.round(minutes * 1.5)
      }
    };
  }

  private async ruleBasedProjectMatching(request: ProjectMatchingRequest): Promise<ProjectMatchingResponse> {
    const db = Database.getInstance();
    
    // Try to match by email domain first
    if (request.emailDomain) {
      const result = await db.query(`
        SELECT p.id, p.name FROM projects p
        JOIN clients c ON p.client_id = c.id
        WHERE c.domain = $1 AND p.is_active = true
      `, [request.emailDomain]);
      
      if (result.rows.length > 0) {
        return {
          matchedProjectId: result.rows[0].id,
          confidenceScore: 0.9,
          reasoning: `Matched by email domain: ${request.emailDomain}`,
          alternatives: result.rows.slice(1).map(row => ({
            projectId: row.id,
            confidenceScore: 0.8
          }))
        };
      }
    }
    
    // Try keyword matching
    const keywords = request.content.toLowerCase().split(' ');
    const matchQuery = `
      SELECT p.id, p.name, p.keywords,
        array_length(array(select unnest(p.keywords) intersect select unnest($1)), 1) as matches
      FROM projects p
      WHERE p.is_active = true AND p.keywords && $1
      ORDER BY matches DESC
      LIMIT 3
    `;
    
    const keywordResult = await db.query(matchQuery, [keywords]);
    
    if (keywordResult.rows.length > 0) {
      const best = keywordResult.rows[0];
      return {
        matchedProjectId: best.id,
        confidenceScore: Math.min(0.8, best.matches / 5),
        reasoning: `Matched by keywords: ${best.matches} matches found`,
        alternatives: keywordResult.rows.slice(1).map(row => ({
          projectId: row.id,
          confidenceScore: Math.min(0.7, row.matches / 5)
        }))
      };
    }
    
    return {
      matchedProjectId: null,
      confidenceScore: 0,
      reasoning: 'No rule-based matches found',
      alternatives: []
    };
  }
}