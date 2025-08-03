import React, { useState } from 'react';
import { TimeEntry, Project } from '../types';
import { MultiSelect } from './MultiSelect';

interface ColumnConfig {
  id: string;
  label: string;
  field: string;
  type: 'text' | 'number' | 'date' | 'time' | 'currency' | 'percentage';
  visible: boolean;
  order: number;
  width?: number;
}

interface ReportConfig {
  id: string;
  title: string;
  description?: string;
  columns: ColumnConfig[];
  chartType: 'bar' | 'donut' | 'line' | 'area' | 'scatter';
  groupBy?: string;
  sortBy?: string;
  filterBy?: string;
}

interface ReportsProps {
  entries: TimeEntry[];
  projects: Project[];
}

interface SavedReport {
  id: string;
  name: string;
  reportConfig: ReportConfig;
  dateRange: { start: string; end: string };
  selectedProjects: string[];
  createdAt: string;
}


// Helper function to get current week dates (Monday to Friday)
const getCurrentWeekRange = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek + 1); // Go to Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4); // Go to Friday
  
  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0]
  };
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'date', label: 'Date', field: 'date', type: 'date', visible: true, order: 1 },
  { id: 'startTime', label: 'Start Time', field: 'startTime', type: 'time', visible: true, order: 2 },
  { id: 'endTime', label: 'End Time', field: 'endTime', type: 'time', visible: true, order: 3 },
  { id: 'duration', label: 'Duration', field: 'duration', type: 'number', visible: true, order: 4 },
  { id: 'client', label: 'Client', field: 'client', type: 'text', visible: true, order: 5 },
  { id: 'project', label: 'Project', field: 'project', type: 'text', visible: true, order: 6 },
  { id: 'description', label: 'Description', field: 'description', type: 'text', visible: true, order: 7 },
  { id: 'status', label: 'Status', field: 'status', type: 'text', visible: true, order: 8 },
  { id: 'billable', label: 'Billable', field: 'billable', type: 'text', visible: true, order: 9 },
  { id: 'category', label: 'Category', field: 'category', type: 'text', visible: false, order: 10 },
  { id: 'source', label: 'Source', field: 'source', type: 'text', visible: false, order: 11 },
  { id: 'meetingType', label: 'Meeting Type', field: 'meetingType', type: 'text', visible: false, order: 12 }
];

