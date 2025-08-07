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
  emailNotifications: {
    enabled: boolean;
    cadence: 'hourly' | 'daily' | 'weekly' | 'realtime';
    time?: string; // For daily notifications
    weeklyDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  };
  slackNotifications: {
    enabled: boolean;
    cadence: 'hourly' | 'daily' | 'weekly' | 'realtime';
    channel?: string;
    weeklyDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    weeklyTime?: string;
  };
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
  emailNotifications: {
    enabled: false,
    cadence: 'daily',
    time: '17:00',
    weeklyDay: 'friday'
  },
  slackNotifications: {
    enabled: false,
    cadence: 'realtime',
    channel: '',
    weeklyDay: 'friday',
    weeklyTime: '09:00'
  },
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
        const loadedSettings = {
          ...defaultSettings,
          ...parsed,
          // Ensure nested objects are properly merged
          emailNotifications: {
            ...defaultSettings.emailNotifications,
            ...(parsed.emailNotifications || {})
          },
          slackNotifications: {
            ...defaultSettings.slackNotifications,
            ...(parsed.slackNotifications || {})
          }
        };
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
  const handleChange = (field: keyof SettingsData, value: any) => {
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
        
        {/* Browser Notifications */}
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={settings.browserNotifications}
              onChange={(e) => handleChange('browserNotifications', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
            />
            <div>
              <div style={{ fontWeight: '600', color: '#374151' }}>Browser Notifications</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Get notified in your browser for time tracking reminders
              </div>
            </div>
          </label>
        </div>

        {/* Email Notifications */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: settings.emailNotifications.enabled ? '#f0f9ff' : '#f8fafc', 
          borderRadius: '8px',
          border: settings.emailNotifications.enabled ? '2px solid #3b82f6' : '1px solid #e2e8f0'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '16px' }}>
            <input
              type="checkbox"
              checked={settings.emailNotifications.enabled}
              onChange={(e) => handleChange('emailNotifications', { ...settings.emailNotifications, enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
            />
            <div>
              <div style={{ fontWeight: '600', color: '#374151' }}>
                Email Notifications
                {settings.emailNotifications.enabled && <span style={{ color: '#3b82f6', marginLeft: '8px' }}>✓ Enabled</span>}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Receive time tracking summaries and reminders via email
              </div>
            </div>
          </label>

          {settings.emailNotifications.enabled && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Notification Frequency</label>
                  <select
                    value={settings.emailNotifications.cadence}
                    onChange={(e) => handleChange('emailNotifications', { 
                      ...settings.emailNotifications, 
                      cadence: e.target.value as 'hourly' | 'daily' | 'weekly' | 'realtime'
                    })}
                    style={inputStyle}
                  >
                    <option value="realtime">Real-time (immediate)</option>
                    <option value="hourly">Every hour</option>
                    <option value="daily">Daily digest</option>
                    <option value="weekly">Weekly summary</option>
                  </select>
                </div>
                
                {settings.emailNotifications.cadence === 'daily' && (
                  <div>
                    <label style={labelStyle}>Daily Email Time</label>
                    <input
                      type="time"
                      value={settings.emailNotifications.time || '17:00'}
                      onChange={(e) => handleChange('emailNotifications', { 
                        ...settings.emailNotifications, 
                        time: e.target.value 
                      })}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
              
              {settings.emailNotifications.cadence === 'weekly' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Weekly Day</label>
                    <select
                      value={settings.emailNotifications.weeklyDay || 'friday'}
                      onChange={(e) => handleChange('emailNotifications', { 
                        ...settings.emailNotifications, 
                        weeklyDay: e.target.value as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
                      })}
                      style={inputStyle}
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={labelStyle}>Weekly Email Time</label>
                    <input
                      type="time"
                      value={settings.emailNotifications.time || '17:00'}
                      onChange={(e) => handleChange('emailNotifications', { 
                        ...settings.emailNotifications, 
                        time: e.target.value 
                      })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slack Notifications */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: settings.slackNotifications.enabled ? '#f0f9ff' : '#f8fafc', 
          borderRadius: '8px',
          border: settings.slackNotifications.enabled ? '2px solid #3b82f6' : '1px solid #e2e8f0'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '16px' }}>
            <input
              type="checkbox"
              checked={settings.slackNotifications.enabled}
              onChange={(e) => handleChange('slackNotifications', { ...settings.slackNotifications, enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
            />
            <div>
              <div style={{ fontWeight: '600', color: '#374151' }}>
                Slack Notifications
                {settings.slackNotifications.enabled && <span style={{ color: '#3b82f6', marginLeft: '8px' }}>✓ Enabled</span>}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Send time tracking updates and reminders to your Slack workspace
              </div>
            </div>
          </label>

          {settings.slackNotifications.enabled && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Notification Frequency</label>
                  <select
                    value={settings.slackNotifications.cadence}
                    onChange={(e) => handleChange('slackNotifications', { 
                      ...settings.slackNotifications, 
                      cadence: e.target.value as 'hourly' | 'daily' | 'weekly' | 'realtime'
                    })}
                    style={inputStyle}
                  >
                    <option value="realtime">Real-time updates</option>
                    <option value="hourly">Hourly summaries</option>
                    <option value="daily">Daily reports</option>
                    <option value="weekly">Weekly summaries</option>
                  </select>
                </div>
                
                <div>
                  <label style={labelStyle}>Slack Channel (optional)</label>
                  <input
                    type="text"
                    value={settings.slackNotifications.channel || ''}
                    onChange={(e) => handleChange('slackNotifications', { 
                      ...settings.slackNotifications, 
                      channel: e.target.value 
                    })}
                    placeholder="#timebeacon or @username"
                    style={inputStyle}
                  />
                </div>
              </div>
              
              {settings.slackNotifications.cadence === 'weekly' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Weekly Day</label>
                    <select
                      value={settings.slackNotifications.weeklyDay || 'friday'}
                      onChange={(e) => handleChange('slackNotifications', { 
                        ...settings.slackNotifications, 
                        weeklyDay: e.target.value as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
                      })}
                      style={inputStyle}
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={labelStyle}>Weekly Slack Time</label>
                    <input
                      type="time"
                      value={settings.slackNotifications.weeklyTime || '09:00'}
                      onChange={(e) => handleChange('slackNotifications', { 
                        ...settings.slackNotifications, 
                        weeklyTime: e.target.value 
                      })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto Breaks */}
        <div style={{ marginBottom: '0', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.autoBreaks}
              onChange={(e) => handleChange('autoBreaks', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
            />
            <div>
              <div style={{ fontWeight: '600', color: '#374151' }}>Automatic Break Detection</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Automatically detect and suggest breaks during long work sessions
              </div>
            </div>
          </label>
        </div>
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