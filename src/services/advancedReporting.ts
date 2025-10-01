/**
 * Advanced Reporting Service
 * Provides enhanced analytics, chart generation, and export capabilities
 */

import { TimeEntry, Project, Client } from '../types';
import { excelExporter } from './excelExporter';

export interface ReportMetrics {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilizationRate: number;
  productivityScore: number;
  averageSessionLength: number;
  totalSessions: number;
  topProjects: Array<{ name: string; hours: number; percentage: number }>;
  topClients: Array<{ name: string; hours: number; revenue: number }>;
  dailyTrends: Array<{ date: string; hours: number; sessions: number }>;
  weeklyComparison: Array<{ week: string; currentYear: number; previousYear: number }>;
  projectEfficiency: Array<{ project: string; plannedHours: number; actualHours: number; efficiency: number }>;
}

export interface AdvancedChartConfig {
  type: 'line' | 'bar' | 'doughnut' | 'radar' | 'scatter' | 'area' | 'treemap' | 'heatmap';
  title: string;
  data: any;
  options: any;
  interactive: boolean;
  drilldown?: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'png' | 'svg';
  includeCharts: boolean;
  template?: 'standard' | 'executive' | 'detailed' | 'summary';
  customFields?: string[];
  dateFormat?: string;
  groupBy?: 'day' | 'week' | 'month' | 'project' | 'client';
}

