import React, { useState, useMemo } from 'react';
import { TimeEntry, Project } from '../types';

interface ReportsProps {
  entries: TimeEntry[];
  projects: Project[];
}

type DateRange = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';
type ChartType = 'overview' | 'projects' | 'status' | 'trends' | 'utilization';

const formatHours = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(amount);
};

export const Reports: React.FC<ReportsProps> = ({ entries, projects }) => {
  const [dateRange, setDateRange] = useState<DateRange>('thisWeek');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [activeChart, setActiveChart] = useState<ChartType>('overview');

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    let start: Date, end: Date;

    switch (dateRange) {
      case 'today':
        start = end = new Date(today);
        break;
      case 'yesterday':
        start = end = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        start = startOfWeek;
        end = new Date(startOfWeek.getTime() + 4 * 24 * 60 * 60 * 1000);
        break;
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 6);
        start = lastWeekStart;
        end = new Date(lastWeekStart.getTime() + 4 * 24 * 60 * 60 * 1000);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : new Date();
        end = customEndDate ? new Date(customEndDate) : new Date();
        break;
      default:
        start = end = today;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  // Filter entries based on date range and selected projects
  const filteredEntries = useMemo(() => {
    const range = getDateRange();
    return entries.filter(entry => {
      const entryDate = entry.date;
      const inDateRange = entryDate >= range.start && entryDate <= range.end;
      const inProject = selectedProjects.length === 0 || selectedProjects.includes(entry.project);
      return inDateRange && inProject;
    });
  }, [entries, dateRange, customStartDate, customEndDate, selectedProjects]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const billableHours = filteredEntries.filter(e => e.billable).reduce((sum, e) => sum + e.duration, 0);
    const totalEarnings = filteredEntries
      .filter(entry => entry.status === 'approved' && entry.billable)
      .reduce((sum, entry) => {
        const project = projects.find(p => p.name === entry.project);
        const rate = entry.rate || project?.rate || 0;
        return sum + (entry.duration * rate);
      }, 0);

    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
    const avgHoursPerDay = totalHours / Math.max(1, new Set(filteredEntries.map(e => e.date)).size);

    // Project breakdown
    const projectStats = filteredEntries.reduce((acc, entry) => {
      if (!acc[entry.project]) {
        acc[entry.project] = { hours: 0, earnings: 0, count: 0 };
      }
      acc[entry.project].hours += entry.duration;
      acc[entry.project].count += 1;
      
      if (entry.status === 'approved' && entry.billable) {
        const project = projects.find(p => p.name === entry.project);
        const rate = entry.rate || project?.rate || 0;
        acc[entry.project].earnings += entry.duration * rate;
      }
      
      return acc;
    }, {} as Record<string, { hours: number; earnings: number; count: number }>);

    // Status breakdown
    const statusStats = filteredEntries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + entry.duration;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalHours,
      billableHours,
      totalEarnings,
      utilizationRate,
      avgHoursPerDay,
      projectStats,
      statusStats,
      totalEntries: filteredEntries.length,
      automatedEntries: filteredEntries.filter(e => e.automated).length
    };
  }, [filteredEntries, projects]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Date', 'Start', 'End', 'Duration', 'Client', 'Project', 'Description', 'Status', 'Billable', 'Earnings'];
    const csvData = filteredEntries.map(entry => {
      const project = projects.find(p => p.name === entry.project);
      const rate = entry.rate || project?.rate || 0;
      const earnings = entry.status === 'approved' && entry.billable ? (entry.duration * rate) : 0;
      
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
        earnings.toFixed(2)
      ];
    });
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `timebeacon-report-${getDateRange().start}-to-${getDateRange().end}.csv`;
    link.click();
  };

  // Chart components
  const DonutChart = ({ data, title, total }: { data: Record<string, number>; title: string; total: number }) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    let currentAngle = 0;
    
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="donut-chart-wrapper">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {Object.entries(data)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([key, value], index) => {
                const percentage = (value / total) * 100;
                const angle = (percentage / 100) * 360;
                const largeArcFlag = angle > 180 ? 1 : 0;
                
                const startAngle = (currentAngle * Math.PI) / 180;
                const endAngle = ((currentAngle + angle) * Math.PI) / 180;
                
                const x1 = 100 + 70 * Math.cos(startAngle);
                const y1 = 100 + 70 * Math.sin(startAngle);
                const x2 = 100 + 70 * Math.cos(endAngle);
                const y2 = 100 + 70 * Math.sin(endAngle);
                
                const pathData = [
                  `M 100 100`,
                  `L ${x1} ${y1}`,
                  `A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2}`,
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
            <circle cx="100" cy="100" r="35" fill="white" />
            <text x="100" y="95" textAnchor="middle" fontSize="14" fontWeight="bold">
              {formatHours(total)}
            </text>
            <text x="100" y="110" textAnchor="middle" fontSize="12" fill="#666">
              Total
            </text>
          </svg>
          <div className="chart-legend">
            {Object.entries(data)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([key, value], index) => (
                <div key={key} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="legend-label">{key}</span>
                  <span className="legend-value">
                    {formatHours(value)} ({((value / total) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const BarChart = ({ data, title, type = 'hours' }: { data: Record<string, any>; title: string; type?: 'hours' | 'currency' }) => {
    const maxValue = Math.max(...Object.values(data).map((item: any) => 
      type === 'hours' ? item.hours || item : item.earnings || item
    ));
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="bar-chart">
          {Object.entries(data)
            .sort(([,a], [,b]) => {
              const aVal = type === 'hours' ? (a as any).hours || (a as number) : (a as any).earnings || (a as number);
              const bVal = type === 'hours' ? (b as any).hours || (b as number) : (b as any).earnings || (b as number);
              return bVal - aVal;
            })
            .slice(0, 8)
            .map(([key, value], index) => {
              const val = type === 'hours' ? (value as any).hours || (value as number) : (value as any).earnings || (value as number);
              const height = (val / maxValue) * 150;
              
              return (
                <div key={key} className="bar-item">
                  <div className="bar-label">{key.length > 12 ? key.substring(0, 12) + '...' : key}</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ 
                        height: `${height}px`,
                        backgroundColor: colors[index % colors.length]
                      }}
                    />
                  </div>
                  <div className="bar-value">
                    {type === 'hours' ? formatHours(val) : formatCurrency(val)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  return (
    <div className="reports-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Reports & Analytics</h1>
          <p className="dashboard-subtitle">Comprehensive insights into your time tracking</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="content-card filters-card">
        <div className="card-header">
          <h2 className="card-title">Filters & Date Range</h2>
        </div>
        <div className="filters-content">
          <div className="filter-group">
            <label>Time Period</label>
            <div className="date-range-buttons">
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'thisWeek', label: 'This Week' },
                { key: 'lastWeek', label: 'Last Week' },
                { key: 'thisMonth', label: 'This Month' },
                { key: 'lastMonth', label: 'Last Month' },
                { key: 'custom', label: 'Custom' }
              ].map(period => (
                <button
                  key={period.key}
                  className={`btn ${dateRange === period.key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDateRange(period.key as DateRange)}
                >
                  {period.label}
                </button>
              ))}
            </div>
            
            {dateRange === 'custom' && (
              <div className="custom-date-inputs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="form-input"
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="form-input"
                />
              </div>
            )}
          </div>

          <div className="filter-group">
            <label>Projects</label>
            <select
              multiple
              value={selectedProjects}
              onChange={(e) => setSelectedProjects(Array.from(e.target.selectedOptions, option => option.value))}
              className="form-input projects-select"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.name} value={project.name}>
                  {project.name} ({project.client})
                </option>
              ))}
            </select>
            <small>Hold Ctrl/Cmd to select multiple projects</small>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <div className="metric-value">{formatHours(metrics.totalHours)}</div>
            <div className="metric-label">Total Hours</div>
            <div className="metric-detail">{metrics.totalEntries} entries</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <div className="metric-value">{formatCurrency(metrics.totalEarnings)}</div>
            <div className="metric-label">Total Earnings</div>
            <div className="metric-detail">{formatHours(metrics.billableHours)} billable</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.utilizationRate.toFixed(1)}%</div>
            <div className="metric-label">Utilization Rate</div>
            <div className="metric-detail">Billable vs total time</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📅</div>
          <div className="metric-content">
            <div className="metric-value">{formatHours(metrics.avgHoursPerDay)}</div>
            <div className="metric-label">Avg. Hours/Day</div>
            <div className="metric-detail">{metrics.automatedEntries} automated</div>
          </div>
        </div>
      </div>

      {/* Chart Navigation */}
      <div className="chart-navigation">
        {[
          { key: 'overview', label: '📊 Overview', desc: 'Key metrics and summaries' },
          { key: 'projects', label: '📁 Projects', desc: 'Time breakdown by project' },
          { key: 'status', label: '✅ Status', desc: 'Entry status analysis' },
          { key: 'trends', label: '📈 Trends', desc: 'Daily and weekly patterns' },
          { key: 'utilization', label: '⚖️ Utilization', desc: 'Billable vs non-billable' }
        ].map(chart => (
          <button
            key={chart.key}
            className={`chart-nav-btn ${activeChart === chart.key ? 'active' : ''}`}
            onClick={() => setActiveChart(chart.key as ChartType)}
          >
            <div className="chart-nav-label">{chart.label}</div>
            <div className="chart-nav-desc">{chart.desc}</div>
          </button>
        ))}
      </div>

      {/* Chart Display */}
      <div className="chart-display-area">
        {activeChart === 'overview' && (
          <div className="charts-grid">
            <DonutChart 
              data={Object.fromEntries(Object.entries(metrics.projectStats).map(([k, v]) => [k, v.hours]))} 
              title="Hours by Project" 
              total={metrics.totalHours} 
            />
            <BarChart 
              data={metrics.projectStats} 
              title="Earnings by Project" 
              type="currency" 
            />
          </div>
        )}

        {activeChart === 'projects' && (
          <div className="charts-grid">
            <BarChart 
              data={metrics.projectStats} 
              title="Hours by Project" 
              type="hours" 
            />
            <div className="project-details-table">
              <h3>Project Details</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Hours</th>
                    <th>Entries</th>
                    <th>Earnings</th>
                    <th>Avg Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metrics.projectStats)
                    .sort(([,a], [,b]) => b.hours - a.hours)
                    .map(([project, stats]) => (
                      <tr key={project}>
                        <td>{project}</td>
                        <td>{formatHours(stats.hours)}</td>
                        <td>{stats.count}</td>
                        <td>{formatCurrency(stats.earnings)}</td>
                        <td>{stats.hours > 0 ? formatCurrency(stats.earnings / stats.hours) : '$0'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeChart === 'status' && (
          <div className="charts-grid">
            <DonutChart 
              data={metrics.statusStats} 
              title="Hours by Status" 
              total={metrics.totalHours} 
            />
            <div className="status-details">
              <h3>Status Breakdown</h3>
              <div className="status-cards">
                {Object.entries(metrics.statusStats)
                  .sort(([,a], [,b]) => b - a)
                  .map(([status, hours]) => (
                    <div key={status} className="status-card">
                      <div className="status-name">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
                      <div className="status-hours">{formatHours(hours)}</div>
                      <div className="status-percentage">
                        {((hours / metrics.totalHours) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeChart === 'utilization' && (
          <div className="utilization-analysis">
            <div className="utilization-overview">
              <div className="utilization-gauge">
                <div className="gauge-container">
                  <div 
                    className="gauge-fill" 
                    style={{ 
                      background: `conic-gradient(#3b82f6 0deg ${(metrics.utilizationRate / 100) * 360}deg, #e5e7eb ${(metrics.utilizationRate / 100) * 360}deg 360deg)` 
                    }}
                  >
                    <div className="gauge-center">
                      <div className="gauge-value">{metrics.utilizationRate.toFixed(1)}%</div>
                      <div className="gauge-label">Utilization</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="utilization-breakdown">
                <div className="breakdown-item billable">
                  <div className="breakdown-color"></div>
                  <div className="breakdown-label">Billable Hours</div>
                  <div className="breakdown-value">{formatHours(metrics.billableHours)}</div>
                </div>
                <div className="breakdown-item non-billable">
                  <div className="breakdown-color"></div>
                  <div className="breakdown-label">Non-billable Hours</div>
                  <div className="breakdown-value">{formatHours(metrics.totalHours - metrics.billableHours)}</div>
                </div>
              </div>
            </div>
            
            <div className="utilization-tips">
              <h4>💡 Optimization Tips</h4>
              <div className="tips-list">
                {metrics.utilizationRate < 60 && (
                  <div className="tip warning">
                    ⚠️ Low utilization rate. Consider focusing more time on billable client work.
                  </div>
                )}
                {metrics.utilizationRate >= 80 && (
                  <div className="tip success">
                    ✅ Excellent utilization rate! You're maximizing billable time.
                  </div>
                )}
                {metrics.automatedEntries / metrics.totalEntries > 0.7 && (
                  <div className="tip info">
                    🤖 Great automation usage! {((metrics.automatedEntries / metrics.totalEntries) * 100).toFixed(0)}% of entries are automated.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="content-card data-table-card">
        <div className="card-header">
          <h2 className="card-title">Time Entries ({filteredEntries.length})</h2>
        </div>
        <div className="table-container">
          <table className="data-table">
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
                <th>Earnings</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries
                .sort((a, b) => new Date(b.date + ' ' + b.startTime).getTime() - new Date(a.date + ' ' + a.startTime).getTime())
                .slice(0, 100)
                .map((entry, index) => {
                  const project = projects.find(p => p.name === entry.project);
                  const rate = entry.rate || project?.rate || 0;
                  const earnings = entry.status === 'approved' && entry.billable ? entry.duration * rate : 0;
                  
                  return (
                    <tr key={entry.id || index}>
                      <td>{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="time-cell">{entry.startTime} - {entry.endTime}</td>
                      <td>{formatHours(entry.duration)}</td>
                      <td>{entry.client}</td>
                      <td>{entry.project}</td>
                      <td className="description-cell">{entry.description}</td>
                      <td>
                        <span className={`status-badge status-${entry.status}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td>
                        <span className={`billable-badge ${entry.billable ? 'billable' : 'non-billable'}`}>
                          {entry.billable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{formatCurrency(earnings)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {filteredEntries.length > 100 && (
            <div className="table-footer">
              Showing first 100 of {filteredEntries.length} entries. Export to CSV for complete data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};