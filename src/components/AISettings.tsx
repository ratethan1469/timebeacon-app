/**
 * AI Control Center Component
 * Configure AI agent settings for automatic time tracking from workplace data
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';
import { contentAnalyzer } from '../services/contentAnalyzer';
import { calendarIntegration } from '../services/calendarIntegration';
import { aiPreferencesApi, AIPreferences } from '../services/aiPreferencesApi';

// AI Control Center Settings Interface
interface AIControlSettings {
  confidenceThreshold: number;
  descriptionLength: 'brief' | 'standard' | 'detailed';
  autoApprove: boolean;
  gmailDomainFilter: {
    enabled: boolean;
    companyDomain: string;
    excludeInternal: boolean;
  };
  slackChannelFilter: {
    enabled: boolean;
    includedChannels: string[];
    keywords: string[];
  };
  slackParticipantFilter: {
    enabled: boolean;
    includedParticipants: string[];
  };
  retentionPolicy: {
    deleteRawDataAfterProcessing: boolean;
    keepStructuredDataDays: number;
  };
}

interface AIControlCenterProps {
  onClose?: () => void;
}

export const AIControlCenter: React.FC<AIControlCenterProps> = ({ onClose }) => {
  const [aiStatus, setAiStatus] = useState(aiService.getStatus());
  const [analyzerStats, setAnalyzerStats] = useState(contentAnalyzer.getStats());
  const [calendarStatus, setCalendarStatus] = useState(calendarIntegration.getStatus());
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Backend preferences state
  const [backendPreferences, setBackendPreferences] = useState<AIPreferences | null>(null);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Control Settings State (local UI state)
  const [settings, setSettings] = useState<AIControlSettings>({
    confidenceThreshold: 0.80,
    descriptionLength: 'standard',
    autoApprove: false,
    gmailDomainFilter: {
      enabled: true,
      companyDomain: '@timebeacon.io',
      excludeInternal: true
    },
    slackChannelFilter: {
      enabled: true,
      includedChannels: [],
      keywords: ['client', 'project', 'meeting']
    },
    slackParticipantFilter: {
      enabled: false,
      includedParticipants: []
    },
    retentionPolicy: {
      deleteRawDataAfterProcessing: true,
      keepStructuredDataDays: 30
    }
  });

  // Load settings from backend on mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        setIsLoadingPrefs(true);
        const prefs = await aiPreferencesApi.getPreferences();
        setBackendPreferences(prefs);

        // Sync backend preferences to local state
        setSettings(prev => ({
          ...prev,
          confidenceThreshold: prefs.confidence_threshold / 100, // Backend uses 0-100, UI uses 0-1
          descriptionLength: prefs.description_length,
          autoApprove: prefs.auto_approve_enabled,
        }));

        console.log('✅ Loaded AI preferences from backend:', prefs);
      } catch (error) {
        console.error('Failed to load AI preferences:', error);
        // Fall back to localStorage
        const savedSettings = localStorage.getItem('aiControlSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } finally {
        setIsLoadingPrefs(false);
      }
    }

    loadPreferences();
  }, []);

  // Update status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAiStatus(aiService.getStatus());
      setAnalyzerStats(contentAnalyzer.getStats());
      setCalendarStatus(calendarIntegration.getStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Save settings to localStorage AND backend
  const saveSettings = (newSettings: AIControlSettings) => {
    setSettings(newSettings);
    localStorage.setItem('aiControlSettings', JSON.stringify(newSettings));
  };

  // Save to backend
  const handleSaveToBackend = async () => {
    try {
      setIsSavingPrefs(true);
      setSaveSuccess(false);

      await aiPreferencesApi.updatePreferences({
        confidence_threshold: Math.round(settings.confidenceThreshold * 100), // Convert 0-1 to 0-100
        description_length: settings.descriptionLength,
        auto_approve_enabled: settings.autoApprove,
        only_opened_emails: true, // Default for now
        skip_promotional: true, // Default for now
      });

      setSaveSuccess(true);
      console.log('✅ Saved AI preferences to backend');

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save AI preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const updateSetting = (path: string, value: any) => {
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    saveSettings(newSettings);
  };

  const addToList = (path: string, value: string) => {
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    const list = current[keys[keys.length - 1]];
    if (!list.includes(value) && value.trim()) {
      list.push(value.trim());
      saveSettings(newSettings);
    }
  };

  const removeFromList = (path: string, value: string) => {
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    const list = current[keys[keys.length - 1]];
    const index = list.indexOf(value);
    if (index > -1) {
      list.splice(index, 1);
      saveSettings(newSettings);
    }
  };

  const handleTestAI = async () => {
    setIsTestingAI(true);
    setTestResult(null);
    
    try {
      const result = await aiService.testService();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: 'Test failed' });
    } finally {
      setIsTestingAI(false);
    }
  };

  const handleTestCalendar = async () => {
    try {
      const result = await calendarIntegration.testConnection();
      console.log('Calendar test result:', result);
    } catch (error) {
      console.error('Calendar test failed:', error);
    }
  };

  const handleForceSync = async () => {
    try {
      const result = await calendarIntegration.forceSync();
      console.log('Force sync result:', result);
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  return (
    <div className="content-card">
      <div className="card-header">
        <h2 className="card-title">🎯 AI Control Center</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
          Configure intelligent time tracking from workplace activity data
        </p>
        {onClose && (
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      
      <div style={{ padding: '32px' }}>
        
        {/* Loading State */}
        {isLoadingPrefs && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p>Loading AI preferences...</p>
          </div>
        )}

        {!isLoadingPrefs && (
          <>
            {/* Save Button - Sticky at top */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'var(--bg-primary)',
              padding: '16px 0',
              marginBottom: '24px',
              borderBottom: '2px solid var(--border-color)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <button
                className="btn btn-primary"
                onClick={handleSaveToBackend}
                disabled={isSavingPrefs}
                style={{ fontSize: '16px', padding: '12px 24px' }}
              >
                {isSavingPrefs ? '💾 Saving...' : '💾 Save Changes to Backend'}
              </button>

              {saveSuccess && (
                <div style={{
                  background: '#10b981',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  ✅ Saved successfully!
                </div>
              )}

              {backendPreferences && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Last updated: {new Date(backendPreferences.updated_at).toLocaleString()}
                </div>
              )}
            </div>

            {/* Processing Configuration */}
            <div className="settings-section">
              <h3 className="settings-section-title">⚙️ Processing Configuration</h3>

              <div style={{ display: 'grid', gap: '24px', marginBottom: '32px' }}>
            {/* Confidence Threshold */}
            <div className="setting-item">
              <label className="setting-label">
                🎯 Confidence Threshold
                <span className="setting-description">Minimum AI confidence required for auto-approval (below this requires review)</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={settings.confidenceThreshold}
                  onChange={(e) => updateSetting('confidenceThreshold', parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="confidence-value">
                  {Math.round(settings.confidenceThreshold * 100)}%
                </span>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={settings.autoApprove}
                    onChange={(e) => updateSetting('autoApprove', e.target.checked)}
                  />
                  Auto-approve high confidence entries
                </label>
              </div>
            </div>

            {/* Description Length */}
            <div className="setting-item">
              <label className="setting-label">
                📝 Description Length
                <span className="setting-description">How detailed should AI-generated descriptions be?</span>
              </label>
              <div className="radio-group">
                {[
                  { value: 'brief', label: 'Brief (1-20 words)', example: '"Client pricing discussion"' },
                  { value: 'standard', label: 'Standard (20-40 words)', example: '"Exchanged emails with client about pricing adjustments and timeline estimates"' },
                  { value: 'detailed', label: 'Detailed (40-100 words)', example: '"Extensive email thread with client Bob regarding pricing revisions to the proposal. Clarified cost structures, updated timeline estimates, and confirmed next steps for contract approval."' }
                ].map(option => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="descriptionLength"
                      value={option.value}
                      checked={settings.descriptionLength === option.value}
                      onChange={(e) => updateSetting('descriptionLength', e.target.value)}
                    />
                    <div>
                      <strong>{option.label}</strong>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        Example: {option.example}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gmail Filters */}
        <div className="settings-section">
          <h3 className="settings-section-title">📧 Gmail Integration</h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={settings.gmailDomainFilter.enabled}
                onChange={(e) => updateSetting('gmailDomainFilter.enabled', e.target.checked)}
              />
              Enable Gmail domain filtering
            </label>
            
            {settings.gmailDomainFilter.enabled && (
              <div className="filter-config">
                <div className="setting-item">
                  <label className="setting-label">Company Domain</label>
                  <input
                    type="text"
                    value={settings.gmailDomainFilter.companyDomain}
                    onChange={(e) => updateSetting('gmailDomainFilter.companyDomain', e.target.value)}
                    placeholder="@yourcompany.com"
                    className="setting-input"
                  />
                </div>
                
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={settings.gmailDomainFilter.excludeInternal}
                    onChange={(e) => updateSetting('gmailDomainFilter.excludeInternal', e.target.checked)}
                  />
                  Only track emails with external participants (exclude internal company emails)
                </label>
                
                <div className="info-box">
                  <p><strong>How it works:</strong> Only emails involving people outside your company domain will be processed for time tracking. Internal company discussions will be ignored.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Slack Filters */}
        <div className="settings-section">
          <h3 className="settings-section-title">💬 Slack Integration</h3>
          
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Channel Filter */}
            <div>
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={settings.slackChannelFilter.enabled}
                  onChange={(e) => updateSetting('slackChannelFilter.enabled', e.target.checked)}
                />
                Enable Slack channel filtering
              </label>
              
              {settings.slackChannelFilter.enabled && (
                <div className="filter-config">
                  <div className="setting-item">
                    <label className="setting-label">Channel Keywords</label>
                    <div className="tag-input-container">
                      <div className="tags">
                        {settings.slackChannelFilter.keywords.map(keyword => (
                          <span key={keyword} className="tag">
                            {keyword}
                            <button 
                              onClick={() => removeFromList('slackChannelFilter.keywords', keyword)}
                              className="tag-remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Add keyword (e.g., 'client', 'project')..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToList('slackChannelFilter.keywords', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className="tag-input"
                      />
                    </div>
                    <div className="info-box">
                      <p>Only process messages from channels containing these keywords in their name.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Participant Filter */}
            <div>
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={settings.slackParticipantFilter.enabled}
                  onChange={(e) => updateSetting('slackParticipantFilter.enabled', e.target.checked)}
                />
                Enable Slack participant filtering
              </label>
              
              {settings.slackParticipantFilter.enabled && (
                <div className="filter-config">
                  <div className="setting-item">
                    <label className="setting-label">Included Participants</label>
                    <div className="tag-input-container">
                      <div className="tags">
                        {settings.slackParticipantFilter.includedParticipants.map(participant => (
                          <span key={participant} className="tag">
                            @{participant}
                            <button 
                              onClick={() => removeFromList('slackParticipantFilter.includedParticipants', participant)}
                              className="tag-remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Add username (without @)..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToList('slackParticipantFilter.includedParticipants', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className="tag-input"
                      />
                    </div>
                    <div className="info-box">
                      <p>Only process messages that include these specific participants.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Retention */}
        <div className="settings-section">
          <h3 className="settings-section-title">🔒 Data Retention & Privacy</h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={settings.retentionPolicy.deleteRawDataAfterProcessing}
                onChange={(e) => updateSetting('retentionPolicy.deleteRawDataAfterProcessing', e.target.checked)}
              />
              Delete raw transcripts/emails/messages after processing (recommended)
            </label>
            
            <div className="setting-item">
              <label className="setting-label">
                Keep structured time entries for
                <span className="setting-description">How long to retain processed time entries before cleanup</span>
              </label>
              <select 
                value={settings.retentionPolicy.keepStructuredDataDays}
                onChange={(e) => updateSetting('retentionPolicy.keepStructuredDataDays', parseInt(e.target.value))}
                className="setting-select"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
                <option value={-1}>Forever</option>
              </select>
            </div>
            
            <div className="privacy-info">
              <h4>🛡️ Privacy Protection</h4>
              <ul>
                <li><strong>Local Processing:</strong> All AI analysis happens on your device</li>
                <li><strong>No External Transmission:</strong> Raw workplace data never leaves your computer</li>
                <li><strong>Selective Storage:</strong> Only structured time entries are saved, not raw content</li>
                <li><strong>User Control:</strong> Review and approve all AI-generated entries</li>
              </ul>
            </div>
          </div>
        </div>

        {/* AI Service Status */}
        <div className="settings-section">
          <h3 className="settings-section-title">🧠 AI Engine Status</h3>
          
          <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="status-card">
              <div className="status-label">AI Service</div>
              <div className={`status-value ${aiStatus.available ? 'status-success' : 'status-error'}`}>
                {aiStatus.available ? '✅ Available' : '❌ Not Available'}
              </div>
            </div>
            <div className="status-card">
              <div className="status-label">Model</div>
              <div className="status-value">{aiStatus.model}</div>
            </div>
            <div className="status-card">
              <div className="status-label">Processing</div>
              <div className={`status-value ${aiStatus.enabled ? 'status-success' : 'status-warning'}`}>
                {aiStatus.enabled ? '🟢 Enabled' : '🟡 Disabled'}
              </div>
            </div>
          </div>

          {!aiStatus.available && (
            <div className="alert alert-info">
              <h4>🔧 Ollama Setup Required</h4>
              <p>To enable local AI processing, install Ollama and the required model:</p>
              <div className="code-block">
                <code>
                  # Install Ollama (macOS/Linux)<br/>
                  curl -fsSL https://ollama.com/install.sh | sh<br/><br/>
                  # Pull the model<br/>
                  ollama pull llama3.2:3b<br/><br/>
                  # Start Ollama service<br/>
                  ollama serve
                </code>
              </div>
              <p style={{ marginTop: '16px' }}>
                <strong>Privacy Note:</strong> All AI processing happens locally on your machine. 
                No data is sent to external servers.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button 
              className="btn btn-secondary"
              onClick={handleTestAI}
              disabled={isTestingAI}
            >
              {isTestingAI ? '🔄 Testing...' : '🧪 Test AI Service'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => aiService.checkOllamaAvailability()}
            >
              🔄 Refresh Status
            </button>
          </div>

          {testResult && (
            <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '16px' }}>
              {testResult.success ? (
                <p>✅ AI service test successful! Latency: {testResult.latency}ms</p>
              ) : (
                <p>❌ AI service test failed: {testResult.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Content Analyzer Status */}
        <div className="settings-section">
          <h3 className="settings-section-title">📊 Content Analyzer</h3>
          
          <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="status-card">
              <div className="status-label">Queue Length</div>
              <div className="status-value">{analyzerStats.queueLength}</div>
            </div>
            <div className="status-card">
              <div className="status-label">Processing</div>
              <div className={`status-value ${analyzerStats.isProcessing ? 'status-warning' : 'status-success'}`}>
                {analyzerStats.isProcessing ? '🟡 Active' : '🟢 Idle'}
              </div>
            </div>
            <div className="status-card">
              <div className="status-label">Cache Size</div>
              <div className="status-value">{analyzerStats.cacheSize}</div>
            </div>
            <div className="status-card">
              <div className="status-label">Total Suggestions</div>
              <div className="status-value">{analyzerStats.totalSuggestions}</div>
            </div>
            <div className="status-card">
              <div className="status-label">Pending Review</div>
              <div className="status-value">{analyzerStats.pendingSuggestions}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => contentAnalyzer.clearOldSuggestions(7)}
            >
              🧹 Clear Old Suggestions
            </button>
          </div>
        </div>

        {/* Calendar Integration */}
        <div className="settings-section">
          <h3 className="settings-section-title">📅 Calendar Integration</h3>
          
          <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="status-card">
              <div className="status-label">Status</div>
              <div className={`status-value ${calendarStatus.enabled ? 'status-success' : 'status-warning'}`}>
                {calendarStatus.enabled ? '✅ Connected' : '⚠️ Disconnected'}
              </div>
            </div>
            <div className="status-card">
              <div className="status-label">Last Sync</div>
              <div className="status-value">
                {calendarStatus.lastSync ? 
                  new Date(calendarStatus.lastSync).toLocaleString() : 
                  'Never'
                }
              </div>
            </div>
            <div className="status-card">
              <div className="status-label">Events Processed</div>
              <div className="status-value">{calendarStatus.processedEventsCount}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary"
              onClick={handleTestCalendar}
            >
              🧪 Test Connection
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleForceSync}
            >
              🔄 Force Sync
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => calendarIntegration.clearHistory()}
            >
              🧹 Clear History
            </button>
          </div>
        </div>

        {/* Privacy Information */}
        <div className="settings-section">
          <h3 className="settings-section-title">🔒 Privacy & Security</h3>
          
          <div className="alert alert-success">
            <h4>✅ Privacy-First Architecture</h4>
            <ul style={{ margin: '12px 0', paddingLeft: '20px' }}>
              <li><strong>Local Processing:</strong> All AI analysis happens on your device</li>
              <li><strong>No Data Transmission:</strong> Raw content never leaves your computer</li>
              <li><strong>Encrypted Storage:</strong> Suggestions stored locally with encryption</li>
              <li><strong>User Control:</strong> You approve every AI-generated time entry</li>
              <li><strong>Audit Trail:</strong> Complete visibility into AI decision-making</li>
            </ul>
          </div>

          <div className="alert alert-info">
            <h4>🔧 What the AI Analyzes</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '12px' }}>
              <div>
                <strong>📅 Calendar Events</strong>
                <ul style={{ fontSize: '14px', margin: '8px 0', paddingLeft: '16px' }}>
                  <li>Meeting titles and descriptions</li>
                  <li>Attendee information</li>
                  <li>Meeting duration and timing</li>
                  <li>Location details</li>
                </ul>
              </div>
              <div>
                <strong>📧 Email Content (Future)</strong>
                <ul style={{ fontSize: '14px', margin: '8px 0', paddingLeft: '16px' }}>
                  <li>Subject lines for project matching</li>
                  <li>Sender/recipient analysis</li>
                  <li>Project keywords and references</li>
                  <li>Time-related discussions</li>
                </ul>
              </div>
              <div>
                <strong>💬 Slack Messages (Future)</strong>
                <ul style={{ fontSize: '14px', margin: '8px 0', paddingLeft: '16px' }}>
                  <li>Project channel discussions</li>
                  <li>Client interaction threads</li>
                  <li>Work status updates</li>
                  <li>Meeting coordination</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="settings-section">
          <h3 className="settings-section-title">⚡ Performance Optimization</h3>
          
          <div className="tips-grid" style={{ display: 'grid', gap: '16px' }}>
            <div className="tip-card">
              <h4>🚀 Speed Tips</h4>
              <ul style={{ fontSize: '14px', margin: '8px 0', paddingLeft: '16px' }}>
                <li>Use a smaller model (llama3.2:1b) for faster processing</li>
                <li>Increase RAM allocation to Ollama for better performance</li>
                <li>Close unnecessary applications when AI is processing</li>
                <li>Process activities in batches for efficiency</li>
              </ul>
            </div>
            <div className="tip-card">
              <h4>🎯 Accuracy Tips</h4>
              <ul style={{ fontSize: '14px', margin: '8px 0', paddingLeft: '16px' }}>
                <li>Use descriptive meeting titles and descriptions</li>
                <li>Maintain consistent project and client naming</li>
                <li>Review and approve suggestions to train the system</li>
                <li>Keep your project and client lists up to date</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="settings-section">
          <h3 className="settings-section-title">⚡ Quick Actions</h3>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => {
              if (confirm('Reset all AI Control settings to defaults?')) {
                const defaultSettings: AIControlSettings = {
                  confidenceThreshold: 0.80,
                  descriptionLength: 'standard',
                  autoApprove: false,
                  gmailDomainFilter: {
                    enabled: true,
                    companyDomain: '@timebeacon.io',
                    excludeInternal: true
                  },
                  slackChannelFilter: {
                    enabled: true,
                    includedChannels: [],
                    keywords: ['client', 'project', 'meeting']
                  },
                  slackParticipantFilter: {
                    enabled: false,
                    includedParticipants: []
                  },
                  retentionPolicy: {
                    deleteRawDataAfterProcessing: true,
                    keepStructuredDataDays: 30
                  }
                };
                saveSettings(defaultSettings);
              }
            }}>
              🔄 Reset to Defaults
            </button>
            
            <button className="btn btn-primary" onClick={() => {
              const exported = JSON.stringify(settings, null, 2);
              navigator.clipboard.writeText(exported);
              alert('Settings copied to clipboard!');
            }}>
              📋 Export Settings
            </button>
            
            <button className="btn btn-secondary" onClick={() => {
              const imported = prompt('Paste exported settings JSON:');
              if (imported) {
                try {
                  const parsedSettings = JSON.parse(imported);
                  saveSettings(parsedSettings);
                  alert('Settings imported successfully!');
                } catch (e) {
                  alert('Invalid settings format');
                }
              }
            }}>
              📥 Import Settings
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

// Export both for backward compatibility
export const AISettings = AIControlCenter;