/**
 * Enhanced Permissions Manager
 * Comprehensive role-based access control with Manager/Individual Contributor/Admin roles
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { 
  User, 
  UserRole, 
  Permission, 
  ROLE_PERMISSIONS, 
  ROLE_HIERARCHY,
  PermissionResource,
  PermissionAction 
} from '../types/auth';

interface TeamAssignment {
  userId: string;
  managerId: string;
  department: string;
  startDate: string;
}

interface PermissionAuditLog {
  id: string;
  userId: string;
  action: 'granted' | 'revoked' | 'modified';
  permission: string;
  grantedBy: string;
  timestamp: string;
  reason?: string;
}

const PermissionsManager: React.FC = () => {
  const { user, checkPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'teams' | 'audit'>('roles');

  // Check if current user can manage permissions
  const canManagePermissions = useMemo(() => {
    return user && (
      user.role === 'owner' || 
      user.role === 'admin' || 
      checkPermission('users', 'manage')
    );
  }, [user, checkPermission]);

  // Check if current user can manage teams
  const canManageTeams = useMemo(() => {
    return user && (
      user.role === 'owner' || 
      user.role === 'admin' || 
      user.role === 'manager' ||
      checkPermission('teams', 'manage')
    );
  }, [user, checkPermission]);

  useEffect(() => {
    if (canManagePermissions || canManageTeams) {
      loadUsersAndPermissions();
    }
  }, [canManagePermissions, canManageTeams]);

  const loadUsersAndPermissions = async () => {
    setIsLoading(true);
    try {
      // Mock data for demo - in real app, fetch from API
      const mockUsers: User[] = [
        {
          id: 'user-1',
          visitorId: '10001',
          email: 'john.doe@company.com',
          name: 'John Doe',
          companyId: user?.companyId || '',
          role: 'individual_contributor',
          permissions: [],
          profile: { 
            firstName: 'John', 
            lastName: 'Doe', 
            jobTitle: 'Senior Developer', 
            department: 'Engineering',
            manager: user?.id,
            accessLevel: 'senior'
          },
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
          role: 'manager',
          permissions: [],
          profile: { 
            firstName: 'Jane', 
            lastName: 'Smith', 
            jobTitle: 'Engineering Manager', 
            department: 'Engineering',
            directReports: ['user-1', 'user-3'],
            accessLevel: 'elevated'
          },
          settings: {} as any,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mfaEnabled: true,
        },
        {
          id: 'user-3',
          visitorId: '10003',
          email: 'mike.wilson@company.com',
          name: 'Mike Wilson',
          companyId: user?.companyId || '',
          role: 'employee',
          permissions: [],
          profile: { 
            firstName: 'Mike', 
            lastName: 'Wilson', 
            jobTitle: 'Junior Developer', 
            department: 'Engineering',
            manager: 'user-2',
            accessLevel: 'basic'
          },
          settings: {} as any,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mfaEnabled: false,
        },
      ];

      setUsers(mockUsers);

      // Mock team assignments
      const mockAssignments: TeamAssignment[] = [
        { userId: 'user-1', managerId: user?.id || '', department: 'Engineering', startDate: '2024-01-01' },
        { userId: 'user-3', managerId: 'user-2', department: 'Engineering', startDate: '2024-02-01' },
      ];
      setTeamAssignments(mockAssignments);

      // Mock audit logs
      const mockAuditLogs: PermissionAuditLog[] = [
        {
          id: '1',
          userId: 'user-1',
          action: 'granted',
          permission: 'Project Lead Access',
          grantedBy: user?.id || '',
          timestamp: new Date().toISOString(),
          reason: 'Promoted to Senior Developer'
        },
        {
          id: '2',
          userId: 'user-2',
          action: 'granted',
          permission: 'Team Management',
          grantedBy: user?.id || '',
          timestamp: new Date().toISOString(),
          reason: 'Assigned as Engineering Manager'
        },
      ];
      setAuditLogs(mockAuditLogs);

    } catch (error) {
      console.error('Failed to load permissions data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole, reason?: string) => {
    if (!canManagePermissions) return;

    try {
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      // Update user role
      const updatedUser = { ...userToUpdate, role: newRole };
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));

      // Add audit log
      const auditEntry: PermissionAuditLog = {
        id: Date.now().toString(),
        userId,
        action: 'modified',
        permission: `Role changed to ${ROLE_HIERARCHY[newRole].title}`,
        grantedBy: user?.id || '',
        timestamp: new Date().toISOString(),
        reason,
      };
      setAuditLogs(prev => [auditEntry, ...prev]);

      console.log(`✅ Updated ${userToUpdate.name} role to ${newRole}`);
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const assignTeamMember = async (userId: string, managerId: string, department: string) => {
    if (!canManageTeams) return;

    try {
      const newAssignment: TeamAssignment = {
        userId,
        managerId,
        department,
        startDate: new Date().toISOString(),
      };

      setTeamAssignments(prev => [
        ...prev.filter(a => a.userId !== userId),
        newAssignment
      ]);

      // Update user's manager
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, profile: { ...u.profile, manager: managerId, department } }
          : u
      ));

      console.log(`✅ Assigned team member ${userId} to manager ${managerId}`);
    } catch (error) {
      console.error('Failed to assign team member:', error);
    }
  };

  const grantCustomPermission = async (userId: string, permission: Permission, reason?: string) => {
    if (!canManagePermissions) return;

    try {
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, permissions: [...u.permissions, permission] }
          : u
      ));

      // Add audit log
      const auditEntry: PermissionAuditLog = {
        id: Date.now().toString(),
        userId,
        action: 'granted',
        permission: `${permission.resource}:${permission.actions.join(',')}`,
        grantedBy: user?.id || '',
        timestamp: new Date().toISOString(),
        reason,
      };
      setAuditLogs(prev => [auditEntry, ...prev]);

      console.log(`✅ Granted custom permission to user ${userId}`);
    } catch (error) {
      console.error('Failed to grant permission:', error);
    }
  };

  // Get effective permissions for a user
  const getEffectivePermissions = (targetUser: User): Permission[] => {
    const rolePermissions = ROLE_PERMISSIONS[targetUser.role] || [];
    return [...rolePermissions, ...targetUser.permissions];
  };

  // Check if user can access a specific resource
  const canUserAccess = (targetUser: User, resource: PermissionResource, action: PermissionAction): boolean => {
    const permissions = getEffectivePermissions(targetUser);
    return authService.hasPermission(permissions, resource, action, targetUser.id);
  };

  // Get users that current user can manage
  const managedUsers = useMemo(() => {
    if (!user) return [];
    
    if (user.role === 'owner' || user.role === 'admin') {
      return users;
    }
    
    if (user.role === 'manager') {
      return users.filter(u => u.profile?.manager === user.id);
    }
    
    return [];
  }, [users, user]);

  if (!canManagePermissions && !canManageTeams) {
    return (
      <div className="permissions-manager">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to manage user roles and permissions.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="permissions-manager loading">
        <div className="loading-spinner"></div>
        <p>Loading permissions data...</p>
      </div>
    );
  }

  return (
    <div className="permissions-manager">
      <div className="permissions-header">
        <h1>Permissions & Team Management</h1>
        <p>Manage user roles, permissions, and team assignments</p>
      </div>

      {/* Navigation Tabs */}
      <div className="permissions-tabs">
        <button 
          className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Roles & Users
        </button>
        <button 
          className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
        {canManageTeams && (
          <button 
            className={`tab ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            Team Management
          </button>
        )}
        <button 
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Log
        </button>
      </div>

      {/* Roles & Users Tab */}
      {activeTab === 'roles' && (
        <div className="roles-section">
          <h2>User Roles</h2>
          
          {/* Role Hierarchy Info */}
          <div className="role-hierarchy">
            <h3>Role Hierarchy</h3>
            <div className="role-cards">
              {Object.entries(ROLE_HIERARCHY)
                .sort(([,a], [,b]) => b.level - a.level)
                .map(([role, info]) => (
                  <div key={role} className="role-card">
                    <div className="role-title">{info.title}</div>
                    <div className="role-level">Level {info.level}</div>
                    <div className="role-description">{info.description}</div>
                    <div className="role-count">
                      {users.filter(u => u.role === role).length} users
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Users List */}
          <div className="users-list">
            <h3>Manage Users</h3>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Department</th>
                    <th>Manager</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managedUsers.map(targetUser => (
                    <tr key={targetUser.id}>
                      <td>
                        <div className="user-info">
                          <strong>{targetUser.name}</strong>
                          <div className="user-title">{targetUser.profile?.jobTitle}</div>
                        </div>
                      </td>
                      <td>{targetUser.email}</td>
                      <td>
                        <span className={`role-badge ${targetUser.role}`}>
                          {ROLE_HIERARCHY[targetUser.role].title}
                        </span>
                      </td>
                      <td>{targetUser.profile?.department || 'Unassigned'}</td>
                      <td>
                        {targetUser.profile?.manager ? 
                          users.find(u => u.id === targetUser.profile?.manager)?.name || 'Unknown' : 
                          'None'
                        }
                      </td>
                      <td>
                        <div className="user-actions">
                          <select
                            value={targetUser.role}
                            onChange={(e) => updateUserRole(targetUser.id, e.target.value as UserRole, 'Role change via admin panel')}
                            disabled={!canManagePermissions}
                          >
                            {Object.entries(ROLE_HIERARCHY).map(([role, info]) => (
                              <option key={role} value={role}>{info.title}</option>
                            ))}
                          </select>
                          <button 
                            className="btn btn-sm"
                            onClick={() => setSelectedUser(targetUser)}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="permissions-section">
          <h2>Detailed Permissions</h2>
          
          {selectedUser ? (
            <div className="user-permissions">
              <h3>Permissions for {selectedUser.name}</h3>
              
              <div className="permission-categories">
                {Object.entries(
                  getEffectivePermissions(selectedUser).reduce((acc, perm) => {
                    if (!acc[perm.resource]) acc[perm.resource] = [];
                    acc[perm.resource].push(perm);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([resource, permissions]) => (
                  <div key={resource} className="permission-category">
                    <h4>{resource.charAt(0).toUpperCase() + resource.slice(1)}</h4>
                    <div className="permission-actions">
                      {permissions.map((perm, index) => (
                        <div key={index} className="permission-item">
                          <div className="permission-actions-list">
                            {perm.actions.map(action => (
                              <span key={action} className="action-badge">{action}</span>
                            ))}
                          </div>
                          {perm.scope && (
                            <div className="permission-scope">
                              Scope: {
                                perm.scope.all ? 'All' : 
                                perm.scope.own ? 'Own Data Only' :
                                perm.scope.team ? 'Team Members' :
                                perm.scope.department ? 'Department' : 'Limited'
                              }
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Back to Users
              </button>
            </div>
          ) : (
            <div className="select-user">
              <p>Select a user from the Roles tab to view their detailed permissions.</p>
            </div>
          )}
        </div>
      )}

      {/* Team Management Tab */}
      {activeTab === 'teams' && canManageTeams && (
        <div className="teams-section">
          <h2>Team Assignments</h2>
          
          <div className="team-structure">
            <h3>Organizational Structure</h3>
            <div className="org-chart">
              {users.filter(u => u.role === 'manager' || u.role === 'admin' || u.role === 'owner').map(manager => (
                <div key={manager.id} className="manager-group">
                  <div className="manager-card">
                    <h4>{manager.name}</h4>
                    <div className="manager-role">{ROLE_HIERARCHY[manager.role].title}</div>
                    <div className="manager-department">{manager.profile?.department}</div>
                  </div>
                  
                  <div className="direct-reports">
                    {users.filter(u => u.profile?.manager === manager.id).map(report => (
                      <div key={report.id} className="report-card">
                        <div className="report-name">{report.name}</div>
                        <div className="report-role">{ROLE_HIERARCHY[report.role].title}</div>
                        <div className="report-title">{report.profile?.jobTitle}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="team-assignments">
            <h3>Team Assignments</h3>
            <table>
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Manager</th>
                  <th>Department</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamAssignments.map(assignment => {
                  const member = users.find(u => u.id === assignment.userId);
                  const manager = users.find(u => u.id === assignment.managerId);
                  
                  return (
                    <tr key={assignment.userId}>
                      <td>{member?.name || 'Unknown'}</td>
                      <td>{manager?.name || 'Unknown'}</td>
                      <td>{assignment.department}</td>
                      <td>{new Date(assignment.startDate).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary">
                          Reassign
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="audit-section">
          <h2>Permission Audit Log</h2>
          
          <div className="audit-log">
            {auditLogs.map(log => (
              <div key={log.id} className="audit-entry">
                <div className="audit-header">
                  <span className={`audit-action ${log.action}`}>
                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                  </span>
                  <span className="audit-timestamp">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div className="audit-details">
                  <div><strong>User:</strong> {users.find(u => u.id === log.userId)?.name || 'Unknown'}</div>
                  <div><strong>Permission:</strong> {log.permission}</div>
                  <div><strong>Changed by:</strong> {users.find(u => u.id === log.grantedBy)?.name || 'System'}</div>
                  {log.reason && <div><strong>Reason:</strong> {log.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .permissions-manager {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .permissions-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .permissions-header h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          color: #1f2937;
        }

        .permissions-tabs {
          display: flex;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 30px;
        }

        .tab {
          padding: 12px 24px;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          font-weight: 500;
          transition: all 0.2s;
        }

        .tab:hover {
          background: #f3f4f6;
        }

        .tab.active {
          border-bottom-color: #3b82f6;
          color: #3b82f6;
        }

        .role-hierarchy {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .role-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }

        .role-card {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          transition: all 0.2s;
        }

        .role-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }

        .role-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .role-level {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .role-description {
          font-size: 0.85rem;
          color: #374151;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .role-count {
          font-size: 0.8rem;
          color: #059669;
          font-weight: 500;
        }

        .users-list {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .users-table {
          overflow-x: auto;
        }

        .users-table table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .users-table th,
        .users-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .users-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }

        .user-info strong {
          display: block;
          margin-bottom: 4px;
        }

        .user-title {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .role-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .role-badge.owner { background: #fef3c7; color: #92400e; }
        .role-badge.admin { background: #ddd6fe; color: #5b21b6; }
        .role-badge.manager { background: #d1fae5; color: #065f46; }
        .role-badge.individual_contributor { background: #e0e7ff; color: #3730a3; }
        .role-badge.employee { background: #e5e7eb; color: #374151; }
        .role-badge.viewer { background: #f3f4f6; color: #6b7280; }

        .user-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .user-actions select {
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.8rem;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .permission-categories {
          display: grid;
          gap: 20px;
        }

        .permission-category {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
        }

        .permission-category h4 {
          margin-bottom: 10px;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }

        .permission-item {
          margin-bottom: 10px;
        }

        .permission-actions-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 5px;
        }

        .action-badge {
          padding: 2px 6px;
          background: #3b82f6;
          color: white;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .permission-scope {
          font-size: 0.8rem;
          color: #6b7280;
          font-style: italic;
        }

        .org-chart {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .manager-group {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
        }

        .manager-card {
          background: #f8fafc;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 15px;
        }

        .manager-card h4 {
          margin-bottom: 5px;
        }

        .manager-role, .manager-department {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .direct-reports {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }

        .report-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px;
        }

        .report-name {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .report-role, .report-title {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .audit-log {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .audit-entry {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
        }

        .audit-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 10px;
        }

        .audit-action {
          font-weight: 600;
          margin-right: 10px;
        }

        .audit-action.granted { color: #059669; }
        .audit-action.revoked { color: #dc2626; }
        .audit-action.modified { color: #d97706; }

        .audit-timestamp {
          font-size: 0.8rem;
          color: #6b7280;
          margin-left: auto;
        }

        .audit-details {
          display: grid;
          gap: 4px;
          font-size: 0.9rem;
        }

        .access-denied, .select-user {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .loading {
          text-align: center;
          padding: 40px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .role-cards {
            grid-template-columns: 1fr;
          }
          
          .permissions-tabs {
            flex-wrap: wrap;
          }
          
          .direct-reports {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default PermissionsManager;