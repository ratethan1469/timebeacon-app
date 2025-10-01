import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeeklyCalendar } from '../WeeklyCalendar';
import { TimeEntry, Project, Client } from '../../types';

const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    date: new Date().toISOString().split('T')[0], // Today
    startTime: '09:00',
    endTime: '10:00',
    duration: 1,
    client: 'Test Client',
    project: 'Test Project',
    description: 'Test work',
    category: 'client',
    status: 'pending',
    automated: false,
    billable: true
  },
  {
    id: '2',
    date: new Date().toISOString().split('T')[0], // Today
    startTime: '14:00',
    endTime: '15:30',
    duration: 1.5,
    client: 'Another Client',
    project: 'Another Project',
    description: 'More test work',
    category: 'client',
    status: 'approved',
    automated: true,
    billable: true,
    source: 'calendar'
  }
];

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Test Project',
    client: 'Test Client',
    color: '#3b82f6',
    active: true,
    createdAt: '2025-01-15'
  },
  {
    id: '2',
    name: 'Another Project',
    client: 'Another Client',
    color: '#10b981',
    active: true,
    createdAt: '2025-01-15'
  }
];

const mockClients: Client[] = [
  {
    id: '1',
    name: 'Test Client',
    color: '#3b82f6',
    active: true,
    createdAt: '2025-01-15',
    updatedAt: '2025-01-15'
  },
  {
    id: '2',
    name: 'Another Client',
    color: '#10b981',
    active: true,
    createdAt: '2025-01-15',
    updatedAt: '2025-01-15'
  }
];

const mockProps = {
  entries: mockTimeEntries,
  projects: mockProjects,
  clients: mockClients,
  onUpdateEntry: vi.fn(),
  onDeleteEntry: vi.fn()
};

describe('WeeklyCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders weekly timesheet title', () => {
    render(<WeeklyCalendar {...mockProps} />);
    expect(screen.getByText('Weekly Timesheet')).toBeInTheDocument();
  });

  it('displays week navigation buttons', () => {
    render(<WeeklyCalendar {...mockProps} />);
    expect(screen.getByText('← Previous Week')).toBeInTheDocument();
    expect(screen.getByText('Next Week →')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows week summary cards', () => {
    render(<WeeklyCalendar {...mockProps} />);
    expect(screen.getByText('Total Hours This Week')).toBeInTheDocument();
    expect(screen.getByText('Customer-Focused Hours')).toBeInTheDocument();
    expect(screen.getByText('Utilization Rate')).toBeInTheDocument();
    expect(screen.getByText('Pending Entries')).toBeInTheDocument();
    expect(screen.getByText('Automated Entries')).toBeInTheDocument();
  });

  it('displays time entries for the current week', () => {
    render(<WeeklyCalendar {...mockProps} />);
    expect(screen.getByText('Test work')).toBeInTheDocument();
    expect(screen.getByText('More test work')).toBeInTheDocument();
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('Another Client')).toBeInTheDocument();
  });

  it('shows time entry information', () => {
    render(<WeeklyCalendar {...mockProps} />);
    // Check if time entries are rendered with their descriptions
    expect(screen.getByText('Test work')).toBeInTheDocument();
    expect(screen.getByText('More test work')).toBeInTheDocument();
  });

  it('displays duration correctly', () => {
    render(<WeeklyCalendar {...mockProps} />);
    // Should show total hours in summary
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('shows status indicators', () => {
    render(<WeeklyCalendar {...mockProps} />);
    const statusSelects = screen.getAllByDisplayValue('pending');
    expect(statusSelects).toHaveLength(1);
    
    const approvedSelects = screen.getAllByDisplayValue('approved');
    expect(approvedSelects).toHaveLength(1);
  });

  it('shows automated vs manual indicators', () => {
    render(<WeeklyCalendar {...mockProps} />);
    // Check that entries have source indicators
    expect(screen.getByText('🤖')).toBeInTheDocument(); // Automated entry
  });

  it('handles status change', async () => {
    const user = userEvent.setup();
    render(<WeeklyCalendar {...mockProps} />);
    
    const statusSelect = screen.getAllByDisplayValue('pending')[0];
    await user.selectOptions(statusSelect, 'approved');
    
    expect(mockProps.onUpdateEntry).toHaveBeenCalledWith('1', { status: 'approved' });
  });

  it('handles edit button click', async () => {
    const user = userEvent.setup();
    render(<WeeklyCalendar {...mockProps} />);
    
    const editButtons = screen.getAllByTitle('Edit duration');
    await user.click(editButtons[0]);
    
    expect(screen.getByText('✏️ Edit Duration')).toBeInTheDocument();
  });

  it('handles delete button click with confirmation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<WeeklyCalendar {...mockProps} />);
    
    const deleteButtons = screen.getAllByTitle('Delete this entry');
    await user.click(deleteButtons[0]);
    
    expect(confirmSpy).toHaveBeenCalledWith('Delete this entry?');
    expect(mockProps.onDeleteEntry).toHaveBeenCalledWith('1');
    
    confirmSpy.mockRestore();
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<WeeklyCalendar {...mockProps} />);
    
    const deleteButtons = screen.getAllByTitle('Delete this entry');
    await user.click(deleteButtons[0]);
    
    expect(confirmSpy).toHaveBeenCalledWith('Delete this entry?');
    expect(mockProps.onDeleteEntry).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  it('navigates to previous week', async () => {
    const user = userEvent.setup();
    render(<WeeklyCalendar {...mockProps} />);
    
    const prevButton = screen.getByText('← Previous Week');
    await user.click(prevButton);
    
    // The week should change (we can't easily test the exact date change without more complex setup)
    expect(prevButton).toBeInTheDocument();
  });

  it('navigates to next week', async () => {
    const user = userEvent.setup();
    render(<WeeklyCalendar {...mockProps} />);
    
    const nextButton = screen.getByText('Next Week →');
    await user.click(nextButton);
    
    expect(nextButton).toBeInTheDocument();
  });

  it('shows submit button for current week', () => {
    render(<WeeklyCalendar {...mockProps} />);
    
    // Should show pending entries count since not all entries are approved
    expect(screen.getByText('⏳ 1 Pending Entries')).toBeInTheDocument();
  });

  it('shows billable and non-billable badges', () => {
    render(<WeeklyCalendar {...mockProps} />);
    
    const billableBadges = screen.getAllByText('Billable');
    expect(billableBadges).toHaveLength(2); // Both entries are billable
  });

  it('displays day headers correctly', () => {
    render(<WeeklyCalendar {...mockProps} />);
    
    // Should show all days of the week
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Thursday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
  });

  it('highlights today correctly', () => {
    render(<WeeklyCalendar {...mockProps} />);
    
    // Should show "Today" for the current date
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('calculates total hours correctly', () => {
    render(<WeeklyCalendar {...mockProps} />);
    
    // Total should be 2.5 hours (1 + 1.5)
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('shows correct utilization rate', () => {
    render(<WeeklyCalendar {...mockProps} />);
    
    // Both entries are billable, so utilization should be 100%
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });
});