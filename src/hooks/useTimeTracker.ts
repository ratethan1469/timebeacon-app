import { useState, useEffect } from 'react';
import { TimeEntry, Project, Client, ActiveTimer, Settings, DashboardStats } from '../types';
import { mockTimeEntries, mockProjects, mockSettings } from '../mockData';

const STORAGE_KEYS = {
  TIME_ENTRIES: 'timebeacon_entries_v6',
  PROJECTS: 'timebeacon_projects_v6',
  CLIENTS: 'timebeacon_clients_v6',
  SETTINGS: 'timebeacon_settings_v6',
  ACTIVE_TIMER: 'timebeacon_active_timer_v6',
};

export const useTimeTracker = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<Settings>(mockSettings);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load data from localStorage on mount
  useEffect(() => {
    const savedEntries = localStorage.getItem(STORAGE_KEYS.TIME_ENTRIES);
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const savedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const savedTimer = localStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER);

    const entries = savedEntries ? JSON.parse(savedEntries) : mockTimeEntries;
    const projects = savedProjects ? JSON.parse(savedProjects) : mockProjects;
    const clients = savedClients ? JSON.parse(savedClients) : [];
    
    // Handle settings with backward compatibility
    let settings = mockSettings;
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      settings = {
        ...mockSettings,
        ...parsedSettings,
        // Ensure emailNotifications exists with defaults
        emailNotifications: {
          ...mockSettings.emailNotifications,
          ...(parsedSettings.emailNotifications || {})
        },
        // Ensure arrays exist for new multi-select fields
        defaultClients: parsedSettings.defaultClients || [parsedSettings.defaultClient].filter(Boolean) || mockSettings.defaultClients,
        defaultProjects: parsedSettings.defaultProjects || [parsedSettings.defaultProject].filter(Boolean) || mockSettings.defaultProjects
      };
    }
    
    setTimeEntries(entries);
    setProjects(projects);
    setClients(clients);
    setSettings(settings);
    setActiveTimer(savedTimer ? JSON.parse(savedTimer) : null);
  }, []);

  // Update current time every second for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TIME_ENTRIES, JSON.stringify(timeEntries));
  }, [timeEntries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify(activeTimer));
  }, [activeTimer]);

  // Timer functions
  const startTimer = (client: string, project: string, description: string) => {
    const timer: ActiveTimer = {
      id: Date.now().toString(),
      client,
      project,
      description,
      startTime: new Date().toISOString(),
      isRunning: true,
    };
    setActiveTimer(timer);
  };

  const stopTimer = () => {
    if (!activeTimer) return null;

    const endTime = new Date();
    const startTime = new Date(activeTimer.startTime);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours

    // Find the client for this project
    const project = projects.find(p => p.name === activeTimer.project);
    const client = project ? clients.find(c => c.id === project.clientId) : null;

    const entry: TimeEntry = {
      id: Date.now().toString(),
      date: endTime.toISOString().split('T')[0],
      startTime: startTime.toTimeString().slice(0, 5),
      endTime: endTime.toTimeString().slice(0, 5),
      duration: Math.round(duration * 100) / 100,
      client: client?.name || 'Unknown Client',
      project: activeTimer.project,
      description: activeTimer.description,
      category: 'client',
      status: 'pending',
      automated: false,
      billable: settings.billableByDefault,
    };

    setTimeEntries(prev => [entry, ...prev]);
    setActiveTimer(null);
    return entry;
  };

  const pauseTimer = () => {
    if (activeTimer) {
      setActiveTimer({ ...activeTimer, isRunning: false });
    }
  };

  const resumeTimer = () => {
    if (activeTimer) {
      setActiveTimer({ ...activeTimer, isRunning: true });
    }
  };

  // Time entry functions
  const addTimeEntry = (entry: Omit<TimeEntry, 'id'>) => {
    const newEntry: TimeEntry = {
      ...entry,
      id: Date.now().toString(),
      automated: false,
      billable: entry.billable ?? settings.billableByDefault,
    };
    setTimeEntries(prev => [newEntry, ...prev]);
    return newEntry;
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries(prev =>
      prev.map(entry => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const deleteTimeEntry = (id: string) => {
    setTimeEntries(prev => prev.filter(entry => entry.id !== id));
  };

  // Client functions
  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...client,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev =>
      prev.map(client => (client.id === id ? { ...client, ...updates } : client))
    );
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(client => client.id !== id));
  };

  // Project functions
  const addProject = (project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(project => (project.id === id ? { ...project, ...updates } : project))
    );
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(project => project.id !== id));
  };

  // Statistics calculations
  const getDashboardStats = (): DashboardStats => {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayEntries = timeEntries.filter(entry => entry.date === today);
    const weekEntries = timeEntries.filter(entry => entry.date >= oneWeekAgo);
    const monthEntries = timeEntries.filter(entry => entry.date >= oneMonthAgo);

    const todayHours = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const weekHours = weekEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const monthHours = monthEntries.reduce((sum, entry) => sum + entry.duration, 0);

    const billableHours = monthEntries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + entry.duration, 0);
    const nonBillableHours = monthHours - billableHours;

    const pendingEntries = timeEntries.filter(entry => entry.status === 'pending').length;
    const totalClients = clients.filter(client => client.active).length;
    const activeProjects = projects.filter(project => project.active).length;
    const automatedEntries = timeEntries.filter(entry => entry.automated).length;

    const totalEarnings = 0; // Removed earnings calculation - focusing on utilization instead

    const utilizationRate = monthHours > 0 ? (billableHours / monthHours) * 100 : 0;

    return {
      todayHours: Math.round(todayHours * 100) / 100,
      weekHours: Math.round(weekHours * 100) / 100,
      monthHours: Math.round(monthHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      nonBillableHours: Math.round(nonBillableHours * 100) / 100,
      pendingEntries,
      totalClients,
      activeProjects,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      automatedEntries,
    };
  };

  const getActiveTimerDuration = (): number => {
    if (!activeTimer || !activeTimer.isRunning) return 0;
    const start = new Date(activeTimer.startTime);
    const duration = (currentTime.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(0, duration);
  };

  // Integration functions
  const toggleIntegration = (integrationId: string) => {
    setSettings(prev => ({
      ...prev,
      integrations: prev.integrations.map(integration =>
        integration.id === integrationId
          ? { ...integration, enabled: !integration.enabled }
          : integration
      )
    }));
  };

  return {
    // State
    timeEntries,
    projects,
    clients,
    settings,
    activeTimer,
    currentTime,
    
    // Timer functions
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    getActiveTimerDuration,
    
    // Time entry functions
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    
    // Client functions
    addClient,
    updateClient,
    deleteClient,
    
    // Project functions
    addProject,
    updateProject,
    deleteProject,
    
    // Settings
    setSettings,
    
    // Integration functions
    toggleIntegration,
    
    // Statistics
    getDashboardStats,
  };
};