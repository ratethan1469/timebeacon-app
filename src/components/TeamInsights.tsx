import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TeamMember, TimeEntry } from '../types/auth';
import { authService } from '../services/auth';
import { multiTenantDB } from '../services/multiTenantDatabase';

interface TeamStats {
  totalHours: number;
  billableHours: number;
  utilizationRate: number;
  avgDailyHours: number;
  projectsWorked: number;
  topProjects: { name: string; hours: number }[];
}

interface TeamInsightsProps {
  isVisible: boolean;
}

export const TeamInsights: React.FC<TeamInsightsProps> = ({ isVisible }) => {
  const { user, company, checkPermission } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [teamStats, setTeamStats] = useState<Record<string, TeamStats>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && checkPermission('reports', 'read')) {
      loadTeamData();
    }
  }, [isVisible, selectedPeriod]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      // Load team members
      const members = await authService.getTeamMembers();
      setTeamMembers(members);

      // Load time entries for each team member
      const statsPromises = members.map(member => calculateMemberStats(member));
      const stats = await Promise.all(statsPromises);
      
      const statsMap: Record<string, TeamStats> = {};
      members.forEach((member, index) => {
        statsMap[member.id] = stats[index];
      });
      
      setTeamStats(statsMap);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMemberStats = async (member: TeamMember): Promise<TeamStats> => {
    try {
      // Get date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }

      // Mock data for development - in production, this would fetch from multiTenantDB
      const mockTimeEntries: TimeEntry[] = generateMockTimeEntries(member.id, startDate, endDate);
      
      const totalHours = mockTimeEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const billableHours = mockTimeEntries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => sum + entry.duration, 0);
      
      const workingDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgDailyHours = totalHours / workingDays;
      const utilizationRate = (totalHours / (workingDays * 8)) * 100; // Assuming 8-hour workdays
      
      const projectHours: Record<string, number> = {};
      mockTimeEntries.forEach(entry => {
        projectHours[entry.project] = (projectHours[entry.project] || 0) + entry.duration;
      });
      
      const topProjects = Object.entries(projectHours)
        .map(([name, hours]) => ({ name, hours }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 3);

      return {
        totalHours,
        billableHours,
        utilizationRate,
        avgDailyHours,
        projectsWorked: Object.keys(projectHours).length,
        topProjects,
      };
    } catch (error) {
      console.error('Failed to calculate member stats:', error);
      return {
        totalHours: 0,
        billableHours: 0,
        utilizationRate: 0,
        avgDailyHours: 0,
        projectsWorked: 0,
        topProjects: [],
      };
    }
  };

  const generateMockTimeEntries = (userId: string, startDate: Date, endDate: Date): TimeEntry[] => {
    const entries: TimeEntry[] = [];
    const projects = ['Website Redesign', 'Mobile App', 'API Development', 'Bug Fixes', 'Documentation'];
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const entriesPerDay = Math.floor(Math.random() * 4) + 1;
        
        for (let i = 0; i < entriesPerDay; i++) {
          const project = projects[Math.floor(Math.random() * projects.length)];
          const duration = Math.random() * 4 + 0.5; // 0.5 to 4.5 hours
          const billable = Math.random() > 0.2; // 80% billable
          
          entries.push({
            id: `${userId}-${currentDate.toISOString()}-${i}`,
            userId,
            companyId: company?.id || '',
            date: currentDate.toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '17:00',
            duration,
            client: 'Mock Client',
            project,
            description: `Working on ${project.toLowerCase()}`,
            category: 'client',
            status: 'approved',
            automated: false,
            billable,
            createdAt: currentDate.toISOString(),
            updatedAt: currentDate.toISOString(),
          });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return entries;
  };

  const formatHours = (hours: number): string => {
    return `${hours.toFixed(1)}h`;
  };

  const getUtilizationColor = (rate: number): string => {
    if (rate >= 80) return '#16a34a'; // Green
    if (rate >= 60) return '#eab308'; // Yellow
    return '#dc2626'; // Red
  };

  if (!isVisible) return null;

  if (!checkPermission('reports', 'read')) {
    return (
      <div className="content-card">
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: 'var(--gray-600)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3 style={{ margin: '0 0 8px 0' }}>Access Restricted</h3>
          <p style={{ margin: 0 }}>
            You don't have permission to view team insights. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Team Insights</h1>
        <p className="dashboard-subtitle">Monitor your team's productivity and performance</p>
      </div>

      {/* Period Selection */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: '600' }}>Time Period:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['week', 'month', 'quarter'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '6px',
                    backgroundColor: selectedPeriod === period ? 'var(--primary-color)' : 'white',
                    color: selectedPeriod === period ? 'white' : 'var(--gray-700)',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team Overview */}
      {loading ? (
        <div className="content-card">
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <p>Loading team insights...</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {teamMembers.map((member) => {
            const stats = teamStats[member.id];
            if (!stats) return null;

            return (
              <div key={member.id} className="content-card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '18px'
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--gray-900)' }}>{member.name}</h3>
                      <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
                        {member.profile.jobTitle} • {member.profile.department}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '24px' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '20px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--gray-900)' }}>
                        {formatHours(stats.totalHours)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Total Hours</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-color)' }}>
                        {formatHours(stats.billableHours)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Billable Hours</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div 
                        style={{ 
                          fontSize: '24px', 
                          fontWeight: '700', 
                          color: getUtilizationColor(stats.utilizationRate)
                        }}
                      >
                        {stats.utilizationRate.toFixed(0)}%
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Utilization</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--gray-900)' }}>
                        {formatHours(stats.avgDailyHours)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Avg Daily</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--gray-900)' }}>
                        {stats.projectsWorked}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Projects</div>
                    </div>
                  </div>

                  {/* Top Projects */}
                  {stats.topProjects.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                        Top Projects This {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
                      </h4>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {stats.topProjects.map((project, index) => (
                          <div 
                            key={project.name}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              backgroundColor: 'var(--gray-50)',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          >
                            <span>{project.name}</span>
                            <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                              {formatHours(project.hours)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {teamMembers.length === 0 && (
            <div className="content-card">
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: 'var(--gray-600)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <h3 style={{ margin: '0 0 8px 0' }}>No Team Members</h3>
                <p style={{ margin: 0 }}>
                  Invite team members to start viewing insights and analytics.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};