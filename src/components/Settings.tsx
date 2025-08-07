import React, { useState, useEffect } from 'react';
import { Settings as SettingsType, Project } from '../types';
import { MultiSelect } from './MultiSelect';
import { projectTemplates, ProjectTemplate } from '../data/projectTemplates';
import PermissionsManager from './PermissionsManager';
import { useAuth } from '../contexts/AuthContext';
import { useTimeTracker } from '../hooks/useTimeTracker';

interface SettingsProps {
  // Keep for compatibility, but we'll use the DB hook internally
  settings?: SettingsType;
  projects?: Project[];
  onUpdateSettings?: (settings: SettingsType) => void;
  onAddProject?: (project: Omit<Project, 'id' | 'createdAt'>) => Project;
  onUpdateProject?: (id: string, updates: Partial<Project>) => void;
  onDeleteProject?: (id: string) => void;
}

export const Settings: React.FC<SettingsProps> = (props) => {
  const { checkPermission } = useAuth();
  const {
    settings,
    projects,
    updateSettings,
    addProject,
    updateProject,
    deleteProject
  } = useTimeTracker();
  
  // Settings should always be available with useTimeTracker
  if (!settings) {
    console.error('Settings not loaded from useTimeTracker');
    return <div>Error loading settings. Please refresh the page.</div>;
  }
  
  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    client: '',
    description: '',
    rate: 0,
    color: '#3b82f6',
    active: true,
    billable: true,
    clientId: '',
    category: 'implementation' as Project['category'],
    status: 'planning' as Project['status'],
    startDate: new Date().toISOString().split('T')[0]
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const handleSettingsChange = async (updates: Partial<SettingsType>) => {
    try {
      setSaveStatus('saving');
      const updatedSettings = {
        ...settings,
        ...updates,
        // Ensure nested objects are properly merged
        profile: {
          ...settings.profile,
          ...(updates.profile || {})
        },
        workingHours: {
          ...settings.workingHours,
          ...(updates.workingHours || {})
        },
        emailNotifications: {
          ...settings.emailNotifications,
          ...(updates.emailNotifications || {})
        }
      };
      
      updateSettings(updatedSettings);
      setSaveStatus('saved');
      
      // Clear saved status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Ensure emailNotifications is always defined with defaults
  const safeEmailNotifications = settings.emailNotifications || {
    enabled: false,
    dailyReviewTime: '17:30',
    approvalReminders: true,
    weeklyDigest: true,
    email: ''
  };

  // Ensure defaultProjects is an array
  const safeDefaultProjects = Array.isArray(settings.defaultProjects) ? settings.defaultProjects : [];

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      if (editingProject) {
        await updateProject(editingProject.id, projectForm);
        setEditingProject(null);
      } else {
        await addProject(projectForm);
      }
      setProjectForm({
        name: '',
        client: '',
        description: '',
        rate: 0,
        color: '#3b82f6',
        active: true,
        billable: true,
        clientId: '',
        category: 'implementation',
        status: 'planning',
        startDate: new Date().toISOString().split('T')[0]
      });
      setShowProjectForm(false);
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      client: project.client,
      description: project.description || '',
      rate: project.rate || 0,
      color: project.color,
      active: project.active,
      billable: project.billable || true,
      clientId: project.clientId || '',
      category: project.category || 'implementation',
      status: project.status || 'planning',
      startDate: project.startDate || new Date().toISOString().split('T')[0]
    });
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        await deleteProject(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Failed to delete project. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUseTemplate = (template: ProjectTemplate) => {
    setProjectForm({
      name: template.name,
      client: template.client,
      description: template.description,
      rate: template.estimatedRate,
      color: template.color,
      active: true,
      billable: true,
      clientId: '',
      category: template.category,
      status: 'planning',
      startDate: new Date().toISOString().split('T')[0]
    });
    setShowTemplates(false);
    setShowProjectForm(true);
  };

  const handleExportToCSV = async () => {
    try {
      setIsLoading(true);
      // Temporary placeholder - will implement real export later
      const timeEntries = JSON.parse(localStorage.getItem('timebeacon_entries_v6') || '[]');
      const csvData = 'Date,Start,End,Duration,Project,Client,Description\n' + 
        timeEntries.map(entry => 
          `${entry.date},${entry.startTime},${entry.endTime},${entry.duration},${entry.project},${entry.client},"${entry.description}"`
        ).join('\n');
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `timebeacon-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('CSV exported successfully!');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToPDF = async () => {
    alert('PDF export coming soon! For now, use the CSV export.');
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">Configure your TimeBeacon preferences</p>
        
        {/* Save Status Indicator */}
        {saveStatus !== 'idle' && (
          <div className={`settings-status ${saveStatus}`} style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: saveStatus === 'saved' ? '#10b981' : 
                            saveStatus === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white'
          }}>
            {saveStatus === 'saving' && '💾 Saving...'}
            {saveStatus === 'saved' && '✅ Settings saved!'}
            {saveStatus === 'error' && '❌ Save failed'}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--gray-200)', 
        marginBottom: '24px',
        backgroundColor: 'white',
        borderRadius: '8px 8px 0 0',
        padding: '0 24px'
      }}>
        <button
          onClick={() => setActiveTab('general')}
          style={{
            padding: '16px 24px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            borderBottom: activeTab === 'general' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'general' ? 'var(--primary-color)' : 'var(--gray-600)',
            fontWeight: activeTab === 'general' ? '600' : '400',
            fontSize: '16px'
          }}
        >
          General Settings
        </button>
        
        {checkPermission('users', 'read') && (
          <button
            onClick={() => setActiveTab('permissions')}
            style={{
              padding: '16px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderBottom: activeTab === 'permissions' ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === 'permissions' ? 'var(--primary-color)' : 'var(--gray-600)',
              fontWeight: activeTab === 'permissions' ? '600' : '400',
              fontSize: '16px'
            }}
          >
            Team & Permissions
          </button>
        )}
      </div>

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <PermissionsManager isVisible={true} />
      )}

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div style={{ display: 'grid', gap: '24px' }}>
        {/* Profile Settings */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Profile Settings</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={settings.profile?.name || ''}
                  onChange={(e) => handleSettingsChange({ 
                    profile: { ...settings.profile, name: e.target.value }
                  })}
                  className="form-input"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={settings.profile?.email || ''}
                  onChange={(e) => handleSettingsChange({ 
                    profile: { ...settings.profile, email: e.target.value }
                  })}
                  className="form-input"
                  placeholder="Enter your email address"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={settings.profile?.company || ''}
                  onChange={(e) => handleSettingsChange({ 
                    profile: { ...settings.profile, company: e.target.value }
                  })}
                  className="form-input"
                  placeholder="Enter your company name"
                />
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  value={settings.profile?.jobTitle || ''}
                  onChange={(e) => handleSettingsChange({ 
                    profile: { ...settings.profile, jobTitle: e.target.value }
                  })}
                  className="form-input"
                  placeholder="Enter your job title"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={settings.profile?.phone || ''}
                onChange={(e) => handleSettingsChange({ 
                  profile: { ...settings.profile, phone: e.target.value }
                })}
                className="form-input"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">General Settings</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div className="form-row">
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Timezone</label>
                <select
                  value={settings.workingHours.timezone}
                  onChange={(e) => handleSettingsChange({ 
                    workingHours: { ...settings.workingHours, timezone: e.target.value }
                  })}
                  className="form-input"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div className="form-group">
                {/* Empty space for layout balance */}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Work Start Time</label>
                <input
                  type="time"
                  value={settings.workingHours.start}
                  onChange={(e) => handleSettingsChange({ 
                    workingHours: { ...settings.workingHours, start: e.target.value }
                  })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Work End Time</label>
                <input
                  type="time"
                  value={settings.workingHours.end}
                  onChange={(e) => handleSettingsChange({ 
                    workingHours: { ...settings.workingHours, end: e.target.value }
                  })}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={settings.notifications}
                  onChange={(e) => handleSettingsChange({ notifications: e.target.checked })}
                />
                <span>Enable browser notifications</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={settings.autoBreaks}
                  onChange={(e) => handleSettingsChange({ autoBreaks: e.target.checked })}
                />
                <span>Enable automatic break detection</span>
              </label>
            </div>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Email Notifications</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  checked={safeEmailNotifications.enabled}
                  onChange={(e) => handleSettingsChange({ 
                    emailNotifications: { 
                      ...safeEmailNotifications, 
                      enabled: e.target.checked 
                    }
                  })}
                />
                <span>Enable email notifications</span>
              </label>
            </div>

            {safeEmailNotifications.enabled && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={safeEmailNotifications.email}
                      onChange={(e) => handleSettingsChange({ 
                        emailNotifications: { 
                          ...safeEmailNotifications, 
                          email: e.target.value 
                        }
                      })}
                      className="form-input"
                      placeholder="your.email@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Daily Review Time</label>
                    <input
                      type="time"
                      value={safeEmailNotifications.dailyReviewTime}
                      onChange={(e) => handleSettingsChange({ 
                        emailNotifications: { 
                          ...safeEmailNotifications, 
                          dailyReviewTime: e.target.value 
                        }
                      })}
                      className="form-input"
                    />
                    <small style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                      When to send daily timesheet review reminders
                    </small>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={safeEmailNotifications.approvalReminders}
                      onChange={(e) => handleSettingsChange({ 
                        emailNotifications: { 
                          ...safeEmailNotifications, 
                          approvalReminders: e.target.checked 
                        }
                      })}
                    />
                    <span>Send approval reminders</span>
                  </label>
                  <small style={{ color: 'var(--gray-600)', fontSize: '12px', marginLeft: '28px' }}>
                    Get notified about pending time entries awaiting approval
                  </small>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', marginBottom: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={safeEmailNotifications.weeklyDigest}
                      onChange={(e) => handleSettingsChange({ 
                        emailNotifications: { 
                          ...safeEmailNotifications, 
                          weeklyDigest: e.target.checked 
                        }
                      })}
                    />
                    <span>Weekly utilization digest</span>
                  </label>
                  <small style={{ color: 'var(--gray-600)', fontSize: '12px', marginLeft: '28px' }}>
                    Weekly summary of hours logged and utilization rate progress
                  </small>
                </div>
              </>
            )}
          </div>
        </div>


        {/* Export & Integration */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Export & Integration</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <button 
                className="btn btn-secondary"
                style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={handleExportToCSV}
                disabled={isLoading}
              >
                <div style={{ fontSize: '32px' }}>📊</div>
                <div style={{ fontWeight: '600' }}>Export to CSV</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                  Download all time entries
                </div>
              </button>
              
              <button 
                className="btn btn-secondary"
                style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={handleExportToPDF}
                disabled={isLoading}
              >
                <div style={{ fontSize: '32px' }}>📄</div>
                <div style={{ fontWeight: '600' }}>Generate PDF Report</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                  Detailed timesheet report
                </div>
              </button>
              
              <button 
                className="btn btn-secondary"
                style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => window.location.href = '/integrations'}
              >
                <div style={{ fontSize: '32px' }}>🔗</div>
                <div style={{ fontWeight: '600' }}>Integrations</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                  Connect to external tools
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Project Management */}
        <div className="content-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="card-title">Project Management</h2>
              <p style={{ color: 'var(--gray-600)', fontSize: '14px', margin: '4px 0 0 0' }}>
                Manage your projects and time tracking templates
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowTemplates(true)}
                disabled={isLoading}
              >
                📋 Use Template
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setShowProjectForm(true)}
                disabled={isLoading}
              >
                ➕ Add Project
              </button>
            </div>
          </div>
          <div style={{ padding: '24px' }}>
            {projects.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: 'var(--gray-600)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                <h3 style={{ margin: '0 0 8px 0' }}>No Projects Yet</h3>
                <p style={{ margin: '0 0 20px 0' }}>Create your first project to start tracking time more efficiently.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowProjectForm(true)}
                >
                  Create First Project
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {projects.map(project => (
                  <div 
                    key={project.id} 
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div 
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: project.color
                        }}
                      />
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontWeight: '600' }}>{project.name}</h4>
                        <p style={{ margin: '0', color: 'var(--gray-600)', fontSize: '14px' }}>
                          {project.client} • {project.category} • {project.billable ? 'Billable' : 'Non-billable'}
                          {project.rate && ` • $${project.rate}/hr`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span 
                        className={`status-badge ${project.active ? 'active' : 'inactive'}`}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: project.active ? '#dcfce7' : '#f3f4f6',
                          color: project.active ? '#166534' : '#6b7280'
                        }}
                      >
                        {project.active ? 'Active' : 'Inactive'}
                      </span>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEditProject(project)}
                        disabled={isLoading}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteProject(project.id)}
                        disabled={isLoading}
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '12px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Project Form Modal */}
      {showProjectForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </h3>
              <button 
                onClick={() => {
                  setShowProjectForm(false);
                  setEditingProject(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--gray-500)'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleProjectSubmit} style={{ display: 'grid', gap: '16px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    className="form-input"
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Client</label>
                  <input
                    type="text"
                    value={projectForm.client}
                    onChange={(e) => setProjectForm({...projectForm, client: e.target.value})}
                    className="form-input"
                    placeholder="Enter client name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                  className="form-input"
                  placeholder="Project description (optional)"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hourly Rate</label>
                  <input
                    type="number"
                    value={projectForm.rate}
                    onChange={(e) => setProjectForm({...projectForm, rate: Number(e.target.value)})}
                    className="form-input"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Project Color</label>
                  <input
                    type="color"
                    value={projectForm.color}
                    onChange={(e) => setProjectForm({...projectForm, color: e.target.value})}
                    className="form-input"
                    style={{ height: '42px' }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={projectForm.category}
                    onChange={(e) => setProjectForm({...projectForm, category: e.target.value as Project['category']})}
                    className="form-input"
                  >
                    <option value="implementation">Implementation</option>
                    <option value="ongoing-support">Ongoing Support</option>
                    <option value="training">Training</option>
                    <option value="consulting">Consulting</option>
                    <option value="escalation">Escalation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({...projectForm, status: e.target.value as Project['status']})}
                    className="form-input"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={projectForm.active}
                    onChange={(e) => setProjectForm({...projectForm, active: e.target.checked})}
                  />
                  <span>Active Project</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={projectForm.billable}
                    onChange={(e) => setProjectForm({...projectForm, billable: e.target.checked})}
                  />
                  <span>Billable</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowProjectForm(false);
                    setEditingProject(null);
                  }}
                  disabled={isLoading}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                  style={{ flex: 1 }}
                >
                  {isLoading ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Choose Project Template
              </h3>
              <button 
                onClick={() => setShowTemplates(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--gray-500)'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {projectTemplates.map(template => (
                <div 
                  key={template.id}
                  style={{
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    ':hover': {
                      borderColor: 'var(--primary-color)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                  onClick={() => handleUseTemplate(template)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div 
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: template.color
                      }}
                    />
                    <h4 style={{ margin: 0, fontWeight: '600' }}>{template.name}</h4>
                  </div>
                  <p style={{ margin: '0 0 12px 0', color: 'var(--gray-600)', fontSize: '14px' }}>
                    {template.description}
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                    {template.client} • ${template.estimatedRate}/hr • {template.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};