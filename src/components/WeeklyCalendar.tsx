import React, { useState } from 'react';
import { TimeEntry, Project } from '../types';
import { formatTimeRange } from '../utils/dateUtils';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { CalendarEvent } from '../services/calendarIntegration';

interface WeeklyCalendarProps {
  entries: TimeEntry[];
  projects: Project[];
  onUpdateEntry: (id: string, updates: Partial<TimeEntry>) => void;
  onDeleteEntry: (id: string) => void;
  onAddEntry?: (entry: Omit<TimeEntry, 'id'>) => void;
}

const getDayOfWeek = (date: string) => {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dateObj = new Date(date + 'T00:00:00'); // Ensure proper date parsing
  const jsDay = dateObj.getDay();
  
  const workDayMap: { [key: number]: number } = {
    1: 0, // Monday
    2: 1, // Tuesday  
    3: 2, // Wednesday
    4: 3, // Thursday
    5: 4  // Friday
  };
  
  const workDay = workDayMap[jsDay];
  return workDay !== undefined ? dayNames[workDay] : null;
};

const getWeekDates = (currentDate: Date) => {
  const week = [];
  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0); // Reset time to avoid timezone issues
  const jsDay = current.getDay();
  
  // Calculate days to Monday (0=Sunday, 1=Monday, etc.)
  let daysToMonday;
  if (jsDay === 0) { // Sunday
    daysToMonday = 6;
  } else {
    daysToMonday = jsDay - 1;
  }
  
  // Get Monday of the current week
  const monday = new Date(current);
  monday.setDate(current.getDate() - daysToMonday);
  
  // Generate all 5 weekdays (Monday through Friday)
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    week.push(`${year}-${month}-${day}`);
  }
  
  return week;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  entries,
  projects,
  onUpdateEntry,
  onDeleteEntry,
  onAddEntry
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [newDuration, setNewDuration] = useState(0);
  
  // Calendar events integration
  const { getEventsForDate } = useCalendarEvents();
  
  const weekDates = getWeekDates(currentWeek);
  
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    return weekDates.includes(todayString);
  };
  
  const getEntriesForDate = (date: string) => {
    return entries.filter(entry => entry.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const renderCalendarEvent = (event: CalendarEvent) => {
    const startTime = new Date(event.start).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const endTime = new Date(event.end).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);

    return (
      <div key={`calendar-${event.id}`} className="calendar-event-card">
        <div className="entry-header">
          <div className="entry-time">
            {startTime} - {endTime}
          </div>
          <div className="entry-duration">
            {formatHours(duration)}
          </div>
        </div>
        
        <div className="entry-content">
          <div className="entry-client">
            <div 
              className="client-dot"
              style={{ backgroundColor: '#4285F4' }}
            />
            <span className="client-name">📅 Calendar Event</span>
          </div>
          <div className="entry-project">{event.title}</div>
          {event.description && (
            <div className="entry-description">{event.description}</div>
          )}
          
          <div className="entry-meta">
            <div className="source-badge">
              <span>📅</span>
              <span>Google Calendar</span>
            </div>
            {event.attendees && event.attendees.length > 0 && (
              <span className="meeting-attendees">
                {event.attendees.length} attendees
              </span>
            )}
            {event.location && (
              <span className="meeting-location">
                📍 {event.location}
              </span>
            )}
          </div>
        </div>
        
        <div className="entry-actions">
          <button 
            className="btn btn-small btn-primary"
            onClick={() => convertCalendarEventToTimeEntry(event)}
            title="Convert to time entry"
          >
            ➕ Track Time
          </button>
        </div>
      </div>
    );
  };
  
  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };
  
  const getTotalHoursForDay = (date: string) => {
    return getEntriesForDate(date).reduce((sum, entry) => sum + entry.duration, 0);
  };
  
  const getTotalHoursForWeek = () => {
    return weekDates.reduce((sum, date) => sum + getTotalHoursForDay(date), 0);
  };
  
  const handleStatusChange = (entryId: string, newStatus: TimeEntry['status']) => {
    onUpdateEntry(entryId, { status: newStatus });
  };

  const handleEditDuration = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setNewDuration(entry.duration);
    setShowDurationModal(true);
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + (duration * 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const saveDurationChange = () => {
    if (editingEntry && newDuration > 0) {
      const endTime = calculateEndTime(editingEntry.startTime, newDuration);
      onUpdateEntry(editingEntry.id, { 
        duration: newDuration,
        endTime: endTime
      });
      setShowDurationModal(false);
      setEditingEntry(null);
    }
  };

  const adjustDuration = (increment: number) => {
    const adjusted = Math.max(0.25, newDuration + increment); // Minimum 15 minutes
    setNewDuration(Math.round(adjusted * 4) / 4); // Round to nearest 15-minute increment
  };

  const convertCalendarEventToTimeEntry = (event: CalendarEvent) => {
    if (!onAddEntry) {
      console.warn('onAddEntry prop not provided, cannot convert calendar event');
      return;
    }

    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    
    // Extract client and project from event title or attendees
    const { client, project } = extractClientAndProject(event);
    
    const timeEntry: Omit<TimeEntry, 'id'> = {
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
      duration: duration,
      client: client,
      project: project,
      description: event.description || event.title,
      category: 'meeting',
      status: 'pending',
      automated: true,
      source: 'calendar',
      meetingType: determineMeetingType(event),
      billable: true, // Default to billable, user can change
      tags: event.attendees ? [`${event.attendees.length} attendees`] : undefined
    };

    onAddEntry(timeEntry);
    console.log('✅ Converted calendar event to time entry:', event.title);
  };

  const extractClientAndProject = (event: CalendarEvent): { client: string; project: string } => {
    // Try to extract client/project from event title
    const title = event.title.toLowerCase();
    
    // Look for existing projects in the title
    const matchedProject = projects.find(project => 
      title.includes(project.name.toLowerCase())
    );
    
    if (matchedProject) {
      return {
        client: matchedProject.client,
        project: matchedProject.name
      };
    }
    
    // Try to extract from attendees email domains by matching against project client names
    if (event.attendees && event.attendees.length > 0) {
      for (const attendee of event.attendees) {
        const domain = attendee.split('@')[1];
        if (domain) {
          const domainProject = projects.find(project => 
            project.client.toLowerCase().includes(domain.split('.')[0])
          );
          if (domainProject) {
            return {
              client: domainProject.client,
              project: 'General Meeting'
            };
          }
        }
      }
    }
    
    // Default fallback - use first project if available
    const defaultProject = projects[0];
    return {
      client: defaultProject?.client || 'External',
      project: defaultProject?.name || 'Calendar Meeting'
    };
  };

  const determineMeetingType = (event: CalendarEvent): TimeEntry['meetingType'] => {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    const text = `${title} ${description}`;
    
    if (text.includes('kickoff') || text.includes('kick-off')) return 'kickoff';
    if (text.includes('discovery') || text.includes('discovery')) return 'discovery';
    if (text.includes('implementation') || text.includes('implement')) return 'implementation';
    if (text.includes('support') || text.includes('help')) return 'support';
    if (text.includes('training') || text.includes('onboarding')) return 'training';
    if (text.includes('check-in') || text.includes('checkin') || text.includes('status')) return 'check-in';
    if (text.includes('escalation') || text.includes('urgent')) return 'escalation';
    
    return 'check-in'; // Default
  };

  const formatDurationHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status: TimeEntry['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'submitted': return '#3b82f6';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPendingEntriesCount = () => {
    return entries.filter(e => weekDates.includes(e.date) && e.status === 'pending').length;
  };

  const canSubmitWeek = () => {
    const weekEntries = entries.filter(e => weekDates.includes(e.date));
    return weekEntries.length > 0 && weekEntries.every(e => e.status === 'approved');
  };

  const handleSubmitWeek = () => {
    const weekEntries = entries.filter(e => weekDates.includes(e.date) && e.status === 'approved');
    weekEntries.forEach(entry => {
      onUpdateEntry(entry.id, { status: 'submitted' });
    });
  };

  const weekStart = new Date(weekDates[0]);
  const weekEnd = new Date(weekDates[4]); // Friday is now the last day
  const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Weekly Timesheet</h1>
          <p className="dashboard-subtitle">
            Review and submit your automatically tracked time
          </p>
        </div>
        <div className="week-navigation">
          <button 
            className="btn btn-secondary"
            onClick={() => navigateWeek('prev')}
          >
            ← Previous Week
          </button>
          {!isCurrentWeek() && (
            <button 
              className="btn btn-primary"
              onClick={goToCurrentWeek}
            >
              📅 Current Week
            </button>
          )}
          <span className="week-range">{weekRange}</span>
          <button 
            className="btn btn-secondary"
            onClick={() => navigateWeek('next')}
          >
            Next Week →
          </button>
        </div>
        
        <div className="add-entry-section">
          <button 
            className="btn btn-primary add-entry-btn"
            onClick={() => {
              // Create a new time entry for today
              if (onAddEntry) {
                const today = new Date().toISOString().split('T')[0];
                const now = new Date();
                const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                const endTime = `${(now.getHours() + 1).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                
                onAddEntry({
                  date: today,
                  startTime,
                  endTime,
                  duration: 1,
                  client: projects[0]?.client || 'New Client',
                  project: projects[0]?.name || 'New Project',
                  description: 'New time entry',
                  category: 'client',
                  status: 'pending',
                  automated: false,
                  billable: true
                });
              }
            }}
          >
            ➕ Add Entry
          </button>
        </div>
      </div>

      <div className="week-summary">
        <div className="summary-card">
          <div className="summary-label">Total Hours This Week</div>
          <div className="summary-value">{formatHours(getTotalHoursForWeek())}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Customer-Focused Hours</div>
          <div className="summary-value">
            {formatHours(entries.filter(e => weekDates.includes(e.date) && e.billable).reduce((sum, e) => sum + e.duration, 0))}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Utilization Rate</div>
          <div className="summary-value">
            {getTotalHoursForWeek() > 0 ? ((entries.filter(e => weekDates.includes(e.date) && e.billable).reduce((sum, e) => sum + e.duration, 0) / getTotalHoursForWeek()) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="summary-card submit-entries-card">
          <button 
            className="btn btn-primary submit-entries-btn"
            onClick={() => {
              // Submit all pending entries for approval
              const pendingEntries = entries.filter(e => weekDates.includes(e.date) && e.status === 'pending');
              pendingEntries.forEach(entry => {
                onUpdateEntry(entry.id, { status: 'submitted' });
              });
            }}
            disabled={getPendingEntriesCount() === 0}
          >
            📝 Submit Entries ({getPendingEntriesCount()})
          </button>
        </div>
        <div className="summary-card">
          <div className="summary-label">Automated Entries</div>
          <div className="summary-value">
            {entries.filter(e => weekDates.includes(e.date) && e.automated).length}
          </div>
        </div>
        <div className="submit-actions">
          {isCurrentWeek() ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                className={`btn ${canSubmitWeek() ? 'btn-primary' : 'btn-secondary'}`}
                onClick={canSubmitWeek() ? handleSubmitWeek : undefined}
                disabled={!canSubmitWeek()}
                title={canSubmitWeek() ? 'Submit all approved entries for manager review' : `You have ${getPendingEntriesCount()} pending entries. Please approve all entries before submitting.`}
              >
                {canSubmitWeek() ? '📋 Submit Week for Review' : `⏳ ${getPendingEntriesCount()} Pending Entries`}
              </button>
              {!canSubmitWeek() && getPendingEntriesCount() > 0 && (
                <div className="tooltip-warning" style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--warning)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  marginBottom: '8px',
                  opacity: 0,
                  animation: 'fadeIn 0.3s ease-in-out 2s forwards'
                }}>
                  Please approve all entries before submitting
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-secondary" disabled>
              {weekDates[0] > new Date().toISOString().split('T')[0] ? '📅 Future Week' : 
               entries.filter(e => weekDates.includes(e.date) && e.status === 'submitted').length > 0 ? '📋 Submitted' : '✅ Past Week'}
            </button>
          )}
        </div>
      </div>

      <div className="weekly-grid">
        {weekDates.map(date => {
          const dayEntries = getEntriesForDate(date);
          const dayCalendarEvents = getEventsForDate(date);
          const totalHours = getTotalHoursForDay(date);
          const isToday = date === new Date().toISOString().split('T')[0];
          
          const isPast = date < new Date().toISOString().split('T')[0];
          const isFuture = date > new Date().toISOString().split('T')[0];
          
          const dayName = getDayOfWeek(date);
          if (!dayName) return null; // Skip weekend days
          
          return (
            <div key={date} className={`day-column ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}>
              <div className="day-header">
                <div className="day-info">
                  <div className="day-name">{getDayOfWeek(date)}</div>
                  <div className="day-date">{formatDate(date)}</div>
                </div>
                <div className="day-total">
                  {totalHours > 0 && (
                    <span className="hours-badge">{formatHours(totalHours)}</span>
                  )}
                  {isFuture && totalHours === 0 && (
                    <span className="future-indicator">📅</span>
                  )}
                </div>
              </div>
              
              <div className="day-entries">
                {/* Render Calendar Events First */}
                {dayCalendarEvents.map(event => renderCalendarEvent(event))}
                
                {/* Render Time Entries */}
                {dayEntries.length === 0 && dayCalendarEvents.length === 0 ? (
                  <div className="no-entries">
                    {isFuture ? (
                      <>
                        <span>📅</span>
                        <p>Upcoming - no meetings scheduled</p>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <p>No automated entries detected</p>
                      </>
                    )}
                  </div>
                ) : (
                  dayEntries.map(entry => {
                    const project = projects.find(p => p.name === entry.project);
                    
                    return (
                      <div key={entry.id} className="time-entry-card">
                        <div className="entry-header">
                          <div className="entry-time">
                            {formatTimeRange(entry.startTime, entry.endTime)}
                          </div>
                          <div className="entry-duration">
                            {formatHours(entry.duration)}
                          </div>
                        </div>
                        
                        <div className="entry-content">
                          <div className="entry-client">
                            <div 
                              className="client-dot"
                              style={{ backgroundColor: project?.color || '#gray' }}
                            />
                            <span className="client-name">{entry.client}</span>
                          </div>
                          <div className="entry-project">{entry.project}</div>
                          <div className="entry-description">{entry.description}</div>
                          
                          <div className="entry-meta">
                            {entry.automated && (
                              <div className="source-badge">
                                <span>🤖</span>
                                <span>{entry.source || 'Auto'}</span>
                              </div>
                            )}
                            {entry.meetingType && (
                              <span className="meeting-type">
                                {entry.meetingType.replace('-', ' ')}
                              </span>
                            )}
                            <span className={`billable-badge ${entry.billable ? 'billable' : 'non-billable'}`}>
                              {entry.billable ? 'Billable' : 'Non-billable'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="entry-actions">
                          <select
                            value={entry.status === 'submitted' || entry.status === 'rejected' ? 'approved' : entry.status}
                            onChange={(e) => handleStatusChange(entry.id, e.target.value as TimeEntry['status'])}
                            className="status-select"
                            style={{ borderColor: getStatusColor(entry.status) }}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                          </select>
                          <button 
                            className="btn btn-small btn-secondary"
                            onClick={() => handleEditDuration(entry)}
                            title="Edit duration"
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn btn-small btn-danger"
                            onClick={() => {
                              if (confirm('Delete this entry?')) {
                                onDeleteEntry(entry.id);
                              }
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Duration Edit Modal */}
      {showDurationModal && editingEntry && (
        <div className="modal-overlay" onClick={() => setShowDurationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Duration</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDurationModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Entry Preview */}
              <div style={{ background: 'var(--background-secondary)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {editingEntry.project} • {editingEntry.client}
                </h4>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {new Date(editingEntry.date).toLocaleDateString()} • {formatTimeRange(editingEntry.startTime, editingEntry.endTime)}
                  <br />
                  {editingEntry.description}
                </div>
              </div>

              {/* Duration Controls */}
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: 'var(--text-primary)' }}>
                  Adjust Time Duration
                </h4>
                
                {/* Current Duration Display */}
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '700', 
                  color: 'var(--brand-primary)', 
                  marginBottom: '24px',
                  padding: '16px',
                  background: 'var(--brand-primary-light)',
                  borderRadius: '12px',
                  border: '2px solid var(--brand-primary)'
                }}>
                  {formatDurationHours(newDuration)}
                </div>

                {/* Quick Adjustment Buttons */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '12px', 
                  marginBottom: '24px',
                  maxWidth: '300px',
                  margin: '0 auto 24px auto'
                }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => adjustDuration(-0.25)}
                    disabled={newDuration <= 0.25}
                    style={{ fontSize: '16px', padding: '12px' }}
                  >
                    − 15min
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => adjustDuration(0.25)}
                    style={{ fontSize: '16px', padding: '12px' }}
                  >
                    + 15min
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => adjustDuration(-0.5)}
                    disabled={newDuration <= 0.5}
                    style={{ fontSize: '16px', padding: '12px' }}
                  >
                    − 30min
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => adjustDuration(0.5)}
                    style={{ fontSize: '16px', padding: '12px' }}
                  >
                    + 30min
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => adjustDuration(-1)}
                    disabled={newDuration <= 1}
                    style={{ fontSize: '16px', padding: '12px' }}
                  >
                    − 1hr
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => adjustDuration(1)}
                    style={{ fontSize: '16px', padding: '12px' }}
                  >
                    + 1hr
                  </button>
                </div>

                {/* Precise Input */}
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Or set exact duration (hours):
                  </label>
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    value={newDuration}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0.25;
                      setNewDuration(Math.max(0.25, Math.round(value * 4) / 4));
                    }}
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '16px' }}
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Minimum 15 minutes (0.25 hours)
                  </small>
                </div>

                {/* New End Time Preview */}
                <div style={{ 
                  background: 'var(--info-light)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}>
                  <p style={{ fontSize: '14px', color: 'var(--info-dark)', margin: 0 }}>
                    <strong>New time range:</strong> {editingEntry.startTime} - {calculateEndTime(editingEntry.startTime, newDuration)}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDurationModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveDurationChange}
                disabled={newDuration <= 0}
              >
                Save Duration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};