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
  const [originalSettings, setOriginalSettings] = useState<SettingsData>(defaultSettings);
  const [saveStatus, setSaveStatus] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timebeacon_settings_simplified');
      if (saved) {
        const parsed = JSON.parse(saved);
        const loadedSettings = { ...defaultSettings, ...parsed };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // Save to localStorage
  const saveSettings = () => {
    try {
      setSaveStatus('Saving...');
      localStorage.setItem('timebeacon_settings_simplified', JSON.stringify(settings));
      setOriginalSettings(settings);
      setHasChanges(false);
      setSaveStatus('Saved ✓');
      setTimeout(() => setSaveStatus(''), 3000);
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('Save failed!');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Handle input changes (no auto-save)
  const handleChange = (field: keyof SettingsData, value: string | boolean) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(originalSettings));
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

  const saveButtonStyle = {
    backgroundColor: hasChanges ? '#3b82f6' : '#94a3b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: hasChanges ? 'pointer' as const : 'not-allowed' as const,
    transition: 'all 0.2s',
    minWidth: '120px'
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111', marginBottom: '8px' }}>
              Settings
            </h1>
            <p style={{ color: '#666', fontSize: '16px' }}>
              Configure your TimeBeacon preferences
            </p>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={!hasChanges}
            style={saveButtonStyle}
          >
            {saveStatus === 'Saving...' ? 'Saving...' : hasChanges ? 'Save Settings' : 'No Changes'}
          </button>
        </div>
        
        {saveStatus && saveStatus !== 'Saving...' && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: saveStatus.includes('failed') ? '#fee' : '#eff6ff',
            color: saveStatus.includes('failed') ? '#c33' : '#1e40af',
            borderRadius: '6px',
            fontSize: '14px',
            border: saveStatus.includes('failed') ? '1px solid #fecaca' : '1px solid #dbeafe'
          }}>
            {saveStatus}
          </div>
        )}

        {hasChanges && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#fef3c7',
            color: '#92400e',
            borderRadius: '6px',
            fontSize: '14px',
            border: '1px solid #fcd34d',
            marginTop: '12px'
          }}>
            ⚠️ You have unsaved changes
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

      {/* Bottom Save Button */}
      <div style={{ 
        marginTop: '40px', 
        padding: '24px',
        backgroundColor: hasChanges ? '#f8fafc' : 'transparent',
        border: hasChanges ? '1px solid #e2e8f0' : 'none',
        borderRadius: '8px',
        textAlign: 'center' as const
      }}>
        <button
          onClick={saveSettings}
          disabled={!hasChanges}
          style={{
            ...saveButtonStyle,
            fontSize: '18px',
            padding: '16px 32px',
            minWidth: '200px'
          }}
        >
          {saveStatus === 'Saving...' ? 'Saving Changes...' : hasChanges ? 'Save All Settings' : 'All Settings Saved'}
        </button>
        
        {hasChanges && (
          <p style={{ 
            marginTop: '12px', 
            color: '#64748b', 
            fontSize: '14px',
            margin: '12px 0 0 0'
          }}>
            Don't forget to save your changes before leaving this page
          </p>
        )}
      </div>
    </div>
  );
};