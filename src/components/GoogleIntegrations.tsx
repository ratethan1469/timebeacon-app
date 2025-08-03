/**
 * Google Integrations Component
 * Allows users to connect and manage Google service integrations
 */

import { useState, useEffect } from 'react';
import { googleIntegrationsService, GoogleAccount, GoogleActivity } from '../services/googleIntegrations';
import { activitySyncService, PendingEntry } from '../services/activitySync';

interface IntegrationStatus {
  gmail: boolean;
  calendar: boolean;
  docs: boolean;
  sheets: boolean;
}

export default function GoogleIntegrations() {
  const [account, setAccount] = useState<GoogleAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activities, setActivities] = useState<GoogleActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [enabledServices, setEnabledServices] = useState<IntegrationStatus>({
    gmail: true,
    calendar: true,
    docs: true,
    sheets: true,
  });

  useEffect(() => {
    // Check if already connected
    const storedAccount = googleIntegrationsService.getStoredAccount();
    setAccount(storedAccount);
    
    // Load sync settings
    const syncSettings = activitySyncService.getSyncSettings();
    setSyncEnabled(syncSettings.enabled);
    
    if (storedAccount) {
      loadRecentActivities();
      loadPendingEntries();
      
      // Start auto sync if enabled
      if (syncSettings.enabled) {
        activitySyncService.startAutoSync();
      }
    }
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const connectedAccount = await googleIntegrationsService.authenticate();
      setAccount(connectedAccount);
      await loadRecentActivities();
    } catch (error) {
      console.error('Connection failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to connect to Google');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    googleIntegrationsService.disconnect();
    setAccount(null);
    setActivities([]);
  };

  const loadRecentActivities = async () => {
    setIsLoadingActivities(true);
    try {
      const recentActivities = await googleIntegrationsService.fetchAllActivities(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      );
      setActivities(recentActivities.slice(0, 10)); // Show latest 10
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const loadPendingEntries = () => {
    const pending = activitySyncService.getPendingEntries();
    setPendingEntries(pending);
  };

  const handleSyncToggle = (enabled: boolean) => {
    setSyncEnabled(enabled);
    activitySyncService.updateSyncSettings({ enabled });
    
    if (enabled) {
      activitySyncService.startAutoSync();
    } else {
      activitySyncService.stopAutoSync();
    }
  };

  const handleManualSync = async () => {
    try {
      const result = await activitySyncService.performSync();
      console.log('Sync completed:', result);
      await loadRecentActivities();
      loadPendingEntries();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleApprovePending = async (tempId: string) => {
    try {
      await activitySyncService.approvePendingEntry(tempId);
      loadPendingEntries();
    } catch (error) {
      console.error('Failed to approve entry:', error);
    }
  };

  const handleRejectPending = (tempId: string) => {
    activitySyncService.rejectPendingEntry(tempId);
    loadPendingEntries();
  };

  const toggleService = (service: keyof IntegrationStatus) => {
    setEnabledServices(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'gmail':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'docs':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'sheets':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a2 2 0 012-2h14a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'gmail': return 'bg-red-100 text-red-800';
      case 'calendar': return 'bg-blue-100 text-blue-800';
      case 'docs': return 'bg-blue-100 text-blue-800';
      case 'sheets': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Google Integrations
          </h2>
          <p className="text-gray-600">
            Connect your Google account to automatically track activities across Gmail, Calendar, Docs, and Sheets
          </p>
        </div>

        <div className="p-6">
          {!account ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Connect Your Google Account
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Automatically track time spent on emails, meetings, documents, and spreadsheets by connecting your Google account.
              </p>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect with Google
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Status */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <img
                    src={account.picture}
                    alt={account.name}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <h3 className="font-medium text-green-900">{account.name}</h3>
                    <p className="text-sm text-green-700">{account.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Sync Controls */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Activity Sync
                </h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Automatic Time Tracking</h4>
                    <p className="text-sm text-gray-600">Automatically convert Google activities to time entries</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleManualSync}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Sync Now
                    </button>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={syncEnabled}
                        onChange={(e) => handleSyncToggle(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Auto-sync</span>
                    </label>
                  </div>
                </div>
                {pendingEntries.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">
                      {pendingEntries.length} activities pending approval
                    </h4>
                    <div className="space-y-2">
                      {pendingEntries.slice(0, 3).map((entry) => (
                        <div key={entry.tempId} className="flex items-center justify-between text-sm">
                          <span className="text-yellow-800">{entry.description}</span>
                          <div className="space-x-2">
                            <button
                              onClick={() => handleApprovePending(entry.tempId)}
                              className="text-green-600 hover:text-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPending(entry.tempId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                      {pendingEntries.length > 3 && (
                        <p className="text-xs text-yellow-700">
                          +{pendingEntries.length - 3} more pending...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Service Toggles */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Enabled Services
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(enabledServices).map(([service, enabled]) => (
                    <label key={service} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleService(service as keyof IntegrationStatus)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex items-center">
                        <div className={`p-2 rounded-lg mr-3 ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                          {getServiceIcon(service)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 capitalize">
                            Google {service}
                          </div>
                          <div className="text-sm text-gray-600">
                            {service === 'gmail' && 'Track email activities'}
                            {service === 'calendar' && 'Track meeting time'}
                            {service === 'docs' && 'Track document editing'}
                            {service === 'sheets' && 'Track spreadsheet work'}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Recent Activities */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Recent Activities
                  </h3>
                  <button
                    onClick={loadRecentActivities}
                    disabled={isLoadingActivities}
                    className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {isLoadingActivities ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {isLoadingActivities ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading activities...</p>
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                              {getServiceIcon(activity.type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{activity.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                              <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                                <span>{new Date(activity.startTime).toLocaleDateString()}</span>
                                <span>{formatDuration(activity.duration || 0)}</span>
                                {activity.suggestedProject && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                    {activity.suggestedProject}
                                  </span>
                                )}
                                {activity.suggestedClient && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                    {activity.suggestedClient}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {(activity.confidence * 100).toFixed(0)}% confident
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    No recent activities found. Activities will appear here as you use Google services.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}