export const Reports: React.FC<ReportsProps> = ({ entries, projects }) => {
  const [dateRange, setDateRange] = useState(getCurrentWeekRange());
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportName, setReportName] = useState('');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  
  // Report configuration state
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    id: 'default',
    title: 'Time Entry Report',
    description: 'Comprehensive analysis of time entries',
    columns: DEFAULT_COLUMNS,
    chartType: 'bar',
    groupBy: 'project',
    sortBy: 'date'
  });
  
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    const inDateRange = entryDate >= startDate && entryDate <= endDate;
    const inProject = selectedProjects.length === 0 || selectedProjects.includes(entry.project);
    
    return inDateRange && inProject;
  });

  // Column management functions
  const updateColumnLabel = (columnId: string, newLabel: string) => {
    setReportConfig(prev => ({
      ...prev,
      columns: prev.columns.map(col => 
        col.id === columnId ? { ...col, label: newLabel } : col
      )
    }));
  };

  const toggleColumnVisibility = (columnId: string) => {
    setReportConfig(prev => ({
      ...prev,
      columns: prev.columns.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    }));
  };

  const moveColumn = (columnId: string, direction: 'up' | 'down') => {
    setReportConfig(prev => {
      const columns = [...prev.columns];
      const currentIndex = columns.findIndex(col => col.id === columnId);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex >= 0 && newIndex < columns.length) {
        [columns[currentIndex], columns[newIndex]] = [columns[newIndex], columns[currentIndex]];
        // Update order numbers
        columns.forEach((col, index) => {
          col.order = index + 1;
        });
      }
      
      return { ...prev, columns };
    });
  };

  const addCustomColumn = () => {
    const newColumn: ColumnConfig = {
      id: `custom_${Date.now()}`,
      label: 'New Column',
      field: 'custom',
      type: 'text',
      visible: true,
      order: reportConfig.columns.length + 1
    };
    
    setReportConfig(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn]
    }));
  };

  const removeColumn = (columnId: string) => {
    setReportConfig(prev => ({
      ...prev,
      columns: prev.columns.filter(col => col.id !== columnId)
    }));
  };

  const getVisibleColumns = () => {
    return reportConfig.columns
      .filter(col => col.visible)
      .sort((a, b) => a.order - b.order);
  };

  const formatCellValue = (entry: TimeEntry, column: ColumnConfig) => {
    const value = (entry as any)[column.field];
    
    switch (column.type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'time':
        return value;
      case 'number':
        return column.field === 'duration' ? formatHours(value) : value;
      case 'currency':
        return `$${value?.toFixed(2) || '0.00'}`;
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      default:
        if (column.field === 'billable') {
          return value ? 'Yes' : 'No';
        }
        return value || '-';
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Export functions
  const exportToCSV = () => {
    const headers = [
      'Date', 'Start Time', 'End Time', 'Duration (Hours)', 'Client', 'Project', 
      'Description', 'Status', 'Billable', 'Rate', 'Earnings', 'Source', 'Meeting Type'
    ];
    
    const csvData = filteredEntries.map(entry => {
      const project = projects.find(p => p.name === entry.project);
      const rate = entry.rate || project?.rate || 0;
      const earnings = entry.status === 'approved' ? (entry.duration * rate) : 0;
      
      return [
        entry.date,
        entry.startTime,
        entry.endTime,
        entry.duration,
        entry.client,
        entry.project,
        `"${entry.description.replace(/"/g, '""')}"`,
        entry.status,
        entry.billable ? 'Yes' : 'No',
        rate,
        earnings.toFixed(2),
        entry.source || 'Manual',
        entry.meetingType || ''
      ];
    });
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `timebeacon-report-${dateRange.start}-to-${dateRange.end}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>TimeBeacon Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
            .summary-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .summary-label { color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .time-value { font-family: monospace; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TimeBeacon Report</h1>
            <p>Period: ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <div class="summary-value">${formatHours(totalHours)}</div>
              <div class="summary-label">Total Hours</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">$${totalEarnings.toLocaleString()}</div>
              <div class="summary-label">Total Earnings</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${filteredEntries.length}</div>
              <div class="summary-label">Total Entries</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${billableHours.toFixed(1)}h</div>
              <div class="summary-label">Billable Hours</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Client</th>
                <th>Project</th>
                <th>Description</th>
                <th>Status</th>
                <th>Billable</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEntries.map(entry => `
                <tr>
                  <td>${new Date(entry.date).toLocaleDateString()}</td>
                  <td class="time-value">${entry.startTime} - ${entry.endTime}</td>
                  <td class="time-value">${formatHours(entry.duration)}</td>
                  <td>${entry.client}</td>
                  <td>${entry.project}</td>
                  <td>${entry.description}</td>
                  <td style="text-transform: capitalize">${entry.status}</td>
                  <td>${entry.billable ? 'Yes' : 'No'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Chart data calculations
  const projectStats = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.project]) {
      acc[entry.project] = { hours: 0, count: 0, earnings: 0 };
    }
    const project = projects.find(p => p.name === entry.project);
    const rate = entry.rate || project?.rate || 0;
    
    acc[entry.project].hours += entry.duration;
    acc[entry.project].count += 1;
    if (entry.status === 'approved') {
      acc[entry.project].earnings += entry.duration * rate;
    }
    return acc;
  }, {} as Record<string, { hours: number; count: number; earnings: number }>);

  const projectBreakdownStats = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.project]) {
      acc[entry.project] = { hours: 0, count: 0, earnings: 0 };
    }
    const project = projects.find(p => p.name === entry.project);
    const rate = entry.rate || project?.rate || 0;
    
    acc[entry.project].hours += entry.duration;
    acc[entry.project].count += 1;
    if (entry.status === 'approved') {
      acc[entry.project].earnings += entry.duration * rate;
    }
    return acc;
  }, {} as Record<string, { hours: number; count: number; earnings: number }>);

  const statusStats = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.status]) {
      acc[entry.status] = { hours: 0, count: 0 };
    }
    acc[entry.status].hours += entry.duration;
    acc[entry.status].count += 1;
    return acc;
  }, {} as Record<string, { hours: number; count: number }>);
  
  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
  const billableHours = filteredEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0);
  const totalEarnings = filteredEntries
    .filter(entry => entry.status === 'approved')
    .reduce((sum, entry) => {
      const project = projects.find(p => p.name === entry.project);
      const rate = entry.rate || project?.rate || 0;
      return sum + (entry.duration * rate);
    }, 0);
    
  // Daily data for line chart
  const dailyStats = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = { hours: 0, billableHours: 0, entries: 0 };
    }
    acc[entry.date].hours += entry.duration;
    if (entry.billable) acc[entry.date].billableHours += entry.duration;
    acc[entry.date].entries += 1;
    return acc;
  }, {} as Record<string, { hours: number; billableHours: number; entries: number }>);

  // Save and load report functions
  const saveCurrentReport = () => {
    if (!reportName.trim()) return;
    
    const newReport: SavedReport = {
      id: Date.now().toString(),
      name: reportName.trim(),
      reportConfig,
      dateRange,
      selectedProjects,
      createdAt: new Date().toISOString()
    };
    
    setSavedReports(prev => [newReport, ...prev]);
    setReportName('');
    setShowSaveModal(false);
  };

  const loadSavedReport = (report: SavedReport) => {
    setReportConfig(report.reportConfig);
    setDateRange(report.dateRange);
    setSelectedProjects(report.selectedProjects);
  };

  const deleteSavedReport = (reportId: string) => {
    setSavedReports(prev => prev.filter(r => r.id !== reportId));
  };


  // Quick date range presets
  const setQuickDateRange = (type: string) => {
    const today = new Date();
    let start: Date, end: Date;

    switch (type) {
      case 'today':
        start = end = new Date(today);
        break;
      case 'yesterday':
        start = end = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'thisWeek':
        const dayOfWeek = today.getDay();
        start = new Date(today);
        start.setDate(today.getDate() - dayOfWeek);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        start = lastWeekStart;
        end = new Date(lastWeekStart);
        end.setDate(lastWeekStart.getDate() + 6);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last7Days':
        start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        end = new Date(today);
        break;
      case 'last30Days':
        start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        end = new Date(today);
        break;
      case 'last90Days':
        start = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000);
        end = new Date(today);
        break;
      default:
        return;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  // Chart components
  const DonutChart = ({ data, title }: { data: Record<string, any>, title: string }) => {
    const total = Object.values(data).reduce((sum: number, item: any) => sum + item.hours, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
    
    let currentAngle = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {Object.entries(data).map(([key, value]: [string, any], index) => {
              const percentage = (value.hours / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
              const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
              const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
              const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
              
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              currentAngle += angle;
              
              return (
                <path
                  key={key}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
            <circle cx={centerX} cy={centerY} r="30" fill="white" />
            <text x={centerX} y={centerY - 5} textAnchor="middle" fontSize="12" fontWeight="bold">
              {formatHours(total)}
            </text>
            <text x={centerX} y={centerY + 10} textAnchor="middle" fontSize="10" fill="#666">
              Total
            </text>
          </svg>
          <div className="chart-legend">
            {Object.entries(data).map(([key, value]: [string, any], index) => (
              <div key={key} className="legend-item">
                <div 
                  className="legend-color" 
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="legend-label">{key}</span>
                <span className="legend-value">{formatHours(value.hours)} ({((value.hours / total) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const BarChart = ({ data, title }: { data: Record<string, any>, title: string }) => {
    const maxHours = Math.max(...Object.values(data).map((item: any) => item.hours));
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
    
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="bar-chart">
          {Object.entries(data)
            .sort(([,a], [,b]) => (b as any).hours - (a as any).hours)
            .slice(0, 8)
            .map(([key, value]: [string, any], index) => (
              <div key={key} className="bar-item">
                <div className="bar-label">{key.length > 15 ? key.substring(0, 15) + '...' : key}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      height: `${(value.hours / maxHours) * 200}px`,
                      backgroundColor: colors[index % colors.length]
                    }}
                  />
                </div>
                <div className="bar-value">{formatHours(value.hours)}</div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const LineChart = ({ data, title }: { data: Record<string, any>, title: string }) => {
    const sortedDates = Object.keys(data).sort();
    const maxHours = Math.max(...Object.values(data).map((item: any) => item.hours));
    const width = 600;
    const height = 300;
    const padding = 40;
    
    const points = sortedDates.map((date, index) => {
      const x = padding + (index / (sortedDates.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((data[date].hours / maxHours) * (height - 2 * padding));
      return { x, y, date, hours: data[date].hours };
    });
    
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');
    
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <svg width={width} height={height} className="line-chart">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <line
              key={i}
              x1={padding}
              y1={padding + (i * (height - 2 * padding) / 5)}
              x2={width - padding}
              y2={padding + (i * (height - 2 * padding) / 5)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Axes */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="2" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="2" />
          
          {/* Line */}
          <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="3" />
          
          {/* Points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
            />
          ))}
          
          {/* Y-axis labels */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <text
              key={i}
              x={padding - 10}
              y={height - padding - (i * (height - 2 * padding) / 5) + 5}
              textAnchor="end"
              fontSize="12"
              fill="#666"
            >
              {Math.round((maxHours * i) / 5)}h
            </text>
          ))}
          
          {/* X-axis labels */}
          {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={height - padding + 20}
              textAnchor="middle"
              fontSize="10"
              fill="#666"
            >
              {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div>
      <div className="dashboard-header">
        <div>
          {editingTitle ? (
            <input
              type="text"
              value={reportConfig.title}
              onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
              className="form-input"
              style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}
              autoFocus
            />
          ) : (
            <h1 className="dashboard-title" onClick={() => setEditingTitle(true)} style={{ cursor: 'pointer' }}>
              {reportConfig.title} ✏️
            </h1>
          )}
          <p className="dashboard-subtitle">{reportConfig.description}</p>
        </div>
        <div className="export-actions">
          <button className="btn btn-secondary" onClick={() => setShowColumnManager(true)}>
            ⚙️ Manage Columns
          </button>
          <button className="btn btn-secondary" onClick={exportToCSV}>
            📊 Export CSV
          </button>
          <button className="btn btn-secondary" onClick={exportToPDF}>
            📄 Export PDF
          </button>
        </div>
      </div>
      
      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div className="content-card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h2 className="card-title">Saved Reports</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {savedReports.map(report => (
                <div key={report.id} className="saved-report-card">
                  <div className="saved-report-header">
                    <h3>{report.name}</h3>
                    <div className="saved-report-actions">
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => loadSavedReport(report)}
                      >
                        Load
                      </button>
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => deleteSavedReport(report.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="saved-report-details">
                    <p><strong>Date Range:</strong> {new Date(report.dateRange.start).toLocaleDateString()} - {new Date(report.dateRange.end).toLocaleDateString()}</p>
                    <p><strong>Report Types:</strong> {report.reportTypes.length}</p>
                    <p><strong>Created:</strong> {new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visual Report Configuration */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Visual Report Configuration</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowColumnManager(true)}
              >
                🔧 Columns
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setShowSaveModal(true)}
              >
                💾 Save Report
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding: '32px' }}>
          {/* Quick Date Range Presets */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Quick Date Ranges</label>
            
            {/* Calendar Periods */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>Calendar Periods</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: 'thisWeek', label: 'This Week (Mon-Fri)' },
                  { key: 'lastWeek', label: 'Last Week (Mon-Fri)' },
                  { key: 'thisMonth', label: `This Month (${new Date().toLocaleDateString('en-US', { month: 'short' })})` },
                  { key: 'lastMonth', label: `Last Month (${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'short' })})` }
                ].map(preset => (
                  <button
                    key={preset.key}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                    onClick={() => setQuickDateRange(preset.key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rolling Periods */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>Rolling Periods (from today)</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'last7Days', label: 'Last 7 Days' },
                  { key: 'last30Days', label: 'Last 30 Days' },
                  { key: 'last90Days', label: 'Last 90 Days' }
                ].map(preset => (
                  <button
                    key={preset.key}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                    onClick={() => setQuickDateRange(preset.key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Chart Configuration */}
          <div className="form-row">
            <div className="form-group">
              <label>Chart Type</label>
              <select
                value={reportConfig.chartType}
                onChange={(e) => setReportConfig(prev => ({ ...prev, chartType: e.target.value as any }))}
                className="form-input"
              >
                <option value="bar">📊 Bar Chart</option>
                <option value="donut">🍩 Donut Chart</option>
                <option value="line">📈 Line Chart</option>
                <option value="area">🏔️ Area Chart</option>
                <option value="scatter">⚫ Scatter Plot</option>
              </select>
            </div>
            <div className="form-group">
              <label>Group Data By</label>
              <select
                value={reportConfig.groupBy}
                onChange={(e) => setReportConfig(prev => ({ ...prev, groupBy: e.target.value }))}
                className="form-input"
              >
                <option value="project">Project</option>
                <option value="client">Client</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
                <option value="date">Date</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Projects</label>
              <MultiSelect
                options={projects.map(project => ({
                  value: project.name,
                  label: project.name
                }))}
                selectedValues={selectedProjects}
                onChange={setSelectedProjects}
                placeholder="All projects (or select specific ones)..."
                className="form-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Hours</div>
          <div className="stat-value">{formatHours(totalHours)}</div>
          <div className="stat-change">in selected period</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Customer-Focused Hours</div>
          <div className="stat-value">{formatHours(billableHours)}</div>
          <div className="stat-change">{((billableHours / totalHours) * 100 || 0).toFixed(1)}% of total</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Utilization Rate</div>
          <div className="stat-value">{((billableHours / totalHours) * 100 || 0).toFixed(1)}%</div>
          <div className={`stat-change ${((billableHours / totalHours) * 100) >= 80 ? 'positive' : 'negative'}`}>
            {((billableHours / totalHours) * 100) >= 80 ? '✅ Above 80% target' : '⚠️ Below 80% target'}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Automated Entries</div>
          <div className="stat-value">{filteredEntries.filter(e => e.automated).length}</div>
          <div className="stat-change">{((filteredEntries.filter(e => e.automated).length / filteredEntries.length) * 100 || 0).toFixed(0)}% auto-tracked</div>
        </div>
      </div>

      {/* Visual Chart Display */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">Visual Analysis - {reportConfig.title}</h2>
        </div>
        <div style={{ padding: '24px' }}>
          <div className="chart-display">
            {reportConfig.chartType === 'donut' && (
              <DonutChart data={projectStats} title={`Hours by ${reportConfig.groupBy || 'Project'}`} />
            )}
            {reportConfig.chartType === 'bar' && (
              <BarChart data={projectStats} title={`Hours by ${reportConfig.groupBy || 'Project'}`} />
            )}
            {reportConfig.chartType === 'line' && Object.keys(dailyStats).length > 1 && (
              <LineChart data={dailyStats} title="Daily Hours Trend" />
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Data Table */}
      <div className="content-card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Data Table - {reportConfig.title}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Showing {getVisibleColumns().length} of {reportConfig.columns.length} columns
              </span>
              <button 
                className="btn btn-small btn-secondary"
                onClick={() => setShowColumnManager(true)}
              >
                ⚙️ Manage
              </button>
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table dynamic-table">
            <thead>
              <tr>
                {getVisibleColumns().map(column => (
                  <th key={column.id}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.slice(0, 50).map((entry, index) => (
                <tr key={entry.id || index}>
                  {getVisibleColumns().map(column => (
                    <td key={column.id}>
                      {formatCellValue(entry, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length > 50 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Showing first 50 of {filteredEntries.length} entries. Export to see all data.
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Summary by {reportConfig.groupBy || 'Project'}</h2>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{reportConfig.groupBy || 'Project'}</th>
                  <th>Hours</th>
                  <th>Entries</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(projectStats)
                  .sort(([,a], [,b]) => b.hours - a.hours)
                  .slice(0, 10)
                  .map(([key, stats]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td className="time-value">{formatHours(stats.hours)}</td>
                      <td>{stats.count}</td>
                      <td>{((stats.hours / totalHours) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Status Breakdown</h2>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Hours</th>
                  <th>Entries</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(statusStats)
                  .sort(([,a], [,b]) => b.hours - a.hours)
                  .map(([status, stats]) => (
                    <tr key={status}>
                      <td style={{ textTransform: 'capitalize' }}>{status}</td>
                      <td className="time-value">{formatHours(stats.hours)}</td>
                      <td>{stats.count}</td>
                      <td>{((stats.hours / totalHours) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Save Report Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Save Current Report View</h3>
              <button 
                className="modal-close"
                onClick={() => setShowSaveModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Report Name</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="form-input"
                  placeholder="Enter a name for this report..."
                  autoFocus
                />
              </div>
              <div className="report-summary">
                <h4>Current Configuration:</h4>
                <ul>
                  <li><strong>Report Title:</strong> {reportConfig.title}</li>
                  <li><strong>Date Range:</strong> {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}</li>
                  <li><strong>Chart Type:</strong> {reportConfig.chartType}</li>
                  <li><strong>Group By:</strong> {reportConfig.groupBy}</li>
                  <li><strong>Projects:</strong> {selectedProjects.length === 0 ? 'All' : selectedProjects.join(', ')}</li>
                  <li><strong>Visible Columns:</strong> {getVisibleColumns().length} of {reportConfig.columns.length}</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveCurrentReport}
                disabled={!reportName.trim()}
              >
                Save Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Manager Modal */}
      {showColumnManager && (
        <div className="modal-overlay" onClick={() => setShowColumnManager(false)}>
          <div className="modal-content column-manager-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔧 Column Manager</h3>
              <button 
                className="modal-close"
                onClick={() => setShowColumnManager(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Customize your report columns: show/hide, rename, and reorder columns.
                </p>
                <button 
                  className="btn btn-secondary"
                  onClick={addCustomColumn}
                  style={{ marginBottom: '16px' }}
                >
                  ➕ Add Custom Column
                </button>
              </div>
              
              <div className="column-list">
                {reportConfig.columns
                  .sort((a, b) => a.order - b.order)
                  .map((column, index) => (
                    <div key={column.id} className="column-item">
                      <div className="column-controls">
                        <input
                          type="checkbox"
                          checked={column.visible}
                          onChange={() => toggleColumnVisibility(column.id)}
                          className="column-checkbox"
                        />
                        <input
                          type="text"
                          value={column.label}
                          onChange={(e) => updateColumnLabel(column.id, e.target.value)}
                          className="column-label-input"
                          style={{ flex: 1, marginLeft: '8px' }}
                        />
                        <span className="column-type">{column.type}</span>
                        <div className="column-move-buttons">
                          <button
                            onClick={() => moveColumn(column.id, 'up')}
                            disabled={index === 0}
                            className="btn btn-small btn-secondary"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveColumn(column.id, 'down')}
                            disabled={index === reportConfig.columns.length - 1}
                            className="btn btn-small btn-secondary"
                          >
                            ↓
                          </button>
                        </div>
                        {column.id.startsWith('custom_') && (
                          <button
                            onClick={() => removeColumn(column.id)}
                            className="btn btn-small btn-danger"
                            style={{ marginLeft: '8px' }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowColumnManager(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};