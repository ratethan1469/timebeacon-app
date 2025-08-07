import React, { useState } from 'react';
import { Settings as SettingsType, Project } from '../types';
import { MultiSelect } from './MultiSelect';
import { projectTemplates, ProjectTemplate } from '../data/projectTemplates';
import PermissionsManager from './PermissionsManager';
import { useAuth } from '../contexts/AuthContext';

interface SettingsProps {
  settings: SettingsType;
  projects: Project[];
  onUpdateSettings: (settings: SettingsType) => void;
  onAddProject: (project: Omit<Project, 'id' | 'createdAt'>) => Project;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  projects,
  onUpdateSettings,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
}) => {
  const { checkPermission } = useAuth();
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

  const handleSettingsChange = (updates: Partial<SettingsType>) => {
    onUpdateSettings({ ...settings, ...updates });
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

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      onUpdateProject(editingProject.id, projectForm);
      setEditingProject(null);
    } else {
      onAddProject(projectForm);
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

  const exportToCSV = () => {
    try {
      const timeEntries = JSON.parse(localStorage.getItem('timebeacon_entries_v6') || '[]');
      if (timeEntries.length === 0) {
        alert('No time entries found to export.');
        return;
      }
      
      const csvData = 'Date,Start Time,End Time,Duration (hrs),Project,Client,Description,Billable\n' + 
        timeEntries.map(entry => 
          `"${entry.date}","${entry.startTime}","${entry.endTime}",${entry.duration},"${entry.project}","${entry.client}","${entry.description}",${entry.billable ? 'Yes' : 'No'}`
        ).join('\n');
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `timebeacon-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const exportToPDF = () => {
    alert('PDF export coming soon! For now, please use the CSV export option.');
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">Configure your TimeBeacon preferences</p>
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
                onClick={exportToCSV}
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
                onClick={exportToPDF}
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
        </div>
      )}
    </div>
  );
};