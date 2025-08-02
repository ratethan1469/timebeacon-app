export interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  client: string;
  project: string;
  description: string;
  category: 'client' | 'internal' | 'admin' | 'meeting';
  status: 'pending' | 'approved' | 'submitted' | 'rejected';
  automated: boolean;
  source?: 'calendar' | 'slack' | 'manual' | 'zoom' | 'teams' | 'gmail' | 'ai_suggested' | 'imported';
  meetingType?: 'kickoff' | 'discovery' | 'implementation' | 'support' | 'training' | 'check-in' | 'escalation';
  billable: boolean;
  tags?: string[];
  rate?: number;
}


export interface Project {
  id: string;
  name: string;
  client: string; // Client name for compatibility with existing code
  clientId?: string; // Optional for future use
  color: string;
  rate?: number;
  budget?: number;
  description?: string;
  category?: 'implementation' | 'ongoing-support' | 'training' | 'consulting' | 'escalation';
  status?: 'planning' | 'active' | 'on-hold' | 'completed';
  active: boolean;
  billable?: boolean;
  startDate?: string;
  expectedEndDate?: string;
  createdAt: string;
}

export interface DashboardStats {
  todayHours: number;
  weekHours: number;
  monthHours: number;
  billableHours: number;
  nonBillableHours: number;
  pendingEntries: number;
  activeProjects: number;
  totalEarnings: number;
  utilizationRate: number;
  automatedEntries: number;
}

export interface ActiveTimer {
  id: string;
  project: string;
  description: string;
  startTime: string;
  isRunning: boolean;
}

export interface Integration {
  id: string;
  name: 'google-calendar' | 'slack' | 'zoom' | 'teams' | 'gmail' | 'jira' | 'salesforce';
  enabled: boolean;
  connectedAt?: string;
  lastSync?: string;
  settings: Record<string, any>;
}

export interface Settings {
  defaultProjects: string[];
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  billableByDefault: boolean;
  autoTrackMeetings: boolean;
  autoTrackSlack: boolean;
  minimumSessionLength: number; // in minutes
  notifications: boolean;
  autoBreaks: boolean;
  theme: 'light' | 'dark' | 'system';
  profile?: {
    name?: string;
    email?: string;
    company?: string;
    jobTitle?: string;
    phone?: string;
  };
  emailNotifications: {
    enabled: boolean;
    dailyReviewTime: string; // HH:MM format
    approvalReminders: boolean;
    weeklyDigest: boolean;
    email: string;
  };
  integrations: Integration[];
}

// Extended user settings interface for the new database system
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  workingHours: {
    start: string;
    end: string;
    workingDays: number[];
  };
  notifications: {
    enableDesktop: boolean;
    reminderInterval: number;
    endOfDayReminder: boolean;
  };
  privacy: {
    trackActiveWindow: boolean;
    trackKeystrokes: boolean;
    trackMouse: boolean;
    blurScreenshots: boolean;
  };
  integrations: Record<string, {
    enabled: boolean;
    lastSync?: string;
    settings?: Record<string, any>;
  }>;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  contactPerson?: string;
  website?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NavigationItem = 'dashboard' | 'reports' | 'ai-insights' | 'integrations' | 'settings' | 'privacy';