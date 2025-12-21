import React, { useState, useEffect } from 'react';
import { Settings as SettingsType, Project } from '../types';
import PermissionsManager from './PermissionsManager';
import { useUser } from '@clerk/clerk-react';

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
  const { user } = useUser();
  const userRole = user?.publicMetadata?.role as string | undefined;

  const checkPermission = (resource: string, action: string): boolean => {
    if (!userRole) return false;
    if (userRole === 'owner' || userRole === 'admin') return true;
    if (userRole === 'manager' && resource === 'users' && action === 'read') return true;
    return false;
  };

  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general');
  const [showProjectForm, setShowProjectForm] = useState(false);
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

  // Local state for immediate UI updates
  const [localSettings, setLocalSettings] = useState(settings);
  
  // Sync localSettings when settings prop changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  const handleSettingsChange = (updates: Partial<SettingsType>) => {
    try {
      // First update local state for immediate UI response
      const updatedSettings = { ...localSettings, ...updates };
      setLocalSettings(updatedSettings);
      
      // Then call the parent update
      onUpdateSettings(updatedSettings);
      
      console.log('✅ Settings saved:', Object.keys(updates));
    } catch (error) {
      console.error('❌ Failed to update settings:', error);
    }
  };

  // Ensure emailNotifications is always defined with defaults
  const safeEmailNotifications = localSettings.emailNotifications || {
    enabled: false,
    dailyReviewTime: '17:30',
    approvalReminders: true,
    weeklyDigest: true,
    email: ''
  };


  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProject) {
        onUpdateProject(editingProject.id, projectForm);
        setEditingProject(null);
        console.log('Project updated:', projectForm.name);
      } else {
        const newProject = onAddProject(projectForm);
        console.log('Project added:', newProject.name);
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


  const exportToCSV = () => {
    try {
      const timeEntries = JSON.parse(localStorage.getItem('timebeacon_entries_v6') || '[]');
      if (timeEntries.length === 0) {
        alert('No time entries found to export. Start tracking time first!');
        return;
      }
      
      const csvData = 'Date,Start Time,End Time,Duration (hrs),Project,Client,Description,Billable,Status\n' + 
        timeEntries.map(entry => 
          `"${entry.date}","${entry.startTime}","${entry.endTime}",${entry.duration},"${entry.project}","${entry.client}","${entry.description}",${entry.billable ? 'Yes' : 'No'},"${entry.status || 'completed'}"`
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
      
      console.log(`Successfully exported ${timeEntries.length} time entries`);
      alert(`Successfully exported ${timeEntries.length} time entries!`);
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
                  value={localSettings.profile?.name || ''}
                  onChange={(e) => {
                    const updatedProfile = { ...(localSettings.profile || {}), name: e.target.value };
                    handleSettingsChange({ profile: updatedProfile });
                  }}
                  className="form-input"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={localSettings.profile?.email || ''}
                  onChange={(e) => {
                    const updatedProfile = { ...(localSettings.profile || {}), email: e.target.value };
                    handleSettingsChange({ profile: updatedProfile });
                  }}
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
                  value={localSettings.profile?.company || ''}
                  onChange={(e) => {
                    const updatedProfile = { ...(localSettings.profile || {}), company: e.target.value };
                    handleSettingsChange({ profile: updatedProfile });
                  }}
                  className="form-input"
                  placeholder="Enter your company name"
                />
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  value={localSettings.profile?.jobTitle || ''}
                  onChange={(e) => {
                    const updatedProfile = { ...(localSettings.profile || {}), jobTitle: e.target.value };
                    handleSettingsChange({ profile: updatedProfile });
                  }}
                  className="form-input"
                  placeholder="Enter your job title"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={localSettings.profile?.phone || ''}
                onChange={(e) => {
                  const updatedProfile = { ...(localSettings.profile || {}), phone: e.target.value };
                  handleSettingsChange({ profile: updatedProfile });
                }}
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
                  value={localSettings.workingHours?.timezone || 'America/New_York'}
                  onChange={(e) => handleSettingsChange({ 
                    workingHours: { ...localSettings.workingHours, timezone: e.target.value }
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
                  value={localSettings.workingHours?.start || '09:00'}
                  onChange={(e) => handleSettingsChange({ 
                    workingHours: { ...localSettings.workingHours, start: e.target.value }
                  })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Work End Time</label>
                <input
                  type="time"
                  value={localSettings.workingHours?.end || '17:00'}
                  onChange={(e) => handleSettingsChange({ 
                    workingHours: { ...localSettings.workingHours, end: e.target.value }
                  })}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={localSettings.notifications || false}
                  onChange={(e) => handleSettingsChange({ notifications: e.target.checked })}
                />
                <span>Enable browser notifications</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={localSettings.autoBreaks || false}
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

        {/* Project Management */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Project Management</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Your Projects ({projects.length})</h3>
              <button 
                className="btn btn-primary"
                onClick={() => setShowProjectForm(true)}
              >
                ➕ Add New Project
              </button>
            </div>
            
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-600)' }}>
                <p>No projects yet. Create your first project to get started!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {projects.map(project => (
                  <div 
                    key={project.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      backgroundColor: project.active ? 'white' : 'var(--gray-50)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: project.color
                        }}
                      />
                      <div>
                        <h4 style={{ margin: 0, fontWeight: '600' }}>{project.name}</h4>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
                          {project.client} 
                          {project.rate && ` • $${project.rate}/hr`}
                          {!project.active && ' • Inactive'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEditProject(project)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
                            onDeleteProject(project.id);
                          }
                        }}
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
              <h3 style={{ marginTop: 0 }}>
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </h3>
              
              <form onSubmit={handleProjectSubmit}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="form-group">
                    <label>Project Name</label>
                    <input
                      type="text"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                      className="form-input"
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
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Hourly Rate</label>
                    <input
                      type="number"
                      value={projectForm.rate}
                      onChange={(e) => setProjectForm({...projectForm, rate: Number(e.target.value)})}
                      className="form-input"
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
                      style={{ height: '40px' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={projectForm.active}
                        onChange={(e) => setProjectForm({...projectForm, active: e.target.checked})}
                      />
                      Active Project
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={projectForm.billable}
                        onChange={(e) => setProjectForm({...projectForm, billable: e.target.checked})}
                      />
                      Billable
                    </label>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowProjectForm(false);
                      setEditingProject(null);
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {editingProject ? 'Update Project' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
};