/**
 * Google AI Sync Component
 * UI for triggering Google → AI → Dashboard sync
 */

import React, { useState, useEffect } from 'react';
import { googleAiIntegration, type SyncOptions, type SyncResult } from '../services/googleAiIntegration';
import type { ProcessedTimeEntry } from '../services/googleDataProcessor';

interface GoogleAiSyncProps {
  accessToken?: string;
  onEntriesProcessed?: (entries: ProcessedTimeEntry[]) => void;
}

export const GoogleAiSync: React.FC<GoogleAiSyncProps> = ({ 
  accessToken, 
  onEntriesProcessed 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ProcessedTimeEntry[]>([]);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    sources: ['gmail', 'calendar', 'drive'],
    timeRange: 'today',
    autoConfirm: true
  });

  useEffect(() => {
    // Listen for review updates
    const handleReviewNeeded = (event: CustomEvent) => {
      setReviewQueue(event.detail.entries);
    };

    window.addEventListener('timebeacon-review-needed', handleReviewNeeded as EventListener);
    
    // Load existing review queue
    setReviewQueue(googleAiIntegration.getReviewQueue());
    
    return () => {
      window.removeEventListener('timebeacon-review-needed', handleReviewNeeded as EventListener);
    };
  }, []);

  useEffect(() => {
    if (accessToken) {
      googleAiIntegration.setAccessToken(accessToken);
    }
  }, [accessToken]);

  const handleSync = async () => {
    if (!accessToken) {
      alert('Please connect to Google first');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await googleAiIntegration.syncGoogleDataWithAI(syncOptions);
      setLastResult(result);
      
      if (result.success && onEntriesProcessed) {
        onEntriesProcessed(result.entries);
      }
      
      if (!result.success) {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync failed - check console for details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveEntry = async (entryId: string) => {
    await googleAiIntegration.approveReviewedEntry(entryId);
    setReviewQueue(googleAiIntegration.getReviewQueue());
  };

  const handleRejectEntry = (entryId: string) => {
    const updatedQueue = reviewQueue.filter(entry => entry.id !== entryId);
    localStorage.setItem('timebeacon_review_queue', JSON.stringify(updatedQueue));
    setReviewQueue(updatedQueue);
  };

  return (
    <div className="google-ai-sync">
      <div className="sync-controls">
        <h3>🤖 AI-Powered Google Sync</h3>
        
        {/* Sync Options */}
        <div className="sync-options">
          <div className="option-group">
            <label>Data Sources:</label>
            <div className="checkbox-group">
              {['gmail', 'calendar', 'drive'].map(source => (
                <label key={source}>
                  <input
                    type="checkbox"
                    checked={syncOptions.sources.includes(source as any)}
                    onChange={(e) => {
                      const sources = e.target.checked
                        ? [...syncOptions.sources, source as any]
                        : syncOptions.sources.filter(s => s !== source);
                      setSyncOptions({ ...syncOptions, sources });
                    }}
                  />
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </label>
              ))}
            </div>
          </div>
          
          <div className="option-group">
            <label>Time Range:</label>
            <select
              value={syncOptions.timeRange}
              onChange={(e) => setSyncOptions({ 
                ...syncOptions, 
                timeRange: e.target.value as any 
              })}
            >
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
          </div>
          
          <div className="option-group">
            <label>
              <input
                type="checkbox"
                checked={syncOptions.autoConfirm}
                onChange={(e) => setSyncOptions({ 
                  ...syncOptions, 
                  autoConfirm: e.target.checked 
                })}
              />
              Auto-confirm high confidence entries (&gt;80%)
            </label>
          </div>
        </div>
        
        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={isLoading || !accessToken}
          className="sync-button"
        >
          {isLoading ? '🔄 Processing...' : '🚀 Sync Google Data with AI'}
        </button>
        
        {/* Last Result */}
        {lastResult && (
          <div className={`sync-result ${lastResult.success ? 'success' : 'error'}`}>
            {lastResult.success ? (
              <>
                ✅ Processed {lastResult.processed} items
                {lastResult.failed > 0 && <span> ({lastResult.failed} failed)</span>}
              </>
            ) : (
              <>❌ {lastResult.error}</>
            )}
          </div>
        )}
      </div>
      
      {/* Review Queue */}
      {reviewQueue.length > 0 && (
        <div className="review-queue">
          <h4>📋 Entries Needing Review ({reviewQueue.length})</h4>
          <div className="review-items">
            {reviewQueue.map(entry => (
              <div key={entry.id} className="review-item">
                <div className="entry-info">
                  <div className="entry-title">{entry.description}</div>
                  <div className="entry-meta">
                    {entry.client} • {entry.project} • {entry.duration}h
                    <span className={`confidence ${entry.aiAnalysis.confidence >= 0.7 ? 'medium' : 'low'}`}>
                      {Math.round(entry.aiAnalysis.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="ai-reasoning">{entry.aiAnalysis.reasoning}</div>
                </div>
                <div className="review-actions">
                  <button
                    onClick={() => handleApproveEntry(entry.id)}
                    className="approve-btn"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleRejectEntry(entry.id)}
                    className="reject-btn"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <style>{`
        .google-ai-sync {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
        }
        
        .sync-options {
          display: flex;
          gap: 20px;
          margin: 16px 0;
          flex-wrap: wrap;
        }
        
        .option-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .checkbox-group {
          display: flex;
          gap: 12px;
        }
        
        .sync-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .sync-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        
        .sync-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .sync-result {
          margin-top: 12px;
          padding: 12px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .sync-result.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .sync-result.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .review-queue {
          margin-top: 24px;
          border-top: 1px solid #dee2e6;
          padding-top: 20px;
        }
        
        .review-item {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .entry-info {
          flex: 1;
        }
        
        .entry-title {
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .entry-meta {
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .confidence {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .confidence.medium {
          background: #fff3cd;
          color: #856404;
        }
        
        .confidence.low {
          background: #f8d7da;
          color: #721c24;
        }
        
        .ai-reasoning {
          font-size: 12px;
          color: #495057;
          font-style: italic;
        }
        
        .review-actions {
          display: flex;
          gap: 8px;
        }
        
        .approve-btn, .reject-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .approve-btn {
          background: #28a745;
          color: white;
        }
        
        .reject-btn {
          background: #dc3545;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default GoogleAiSync;