import React, { useState } from 'react';
import { TimeEntry, Project } from '../types';
import { formatTimeRange } from '../utils/dateUtils';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { CalendarEvent } from '../services/calendarIntegration';

interface DashboardProps {
  entries: TimeEntry[];
  projects: Project[];
  onUpdateEntry: (id: string, updates: Partial<TimeEntry>) => void;
  onDeleteEntry: (id: string) => void;
  onAddEntry?: (entry: Omit<TimeEntry, 'id'>) => void;
}

const getDayOfWeek = (date: string) => {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dateObj = new Date(date + 'T00:00:00'); // Force consistent parsing
  const jsDay = dateObj.getDay(); // 0=Sunday, 1=Monday, etc.
  
  // Map JavaScript days to workweek days
  // JS: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
  // We want: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4
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
  
  // Calculate days to go back to Monday
  let daysToMonday;
  if (jsDay === 0) { // Sunday
    daysToMonday = 6;
  } else { // Monday-Saturday
    daysToMonday = jsDay - 1;
  }
  
  // Get Monday of this week
  const monday = new Date(current);
  monday.setDate(current.getDate() - daysToMonday);
  
  // Generate Monday through Friday using local date formatting to avoid timezone issues
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

export const Dashboard: React.FC<DashboardProps> = ({
  entries,
  projects,
  onUpdateEntry,
  onDeleteEntry,
  onAddEntry
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newDuration, setNewDuration] = useState(0);
  const [newDescription, setNewDescription] = useState('');
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatingEntry, setDuplicatingEntry] = useState<TimeEntry | null>(null);
  const [duplicateSettings, setDuplicateSettings] = useState({
    frequency: 'weekly' as 'weekly' | 'daily' | 'monthly',
    count: 4,
    skipWeekends: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [addEntryForm, setAddEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    duration: 1,
    project: '',
    description: '',
    billable: true,
    createSeries: false,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    repeatCount: 4,
    skipWeekends: false
  });

  // Memoize form update function to prevent unnecessary re-renders
  const updateAddEntryForm = React.useCallback((updates: Partial<typeof addEntryForm>) => {
    setAddEntryForm(prev => ({ ...prev, ...updates }));
  }, []);

  // Stable modal close handlers
  const closeAddEntryModal = React.useCallback(() => {
    setShowAddEntryModal(false);
  }, []);

  const closeDuplicateModal = React.useCallback(() => {
    if (!isGenerating) {
      setShowDuplicateModal(false);
      setDuplicatingEntry(null);
    }
  }, [isGenerating]);
  
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
          <div className="entry-source">
            <div 
              className="source-dot"
              style={{ backgroundColor: '#4285F4' }}
            />
            <span className="source-name"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Calendar Event</span>
          </div>
          <div className="entry-project">{event.title}</div>
          {event.description && (
            <div className="entry-description">{event.description}</div>
          )}
          
          <div className="entry-meta">
            <div className="source-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>Google Calendar</span>
            </div>
            {event.attendees && event.attendees.length > 0 && (
              <span className="meeting-attendees">
                {event.attendees.length} attendees
              </span>
            )}
            {event.location && (
              <span className="meeting-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>{event.location}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>Track Time
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

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setNewDuration(entry.duration);
    setNewDescription(entry.description);
    setShowEditModal(true);
  };

  const saveEntryChanges = () => {
    if (editingEntry && newDescription.trim() && newDuration > 0) {
      const endTime = calculateEndTime(editingEntry.startTime, newDuration);
      onUpdateEntry(editingEntry.id, { 
        description: newDescription.trim(),
        duration: newDuration,
        endTime: endTime
      });
      setShowEditModal(false);
      setEditingEntry(null);
      setNewDescription('');
      setNewDuration(0);
    }
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + (duration * 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };


  const adjustDuration = (increment: number) => {
    const adjusted = Math.max(0.25, newDuration + increment); // Minimum 15 minutes
    setNewDuration(Math.round(adjusted * 4) / 4); // Round to nearest 15-minute increment
  };

  const generateRecurringEntries = (baseEntry: Omit<TimeEntry, 'id'>, settings: {
    frequency: 'daily' | 'weekly' | 'monthly';
    count: number;
    skipWeekends: boolean;
  }) => {
    const entries: Omit<TimeEntry, 'id'>[] = [];
    const startDate = new Date(baseEntry.date);
    
    for (let i = 0; i < settings.count; i++) {
      const currentDate = new Date(startDate);
      
      // Calculate date based on frequency
      switch (settings.frequency) {
        case 'daily':
          currentDate.setDate(startDate.getDate() + i);
          break;
        case 'weekly':
          currentDate.setDate(startDate.getDate() + (i * 7));
          break;
        case 'monthly':
          currentDate.setMonth(startDate.getMonth() + i);
          break;
      }
      
      // Skip weekends if enabled
      if (settings.skipWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
        // Move to next Monday for weekend dates
        const daysToAdd = currentDate.getDay() === 0 ? 1 : 2;
        currentDate.setDate(currentDate.getDate() + daysToAdd);
      }
      
      entries.push({
        ...baseEntry,
        date: currentDate.toISOString().split('T')[0]
      });
    }
    
    return entries;
  };

  const handleAddEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddEntry) return;

    const endTime = calculateEndTime(addEntryForm.startTime, addEntryForm.duration);
    
    if (addEntryForm.createSeries) {
      // Create recurring entries
      const entries = generateRecurringEntries({
        date: addEntryForm.date,
        startTime: addEntryForm.startTime,
        endTime,
        duration: addEntryForm.duration,
        client: addEntryForm.client,
        project: addEntryForm.project,
        description: addEntryForm.description,
        category: 'client',
        status: 'pending',
        automated: false,
        billable: addEntryForm.billable
      }, {
        frequency: addEntryForm.frequency,
        count: addEntryForm.repeatCount,
        skipWeekends: addEntryForm.skipWeekends
      });

      entries.forEach(entry => onAddEntry(entry));
    } else {
      // Create single entry
      onAddEntry({
        date: addEntryForm.date,
        startTime: addEntryForm.startTime,
        endTime,
        duration: addEntryForm.duration,
        client: addEntryForm.client,
        project: addEntryForm.project,
        description: addEntryForm.description,
        category: 'client',
        status: 'pending',
        automated: false,
        billable: addEntryForm.billable
      });
    }

    // Reset form and close modal
    setAddEntryForm({
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      duration: 1,
      client: '',
      project: '',
      description: '',
      billable: true,
      createSeries: false,
      frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
      repeatCount: 4,
      skipWeekends: false
    });
    setShowAddEntryModal(false);
  };

  const handleEntrySelect = (entryId: string, checked: boolean) => {
    const newSelected = new Set(selectedEntries);
    if (checked) {
      newSelected.add(entryId);
    } else {
      newSelected.delete(entryId);
    }
    setSelectedEntries(newSelected);
  };


  const handleBulkStatusUpdate = (newStatus: TimeEntry['status']) => {
    selectedEntries.forEach(entryId => {
      onUpdateEntry(entryId, { status: newStatus });
    });
    setSelectedEntries(new Set());
  };

  const handleDuplicate = (entry: TimeEntry) => {
    setDuplicatingEntry(entry);
    setDuplicateSettings({
      frequency: 'weekly',
      count: 4,
      skipWeekends: false
    });
    setShowDuplicateModal(true);
  };

  const generateDuplicates = async () => {
    if (!duplicatingEntry || !onAddEntry) return;

    setIsGenerating(true);
    
    try {
      const duplicates: Omit<TimeEntry, 'id'>[] = [];
      const startDate = new Date(duplicatingEntry.date);
      let actualCount = 0;
      
      for (let i = 1; i <= duplicateSettings.count && actualCount < duplicateSettings.count; i++) {
        const newDate = new Date(startDate);
        
        switch (duplicateSettings.frequency) {
          case 'daily':
            newDate.setDate(startDate.getDate() + i);
            break;
          case 'weekly':
            newDate.setDate(startDate.getDate() + (i * 7));
            break;
          case 'monthly':
            newDate.setMonth(startDate.getMonth() + i);
            break;
        }

        // Skip weekends if option is enabled
        if (duplicateSettings.skipWeekends) {
          const dayOfWeek = newDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Don't count this as one of our duplicates, try next date
            continue;
          }
        }

        duplicates.push({
          ...duplicatingEntry,
          date: newDate.toISOString().split('T')[0],
          status: 'pending' // Reset status for duplicates
        });
        
        actualCount++;
      }

      // Create all duplicate entries with a small delay for smooth UX
      for (const duplicate of duplicates) {
        onAddEntry(duplicate);
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between additions
      }

      // Success feedback
      setTimeout(() => {
        setShowDuplicateModal(false);
        setDuplicatingEntry(null);
        setIsGenerating(false);
      }, 200);
      
    } catch (error) {
      console.error('Error generating duplicates:', error);
      setIsGenerating(false);
    }
  };

  // Helper function to preview upcoming dates
  const getPreviewDates = () => {
    if (!duplicatingEntry) return [];
    
    const startDate = new Date(duplicatingEntry.date);
    const previewDates: Date[] = [];
    let actualCount = 0;
    
    for (let i = 1; i <= duplicateSettings.count && actualCount < Math.min(duplicateSettings.count, 5); i++) {
      const newDate = new Date(startDate);
      
      switch (duplicateSettings.frequency) {
        case 'daily':
          newDate.setDate(startDate.getDate() + i);
          break;
        case 'weekly':
          newDate.setDate(startDate.getDate() + (i * 7));
          break;
        case 'monthly':
          newDate.setMonth(startDate.getMonth() + i);
          break;
      }

      if (duplicateSettings.skipWeekends) {
        const dayOfWeek = newDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }
      }

      previewDates.push(newDate);
      actualCount++;
    }
    
    return previewDates;
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
        client: '',
        project: matchedProject.name
      };
    }
    
    // Try to extract from attendees email domains
    if (event.attendees && event.attendees.length > 0) {
      for (const attendee of event.attendees) {
        const domain = attendee.split('@')[1];
        if (domain) {
          const companyName = domain.split('.')[0];
          return {
            client: '',
            project: `${companyName.charAt(0).toUpperCase() + companyName.slice(1)} - Meeting`
          };
        }
      }
    }
    
    // Default fallback
    return {
      client: '',
      project: 'Calendar Meeting'
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">
              Your weekly time tracking overview with smart automation
            </p>
          </div>
          
          {/* Top Right: Previous Week | Week Listed | Next Week */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '12px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px'
            }}>
              <button 
                className="btn btn-secondary"
                onClick={() => navigateWeek('prev')}
              >
                Previous Week
              </button>
              <span style={{ 
                fontWeight: '600', 
                fontSize: '16px', 
                minWidth: '200px', 
                textAlign: 'center' 
              }}>
                {weekRange}
              </span>
              <button 
                className="btn btn-secondary"
                onClick={() => navigateWeek('next')}
              >
                Next Week
              </button>
            </div>
            
            {/* Bottom Line: Add Entry and Current Week buttons */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px'
            }}>
              <button 
                className="btn btn-primary"
                onClick={() => setShowAddEntryModal(true)}
              >
                Add Entry
              </button>
              {!isCurrentWeek() && (
                <button 
                  className="btn btn-secondary"
                  onClick={goToCurrentWeek}
                >
                  Current Week
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEntries.size > 0 && (
        <div className="content-card" style={{ marginBottom: '24px', background: 'var(--brand-primary-light)', border: '2px solid var(--brand-primary)' }}>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <span style={{ fontWeight: '600', color: 'var(--brand-primary)' }}>
              {selectedEntries.size} entries selected
            </span>
            <button 
              className="btn btn-secondary btn-small"
              onClick={() => handleBulkStatusUpdate('pending')}
            >
              Mark as Pending
            </button>
            <button 
              className="btn btn-primary btn-small"
              onClick={() => handleBulkStatusUpdate('approved')}
            >
              Mark as Approved
            </button>
            <button 
              className="btn btn-secondary btn-small"
              onClick={() => setSelectedEntries(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

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
                {canSubmitWeek() ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><path d="M9 11l3 3 8-8"></path><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.18 0 2.3.23 3.32.64"></path></svg>Submit Week for Review</> : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>{getPendingEntriesCount()} Pending Entries</>}
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
              {weekDates[0] > new Date().toISOString().split('T')[0] ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Future Week</> : 
               entries.filter(e => weekDates.includes(e.date) && e.status === 'submitted').length > 0 ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><path d="M9 11l3 3 8-8"></path><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.18 0 2.3.23 3.32.64"></path></svg>Submitted</> : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>Past Week</>}
            </button>
          )}
        </div>
      </div>

      <div className="weekly-grid">
        {weekDates.map((date, index) => {
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
                  <div className="day-name">{dayName}</div>
                  <div className="day-date">{formatDate(date)}</div>
                </div>
                <div className="day-total">
                  {dayEntries.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginBottom: '4px' }}>
                      <input
                        type="checkbox"
                        checked={dayEntries.every(entry => selectedEntries.has(entry.id))}
                        onChange={(e) => {
                          dayEntries.forEach(entry => handleEntrySelect(entry.id, e.target.checked));
                        }}
                        style={{ margin: 0 }}
                      />
                      All
                    </label>
                  )}
                  {totalHours > 0 && (
                    <span className="hours-badge">{formatHours(totalHours)}</span>
                  )}
                  {isFuture && totalHours === 0 && (
                    <span className="future-indicator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <p>Upcoming - no meetings scheduled</p>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="m12 7-3 4 3 4 3-4-3-4z"></path><line x1="8" y1="14" x2="8" y2="16"></line><line x1="16" y1="14" x2="16" y2="16"></line></svg>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={(e) => handleEntrySelect(entry.id, e.target.checked)}
                              style={{ margin: 0 }}
                            />
                            <div className="entry-time">
                              {formatTimeRange(entry.startTime, entry.endTime)}
                            </div>
                          </div>
                          <div className="entry-duration">
                            {formatHours(entry.duration)}
                          </div>
                        </div>
                        
                        <div className="entry-content">
                          <div className="entry-project-info">
                            <div 
                              className="project-dot"
                              style={{ backgroundColor: project?.color || '#6366f1' }}
                            />
                            <span className="project-name">{entry.project}</span>
                          </div>
                          <div className="entry-description">{entry.description}</div>
                          
                          <div className="entry-meta">
                            {entry.automated && (
                              <div className="source-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="m12 7-3 4 3 4 3-4-3-4z"></path><line x1="8" y1="14" x2="8" y2="16"></line><line x1="16" y1="14" x2="16" y2="16"></line></svg>
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
                            onClick={() => handleEditEntry(entry)}
                            title="Edit entry"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                          </button>
                          <button 
                            className="btn btn-small btn-secondary"
                            onClick={() => handleDuplicate(entry)}
                            title="Duplicate for recurring meetings"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>
                          </button>
                          <button 
                            className="btn btn-small btn-danger"
                            onClick={() => {
                              if (confirm('Delete this entry?')) {
                                onDeleteEntry(entry.id);
                              }
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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

      {/* Combined Edit Entry Modal */}
      {showEditModal && editingEntry && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>Edit Time Entry</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
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
                </div>
              </div>

              {/* Description Section */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Description:
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="Describe what you worked on..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Duration Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>
                  Duration
                </h4>
                
                {/* Current Duration Display */}
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: 'var(--brand-primary)', 
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {formatDurationHours(newDuration)}
                </div>

                {/* Quick Adjustment Buttons */}
                <div style={{ marginBottom: '20px' }}>
                  {/* Subtract Buttons */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block', textAlign: 'center' }}>
                      Subtract Time
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '8px'
                    }}>
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={() => adjustDuration(-0.25)}
                        disabled={newDuration <= 0.25}
                        style={{ fontSize: '12px', padding: '8px 4px' }}
                      >
                        − 15min
                      </button>
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={() => adjustDuration(-0.5)}
                        disabled={newDuration <= 0.5}
                        style={{ fontSize: '12px', padding: '8px 4px' }}
                      >
                        − 30min
                      </button>
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={() => adjustDuration(-1)}
                        disabled={newDuration <= 1}
                        style={{ fontSize: '12px', padding: '8px 4px' }}
                      >
                        − 1hr
                      </button>
                    </div>
                  </div>
                  
                  {/* Add Buttons */}
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block', textAlign: 'center' }}>
                      Add Time
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '8px'
                    }}>
                      <button 
                        className="btn btn-primary btn-small"
                        onClick={() => adjustDuration(0.25)}
                        style={{ fontSize: '12px', padding: '8px 4px' }}
                      >
                        + 15min
                      </button>
                      <button 
                        className="btn btn-primary btn-small"
                        onClick={() => adjustDuration(0.5)}
                        style={{ fontSize: '12px', padding: '8px 4px' }}
                      >
                        + 30min
                      </button>
                      <button 
                        className="btn btn-primary btn-small"
                        onClick={() => adjustDuration(1)}
                        style={{ fontSize: '12px', padding: '8px 4px' }}
                      >
                        + 1hr
                      </button>
                    </div>
                  </div>
                </div>

                {/* Precise Input */}
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Exact duration (hours):
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
                    style={{ textAlign: 'center' }}
                  />
                </div>

                {/* New End Time Preview */}
                <div style={{ 
                  background: 'var(--info-light)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  marginTop: '12px'
                }}>
                  <p style={{ fontSize: '14px', color: 'var(--info-dark)', margin: 0, textAlign: 'center' }}>
                    <strong>New time:</strong> {editingEntry.startTime} - {calculateEndTime(editingEntry.startTime, newDuration)}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveEntryChanges}
                disabled={!newDescription.trim() || newDuration <= 0}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal - Sexy & Streamlined */}
      {showAddEntryModal && (
        <div className="modal-overlay" onClick={closeAddEntryModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', filter: 'drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3))'}}><defs><linearGradient id="lightning-dashboard" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style={{stopColor:'#8b5cf6', stopOpacity:1}} /><stop offset="50%" style={{stopColor:'#6366f1', stopOpacity:1}} /><stop offset="100%" style={{stopColor:'#3b82f6', stopOpacity:1}} /></linearGradient></defs><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="url(#lightning-dashboard)" stroke="url(#lightning-dashboard)"></polygon></svg>Quick Time Entry</h3>
              <button 
                className="modal-close"
                onClick={closeAddEntryModal}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddEntrySubmit}>
                {/* Quick Duration Selection */}
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                    How long did you work?
                  </label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    {[0.5, 1, 2, 4].map(hours => (
                      <button
                        key={hours}
                        type="button"
                        className={`btn ${addEntryForm.duration === hours ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setAddEntryForm({ ...addEntryForm, duration: hours })}
                        style={{ 
                          padding: '12px 8px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        {hours === 0.5 ? '30min' : `${hours}h`}
                      </button>
                    ))}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '8px'
                  }}>
                    {[6, 8, 'custom'].map(option => (
                      <button
                        key={option}
                        type="button"
                        className={`btn ${
                          option === 'custom' 
                            ? (![0.5, 1, 2, 4, 6, 8].includes(addEntryForm.duration) ? 'btn-primary' : 'btn-secondary')
                            : (addEntryForm.duration === option ? 'btn-primary' : 'btn-secondary')
                        }`}
                        onClick={() => {
                          if (option === 'custom') {
                            const customDuration = prompt('Enter duration in hours (e.g., 1.5):');
                            if (customDuration && !isNaN(parseFloat(customDuration))) {
                              setAddEntryForm({ ...addEntryForm, duration: parseFloat(customDuration) });
                            }
                          } else {
                            setAddEntryForm({ ...addEntryForm, duration: option as number });
                          }
                        }}
                        style={{ 
                          padding: '12px 8px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        {option === 'custom' ? 'Other' : `${option}h`}
                      </button>
                    ))}
                  </div>
                  {![0.5, 1, 2, 4, 6, 8].includes(addEntryForm.duration) && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '8px 12px', 
                      background: 'var(--brand-primary-light)', 
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--brand-primary)'
                    }}>
                      {addEntryForm.duration}h selected
                    </div>
                  )}
                </div>

                {/* Simplified Client/Project Selection */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Project
                  </label>
                  <select
                    value={addEntryForm.project}
                    onChange={(e) => setAddEntryForm({ ...addEntryForm, project: e.target.value })}
                    className="form-input"
                    required
                    style={{ fontSize: '14px' }}
                  >
                    <option value="">Select project...</option>
                    {projects
                      .filter(p => p.active)
                      .map(project => (
                        <option key={project.id} value={project.name}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Date and Time */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    When did this happen?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>Date</label>
                      <input
                        type="date"
                        value={addEntryForm.date}
                        onChange={(e) => updateAddEntryForm({ date: e.target.value })}
                        className="form-input"
                        required
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>Start Time</label>
                      <input
                        type="time"
                        value={addEntryForm.startTime}
                        onChange={(e) => setAddEntryForm({ ...addEntryForm, startTime: e.target.value })}
                        className="form-input"
                        required
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Description */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    What did you work on?
                  </label>
                  <textarea
                    value={addEntryForm.description}
                    onChange={(e) => setAddEntryForm({ ...addEntryForm, description: e.target.value })}
                    className="form-input"
                    rows={2}
                    placeholder="Brief description of work completed..."
                    required
                    style={{ fontSize: '14px' }}
                  />
                </div>

                {/* Duplication Settings */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    <input
                      type="checkbox"
                      checked={addEntryForm.createSeries || false}
                      onChange={(e) => setAddEntryForm({ ...addEntryForm, createSeries: e.target.checked })}
                    />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><polyline points="23,4 23,10 17,10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>Create recurring entries
                  </label>
                  
                  {addEntryForm.createSeries && (
                    <div style={{ 
                      padding: '16px', 
                      background: 'var(--brand-primary-light)', 
                      borderRadius: '8px',
                      border: '1px solid var(--brand-primary)'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>Frequency</label>
                          <select
                            value={addEntryForm.frequency || 'weekly'}
                            onChange={(e) => setAddEntryForm({ ...addEntryForm, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                            className="form-input"
                            style={{ fontSize: '14px' }}
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>Count</label>
                          <input
                            type="number"
                            min="2"
                            max="52"
                            value={addEntryForm.repeatCount || 4}
                            onChange={(e) => setAddEntryForm({ ...addEntryForm, repeatCount: parseInt(e.target.value) || 4 })}
                            className="form-input"
                            style={{ fontSize: '14px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'end' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={addEntryForm.skipWeekends || true}
                              onChange={(e) => setAddEntryForm({ ...addEntryForm, skipWeekends: e.target.checked })}
                            />
                            Skip weekends
                          </label>
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--brand-primary)', 
                        fontWeight: '500',
                        textAlign: 'center'
                      }}>
                        Will create {addEntryForm.repeatCount || 4} entries {
                          addEntryForm.frequency === 'daily' ? 'daily' : 
                          addEntryForm.frequency === 'weekly' ? 'weekly' : 'monthly'
                        }{addEntryForm.skipWeekends ? ', skipping weekends' : ''}
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Options Toggle */}
                <details style={{ marginBottom: '20px' }}>
                  <summary style={{ 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    color: 'var(--text-secondary)',
                    marginBottom: '12px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Additional Options
                  </summary>
                  <div style={{ padding: '12px', background: 'var(--background-secondary)', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <input
                          type="checkbox"
                          checked={addEntryForm.billable}
                          onChange={(e) => setAddEntryForm({ ...addEntryForm, billable: e.target.checked })}
                        />
                        Billable to client
                      </label>
                    </div>
                  </div>
                </details>

                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={closeAddEntryModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ fontSize: '16px', padding: '12px 24px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>Create Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Entry Modal */}
      {showDuplicateModal && duplicatingEntry && (
        <div className="modal-overlay" onClick={closeDuplicateModal}>
          <div className="modal-content duplicate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔄 Create Recurring Time Entries</h3>
              <button 
                className="modal-close"
                onClick={closeDuplicateModal}
                disabled={isGenerating}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Entry Preview */}
              <div className="duplicate-preview-card">
                <div className="preview-header">
                  <span className="preview-icon">📋</span>
                  <div>
                    <h4 className="preview-title">
                      {duplicatingEntry.project} • {duplicatingEntry.client}
                    </h4>
                    <div className="preview-details">
                      {new Date(duplicatingEntry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} • {formatTimeRange(duplicatingEntry.startTime, duplicatingEntry.endTime)} • {formatHours(duplicatingEntry.duration)}
                    </div>
                  </div>
                </div>
                <div className="preview-description">
                  {duplicatingEntry.description}
                </div>
              </div>

              <div className="duplicate-settings">
                <div className="settings-grid">
                  <div className="form-group">
                    <label>🔄 Frequency</label>
                    <select
                      value={duplicateSettings.frequency}
                      onChange={(e) => setDuplicateSettings({ ...duplicateSettings, frequency: e.target.value as 'weekly' | 'daily' | 'monthly' })}
                      className="form-input"
                      disabled={isGenerating}
                    >
                      <option value="daily">📅 Daily</option>
                      <option value="weekly">📆 Weekly</option>
                      <option value="monthly">🗓️ Monthly</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>📊 Count</label>
                    <div className="count-input-wrapper">
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={duplicateSettings.count}
                        onChange={(e) => setDuplicateSettings({ ...duplicateSettings, count: parseInt(e.target.value) || 1 })}
                        className="form-input"
                        disabled={isGenerating}
                      />
                      <span className="count-label">occurrences</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={duplicateSettings.skipWeekends}
                      onChange={(e) => setDuplicateSettings({ ...duplicateSettings, skipWeekends: e.target.checked })}
                      disabled={isGenerating}
                    />
                    <span className="checkbox-text">🚫 Skip weekends (Saturday & Sunday)</span>
                  </label>
                </div>
              </div>

              {/* Preview upcoming dates */}
              <div className="dates-preview">
                <h4 className="preview-section-title">📅 Upcoming dates preview:</h4>
                <div className="dates-list">
                  {getPreviewDates().map((date, index) => (
                    <div key={index} className="date-item">
                      <span className="date-number">{index + 1}</span>
                      <span className="date-text">
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  ))}
                  {duplicateSettings.count > 5 && (
                    <div className="date-item more-dates">
                      <span className="date-number">...</span>
                      <span className="date-text">
                        +{duplicateSettings.count - 5} more dates
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={closeDuplicateModal}
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={generateDuplicates}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner">⏳</span>
                    Creating...
                  </>
                ) : (
                  <>
                    ✨ Create {duplicateSettings.count} Duplicates
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};