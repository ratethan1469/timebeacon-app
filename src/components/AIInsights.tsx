import React, { useState, useEffect } from 'react';
import { SuggestedTimeEntry } from '../types/privacy';
import { contentAnalyzer } from '../services/contentAnalyzer';
import { aiService } from '../services/aiService';
import { calendarIntegration } from '../services/calendarIntegration';
import apiService from '../services/apiService';

interface AIInsightsProps {
  aiEnabled: boolean;
  onToggleAI: () => void;
  onApproveSuggestion?: (id: string, modifications?: any) => Promise<void>;
  onRejectSuggestion?: (id: string, reason: string) => Promise<void>;
}

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

type TabType = 'processing' | 'gmail' | 'slack' | 'privacy' | 'engine' | 'overview';

export const AIInsights: React.FC<AIInsightsProps> = ({
  aiEnabled,
  onToggleAI
}) => {
  const [suggestions, setSuggestions] = useState<SuggestedTimeEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [aiStatus, setAiStatus] = useState(aiService.getStatus());
  const [calendarStatus, setCalendarStatus] = useState(calendarIntegration.getStatus());
  const [analyzerStats, setAnalyzerStats] = useState(contentAnalyzer.getStats());
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // AI Control Settings State
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
      keepStructuredDataDays: 1
    }
  });

  // Load settings from MongoDB backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiService.getAIControlSettings();
        if (response.settings) {
          setSettings(response.settings);
        }
      } catch (error) {
        console.error('Failed to load AI Control settings:', error);
        // Fallback to localStorage for development
        const savedSettings = localStorage.getItem('aiControlSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      }
    };

    loadSettings();
  }, []);

  // Load suggestions from content analyzer
  useEffect(() => {
    const loadSuggestions = () => {
      const storedSuggestions = contentAnalyzer.getStoredSuggestions();
      setSuggestions(storedSuggestions);
    };

    loadSuggestions();
    
    // Refresh suggestions every 30 seconds
    const interval = setInterval(loadSuggestions, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update AI and calendar status periodically
  useEffect(() => {
    const updateStatus = () => {
      setAiStatus(aiService.getStatus());
      setCalendarStatus(calendarIntegration.getStatus());
      setAnalyzerStats(contentAnalyzer.getStats());
    };

    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Save settings to MongoDB backend
  const saveSettings = async (newSettings: AIControlSettings) => {
    setSettings(newSettings);
    
    try {
      await apiService.updateAIControlSettings(newSettings);
      console.log('AI Control settings saved to database');
    } catch (error) {
      console.error('Failed to save AI Control settings:', error);
      // Fallback to localStorage for development
      localStorage.setItem('aiControlSettings', JSON.stringify(newSettings));
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
      const result = await apiService.testAI();
      setTestResult(result.result || result);
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

  const tabs = [
    { id: 'overview' as TabType, label: '📊 Overview', icon: '📊' },
    { id: 'processing' as TabType, label: '⚙️ Processing', icon: '⚙️' },
    { id: 'gmail' as TabType, label: '📧 Gmail', icon: '📧' },
    { id: 'slack' as TabType, label: '💬 Slack', icon: '💬' },
    { id: 'privacy' as TabType, label: '🔒 Privacy', icon: '🔒' },
    { id: 'engine' as TabType, label: '🧠 AI Engine', icon: '🧠' }
  ];

  return (
    <div className="content-card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 className="card-title">🎯 AI Control Center</h2>
          <div style={{
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: aiEnabled && aiStatus.available ? 
              'linear-gradient(135deg, #10b981, #34d399)' : 
              'linear-gradient(135deg, #6b7280, #9ca3af)',
            color: 'white'
          }}>
            {aiEnabled && aiStatus.available ? 'Active' : 'Inactive'}
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
          Configure intelligent time tracking from workplace activity data
        </p>
        
        {/* Tab Navigation */}
        <div className="tab-navigation" style={{
          display: 'flex',
          gap: '4px',
          marginTop: '20px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              style={{
                background: activeTab === tab.id ? 'var(--brand-primary)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '-1px',
                borderBottom: activeTab === tab.id ? '2px solid var(--brand-primary)' : '2px solid transparent'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '32px' }}>
        <div className="ai-control-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );

  function renderTabContent() {
    if (!aiEnabled && activeTab !== 'overview') {
      return (
        <div className="inactive-state">
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--background-secondary)',
            borderRadius: '12px',
            border: '2px dashed var(--border)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: 'var(--text-primary)',
              marginBottom: '12px'
            }}>
              AI Control Center Disabled
            </h3>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '24px',
              maxWidth: '500px',
              margin: '0 auto 24px'
            }}>
              Enable AI to configure intelligent time tracking from workplace activities.
            </p>
            <button 
              className="btn btn-primary"
              onClick={onToggleAI}
              style={{ fontSize: '16px', padding: '12px 24px' }}
            >
              🚀 Enable AI Control Center
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'processing':
        return renderProcessingTab();
      case 'gmail':
        return renderGmailTab();
      case 'slack':
        return renderSlackTab();
      case 'privacy':
        return renderPrivacyTab();
      case 'engine':
        return renderEngineTab();
      default:
        return renderOverviewTab();
    }
  }

  function renderOverviewTab() {
    if (!aiEnabled) {
      return (
        <div className="inactive-state">
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--background-secondary)',
            borderRadius: '12px',
            border: '2px dashed var(--border)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: 'var(--text-primary)',
              marginBottom: '12px'
            }}>
              Welcome to AI Control Center
            </h3>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '24px',
              maxWidth: '600px',
              margin: '0 auto 24px'
            }}>
              Configure intelligent time tracking from Gmail, Calendar, Zoom, and Slack activities. 
              The AI agent will automatically filter, classify, and create time entries based on your preferences.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary"
                onClick={onToggleAI}
                style={{ fontSize: '16px', padding: '12px 24px' }}
              >
                🚀 Enable AI Processing
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setActiveTab('processing')}
                style={{ fontSize: '16px', padding: '12px 24px' }}
              >
                ⚙️ Configure Settings
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* Status Overview */}
        <div className="settings-section">
          <h3 className="settings-section-title">📊 System Overview</h3>
          
          <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="status-card">
              <div className="status-label">AI Processing</div>
              <div className={`status-value ${aiStatus.available && aiEnabled ? 'status-success' : 'status-error'}`}>
                {aiStatus.available && aiEnabled ? '✅ Active' : '❌ Inactive'}
              </div>
            </div>
            <div className="status-card">
              <div className="status-label">Confidence Threshold</div>
              <div className="status-value">{Math.round(settings.confidenceThreshold * 100)}%</div>
            </div>
            <div className="status-card">
              <div className="status-label">Pending Suggestions</div>
              <div className="status-value">{suggestions.length}</div>
            </div>
            <div className="status-card">
              <div className="status-label">Description Style</div>
              <div className="status-value" style={{ textTransform: 'capitalize' }}>{settings.descriptionLength}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <button 
              className={`btn ${aiEnabled ? 'btn-danger' : 'btn-primary'}`}
              onClick={onToggleAI}
              style={{ minWidth: '140px' }}
            >
              {aiEnabled ? '⏸️ Disable AI' : '▶️ Enable AI'}
            </button>
          </div>
        </div>

        {/* Quick Settings Overview */}
        <div className="settings-section">
          <h3 className="settings-section-title">⚙️ Quick Settings</h3>
          
          <div style={{ display: 'grid', gap: '20px' }}>
            <div className="setting-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Gmail Domain Filtering</strong>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Only process emails with external participants</div>
                </div>
                <div className={`status-value ${settings.gmailDomainFilter.enabled ? 'status-success' : 'status-warning'}`}>
                  {settings.gmailDomainFilter.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
            
            <div className="setting-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Slack Channel Filtering</strong>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {settings.slackChannelFilter.keywords.length} keywords configured
                  </div>
                </div>
                <div className={`status-value ${settings.slackChannelFilter.enabled ? 'status-success' : 'status-warning'}`}>
                  {settings.slackChannelFilter.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
            
            <div className="setting-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Auto-Approval</strong>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Entries above {Math.round(settings.confidenceThreshold * 100)}% confidence</div>
                </div>
                <div className={`status-value ${settings.autoApprove ? 'status-success' : 'status-warning'}`}>
                  {settings.autoApprove ? 'Enabled' : 'Manual Review'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestions Preview */}
        <div className="settings-section">
          <h3 className="settings-section-title">🔍 Recent AI Activity</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'var(--success-light)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--success)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success-dark)', marginBottom: '4px' }}>
                {suggestions.length}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--success-dark)', fontWeight: '500' }}>
                Pending Suggestions
              </div>
            </div>
            
            <div style={{
              background: 'var(--info-light)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--info)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--info-dark)', marginBottom: '4px' }}>
                {calendarStatus.processedEventsCount || 0}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--info-dark)', fontWeight: '500' }}>
                Events Processed
              </div>
            </div>
            
            <div style={{
              background: aiStatus.available ? 'var(--success-light)' : 'var(--warning-light)',
              padding: '20px',
              borderRadius: '12px',
              border: `1px solid ${aiStatus.available ? 'var(--success)' : 'var(--warning)'}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: aiStatus.available ? 'var(--success-dark)' : 'var(--warning-dark)', marginBottom: '4px' }}>
                {aiStatus.available ? '🟢 Online' : '🟡 Offline'}
              </div>
              <div style={{ fontSize: '14px', color: aiStatus.available ? 'var(--success-dark)' : 'var(--warning-dark)', fontWeight: '500' }}>
                AI Engine Status
              </div>
            </div>
          </div>

          {/* Recent Suggestions Preview */}
          {suggestions.length > 0 ? (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Recent Suggestions (showing {Math.min(3, suggestions.length)} of {suggestions.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {suggestions.slice(0, 3).map((suggestion) => (
                  <div key={suggestion.id} style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {suggestion.activity || 'Unknown Activity'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {suggestion.source} • Confidence: {Math.round((suggestion.confidence || 0) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
              {suggestions.length > 3 && (
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    +{suggestions.length - 3} more suggestions available
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'var(--background-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                No pending suggestions. AI is monitoring your activities.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderProcessingTab() {
    return (
      <div className="settings-section">
        <h3 className="settings-section-title">⚙️ Processing Configuration</h3>
        
        <div style={{ display: 'grid', gap: '24px' }}>
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
    );
  }

  function renderGmailTab() {
    return (
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
    );
  }

  function renderSlackTab() {
    return (
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
    );
  }

  function renderPrivacyTab() {
    return (
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
              <option value={0}>Immediate deletion</option>
              <option value={1}>24 hours (recommended)</option>
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
    );
  }

  function renderEngineTab() {
    return (
      <div>
        {/* AI Service Status */}
        <div className="settings-section">
          <h3 className="settings-section-title">🧠 Local AI Engine (Ollama)</h3>
          
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
      </div>
    );
  }
};