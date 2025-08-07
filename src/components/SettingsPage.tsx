import React, { useState, useEffect } from 'react';

interface SettingsData {
  profile: {
    name: string;
    email: string;
    company: string;
    jobTitle: string;
    phone: string;
  };
  workingHours: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
  notifications: {
    browser: boolean;
    email: boolean;
    slack: boolean;
    autoBreaks: boolean;
  };
}

const defaultSettings: SettingsData = {
  profile: {
    name: '',
    email: '',
    company: '',
    jobTitle: '',
    phone: ''
  },
  workingHours: {
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/New_York'
  },
  notifications: {
    browser: false,
    email: false,
    slack: false,
    autoBreaks: false
  }
};

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timebeacon_settings_new');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: SettingsData) => {
    try {
      setSaveStatus('saving');
      localStorage.setItem('timebeacon_settings_new', JSON.stringify(newSettings));
      setSettings(newSettings);
      setSaveStatus('saved');
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Handle profile field changes
  const handleProfileChange = (field: keyof SettingsData['profile'], value: string) => {
    const newSettings = {
      ...settings,
      profile: {
        ...settings.profile,
        [field]: value
      }
    };
    saveSettings(newSettings);
  };

  // Handle working hours changes
  const handleWorkingHoursChange = (field: keyof SettingsData['workingHours'], value: string) => {
    const newSettings = {
      ...settings,
      workingHours: {
        ...settings.workingHours,
        [field]: value
      }
    };
    saveSettings(newSettings);
  };

  // Handle notification toggles
  const handleNotificationChange = (field: keyof SettingsData['notifications'], value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [field]: value
      }
    };
    saveSettings(newSettings);
  };

  // Export time entries to CSV
  const exportToCSV = () => {
    try {
      const entries = JSON.parse(localStorage.getItem('timebeacon_entries_v6') || '[]');
      if (entries.length === 0) {
        alert('No time entries found to export.');
        return;
      }

      const csvContent = [
        'Date,Start Time,End Time,Duration (hrs),Project,Client,Description,Billable',
        ...entries.map((entry: any) => 
          `"${entry.date}","${entry.startTime}","${entry.endTime}",${entry.duration},"${entry.project}","${entry.client}","${entry.description}",${entry.billable ? 'Yes' : 'No'}`
        )
      ].join('\\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timebeacon-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Successfully exported ${entries.length} time entries!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving': return '💾 Saving...';
      case 'saved': return '✅ Saved';
      case 'error': return '❌ Save failed';
      default: return '';
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">Configure your TimeBeacon preferences</p>
        {saveStatus !== 'idle' && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 16px', 
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: saveStatus === 'saved' ? '#f0f9ff' : saveStatus === 'error' ? '#fef2f2' : '#f9fafb',
            color: saveStatus === 'saved' ? '#0369a1' : saveStatus === 'error' ? '#dc2626' : '#6b7280'
          }}>
            {getSaveStatusText()}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '24px', maxWidth: '800px' }}>
        
        {/* Profile Information */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Profile Information</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={settings.profile.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  placeholder="Enter your email"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                  Company
                </label>
                <input
                  type="text"
                  value={settings.profile.company}
                  onChange={(e) => handleProfileChange('company', e.target.value)}
                  placeholder="Enter your company"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                  Job Title
                </label>
                <input
                  type="text"
                  value={settings.profile.jobTitle}
                  onChange={(e) => handleProfileChange('jobTitle', e.target.value)}
                  placeholder="Enter your job title"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={settings.profile.phone}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                placeholder="Enter your phone number"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.workingHours.startTime}
                  onChange={(e) => handleWorkingHoursChange('startTime', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.workingHours.endTime}
                  onChange={(e) => handleWorkingHoursChange('endTime', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
                Timezone
              </label>
              <select
                value={settings.workingHours.timezone}
                onChange={(e) => handleWorkingHoursChange('timezone', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              >
                <option value="America/New_York">Eastern Time (EST/EDT)</option>
                <option value="America/Chicago">Central Time (CST/CDT)</option>
                <option value="America/Denver">Mountain Time (MST/MDT)</option>
                <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Notifications</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={settings.notifications.browser}
                  onChange={(e) => handleNotificationChange('browser', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#3b82f6'
                  }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: '#374151' }}>Browser Notifications</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Get notified in your browser for time tracking reminders
                  </div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#3b82f6'
                  }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: '#374151' }}>Email Notifications</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Receive daily summaries and approval reminders via email
                  </div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '6px',
                transition: 'background-color 0.2s',
                border: settings.notifications.slack ? '2px solid #3b82f6' : '2px solid transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={settings.notifications.slack}
                  onChange={(e) => handleNotificationChange('slack', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#3b82f6'
                  }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: '#374151' }}>
                    Slack Notifications 
                    {settings.notifications.slack && <span style={{ color: '#3b82f6', marginLeft: '8px' }}>✓ Enabled</span>}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Send time tracking updates and reminders to Slack
                  </div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={settings.notifications.autoBreaks}
                  onChange={(e) => handleNotificationChange('autoBreaks', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#3b82f6'
                  }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: '#374151' }}>Automatic Break Detection</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Automatically detect and suggest breaks during long work sessions
                  </div>
                </div>
              </label>

            </div>
          </div>
        </div>

        {/* Export & Tools */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Export & Tools</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              
              <button
                onClick={exportToCSV}
                style={{
                  padding: '20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '32px' }}>📊</div>
                <div style={{ fontWeight: '600', color: '#374151' }}>Export to CSV</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Download all your time entries as a CSV file
                </div>
              </button>

              <button
                onClick={() => window.location.href = '/integrations'}
                style={{
                  padding: '20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '32px' }}>🔗</div>
                <div style={{ fontWeight: '600', color: '#374151' }}>Integrations</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Connect with external tools and services
                </div>
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};