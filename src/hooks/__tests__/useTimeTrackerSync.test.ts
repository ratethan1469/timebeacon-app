import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeTrackerSync } from '../useTimeTrackerSync';

// Mock the database hook with proper return structure
vi.mock('../useTimeTrackerDB', () => ({
  useTimeTrackerDB: vi.fn(() => ({
    timeEntries: [],
    projects: [],
    clients: [],
    settings: {
      theme: 'light',
      timezone: 'UTC',
      workingHours: {
        start: '09:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5]
      },
      notifications: {
        enableDesktop: true,
        reminderInterval: 60,
        endOfDayReminder: true
      },
      privacy: {
        trackActiveWindow: false,
        trackKeystrokes: false,
        trackMouse: false,
        blurScreenshots: true
      },
      integrations: {}
    },
    isLoading: false,
    error: null,
    addTimeEntry: vi.fn().mockResolvedValue(undefined),
    updateTimeEntry: vi.fn().mockResolvedValue(undefined),
    deleteTimeEntry: vi.fn().mockResolvedValue(undefined),
    addProject: vi.fn().mockResolvedValue(undefined),
    updateProject: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    addClient: vi.fn().mockResolvedValue(undefined),
    updateClient: vi.fn().mockResolvedValue(undefined),
    deleteClient: vi.fn().mockResolvedValue(undefined),
    setSettings: vi.fn().mockResolvedValue(undefined),
    toggleIntegration: vi.fn(),
    exportData: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('useTimeTrackerSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide synchronous interface for time entries', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    expect(result.current.addTimeEntry).toBeDefined();
    expect(result.current.updateTimeEntry).toBeDefined();
    expect(result.current.deleteTimeEntry).toBeDefined();
    expect(typeof result.current.addTimeEntry).toBe('function');
  });

  it('should add time entry synchronously', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    const entryData = {
      date: '2025-01-15',
      startTime: '09:00',
      endTime: '10:00',
      duration: 1,
      client: 'Test Client',
      project: 'Test Project',
      description: 'Test work',
      category: 'client' as const,
      status: 'pending' as const,
      automated: false,
      billable: true
    };

    act(() => {
      const result_entry = result.current.addTimeEntry(entryData);
      expect(result_entry).toHaveProperty('id');
      expect(result_entry.client).toBe('Test Client');
    });
  });

  it('should provide synchronous interface for projects', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    expect(result.current.addProject).toBeDefined();
    expect(result.current.updateProject).toBeDefined();
    expect(result.current.deleteProject).toBeDefined();
  });

  it('should add project synchronously', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    const projectData = {
      name: 'Test Project',
      client: 'Test Client',
      color: '#3b82f6',
      active: true,
      billable: true
    };

    act(() => {
      const result_project = result.current.addProject(projectData);
      expect(result_project).toHaveProperty('id');
      expect(result_project.name).toBe('Test Project');
    });
  });

  it('should provide synchronous interface for clients', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    expect(result.current.addClient).toBeDefined();
    expect(result.current.updateClient).toBeDefined();
    expect(result.current.deleteClient).toBeDefined();
  });

  it('should add client synchronously', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    const clientData = {
      name: 'Test Client',
      color: '#10b981',
      active: true
    };

    act(() => {
      const result_client = result.current.addClient(clientData);
      expect(result_client).toHaveProperty('id');
      expect(result_client.name).toBe('Test Client');
    });
  });

  it('should convert UserSettings to legacy Settings format', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    expect(result.current.settings).toHaveProperty('defaultClients');
    expect(result.current.settings).toHaveProperty('defaultProjects');
    expect(result.current.settings).toHaveProperty('workingHours');
    expect(result.current.settings).toHaveProperty('integrations');
    expect(Array.isArray(result.current.settings.integrations)).toBe(true);
  });

  it('should handle settings updates', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    const newSettings = {
      defaultClients: ['Test Client'],
      defaultProjects: ['Test Project'],
      workingHours: {
        start: '08:00',
        end: '18:00',
        timezone: 'America/New_York'
      },
      billableByDefault: true,
      autoTrackMeetings: true,
      autoTrackSlack: false,
      minimumSessionLength: 15,
      notifications: true,
      autoBreaks: false,
      theme: 'dark' as const,
      emailNotifications: {
        enabled: true,
        dailyReviewTime: '17:00',
        approvalReminders: true,
        weeklyDigest: true,
        email: 'test@example.com'
      },
      integrations: []
    };

    act(() => {
      result.current.setSettings(newSettings);
    });

    // Should not throw errors
    expect(true).toBe(true);
  });

  it('should handle integration toggling', () => {
    const { result } = renderHook(() => useTimeTrackerSync());

    act(() => {
      result.current.toggleIntegration('google-calendar');
    });

    // Should not throw errors
    expect(true).toBe(true);
  });

  it('should expose async data management functions', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    expect(result.current.exportData).toBeDefined();
    expect(result.current.clearAllData).toBeDefined();
    expect(typeof result.current.exportData).toBe('function');
    expect(typeof result.current.clearAllData).toBe('function');
  });

  it('should handle loading and error states', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    expect(result.current.isLoading).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should provide data arrays', () => {
    const { result } = renderHook(() => useTimeTrackerSync());
    
    expect(Array.isArray(result.current.timeEntries)).toBe(true);
    expect(Array.isArray(result.current.projects)).toBe(true);
    expect(Array.isArray(result.current.clients)).toBe(true);
  });
});