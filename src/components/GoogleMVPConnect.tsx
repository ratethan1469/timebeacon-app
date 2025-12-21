import React, { useState, useEffect } from 'react';
import { googleMVP } from '../services/googleMVPIntegration';

export const GoogleMVPConnect: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStats, setSyncStats] = useState<{ events: number; emails: number } | null>(null);

  useEffect(() => {
    // Check auth status on mount
    const isAuth = googleMVP.isAuthenticated();
    setIsConnected(isAuth);

    // If just connected (has tokens but no sync stats), auto-sync
    if (isAuth && !syncStats) {
      console.log('📡 Auto-syncing after OAuth...');
      handleSync();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async () => {
    const success = await googleMVP.authenticate();
    setIsConnected(success);

    if (success) {
      // Auto-sync after connection
      handleSync();
    }
  };

  const handleDisconnect = () => {
    googleMVP.signOut();
    setIsConnected(false);
    setSyncStats(null);
    setLastSync(null);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const stats = await googleMVP.syncAndProcess();
      setSyncStats(stats);
      setLastSync(new Date());
      console.log('✅ Sync complete:', stats);
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #4285F4, #34A853)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          🔵
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Google Workspace
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Calendar + Gmail Integration
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: isConnected ? 'var(--success-light)' : 'var(--warning-light)',
        border: `1px solid ${isConnected ? 'var(--success)' : 'var(--warning)'}`,
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <span style={{ fontSize: '20px' }}>{isConnected ? '✅' : '⚠️'}</span>
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>
            {isConnected ? 'Connected' : 'Not Connected'}
          </div>
          {lastSync && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Last synced: {lastSync.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Sync Stats */}
      {syncStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '16px',
            background: 'var(--background-secondary)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--brand-primary)' }}>
              {syncStats.events}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Calendar Events
            </div>
          </div>
          <div style={{
            padding: '16px',
            background: 'var(--background-secondary)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--brand-primary)' }}>
              {syncStats.emails}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Email Threads
            </div>
          </div>
        </div>
      )}

      {/* What Gets Synced */}
      <div style={{
        padding: '16px',
        background: 'var(--background-secondary)',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
          What gets synced:
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
          <li>📅 <strong>Calendar Events</strong>: Meetings from the last 7 days</li>
          <li>📧 <strong>Gmail Threads</strong>: Email conversations from the last 7 days</li>
          <li>🤖 <strong>AI Processing</strong>: Automatic time entry suggestions</li>
        </ul>
      </div>

      {/* Privacy Note */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--info-light)',
        border: '1px solid var(--info)',
        borderRadius: '8px',
        fontSize: '12px',
        marginBottom: '20px',
        lineHeight: '1.6'
      }}>
        <strong>🔒 Privacy First:</strong> All data is processed locally in your browser.
        We never store your raw emails or calendar data on our servers.
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '15px', padding: '12px' }}
          >
            🔗 Connect Google Account
          </button>
        ) : (
          <>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '15px', padding: '12px' }}
            >
              {isSyncing ? '🔄 Syncing...' : '🔄 Sync Now'}
            </button>
            <button
              onClick={handleDisconnect}
              className="btn btn-secondary"
              style={{ fontSize: '15px', padding: '12px' }}
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
};
