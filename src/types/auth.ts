/**
 * Authentication and Multi-tenant Types
 * Extends the existing TimeBeacon architecture with enterprise features
 */

export interface Company {
  id: string;
  accountId: string; // Numeric ID for URL (e.g., 00001)
  name: string;
  slug: string; // For URL routing (e.g., company.timebeacon.io)
  subscription: Subscription;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
  ownerId: string; // User ID of the company owner
  activeUsers: number;
  maxUsers: number;
}

export interface Subscription {
  id: string;
  companyId: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  pricePerUser: number;
  features: SubscriptionFeatures;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export interface SubscriptionFeatures {
  maxUsers: number;
  aiInsights: boolean;
  advancedReports: boolean;
  integrations: string[]; // ['google-calendar', 'slack', etc.]
  dataRetentionMonths: number;
  apiAccess: boolean;
  ssoEnabled: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

export interface CompanySettings {
  workingHours: {
    start: string;
    end: string;
    timezone: string;
    workingDays: number[]; // 0-6 (Sunday-Saturday)
  };
  billing: {
    currency: 'USD' | 'EUR' | 'GBP';
    invoiceEmail: string;
    billingAddress?: Address;
  };
  branding?: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };
  security: {
    requireMfa: boolean;
    sessionTimeout: number; // minutes
    allowedDomains?: string[]; // Email domains for auto-approval
    passwordPolicy: PasswordPolicy;
  };
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
}

export interface User {
  id: string;
  visitorId: string; // Numeric ID for URL (e.g., 00001)
  email: string;
  name: string;
  companyId: string;
  role: UserRole;
  permissions: Permission[];
  profile: UserProfile;
  settings: UserSettings;
  status: 'active' | 'invited' | 'suspended';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  invitedBy?: string; // User ID
  mfaEnabled: boolean;
  avatar?: string;
}

export type UserRole = 'owner' | 'admin' | 'manager' | 'individual_contributor' | 'employee' | 'viewer';

// Role hierarchy and descriptions
export const ROLE_HIERARCHY: Record<UserRole, { level: number; title: string; description: string }> = {
  owner: {
    level: 100,
    title: 'Owner',
    description: 'Full system access including billing and company management'
  },
  admin: {
    level: 90,
    title: 'Administrator', 
    description: 'User and project management, settings control'
  },
  manager: {
    level: 70,
    title: 'Manager',
    description: 'Team oversight with scoped permissions for team members'
  },
  individual_contributor: {
    level: 50,
    title: 'Individual Contributor',
    description: 'Senior employee with project leadership and limited team visibility'
  },
  employee: {
    level: 30,
    title: 'Employee',
    description: 'Self-service time tracking and basic project access'
  },
  viewer: {
    level: 10,
    title: 'Viewer',
    description: 'Read-only access to own data'
  }
};

export interface Permission {
  id: string;
  resource: PermissionResource;
  actions: PermissionAction[];
  scope?: PermissionScope;
}

export type PermissionResource = 
  | 'company' 
  | 'users' 
  | 'projects' 
  | 'timeEntries' 
  | 'reports' 
  | 'settings' 
  | 'billing' 
  | 'integrations'
  | 'teams'
  | 'clients'
  | 'analytics';

export type PermissionAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'approve' 
  | 'export'
  | 'invite'
  | 'assign'
  | 'review'
  | 'manage';

export interface PermissionScope {
  own?: boolean; // Can only access their own data
  team?: string[]; // Can access specific team members' data
  department?: string[]; // Can access specific departments
  all?: boolean; // Can access all company data
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: string;
  manager?: string; // User ID of manager
  directReports?: string[]; // User IDs of direct reports
  hourlyRate?: number;
  skillTags?: string[];
  accessLevel?: 'basic' | 'elevated' | 'senior';
  startDate?: string;
  phoneNumber?: string;
  location?: string;
  bio?: string;
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

export interface AuthState {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permission[];
}

export interface LoginRequest {
  email: string;
  password: string;
  companySlug?: string; // For multi-tenant routing
  accountId?: string; // Numeric account ID from URL
  visitorId?: string; // Numeric visitor ID from URL
  mfaCode?: string;
}

export interface LoginResponse {
  user: User;
  company: Company;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  companyName: string;
  companySlug: string;
  plan: 'starter' | 'professional' | 'enterprise';
}

export interface InviteUserRequest {
  email: string;
  name: string;
  role: UserRole;
  permissions?: Permission[];
  department?: string;
  manager?: string;
}

export interface TeamMember extends User {
  timeEntries?: TimeEntry[];
  recentActivity?: {
    date: string;
    hoursWorked: number;
    projectsWorked: string[];
  }[];
  performance?: {
    utilizationRate: number;
    averageDailyHours: number;
    projectCount: number;
  };
}

// Role-based permission presets with enhanced granularity
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    { id: 'owner-company', resource: 'company', actions: ['create', 'read', 'update', 'delete', 'manage'], scope: { all: true } },
    { id: 'owner-users', resource: 'users', actions: ['create', 'read', 'update', 'delete', 'invite', 'manage'], scope: { all: true } },
    { id: 'owner-projects', resource: 'projects', actions: ['create', 'read', 'update', 'delete', 'assign', 'manage'], scope: { all: true } },
    { id: 'owner-timeEntries', resource: 'timeEntries', actions: ['create', 'read', 'update', 'delete', 'approve'], scope: { all: true } },
    { id: 'owner-reports', resource: 'reports', actions: ['create', 'read', 'export'], scope: { all: true } },
    { id: 'owner-analytics', resource: 'analytics', actions: ['read', 'export'], scope: { all: true } },
    { id: 'owner-billing', resource: 'billing', actions: ['read', 'update', 'manage'], scope: { all: true } },
    { id: 'owner-settings', resource: 'settings', actions: ['read', 'update', 'manage'], scope: { all: true } },
    { id: 'owner-integrations', resource: 'integrations', actions: ['create', 'read', 'update', 'delete', 'manage'], scope: { all: true } },
    { id: 'owner-teams', resource: 'teams', actions: ['create', 'read', 'update', 'delete', 'manage'], scope: { all: true } },
    { id: 'owner-clients', resource: 'clients', actions: ['create', 'read', 'update', 'delete', 'manage'], scope: { all: true } },
  ],
  admin: [
    { id: 'admin-company', resource: 'company', actions: ['read', 'update'], scope: { all: true } },
    { id: 'admin-users', resource: 'users', actions: ['create', 'read', 'update', 'invite', 'manage'], scope: { all: true } },
    { id: 'admin-projects', resource: 'projects', actions: ['create', 'read', 'update', 'delete', 'assign', 'manage'], scope: { all: true } },
    { id: 'admin-timeEntries', resource: 'timeEntries', actions: ['read', 'update', 'approve'], scope: { all: true } },
    { id: 'admin-reports', resource: 'reports', actions: ['create', 'read', 'export'], scope: { all: true } },
    { id: 'admin-analytics', resource: 'analytics', actions: ['read', 'export'], scope: { all: true } },
    { id: 'admin-settings', resource: 'settings', actions: ['read', 'update'], scope: { all: true } },
    { id: 'admin-integrations', resource: 'integrations', actions: ['create', 'read', 'update', 'delete'], scope: { all: true } },
    { id: 'admin-teams', resource: 'teams', actions: ['create', 'read', 'update', 'delete', 'manage'], scope: { all: true } },
    { id: 'admin-clients', resource: 'clients', actions: ['create', 'read', 'update', 'delete'], scope: { all: true } },
  ],
  manager: [
    { id: 'manager-users', resource: 'users', actions: ['read'], scope: { team: [], department: [] } },
    { id: 'manager-projects', resource: 'projects', actions: ['create', 'read', 'update', 'assign'], scope: { team: [], own: true } },
    { id: 'manager-timeEntries', resource: 'timeEntries', actions: ['read', 'approve', 'review'], scope: { team: [], own: true } },
    { id: 'manager-reports', resource: 'reports', actions: ['read', 'export'], scope: { team: [], own: true } },
    { id: 'manager-analytics', resource: 'analytics', actions: ['read'], scope: { team: [], own: true } },
    { id: 'manager-teams', resource: 'teams', actions: ['read', 'manage'], scope: { team: [] } },
    { id: 'manager-clients', resource: 'clients', actions: ['read', 'update'], scope: { team: [], own: true } },
    { id: 'manager-own', resource: 'timeEntries', actions: ['create', 'read', 'update'], scope: { own: true } },
  ],
  individual_contributor: [
    { id: 'ic-projects', resource: 'projects', actions: ['create', 'read', 'update'], scope: { own: true } },
    { id: 'ic-timeEntries', resource: 'timeEntries', actions: ['create', 'read', 'update'], scope: { own: true } },
    { id: 'ic-reports', resource: 'reports', actions: ['read', 'export'], scope: { own: true } },
    { id: 'ic-analytics', resource: 'analytics', actions: ['read'], scope: { own: true } },
    { id: 'ic-clients', resource: 'clients', actions: ['read', 'update'], scope: { own: true } },
    { id: 'ic-team-visibility', resource: 'users', actions: ['read'], scope: { team: [] } },
    { id: 'ic-project-lead', resource: 'projects', actions: ['assign', 'review'], scope: { own: true } },
  ],
  employee: [
    { id: 'employee-timeEntries', resource: 'timeEntries', actions: ['create', 'read', 'update'], scope: { own: true } },
    { id: 'employee-projects', resource: 'projects', actions: ['read'], scope: { own: true } },
    { id: 'employee-reports', resource: 'reports', actions: ['read'], scope: { own: true } },
    { id: 'employee-clients', resource: 'clients', actions: ['read'], scope: { own: true } },
    { id: 'employee-profile', resource: 'users', actions: ['read', 'update'], scope: { own: true } },
  ],
  viewer: [
    { id: 'viewer-timeEntries', resource: 'timeEntries', actions: ['read'], scope: { own: true } },
    { id: 'viewer-projects', resource: 'projects', actions: ['read'], scope: { own: true } },
    { id: 'viewer-profile', resource: 'users', actions: ['read'], scope: { own: true } },
  ],
};

// Re-export existing types with company context
export interface TimeEntry {
  id: string;
  userId: string; // Added for multi-user support
  companyId: string; // Added for multi-tenant support
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
  approvedBy?: string; // User ID of approver
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  companyId: string; // Added for multi-tenant support
  name: string;
  client: string;
  clientId?: string;
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
  teamMembers?: string[]; // User IDs
  managerId?: string; // User ID of project manager
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
}

export interface Client {
  id: string;
  companyId: string; // Added for multi-tenant support
  name: string;
  color?: string; // Added for compatibility with existing code
  email?: string;
  phone?: string;
  address?: Address;
  contactPerson?: string;
  website?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
}