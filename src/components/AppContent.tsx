import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { Reports } from './Reports';
import EnhancedReports from './EnhancedReports';
import PermissionsManager from './PermissionsManager';
import { Settings } from './Settings';
import { Integrations } from './Integrations';
import { PrivacyOwnership } from './PrivacyOwnership';
import { AIInsights } from './AIInsights';
import { NavigationItem } from '../types';
import { useTimeTrackerSync } from '../hooks/useTimeTrackerSync';
import { contentAnalyzer } from '../services/contentAnalyzer';
import { aiService } from '../services/aiService';

export function AppContent() {
  const [activeItem, setActiveItem] = useState<NavigationItem>('dashboard');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [useEnhancedReports, setUseEnhancedReports] = useState(true);
  const timeTracker = useTimeTrackerSync();

  // Handle AI toggle
  const handleToggleAI = () => {
    const newEnabled = !aiEnabled;
    setAiEnabled(newEnabled);
    
    // Update AI service configuration
    aiService.updateConfig({ enabled: newEnabled });
    
    if (newEnabled) {
      console.log('✨ AI analysis enabled');
    } else {
      console.log('⏸️ AI analysis paused');
    }
  };

  // Handle AI suggestion approval
  const handleApproveSuggestion = async (id: string, modifications?: any) => {
    try {
      await contentAnalyzer.approveSuggestion(id, modifications);
      console.log('✅ Suggestion approved and time entry created');
    } catch (error) {
      console.error('Failed to approve suggestion:', error);
    }
  };

  // Handle AI suggestion rejection
  const handleRejectSuggestion = async (id: string, reason: string) => {
    try {
      await contentAnalyzer.rejectSuggestion(id, reason);
      console.log('❌ Suggestion rejected:', reason);
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return (
          <Dashboard 
            entries={timeTracker.timeEntries}
            projects={timeTracker.projects}
            onUpdateEntry={timeTracker.updateTimeEntry}
            onDeleteEntry={timeTracker.deleteTimeEntry}
            onAddEntry={timeTracker.addTimeEntry}
          />
        );
      case 'reports':
        return useEnhancedReports ? (
          <EnhancedReports />
        ) : (
          <Reports 
            entries={timeTracker.timeEntries}
            projects={timeTracker.projects}
          />
        );
      case 'ai-insights':
        return (
          <AIInsights 
            onApproveSuggestion={handleApproveSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            aiEnabled={aiEnabled}
            onToggleAI={handleToggleAI}
          />
        );
      case 'integrations':
        return (
          <Integrations 
            integrations={timeTracker.settings.integrations}
            onToggleIntegration={timeTracker.toggleIntegration}
          />
        );
      case 'permissions':
        return <PermissionsManager />;
      case 'settings':
        return (
          <Settings 
            settings={timeTracker.settings}
            projects={timeTracker.projects}
            onUpdateSettings={timeTracker.setSettings}
            onAddProject={timeTracker.addProject}
            onUpdateProject={timeTracker.updateProject}
            onDeleteProject={timeTracker.deleteProject}
          />
        );
      case 'privacy':
        return (
          <PrivacyOwnership 
            privacySettings={{
              dataProcessingEnabled: true,
              auditLogRetentionDays: 30,
              contentAnalysisRetentionDays: 7,
              autoDeleteOldData: true,
              aiAnalysisEnabled: true,
              maxConfidenceThreshold: 0.7,
              requireManualApproval: true,
              showDetailedAuditLogs: true,
              notifyOnDataAccess: false,
              exportFormat: 'json',
              masterPauseEnabled: false,
              emergencyWipeEnabled: true
            }}
            dataSources={[]}
            auditLogs={[]}
            onUpdatePrivacySettings={() => {}}
            onExportData={timeTracker.exportData}
            onDeleteAllData={timeTracker.clearAllData}
          />
        );
      default:
        return (
          <Dashboard 
            entries={timeTracker.timeEntries}
            projects={timeTracker.projects}
            onUpdateEntry={timeTracker.updateTimeEntry}
            onDeleteEntry={timeTracker.deleteTimeEntry}
            onAddEntry={timeTracker.addTimeEntry}
          />
        );
    }
  };

  // Show loading state while database initializes
  if (timeTracker.isLoading) {
    return (
      <div className="app-container">
        <div className="loading-container" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          gap: '24px',
          background: 'var(--background)'
        }}>
          <div className="loading-spinner" style={{
            width: '48px',
            height: '48px',
            border: '4px solid var(--border)',
            borderTop: '4px solid var(--brand-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
              🚀 Initializing TimeBeacon
            </h2>
            <p>Setting up your local-first database...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if database fails to load
  if (timeTracker.error) {
    return (
      <div className="app-container">
        <div className="error-container" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          gap: '24px',
          background: 'var(--background)',
          padding: '32px'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              marginBottom: '16px', 
              color: 'var(--error)' 
            }}>
              ⚠️ Database Error
            </h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              Failed to initialize the local database: {timeTracker.error}
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
      <main className="main-content" data-testid="main-content">
        {renderContent()}
      </main>
    </div>
  );
}