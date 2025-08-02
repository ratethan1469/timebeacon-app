import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Permission, 
  UserRole, 
  ROLE_PERMISSIONS,
  PermissionResource,
  PermissionAction,
  InviteUserRequest,
  TeamMember
} from '../types/auth';
import { authService } from '../services/auth';

interface PermissionsManagerProps {
  isVisible: boolean;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({ isVisible }) => {
  const { user, company, checkPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'invite'>('users');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteUserRequest>({
    email: '',
    name: '',
    role: 'employee',
    department: '',
  });

  useEffect(() => {
    if (isVisible && checkPermission('users', 'read')) {
      loadTeamMembers();
    }
  }, [isVisible]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const members = await authService.getTeamMembers();
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkPermission('users', 'create')) {
      alert('You do not have permission to invite users');
      return;
    }

    try {
      setLoading(true);
      await authService.inviteUser(inviteForm);
      setInviteForm({
        email: '',
        name: '',
        role: 'employee',
        department: '',
      });
      alert('User invited successfully! They will receive an email with setup instructions.');
      await loadTeamMembers();
    } catch (error) {
      console.error('Failed to invite user:', error);
      alert('Failed to invite user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: UserRole): string => {
    const roleNames = {
      owner: 'Owner',
      admin: 'Administrator',
      manager: 'Manager',
      employee: 'Employee',
      viewer: 'Viewer'
    };
    return roleNames[role] || role;
  };

  const getRolePermissions = (role: UserRole): Permission[] => {
    return ROLE_PERMISSIONS[role] || [];
  };

  const canManageUser = (targetUser: User): boolean => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (user.role === 'admin' && targetUser.role !== 'owner') return true;
    if (user.role === 'manager' && ['employee', 'viewer'].includes(targetUser.role)) return true;
    return false;
  };

  if (!isVisible) return null;

  return (
    <div className="content-card">
      <div className="card-header">
        <h2 className="card-title">Team & Permissions</h2>
        <p style={{ color: 'var(--gray-600)', fontSize: '14px', margin: 0 }}>
          Manage team members, roles, and access permissions
        </p>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--gray-200)', 
          marginBottom: '24px' 
        }}>
          {(['users', 'roles', 'invite'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--primary-color)' : 'var(--gray-600)',
                fontWeight: activeTab === tab ? '600' : '400',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'users' ? 'Team Members' : tab === 'roles' ? 'Role Permissions' : 'Invite Users'}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading team members...</div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {teamMembers.map((member) => (
                  <div 
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--gray-50)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600'
                        }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>{member.name}</div>
                        <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
                          {member.email}
                        </div>
                        <div style={{ color: 'var(--gray-500)', fontSize: '12px' }}>
                          {member.profile.jobTitle} • {getRoleDisplayName(member.role)}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span 
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: member.status === 'active' ? '#dcfce7' : '#fee2e2',
                          color: member.status === 'active' ? '#166534' : '#991b1b'
                        }}
                      >
                        {member.status}
                      </span>
                      
                      {canManageUser(member) && (
                        <button
                          onClick={() => setSelectedUser(member)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            border: '1px solid var(--gray-300)',
                            borderRadius: '6px',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          Manage
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>Role Permissions Overview</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '14px', margin: 0 }}>
                Each role has predefined permissions. Custom permissions can be assigned on a per-user basis.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => (
                <div 
                  key={role}
                  style={{
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--gray-50)',
                      borderBottom: '1px solid var(--gray-200)'
                    }}
                  >
                    <h4 style={{ margin: 0, color: 'var(--gray-900)' }}>
                      {getRoleDisplayName(role as UserRole)}
                    </h4>
                  </div>
                  
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      {permissions.map((permission, index) => (
                        <div 
                          key={index}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: 'var(--gray-50)',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                            {permission.resource}
                          </div>
                          <div style={{ color: 'var(--gray-600)' }}>
                            {permission.actions.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Tab */}
        {activeTab === 'invite' && (
          <div>
            {checkPermission('users', 'create') ? (
              <form onSubmit={handleInviteUser}>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0' }}>Invite New Team Member</h3>
                  <p style={{ color: 'var(--gray-600)', fontSize: '14px', margin: 0 }}>
                    Send an invitation to join your TimeBeacon workspace. They'll receive setup instructions via email.
                  </p>
                </div>

                <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="form-input"
                      placeholder="colleague@company.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      className="form-input"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                      className="form-input"
                      required
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      {(user?.role === 'owner' || user?.role === 'admin') && (
                        <option value="admin">Administrator</option>
                      )}
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Department (Optional)</label>
                    <input
                      type="text"
                      value={inviteForm.department || ''}
                      onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                      className="form-input"
                      placeholder="Engineering, Sales, Marketing..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ marginTop: '16px' }}
                  >
                    {loading ? 'Sending Invitation...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: 'var(--gray-600)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                <h3 style={{ margin: '0 0 8px 0' }}>Access Restricted</h3>
                <p style={{ margin: 0 }}>
                  You don't have permission to invite new users. Contact your administrator.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};