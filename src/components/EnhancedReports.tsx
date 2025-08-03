/**
 * Enhanced Reports Component
 * Easy-to-use reporting interface with visual exports and team member filtering
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  ArcElement, 
  Title, 
  Tooltip, 
  Legend,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { useTimeTrackerDB } from '../hooks/useTimeTrackerDB';
import { advancedReportingService } from '../services/advancedReporting';
import type { TimeEntry, Project, Client, User } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

interface ReportFilters {
  dateRange: {
    start: string;
    end: string;
    preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  };
  selectedProjects: string[];
  selectedClients: string[];
  selectedTeamMembers: string[];
  reportType: 'overview' | 'productivity' | 'projects' | 'team' | 'trends';
}

const EnhancedReports: React.FC = () => {
  const { user, checkPermission } = useAuth();
  const { timeEntries, projects, clients } = useTimeTrackerDB();
  
  // State management
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: 'month',
    },
    selectedProjects: [],
    selectedClients: [],
    selectedTeamMembers: [],
    reportType: 'overview',
  });
  
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'png'>('pdf');

  // Check if user is manager or admin
  const canViewTeamReports = useMemo(() => {
    return user && (
      user.role === 'owner' || 
      user.role === 'admin' || 
      user.role === 'manager' ||
      checkPermission('reports', 'read')
    );
  }, [user, checkPermission]);

  // Load team members for managers
  useEffect(() => {
    if (canViewTeamReports) {
      // Mock team members - in real app, fetch from API
      const mockTeamMembers: User[] = [
        {
          id: 'user-1',
          visitorId: '10001',
          email: 'john.doe@company.com',
          name: 'John Doe',
          companyId: user?.companyId || '',
          role: 'employee',
          permissions: [],
          profile: { firstName: 'John', lastName: 'Doe', jobTitle: 'Developer', department: 'Engineering' },
          settings: {} as any,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mfaEnabled: false,
        },
        {
          id: 'user-2',
          visitorId: '10002',
          email: 'jane.smith@company.com',
          name: 'Jane Smith',
          companyId: user?.companyId || '',
          role: 'employee',
          permissions: [],
          profile: { firstName: 'Jane', lastName: 'Smith', jobTitle: 'Designer', department: 'Design' },
          settings: {} as any,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mfaEnabled: false,
        },
      ];
      setTeamMembers(mockTeamMembers);
    }
  }, [canViewTeamReports, user]);

  // Filter data based on current selections
  const filteredData = useMemo(() => {
    let filteredEntries = timeEntries;

    // Date range filter
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    filteredEntries = filteredEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    });

    // Project filter
    if (filters.selectedProjects.length > 0) {
      filteredEntries = filteredEntries.filter(entry => 
        filters.selectedProjects.includes(entry.projectId)
      );
    }

    // Client filter
    if (filters.selectedClients.length > 0) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.clientId && filters.selectedClients.includes(entry.clientId)
      );
    }

    // Team member filter (for managers)
    if (canViewTeamReports && filters.selectedTeamMembers.length > 0) {
      filteredEntries = filteredEntries.filter(entry => 
        filters.selectedTeamMembers.includes(entry.userId || user?.id || '')
      );
    } else if (!canViewTeamReports) {
      // Regular employees can only see their own data
      filteredEntries = filteredEntries.filter(entry => 
        entry.userId === user?.id
      );
    }

    return filteredEntries;
  }, [timeEntries, filters, canViewTeamReports, user]);

  // Generate report metrics
  const reportMetrics = useMemo(() => {
    const dateRange = {
      start: new Date(filters.dateRange.start),
      end: new Date(filters.dateRange.end),
    };
    
    return advancedReportingService.generateAdvancedMetrics(
      filteredData,
      projects,
      clients,
      dateRange
    );
  }, [filteredData, projects, clients, filters.dateRange]);

  // Generate charts
  const chartConfigs = useMemo(() => {
    return advancedReportingService.generateAdvancedCharts(reportMetrics);
  }, [reportMetrics]);

  // Quick date range presets
  const setDatePreset = (preset: ReportFilters['dateRange']['preset']) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'week':
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        preset,
      },
    }));
  };

  // Export functionality
  const exportReport = async (format: 'pdf' | 'excel' | 'png') => {
    setIsExporting(true);
    
    try {
      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'pdf':
          blob = await advancedReportingService.exportToPDF(reportMetrics, chartConfigs, {
            format: 'pdf',
            includeCharts: true,
            template: 'detailed',
          });
          filename = `timebeacon-report-${filters.dateRange.start}-to-${filters.dateRange.end}.pdf`;
          break;
          
        case 'excel':
          blob = await advancedReportingService.exportToExcel(
            reportMetrics, 
            filteredData, 
            projects, 
            clients, 
            {
              format: 'xlsx',
              includeCharts: true,
              template: 'detailed',
            }
          );
          filename = `timebeacon-report-${filters.dateRange.start}-to-${filters.dateRange.end}.xlsx`;
          break;
          
        case 'png':
          // Export charts as images
          blob = await exportChartsAsImages();
          filename = `timebeacon-charts-${filters.dateRange.start}-to-${filters.dateRange.end}.zip`;
          break;
          
        default:
          throw new Error('Unsupported export format');
      }

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportChartsAsImages = async (): Promise<Blob> => {
    // In a real implementation, capture chart canvases as images
    // For now, return mock data
    const mockData = JSON.stringify({ message: 'Chart images would be here' });
    return new Blob([mockData], { type: 'application/json' });
  };

  // Render chart component
  const renderChart = (config: any, index: number) => {
    const chartProps = {
      data: config.data,
      options: {
        ...config.options,
        responsive: true,
        maintainAspectRatio: false,
      },
    };

    switch (config.type) {
      case 'doughnut':
        return <Doughnut key={index} {...chartProps} />;
      case 'line':
        return <Line key={index} {...chartProps} />;
      case 'bar':
        return <Bar key={index} {...chartProps} />;
      case 'radar':
        return <Radar key={index} {...chartProps} />;
      default:
        return <div key={index}>Unsupported chart type</div>;
    }
  };

  return (
    <div className="enhanced-reports">
      <div className="reports-header">
        <h1>Analytics & Reports</h1>
        <p>Comprehensive analytics and insights for your time tracking data</p>
      </div>

      {/* Filters Section */}
      <div className="reports-filters">
        <div className="filter-section">
          <h3>Date Range</h3>
          <div className="date-presets">
            {(['today', 'week', 'month', 'quarter', 'year'] as const).map(preset => (
              <button
                key={preset}
                className={`preset-button ${filters.dateRange.preset === preset ? 'active' : ''}`}
                onClick={() => setDatePreset(preset)}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="custom-date-range">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value, preset: 'custom' }
              }))}
            />
            <span>to</span>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value, preset: 'custom' }
              }))}
            />
          </div>
        </div>

        {/* Team Member Filter (Managers Only) */}
        {canViewTeamReports && teamMembers.length > 0 && (
          <div className="filter-section">
            <h3>Team Members</h3>
            <div className="team-member-filters">
              <button
                className={`filter-button ${filters.selectedTeamMembers.length === 0 ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, selectedTeamMembers: [] }))}
              >
                All Team Members
              </button>
              {teamMembers.map(member => (
                <button
                  key={member.id}
                  className={`filter-button ${filters.selectedTeamMembers.includes(member.id) ? 'active' : ''}`}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      selectedTeamMembers: prev.selectedTeamMembers.includes(member.id)
                        ? prev.selectedTeamMembers.filter(id => id !== member.id)
                        : [...prev.selectedTeamMembers, member.id]
                    }));
                  }}
                >
                  {member.name} ({member.profile?.jobTitle})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project Filter */}
        <div className="filter-section">
          <h3>Projects</h3>
          <div className="project-filters">
            <button
              className={`filter-button ${filters.selectedProjects.length === 0 ? 'active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, selectedProjects: [] }))}
            >
              All Projects
            </button>
            {projects.slice(0, 8).map(project => (
              <button
                key={project.id}
                className={`filter-button ${filters.selectedProjects.includes(project.id) ? 'active' : ''}`}
                onClick={() => {
                  setFilters(prev => ({
                    ...prev,
                    selectedProjects: prev.selectedProjects.includes(project.id)
                      ? prev.selectedProjects.filter(id => id !== project.id)
                      : [...prev.selectedProjects, project.id]
                  }));
                }}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>

        {/* Export Controls */}
        <div className="filter-section">
          <h3>Export Reports</h3>
          <div className="export-controls">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'excel' | 'png')}
            >
              <option value="pdf">PDF Report</option>
              <option value="excel">Excel Spreadsheet</option>
              <option value="png">Chart Images</option>
            </select>
            
            <button
              className="export-button"
              onClick={() => exportReport(exportFormat)}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Hours</h3>
          <div className="metric-value">{reportMetrics.totalHours.toFixed(1)}h</div>
          <div className="metric-subtitle">
            {reportMetrics.billableHours.toFixed(1)}h billable
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Utilization</h3>
          <div className="metric-value">{reportMetrics.utilizationRate.toFixed(1)}%</div>
          <div className="metric-subtitle">
            {reportMetrics.utilizationRate >= 75 ? 'Excellent' : 
             reportMetrics.utilizationRate >= 50 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Productivity</h3>
          <div className="metric-value">{reportMetrics.productivityScore.toFixed(1)}%</div>
          <div className="metric-subtitle">
            {reportMetrics.totalSessions} sessions tracked
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Top Project</h3>
          <div className="metric-value">
            {reportMetrics.topProjects[0]?.name || 'No data'}
          </div>
          <div className="metric-subtitle">
            {reportMetrics.topProjects[0]?.hours.toFixed(1)}h logged
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {chartConfigs.map((config, index) => (
          <div key={index} className="chart-container">
            <h3>{config.title}</h3>
            <div className="chart-wrapper">
              {renderChart(config, index)}
            </div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="data-table-section">
        <h3>Detailed Time Entries</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Description</th>
                <th>Duration</th>
                <th>Billable</th>
                {canViewTeamReports && <th>Team Member</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 50).map((entry, index) => (
                <tr key={index}>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>{projects.find(p => p.id === entry.projectId)?.name || 'Unknown'}</td>
                  <td>{entry.description}</td>
                  <td>{((entry.duration || 0) / 60).toFixed(1)}h</td>
                  <td>
                    <span className={`status-badge ${entry.billable ? 'billable' : 'non-billable'}`}>
                      {entry.billable ? 'Billable' : 'Non-billable'}
                    </span>
                  </td>
                  {canViewTeamReports && (
                    <td>{teamMembers.find(m => m.id === entry.userId)?.name || 'You'}</td>
                  )}
                  <td>
                    <span className={`status-badge ${entry.status || 'pending'}`}>
                      {entry.status || 'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredData.length > 50 && (
            <div className="table-footer">
              <p>Showing first 50 entries. Export for complete data.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .enhanced-reports {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .reports-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .reports-header h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          color: #1f2937;
        }

        .reports-filters {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filter-section {
          margin-bottom: 20px;
        }

        .filter-section h3 {
          margin-bottom: 10px;
          color: #374151;
          font-size: 1.1rem;
        }

        .date-presets, .team-member-filters, .project-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .preset-button, .filter-button {
          padding: 8px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .preset-button:hover, .filter-button:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .preset-button.active, .filter-button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .custom-date-range {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }

        .custom-date-range input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
        }

        .export-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .export-controls select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
        }

        .export-button {
          padding: 8px 16px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .export-button:hover:not(:disabled) {
          background: #059669;
        }

        .export-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .summary-card h3 {
          margin-bottom: 10px;
          color: #6b7280;
          font-size: 1rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 5px;
        }

        .metric-subtitle {
          color: #6b7280;
          font-size: 0.9rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .chart-container {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .chart-container h3 {
          margin-bottom: 15px;
          color: #374151;
          text-align: center;
        }

        .chart-wrapper {
          height: 300px;
          position: relative;
        }

        .data-table-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .data-table th,
        .data-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }

        .data-table tr:hover {
          background: #f9fafb;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .status-badge.billable {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.non-billable {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.pending {
          background: #e0e7ff;
          color: #3730a3;
        }

        .status-badge.approved {
          background: #d1fae5;
          color: #065f46;
        }

        .table-footer {
          text-align: center;
          margin-top: 15px;
          color: #6b7280;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .summary-cards {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
          
          .date-presets, .team-member-filters, .project-filters {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedReports;