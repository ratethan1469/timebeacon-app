import React, { useState } from 'react';
import { NavigationItem } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeItem: NavigationItem;
  onItemClick: (item: NavigationItem) => void;
}

const getNavigationItems = (userRole?: string) => {
  const baseItems = [
    { 
      id: 'dashboard' as NavigationItem, 
      label: 'Dashboard', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
    },
    { 
      id: 'reports' as NavigationItem, 
      label: 'Analytics & Reports', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
    },
    { 
      id: 'ai-insights' as NavigationItem, 
      label: 'AI Insights', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"></path><path d="M21 12c.5 0 .9-.4.9-.9V6.1c0-.5-.4-.9-.9-.9H17"></path><path d="M3 12c-.5 0-.9-.4-.9-.9V6.1c0-.5.4-.9.9-.9H7"></path><path d="M12 3c0-.5.4-.9.9-.9h4.9c.5 0 .9.4.9.9V7"></path><path d="M12 21c0 .5-.4.9-.9.9H6.1c-.5 0-.9-.4-.9-.9V17"></path></svg>
    },
    { 
      id: 'privacy' as NavigationItem, 
      label: 'Privacy & Data', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
    },
    { 
      id: 'integrations' as NavigationItem, 
      label: 'Integrations', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
    },
  ];

  // Add permissions menu for managers and above
  const managementItems = [];
  if (userRole && ['owner', 'admin', 'manager'].includes(userRole)) {
    managementItems.push({
      id: 'permissions' as NavigationItem, 
      label: 'Team & Permissions', 
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><line x1="15" y1="11" x2="21" y2="5"></line><circle cx="18" cy="8" r="3"></circle></svg>
    });
  }

  const settingsItem = {
    id: 'settings' as NavigationItem, 
    label: 'Settings', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
  };

  return [...baseItems, ...managementItems, settingsItem];
};

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemClick }) => {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };
  
  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>;
      case 'dark': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
      case 'system': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
      default: return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>;
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3))'}}>
              <defs>
                <linearGradient id="lightning-logo" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#8b5cf6', stopOpacity:1}} />
                  <stop offset="50%" style={{stopColor:'#6366f1', stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
                </linearGradient>
              </defs>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="url(#lightning-logo)" stroke="url(#lightning-logo)"></polygon>
            </svg>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="sidebar-title">TimeBeacon</h1>
              <p className="sidebar-subtitle">AI-Powered Privacy-First</p>
            </div>
          )}
        </div>
        <button 
          className="collapse-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? 
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="9,18 15,12 9,6"></polygon></svg> : 
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="15,18 9,12 15,6"></polygon></svg>
          }
        </button>
      </div>
      <nav className="nav-menu">
        {getNavigationItems(user?.role).map((item) => (
          <a
            key={item.id}
            href="#"
            className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onItemClick(item.id);
            }}
            title={isCollapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </a>
        ))}
        
        <div className="nav-footer">
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={isCollapsed ? `Theme: ${theme}` : `Current theme: ${theme}`}
          >
            <span className="nav-icon">{getThemeIcon()}</span>
            {!isCollapsed && (
              <span className="theme-label">
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </span>
            )}
          </button>
          
          {!isCollapsed && user && (
            <div className="user-info">
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          )}
          
          <button 
            className="logout-button"
            onClick={logout}
            title={isCollapsed ? 'Logout' : 'Sign out'}
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            {!isCollapsed && <span className="logout-label">Sign Out</span>}
          </button>
        </div>
      </nav>
    </div>
  );
};