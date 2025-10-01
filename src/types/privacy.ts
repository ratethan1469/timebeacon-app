// Privacy-First Types for TimeBeacon
// CRITICAL: These types enforce that no raw content leaves the device

export interface DataSource {
  id: string;
  name: string;
  type: 'calendar' | 'email' | 'slack' | 'notion' | 'github' | 'jira' | 'linear';
  enabled: boolean;
  permissions: DataSourcePermissions;
  lastAccessed?: string;
  totalAccessCount: number;
  consentGrantedAt: string;
  consentVersion: string;
}

export interface DataSourcePermissions {
  // What types of data can be accessed
  canReadMetadata: boolean;
  canReadContent: boolean;  // Content stays local - only for AI analysis
  canReadAttachments: boolean;
  
  // Time-based permissions
  accessTimeRange?: {
    start: string;  // ISO date
    end: string;    // ISO date
  };
  
  // Content filtering
  allowedProjects?: string[];  // Only track these projects
  allowedClients?: string[];   // Only track these clients
  excludedKeywords?: string[]; // Never analyze content with these keywords
  
  // Privacy controls
  pausedUntil?: string;        // Temporary pause
  requireApproval: boolean;    // User must approve each generated entry
}

export interface LocalContentAnalysis {
  // This data NEVER leaves the device
  sourceId: string;
  contentHash: string;  // For deduplication, not the content itself
  analyzedAt: string;
  
  // AI-generated metadata (local only)
  extractedMetadata: {
    suggestedProject?: string;
    suggestedClient?: string;
    suggestedDescription?: string;
    suggestedDuration?: number;
    suggestedTags?: string[];
    confidenceScore: number;  // 0-1, how confident the AI is
  };
  
  // Privacy audit trail
  dataAccessed: {
    timestamp: string;
    source: string;
    dataType: 'metadata' | 'content' | 'attachment';
    itemCount: number;
    wasProcessed: boolean;
    processingDuration: number; // milliseconds
  }[];
}

export interface PrivacyAuditLog {
  id: string;
  timestamp: string;
  action: 'data_access' | 'content_analysis' | 'entry_generation' | 'data_export' | 'consent_change';
  source: DataSource['type'];
  
  details: {
    itemsAccessed?: number;
    itemsAnalyzed?: number;
    entriesGenerated?: number;
    dataTypesAccessed?: string[];
    processingTimeMs?: number;
    userApprovalRequired?: boolean;
    userApproved?: boolean;
  };
  
  // Privacy compliance
  consentVersion: string;
  dataRetention: {
    retainUntil: string;
    autoDeleteEnabled: boolean;
  };
}

export interface EncryptedLocalStorage {
  // All sensitive data is encrypted at rest
  encryptionKey: string;  // Derived from user's master key
  encryptedData: {
    contentAnalyses: string;     // Encrypted LocalContentAnalysis[]
    auditLogs: string;          // Encrypted PrivacyAuditLog[]
    userPreferences: string;    // Encrypted user settings
  };
  
  // Non-sensitive metadata (can be unencrypted)
  version: string;
  lastSync: string;
  backupEnabled: boolean;
}

export interface UserPrivacySettings {
  // Master privacy controls
  dataProcessingEnabled: boolean;
  
  // Retention policies
  auditLogRetentionDays: number;
  contentAnalysisRetentionDays: number;
  autoDeleteOldData: boolean;
  
  // AI processing controls
  aiAnalysisEnabled: boolean;
  maxConfidenceThreshold: number;  // Only suggest entries above this confidence
  requireManualApproval: boolean;  // All AI suggestions need approval
  
  // Transparency settings
  showDetailedAuditLogs: boolean;
  notifyOnDataAccess: boolean;
  exportFormat: 'json' | 'csv' | 'both';
  
  // Emergency controls
  masterPauseEnabled: boolean;    // One-click pause all tracking
  emergencyWipeEnabled: boolean;  // One-click delete all data
}

export interface SuggestedTimeEntry {
  // AI-generated time entry suggestion (user must approve)
  id: string;
  generatedAt: string;
  source: DataSource['type'];
  confidence: number;  // 0-1
  
  // Suggested entry data
  suggestedDate: string;
  suggestedStartTime: string;
  suggestedDuration: number;
  suggestedProject: string;
  suggestedClient: string;
  suggestedDescription: string;
  suggestedTags: string[];
  activity?: string; // Added for compatibility with existing code
  
  // Privacy metadata
  basedOnDataFrom: string[];  // Which sources informed this suggestion
  analysisId: string;         // Links to LocalContentAnalysis
  
  // User control
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  userModifications?: Partial<TimeEntry>;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

// Main TimeEntry type (updated to include privacy metadata)
export interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  
  // Core entry data
  client: string;
  project: string;
  description: string;
  category: 'client' | 'internal' | 'meeting' | 'admin';
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  billable: boolean;
  
  // Source tracking (privacy-safe)
  source: 'manual' | 'ai_suggested' | 'imported';
  automated: boolean;
  
  // Privacy metadata
  generatedFromSuggestion?: string;  // SuggestedTimeEntry ID
  aiConfidence?: number;             // Original AI confidence if applicable
  dataSourcesUsed?: DataSource['type'][];  // Which sources informed this entry
  
  // Optional metadata
  tags?: string[];
  meetingType?: 'kickoff' | 'discovery' | 'implementation' | 'support' | 'training' | 'check-in' | 'escalation';
  rate?: number;
}

// Privacy-safe API types (what can be sent to backend)
export interface PrivacySafeMetadata {
  // Only aggregated, anonymized metadata
  totalEntriesGenerated: number;
  averageConfidenceScore: number;
  dataSourcesEnabled: DataSource['type'][];
  retentionPolicyDays: number;
  
  // No raw content, no specific timestamps, no identifiable data
  weeklyStats: {
    week: string;  // Week of year, not specific dates
    entriesGenerated: number;
    hoursTracked: number;
    approvalRate: number;  // % of AI suggestions approved
  }[];
}