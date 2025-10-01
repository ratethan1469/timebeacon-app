/**
 * TimeBeacon AI Service - Local LLM Integration with Ollama
 * Privacy-first AI processing that runs entirely on the user's machine
 */

import { Project, Client } from '../types';
import { TimeEntry } from '../types/privacy';

export interface AIAnalysisResult {
  confidence: number;
  suggestedProject?: string;
  suggestedClient?: string;
  suggestedDescription?: string;
  suggestedCategory?: TimeEntry['category'];
  suggestedBillable?: boolean;
  reasoning?: string;
  tags?: string[];
  meetingType?: TimeEntry['meetingType'];
  suggestions?: SuggestedTimeEntry[];
}

export interface SuggestedTimeEntry {
  id: string;
  date: string;
  startTime: string;
  duration: number;
  client: string;
  project: string;
  description: string;
  category: TimeEntry['category'];
  source: 'ai_suggested';
  isAutomatic: boolean;
  meetingType?: TimeEntry['meetingType'];
  tags: string[];
  activity?: string;
}

export interface ContentAnalysisRequest {
  title: string;
  description?: string;
  participants?: string[];
  location?: string;
  source: 'calendar' | 'slack' | 'email' | 'manual';
  timestamp: string;
  context?: {
    projects: Project[];
    clients: Client[];
    recentEntries: TimeEntry[];
  };
}

export interface AIServiceConfig {
  ollamaBaseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  confidenceThreshold: number;
  enabled: boolean;
}

class AIService {
  private config: AIServiceConfig = {
    ollamaBaseUrl: 'http://localhost:11434',
    model: 'llama3.2:latest', // Use the model that's actually available
    maxTokens: 512,
    temperature: 0.1, // Low temperature for consistent business categorization
    confidenceThreshold: 0.7,
    enabled: false
  };

  private isAvailable = false;

  constructor() {
    this.checkOllamaAvailability();
  }

  /**
   * Check if Ollama is running and the model is available
   */
  async checkOllamaAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const hasModel = data.models?.some((model: any) => 
          model.name.includes(this.config.model.split(':')[0])
        );
        
        this.isAvailable = hasModel;
        this.config.enabled = hasModel;
        
        if (hasModel) {
          console.log('✅ Ollama AI service available with model:', this.config.model);
        } else {
          console.log('⚠️ Ollama available but model not found. Install with:', 
            `ollama pull ${this.config.model}`);
        }
        
