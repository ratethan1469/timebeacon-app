import React, { useState, useEffect } from 'react';

interface SettingsData {
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  startTime: string;
  endTime: string;
  timezone: string;
  browserNotifications: boolean;
  emailNotifications: boolean;
  slackNotifications: boolean;
  autoBreaks: boolean;
}

const defaultSettings: SettingsData = {
  name: '',
  email: '',
  company: '',
  jobTitle: '',
  phone: '',
  startTime: '09:00',
  endTime: '17:00',
  timezone: 'America/New_York',
  browserNotifications: false,
  emailNotifications: false,
  slackNotifications: false,
  autoBreaks: false
};

export const SettingsSimplified: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [saveStatus, setSaveStatus] = useState('');

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timebeacon_settings_simplified');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // Save to localStorage
  const saveSettings = (newSettings: SettingsData) => {
    try {
      localStorage.setItem('timebeacon_settings_simplified', JSON.stringify(newSettings));
      setSettings(newSettings);
      setSaveStatus('Saved ✓');
      setTimeout(() => setSaveStatus(''), 2000);
      console.log('Settings saved:', newSettings);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('Save failed!');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Handle input changes
  const handleChange = (field: keyof SettingsData, value: string | boolean) => {
    const newSettings = { ...settings, [field]: value };
    saveSettings(newSettings);
  };

  // Export CSV
  const exportToCSV = () => {
    try {
      const entries = JSON.parse(localStorage.getItem('timebeacon_entries_v6') || '[]');
      if (entries.length === 0) {
        alert('No time entries found');
        return;
      }

      const csv = [
        'Date,Start Time,End Time,Duration,Project,Client,Description,Billable',
        ...entries.map((e: any) => 
          `"${e.date}","${e.startTime}","${e.endTime}",${e.duration},"${e.project}","${e.client}","${e.description}",${e.billable ? 'Yes' : 'No'}`
        )
      ].join('\\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timebeacon-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`Exported ${entries.length} entries!`);
    } catch (error) {
      alert('Export failed!');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white'
  };

  const labelStyle = {
    display: 'block' as const,
    marginBottom: '6px',
    fontWeight: '500' as const,
    color: '#333'
  };

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '20px'
  };

  const checkboxLabelStyle = {
    display: 'flex' as const,
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    cursor: 'pointer' as const
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111', marginBottom: '8px' }}>
          Settings
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Configure your TimeBeacon preferences
        </p>
        {saveStatus && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 16px', 
            backgroundColor: saveStatus.includes('failed') ? '#fee' : '#efe',
            color: saveStatus.includes('failed') ? '#c33' : '#363',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {saveStatus}
          </div>
        )}
      </div>

      {/* Profile */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#111' }}>
          Profile Information
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter your name"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter your email"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Company</label>
            <input
              type="text"
              value={settings.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Enter your company"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Job Title</label>
            <input
              type="text"
              value={settings.jobTitle}
              onChange={(e) => handleChange('jobTitle', e.target.value)}
              placeholder="Enter your job title"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Phone</label>
          <input
            type="tel"
            value={settings.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Enter your phone number"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Working Hours */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#111' }}>
          Working Hours
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Start Time</label>
            <input
              type="time"
              value={settings.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>End Time</label>
            <input
              type="time"
              value={settings.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            style={inputStyle}
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>

      {/* Notifications */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#111' }}>
          Notifications
        </h2>
        
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={settings.browserNotifications}
            onChange={(e) => handleChange('browserNotifications', e.target.checked)}
          />
          <span>Browser Notifications</span>
        </label>

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={settings.emailNotifications}
            onChange={(e) => handleChange('emailNotifications', e.target.checked)}
          />
          <span>Email Notifications</span>
        </label>

        <label style={{
          ...checkboxLabelStyle,
          padding: '12px',
          backgroundColor: settings.slackNotifications ? '#f0f9ff' : 'transparent',
          borderRadius: '6px',
          border: settings.slackNotifications ? '2px solid #3b82f6' : '2px solid transparent'
        }}>
          <input
            type="checkbox"
            checked={settings.slackNotifications}
            onChange={(e) => handleChange('slackNotifications', e.target.checked)}
          />
          <span>
            Slack Notifications 
            {settings.slackNotifications && <span style={{ color: '#3b82f6', marginLeft: '8px' }}>✓ Enabled</span>}
          </span>
        </label>

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={settings.autoBreaks}
            onChange={(e) => handleChange('autoBreaks', e.target.checked)}
          />
          <span>Auto Break Detection</span>
        </label>
      </div>

      {/* Export */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#111' }}>
          Export & Tools
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <button
            onClick={exportToCSV}
            style={{
              padding: '16px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              textAlign: 'center' as const,
              fontSize: '14px'
            }}
          >
            📊 Export to CSV
          </button>
          
          <button
            onClick={() => window.location.href = '/integrations'}
            style={{
              padding: '16px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              textAlign: 'center' as const,
              fontSize: '14px'
            }}
          >
            🔗 Integrations
          </button>
        </div>
      </div>
    </div>
  );
};