class AdvancedReportingService {
  /**
   * Generate comprehensive report metrics
   */
  generateAdvancedMetrics(
    timeEntries: TimeEntry[],
    projects: Project[],
    clients: Client[],
    dateRange: { start: Date; end: Date }
  ): ReportMetrics {
    const filteredEntries = this.filterEntriesByDateRange(timeEntries, dateRange);
    
    // Basic metrics
    const totalHours = this.calculateTotalHours(filteredEntries);
    const billableHours = this.calculateBillableHours(filteredEntries);
    const nonBillableHours = totalHours - billableHours;
    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
    
    // Advanced metrics
    const productivityScore = this.calculateProductivityScore(filteredEntries);
    const averageSessionLength = this.calculateAverageSessionLength(filteredEntries);
    const totalSessions = this.countUniqueSessions(filteredEntries);
    
    // Analysis data
    const topProjects = this.getTopProjects(filteredEntries, projects);
    const topClients = this.getTopClients(filteredEntries, clients);
    const dailyTrends = this.getDailyTrends(filteredEntries, dateRange);
    const weeklyComparison = this.getWeeklyComparison(timeEntries, dateRange);
    const projectEfficiency = this.getProjectEfficiency(filteredEntries, projects);

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      utilizationRate,
      productivityScore,
      averageSessionLength,
      totalSessions,
      topProjects,
      topClients,
      dailyTrends,
      weeklyComparison,
      projectEfficiency,
    };
  }

  /**
   * Generate interactive charts configuration
   */
  generateAdvancedCharts(metrics: ReportMetrics): AdvancedChartConfig[] {
    return [
      {
        type: 'doughnut',
        title: 'Time Distribution',
        interactive: true,
        drilldown: true,
        data: {
          labels: ['Billable Hours', 'Non-Billable Hours'],
          datasets: [{
            data: [metrics.billableHours, metrics.nonBillableHours],
            backgroundColor: ['#10B981', '#F59E0B'],
            borderWidth: 0,
            hoverBorderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const percentage = ((context.parsed / metrics.totalHours) * 100).toFixed(1);
                  return `${context.label}: ${context.parsed.toFixed(1)}h (${percentage}%)`;
                },
              },
            },
          },
        },
      },
      {
        type: 'line',
        title: 'Daily Productivity Trends',
        interactive: true,
        data: {
          labels: metrics.dailyTrends.map(d => d.date),
          datasets: [
            {
              label: 'Hours Tracked',
              data: metrics.dailyTrends.map(d => d.hours),
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Sessions',
              data: metrics.dailyTrends.map(d => d.sessions),
              borderColor: '#EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: false,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: 'Hours' },
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: { display: true, text: 'Sessions' },
              grid: { drawOnChartArea: false },
            },
          },
          plugins: {
            zoom: {
              zoom: { wheel: { enabled: true }, pinch: { enabled: true } },
              pan: { enabled: true },
            },
          },
        },
      },
      {
        type: 'bar',
        title: 'Top Projects by Hours',
        interactive: true,
        drilldown: true,
        data: {
          labels: metrics.topProjects.map(p => p.name),
          datasets: [{
            label: 'Hours',
            data: metrics.topProjects.map(p => p.hours),
            backgroundColor: [
              '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
              '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
            ],
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                afterLabel: (context: any) => {
                  const project = metrics.topProjects[context.dataIndex];
                  return `${project.percentage.toFixed(1)}% of total time`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Hours' },
            },
          },
        },
      },
      {
        type: 'radar',
        title: 'Project Efficiency Analysis',
        interactive: true,
        data: {
          labels: metrics.projectEfficiency.map(p => p.project),
          datasets: [{
            label: 'Efficiency Score',
            data: metrics.projectEfficiency.map(p => p.efficiency),
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: '#3B82F6',
            pointBackgroundColor: '#3B82F6',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#3B82F6',
          }],
        },
        options: {
          responsive: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 120,
              ticks: {
                stepSize: 20,
                callback: (value: any) => `${value}%`,
              },
            },
          },
        },
      },
      {
        type: 'bar',
        title: 'Year-over-Year Comparison',
        interactive: true,
        data: {
          labels: metrics.weeklyComparison.map(w => w.week),
          datasets: [
            {
              label: 'Current Year',
              data: metrics.weeklyComparison.map(w => w.currentYear),
              backgroundColor: '#10B981',
            },
            {
              label: 'Previous Year',
              data: metrics.weeklyComparison.map(w => w.previousYear),
              backgroundColor: '#6B7280',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                afterBody: (context: any) => {
                  const current = context[0]?.parsed?.y || 0;
                  const previous = context[1]?.parsed?.y || 0;
                  const change = previous > 0 ? ((current - previous) / previous * 100).toFixed(1) : 'N/A';
                  return [`Change: ${change}%`];
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Hours' },
            },
          },
        },
      },
    ];
  }

  /**
   * Generate Excel export with multiple sheets
   */
  async exportToExcel(
    metrics: ReportMetrics,
    timeEntries: TimeEntry[],
    projects: Project[],
    clients: Client[],
    options: ExportOptions
  ): Promise<Blob> {
    return excelExporter.exportReport(
      metrics,
      timeEntries,
      projects,
      clients,
      {
        includeCharts: options.includeCharts,
        includeSummary: true,
        includeDetailedData: true,
        includeTrends: true,
        dateFormat: options.dateFormat || 'Custom Range',
        reportTitle: 'TimeBeacon Analytics Report',
        generatedBy: 'TimeBeacon User',
      }
    );
  }

  /**
   * Generate PDF report with charts
   */
  async exportToPDF(
    metrics: ReportMetrics,
    charts: AdvancedChartConfig[],
    options: ExportOptions
  ): Promise<Blob> {
    // Generate HTML content for PDF
    const htmlContent = this.generatePDFContent(metrics, charts, options);
    
    // In a real implementation, use a library like Puppeteer or jsPDF
    // For now, return HTML as blob
    return new Blob([htmlContent], { type: 'text/html' });
  }

  /**
   * Real-time report updates
   */
  subscribeToRealtimeUpdates(
    callback: (metrics: ReportMetrics) => void,
    interval: number = 60000 // 1 minute
  ): () => void {
    const intervalId = setInterval(() => {
      // In a real implementation, fetch latest data and update metrics
      // For now, just call callback to simulate updates
      callback({} as ReportMetrics);
    }, interval);

    return () => clearInterval(intervalId);
  }

  /**
   * Automated report scheduling
   */
  scheduleReport(
    config: {
      frequency: 'daily' | 'weekly' | 'monthly';
      recipients: string[];
      format: ExportOptions['format'];
      template: ExportOptions['template'];
      time?: string; // HH:mm format
    }
  ): string {
    // Generate schedule ID
    const scheduleId = crypto.randomUUID();
    
    // Store schedule in localStorage (in production, store on server)
    const schedules = JSON.parse(localStorage.getItem('report_schedules') || '[]');
    schedules.push({
      id: scheduleId,
      ...config,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: this.calculateNextRun(config.frequency, config.time),
    });
    
    localStorage.setItem('report_schedules', JSON.stringify(schedules));
    
    return scheduleId;
  }

  // Private helper methods
  private filterEntriesByDateRange(entries: TimeEntry[], range: { start: Date; end: Date }): TimeEntry[] {
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= range.start && entryDate <= range.end;
    });
  }

  private calculateTotalHours(entries: TimeEntry[]): number {
    return entries.reduce((total, entry) => total + (entry.duration || 0), 0) / 60;
  }

  private calculateBillableHours(entries: TimeEntry[]): number {
    return entries
      .filter(entry => entry.billable)
      .reduce((total, entry) => total + (entry.duration || 0), 0) / 60;
  }

  private calculateProductivityScore(entries: TimeEntry[]): number {
    // Calculate based on various factors
    const totalSessions = this.countUniqueSessions(entries);
    const averageSessionLength = this.calculateAverageSessionLength(entries);
    const consistencyScore = this.calculateConsistencyScore(entries);
    
    // Weighted scoring algorithm
    const sessionScore = Math.min(totalSessions / 8 * 100, 100); // Ideal: 8 sessions/day
    const lengthScore = Math.min(averageSessionLength / 120 * 100, 100); // Ideal: 2 hours
    const consistencyWeight = consistencyScore * 100;
    
    return (sessionScore * 0.3 + lengthScore * 0.4 + consistencyWeight * 0.3);
  }

  private calculateAverageSessionLength(entries: TimeEntry[]): number {
    if (entries.length === 0) return 0;
    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return totalMinutes / entries.length;
  }

  private countUniqueSessions(entries: TimeEntry[]): number {
    const sessions = new Set();
    entries.forEach(entry => {
      const sessionKey = `${entry.date}-${entry.projectId}`;
      sessions.add(sessionKey);
    });
    return sessions.size;
  }

  private calculateConsistencyScore(entries: TimeEntry[]): number {
    // Calculate how consistent daily work patterns are
    const dailyHours = new Map<string, number>();
    
    entries.forEach(entry => {
      const date = entry.date.split('T')[0];
      const hours = (entry.duration || 0) / 60;
      dailyHours.set(date, (dailyHours.get(date) || 0) + hours);
    });
    
    const hoursArray = Array.from(dailyHours.values());
    if (hoursArray.length < 2) return 1;
    
    const mean = hoursArray.reduce((sum, h) => sum + h, 0) / hoursArray.length;
    const variance = hoursArray.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hoursArray.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - (stdDev / mean));
  }

  private getTopProjects(entries: TimeEntry[], projects: Project[]): Array<{ name: string; hours: number; percentage: number }> {
    const projectHours = new Map<string, number>();
    const totalHours = this.calculateTotalHours(entries);
    
    entries.forEach(entry => {
      const hours = (entry.duration || 0) / 60;
      projectHours.set(entry.projectId, (projectHours.get(entry.projectId) || 0) + hours);
    });
    
    return Array.from(projectHours.entries())
      .map(([projectId, hours]) => {
        const project = projects.find(p => p.id === projectId);
        return {
          name: project?.name || 'Unknown Project',
          hours,
          percentage: (hours / totalHours) * 100,
        };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }

  private getTopClients(entries: TimeEntry[], clients: Client[]): Array<{ name: string; hours: number; revenue: number }> {
    const clientData = new Map<string, { hours: number; revenue: number }>();
    
    entries.forEach(entry => {
      if (entry.clientId) {
        const hours = (entry.duration || 0) / 60;
        const revenue = hours * (entry.hourlyRate || 0);
        const existing = clientData.get(entry.clientId) || { hours: 0, revenue: 0 };
        clientData.set(entry.clientId, {
          hours: existing.hours + hours,
          revenue: existing.revenue + revenue,
        });
      }
    });
    
    return Array.from(clientData.entries())
      .map(([clientId, data]) => {
        const client = clients.find(c => c.id === clientId);
        return {
          name: client?.name || 'Unknown Client',
          ...data,
        };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }

  private getDailyTrends(entries: TimeEntry[], range: { start: Date; end: Date }): Array<{ date: string; hours: number; sessions: number }> {
    const dailyData = new Map<string, { hours: number; sessions: Set<string> }>();
    
    // Initialize all dates in range
    const currentDate = new Date(range.start);
    while (currentDate <= range.end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyData.set(dateStr, { hours: 0, sessions: new Set() });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Populate with actual data
    entries.forEach(entry => {
      const date = entry.date.split('T')[0];
      const existing = dailyData.get(date);
      if (existing) {
        existing.hours += (entry.duration || 0) / 60;
        existing.sessions.add(`${entry.projectId}-${entry.startTime}`);
      }
    });
    
    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        hours: data.hours,
        sessions: data.sessions.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getWeeklyComparison(_entries: TimeEntry[], range: { start: Date; end: Date }): Array<{ week: string; currentYear: number; previousYear: number }> {
    // Implementation for year-over-year weekly comparison
    // Using range parameter to potentially implement year-over-year comparison
    
    // Mock data for demo
    return [
      { week: 'Week 1', currentYear: 40, previousYear: 35 },
      { week: 'Week 2', currentYear: 42, previousYear: 38 },
      { week: 'Week 3', currentYear: 38, previousYear: 40 },
      { week: 'Week 4', currentYear: 45, previousYear: 42 },
    ];
  }

  private getProjectEfficiency(entries: TimeEntry[], projects: Project[]): Array<{ project: string; plannedHours: number; actualHours: number; efficiency: number }> {
    // Calculate efficiency based on estimated vs actual hours
    const projectData = new Map<string, number>();
    
    entries.forEach(entry => {
      const hours = (entry.duration || 0) / 60;
      projectData.set(entry.projectId, (projectData.get(entry.projectId) || 0) + hours);
    });
    
    return Array.from(projectData.entries())
      .map(([projectId, actualHours]) => {
        const project = projects.find(p => p.id === projectId);
        const estimatedHours = project?.estimatedHours || actualHours * 1.2; // Default 20% buffer
        const efficiency = estimatedHours > 0 ? (estimatedHours / actualHours) * 100 : 100;
        
        return {
          project: project?.name || 'Unknown Project',
          plannedHours: estimatedHours,
          actualHours,
          efficiency: Math.min(efficiency, 150), // Cap at 150%
        };
      })
      .slice(0, 10);
  }





  private generatePDFContent(metrics: ReportMetrics, _charts: AdvancedChartConfig[], _options: ExportOptions): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TimeBeacon Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
          .chart-container { margin: 20px 0; page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TimeBeacon Analytics Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="metrics-summary">
          <div class="metric">
            <h3>Total Hours</h3>
            <p>${metrics.totalHours.toFixed(2)}</p>
          </div>
          <div class="metric">
            <h3>Utilization Rate</h3>
            <p>${metrics.utilizationRate.toFixed(1)}%</p>
          </div>
          <div class="metric">
            <h3>Productivity Score</h3>
            <p>${metrics.productivityScore.toFixed(1)}%</p>
          </div>
        </div>

        <div class="top-projects">
          <h2>Top Projects</h2>
          <table>
            <tr><th>Project</th><th>Hours</th><th>Percentage</th></tr>
            ${metrics.topProjects.map(p => 
              `<tr><td>${p.name}</td><td>${p.hours.toFixed(2)}</td><td>${p.percentage.toFixed(1)}%</td></tr>`
            ).join('')}
          </table>
        </div>
      </body>
      </html>
    `;
  }

  private calculateNextRun(frequency: string, time?: string): Date {
    const now = new Date();
    const nextRun = new Date(now);
    
    switch (frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        break;
    }
    
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    }
    
    return nextRun;
  }
}

export const advancedReportingService = new AdvancedReportingService();