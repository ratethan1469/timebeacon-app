import React, { useState, useEffect } from 'react';
import { emailTimeTracker } from '../services/emailTimeTracking';

interface EmailTimeReviewProps {
  onReviewComplete?: () => void;
}

export const EmailTimeReview: React.FC<EmailTimeReviewProps> = ({ onReviewComplete }) => {
  const [emailsNeedingReview, setEmailsNeedingReview] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmailsNeedingReview();
  }, []);

  const loadEmailsNeedingReview = () => {
    setIsLoading(true);
    const emails = emailTimeTracker.getEmailsNeedingReview();
    setEmailsNeedingReview(emails);
    setIsLoading(false);
  };

  const confirmEmailTime = (emailTimeId: string, confirmedMinutes: number) => {
    emailTimeTracker.confirmEmailTime(emailTimeId, confirmedMinutes);
    loadEmailsNeedingReview(); // Refresh list
    if (onReviewComplete) {
      onReviewComplete();
    }
  };


  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading email time reviews...</div>
      </div>
    );
  }

  if (emailsNeedingReview.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <div style={{ fontSize: '14px', color: '#166534' }}>
          ✅ All email times look good! No reviews needed.
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      margin: '20px 0'
    }}>
      <div style={{ 
        padding: '20px 24px 16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h3 style={{ 
          margin: '0 0 4px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827'
        }}>
          📧 Email Time Review
        </h3>
        <p style={{ 
          margin: 0,
          fontSize: '14px',
          color: '#6b7280'
        }}>
          {emailsNeedingReview.length} email{emailsNeedingReview.length !== 1 ? 's' : ''} need time confirmation
        </p>
      </div>

      <div style={{ padding: '16px 24px 24px' }}>
        {emailsNeedingReview.map((email, index) => (
          <EmailTimeReviewCard 
            key={email.id} 
            email={email} 
            onConfirm={confirmEmailTime}
            isLast={index === emailsNeedingReview.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

interface EmailTimeReviewCardProps {
  email: any;
  onConfirm: (emailTimeId: string, minutes: number) => void;
  isLast: boolean;
}

const EmailTimeReviewCard: React.FC<EmailTimeReviewCardProps> = ({ email, onConfirm, isLast }) => {
  const [adjustedMinutes, setAdjustedMinutes] = useState(email.finalMinutes);
  const confidence = Math.round(email.confidence * 100);
  const confidenceColor = confidence >= 80 ? '#10b981' : confidence >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      padding: '16px 0',
      borderBottom: isLast ? 'none' : '1px solid #f3f4f6'
    }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '500',
          color: '#111827',
          marginBottom: '4px'
        }}>
          {email.subject}
        </div>
        <div style={{ 
          fontSize: '13px',
          color: '#6b7280',
          marginBottom: '8px'
        }}>
          From: {email.sender} • {new Date(email.timestamp).toLocaleDateString()}
        </div>
        <div style={{
          fontSize: '12px',
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: `${confidenceColor}15`,
          color: confidenceColor,
          border: `1px solid ${confidenceColor}30`
        }}>
          {confidence}% confidence
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <label style={{ 
            fontSize: '14px', 
            color: '#374151',
            fontWeight: '500' 
          }}>
            Time spent:
          </label>
          <input
            type="number"
            min="1"
            max="240"
            value={adjustedMinutes}
            onChange={(e) => setAdjustedMinutes(parseInt(e.target.value) || 0)}
            style={{
              width: '80px',
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              textAlign: 'center'
            }}
          />
          <span style={{ fontSize: '14px', color: '#6b7280' }}>minutes</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onConfirm(email.id, adjustedMinutes)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            ✓ Confirm
          </button>
          
          <button
            onClick={() => {
              setAdjustedMinutes(email.estimatedMinutes);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {email.wordCount && (
        <div style={{
          fontSize: '12px',
          color: '#9ca3af',
          marginTop: '8px'
        }}>
          {email.wordCount} words • {email.threadLength > 1 ? `${email.threadLength} messages in thread` : 'Single message'}
        </div>
      )}
    </div>
  );
};