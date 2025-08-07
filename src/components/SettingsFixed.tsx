import React, { useState, useEffect } from 'react';

export const SettingsFixed: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    jobTitle: '',
    phone: '',
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/New_York',
    notifications: false,
    autoBreaks: false,
    emailNotifications: false,
    slackIntegration: false,
  });

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('timebeacon_settings_v6');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setFormData({
          name: settings.profile?.name || '',
          email: settings.profile?.email || '',
          company: settings.profile?.company || '',
          jobTitle: settings.profile?.jobTitle || '',
          phone: settings.profile?.phone || '',
          startTime: settings.workingHours?.start || '09:00',
          endTime: settings.workingHours?.end || '17:00',
          timezone: settings.workingHours?.timezone || 'America/New_York',
          notifications: settings.notifications || false,
          autoBreaks: settings.autoBreaks || false,
          emailNotifications: settings.emailNotifications?.enabled || false,
          slackIntegration: settings.integrations?.some(i => i.name === 'slack' && i.enabled) || false,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  const handleInputChange = (field: string, value: any) => {
    // Update local state immediately
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Save to localStorage
    try {
      const currentSettings = JSON.parse(localStorage.getItem('timebeacon_settings_v6') || '{}');
      
      // Update the appropriate nested field
      if (['name', 'email', 'company', 'jobTitle', 'phone'].includes(field)) {
        currentSettings.profile = { ...currentSettings.profile, [field]: value };
      } else if (['startTime', 'endTime', 'timezone'].includes(field)) {
        const workingHoursField = field === 'startTime' ? 'start' : field === 'endTime' ? 'end' : field;
        currentSettings.workingHours = { ...currentSettings.workingHours, [workingHoursField]: value };
      } else if (field === 'emailNotifications') {
        currentSettings.emailNotifications = { ...currentSettings.emailNotifications, enabled: value };
      } else if (field === 'slackIntegration') {
        const integrations = currentSettings.integrations || [];
        const slackIndex = integrations.findIndex(i => i.name === 'slack');
        if (slackIndex >= 0) {
          integrations[slackIndex].enabled = value;
        } else {
          integrations.push({ id: 'slack', name: 'slack', enabled: value, settings: {} });
        }
        currentSettings.integrations = integrations;
      } else {
        currentSettings[field] = value;
      }
      
      localStorage.setItem('timebeacon_settings_v6', JSON.stringify(currentSettings));
      console.log(`✅ ${field} updated to:`, value);
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const exportToCSV = () => {
    try {
      const timeEntries = JSON.parse(localStorage.getItem('timebeacon_entries_v6') || '[]');
      if (timeEntries.length === 0) {
        alert('No time entries found to export.');
        return;
      }
      
      const csvData = 'Date,Start Time,End Time,Duration (hrs),Project,Client,Description,Billable\\n' + 
        timeEntries.map(entry => 
          `"${entry.date}","${entry.startTime}","${entry.endTime}",${entry.duration},"${entry.project}","${entry.client}","${entry.description}",${entry.billable ? 'Yes' : 'No'}`
        ).join('\\n');
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `timebeacon-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert(`Successfully exported ${timeEntries.length} time entries!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">Configure your TimeBeacon preferences</p>
      </div>

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
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="form-input"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
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
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="form-input"
                  placeholder="Enter your company name"
                />
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  className="form-input"
                  placeholder="Enter your job title"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="form-input"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Working Hours</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="form-input"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & Integrations */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Notifications & Integrations</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.notifications}
                  onChange={(e) => handleInputChange('notifications', e.target.checked)}
                />
                <span>Enable browser notifications</span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.autoBreaks}
                  onChange={(e) => handleInputChange('autoBreaks', e.target.checked)}
                />
                <span>Enable automatic break detection</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.emailNotifications}
                  onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                />
                <span>Enable email notifications</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.slackIntegration}
                  onChange={(e) => handleInputChange('slackIntegration', e.target.checked)}
                />
                <span>Enable Slack integration</span>
              </label>
            </div>
          </div>
        </div>

        {/* Export Tools */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Export & Tools</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <button 
                className="btn btn-secondary"
                onClick={exportToCSV}
                style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '32px' }}>📊</div>
                <div style={{ fontWeight: '600' }}>Export to CSV</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                  Download all time entries
                </div>
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={() => window.location.href = '/integrations'}
                style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '32px' }}>🔗</div>
                <div style={{ fontWeight: '600' }}>Integrations</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                  Connect external tools
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};