        return this.isAvailable;
      }
    } catch (error) {
      console.log('ℹ️ Ollama not available. Install from https://ollama.com for AI features.');
      this.isAvailable = false;
      this.config.enabled = false;
    }
    
    return false;
  }

  /**
   * Analyze content and suggest time entry details
   */
  async analyzeContent(request: ContentAnalysisRequest): Promise<AIAnalysisResult> {
    if (!this.isAvailable || !this.config.enabled) {
      return this.fallbackAnalysis(request);
    }

    try {
      const prompt = this.buildAnalysisPrompt(request);
      const response = await this.callOllama(prompt);
      
      return this.parseAnalysisResponse(response, request);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.fallbackAnalysis(request);
    }
  }

  /**
   * Build a structured prompt for time entry analysis
   */
  private buildAnalysisPrompt(request: ContentAnalysisRequest): string {
    const { title, description, participants, location, source, context } = request;
    
    const availableProjects = context?.projects.map(p => 
      `${p.name} (${p.client})`
    ).join(', ') || 'No projects available';
    
    const availableClients = context?.clients.map(c => c.name).join(', ') || 'No clients available';
    
    return `You are an AI assistant helping categorize work activities for time tracking. Analyze the following activity and suggest appropriate categorization.

ACTIVITY TO ANALYZE:
Title: ${title}
Description: ${description || 'No description'}
Participants: ${participants?.join(', ') || 'Not specified'}
Location: ${location || 'Not specified'}
Source: ${source}

AVAILABLE CONTEXT:
Projects: ${availableProjects}
Clients: ${availableClients}

INSTRUCTIONS:
1. Suggest the most appropriate project and client from the available options
2. Determine if this is billable work (client work = billable, internal = non-billable)
3. Categorize as: client, internal, admin, sales, or marketing
4. If it's a meeting, classify type: kickoff, discovery, implementation, support, training, check-in, or escalation
5. Extract relevant tags or keywords
6. Provide your confidence level (0.0 to 1.0)
7. Explain your reasoning briefly

RESPOND IN THIS EXACT JSON FORMAT:
{
  "confidence": 0.85,
  "suggestedProject": "Project Name",
  "suggestedClient": "Client Name",
  "suggestedDescription": "Enhanced description if needed",
  "suggestedCategory": "client",
  "suggestedBillable": true,
  "meetingType": "implementation",
  "tags": ["keyword1", "keyword2"],
  "reasoning": "Brief explanation of categorization logic"
}

Only respond with valid JSON. If uncertain, lower the confidence score.`;
  }

  /**
   * Call Ollama API with the analysis prompt
   */
  private async callOllama(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  /**
   * Parse the LLM response and extract structured data
   */
  private parseAnalysisResponse(response: string, request: ContentAnalysisRequest): AIAnalysisResult {
    try {
      // Extract JSON from response (LLM might add extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and sanitize the response
      return {
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        suggestedProject: this.validateProject(parsed.suggestedProject, request.context?.projects),
        suggestedClient: this.validateClient(parsed.suggestedClient, request.context?.clients),
        suggestedDescription: parsed.suggestedDescription || request.title,
        suggestedCategory: this.validateCategory(parsed.suggestedCategory),
        suggestedBillable: Boolean(parsed.suggestedBillable),
        meetingType: this.validateMeetingType(parsed.meetingType),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        reasoning: parsed.reasoning || 'AI analysis completed'
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.fallbackAnalysis(request);
    }
  }

  /**
   * Validate suggested project against available projects
   */
  private validateProject(suggested: string, projects?: Project[]): string | undefined {
    if (!suggested || !projects) return undefined;
    
    // Exact match
    const exactMatch = projects.find(p => 
      p.name.toLowerCase() === suggested.toLowerCase()
    );
    if (exactMatch) return exactMatch.name;
    
    // Partial match
    const partialMatch = projects.find(p => 
      p.name.toLowerCase().includes(suggested.toLowerCase()) ||
      suggested.toLowerCase().includes(p.name.toLowerCase())
    );
    
    return partialMatch?.name;
  }

  /**
   * Validate suggested client against available clients
   */
  private validateClient(suggested: string, clients?: Client[]): string | undefined {
    if (!suggested || !clients) return undefined;
    
    // Exact match
    const exactMatch = clients.find(c => 
      c.name.toLowerCase() === suggested.toLowerCase()
    );
    if (exactMatch) return exactMatch.name;
    
    // Partial match
    const partialMatch = clients.find(c => 
      c.name.toLowerCase().includes(suggested.toLowerCase()) ||
      suggested.toLowerCase().includes(c.name.toLowerCase())
    );
    
    return partialMatch?.name;
  }

  /**
   * Validate category against allowed values
   */
  private validateCategory(category: string): TimeEntry['category'] {
    const validCategories: TimeEntry['category'][] = ['client', 'internal', 'admin', 'meeting'];
    return validCategories.includes(category as TimeEntry['category']) 
      ? category as TimeEntry['category'] 
      : 'client';
  }

  /**
   * Validate meeting type against allowed values
   */
  private validateMeetingType(meetingType: string): TimeEntry['meetingType'] | undefined {
    if (!meetingType) return undefined;
    
    const validTypes: TimeEntry['meetingType'][] = [
      'kickoff', 'discovery', 'implementation', 'support', 'training', 'check-in', 'escalation'
    ];
    
    return validTypes.includes(meetingType as TimeEntry['meetingType'])
      ? meetingType as TimeEntry['meetingType']
      : undefined;
  }

  /**
   * Fallback analysis when AI is not available
   */
  private fallbackAnalysis(request: ContentAnalysisRequest): AIAnalysisResult {
    // Simple rule-based analysis
    const title = request.title.toLowerCase();
    const description = request.description?.toLowerCase() || '';
    
    let suggestedCategory: TimeEntry['category'] = 'client';
    let suggestedBillable = true;
    let meetingType: TimeEntry['meetingType'] | undefined;
    
    // Simple keyword matching
    if (title.includes('internal') || title.includes('team') || title.includes('standup')) {
      suggestedCategory = 'internal';
      suggestedBillable = false;
    } else if (title.includes('meeting') || title.includes('demo')) {
      suggestedCategory = 'meeting';
    } else if (title.includes('admin') || title.includes('setup') || title.includes('configuration')) {
      suggestedCategory = 'admin';
      suggestedBillable = false;
    }
    
    // Meeting type detection
    if (title.includes('kickoff')) meetingType = 'kickoff';
    else if (title.includes('discovery')) meetingType = 'discovery';
    else if (title.includes('implementation')) meetingType = 'implementation';
    else if (title.includes('support')) meetingType = 'support';
    else if (title.includes('training')) meetingType = 'training';
    else if (title.includes('check-in') || title.includes('checkin')) meetingType = 'check-in';
    
    // Try to match client/project from context
    const suggestedClient = this.findClientByKeywords(title + ' ' + description, request.context?.clients);
    const suggestedProject = this.findProjectByKeywords(title + ' ' + description, request.context?.projects);
    
    return {
      confidence: 0.6, // Lower confidence for rule-based analysis
      suggestedProject,
      suggestedClient,
      suggestedDescription: request.title,
      suggestedCategory,
      suggestedBillable,
      meetingType,
      tags: this.extractKeywords(title + ' ' + description),
      reasoning: 'Rule-based analysis (AI not available)'
    };
  }

  /**
   * Find client by keyword matching
   */
  private findClientByKeywords(text: string, clients?: Client[]): string | undefined {
    if (!clients) return undefined;
    
    return clients.find(client => 
      text.toLowerCase().includes(client.name.toLowerCase())
    )?.name;
  }

  /**
   * Find project by keyword matching
   */
  private findProjectByKeywords(text: string, projects?: Project[]): string | undefined {
    if (!projects) return undefined;
    
    return projects.find(project => 
      text.toLowerCase().includes(project.name.toLowerCase()) ||
      text.toLowerCase().includes(project.client.toLowerCase())
    )?.name;
  }

  /**
   * Extract keywords using simple text processing
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['with', 'from', 'this', 'that', 'will', 'have', 'been', 'they', 'them', 'were'].includes(word));
    
    // Return unique words, max 5
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Update AI service configuration
   */
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.ollamaBaseUrl || newConfig.model) {
      this.checkOllamaAvailability();
    }
  }

  /**
   * Get current service status
   */
  getStatus(): { available: boolean; model: string; enabled: boolean } {
    return {
      available: this.isAvailable,
      model: this.config.model,
      enabled: this.config.enabled
    };
  }

  /**
   * Test the AI service with a sample request
   */
  async testService(): Promise<{ success: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const testRequest: ContentAnalysisRequest = {
        title: 'Team standup meeting',
        description: 'Daily team sync with engineering',
        source: 'calendar',
        timestamp: new Date().toISOString(),
        context: {
          projects: [{ id: '1', name: 'Internal Tools', client: 'Internal', color: '#000', active: true, createdAt: '' }],
          clients: [{ id: '1', name: 'Internal', color: '#000', active: true, createdAt: '', updatedAt: '' }],
          recentEntries: []
        }
      };
      
      const result = await this.analyzeContent(testRequest);
      const latency = Date.now() - startTime;
      
      return {
        success: result.confidence > 0,
        latency
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();