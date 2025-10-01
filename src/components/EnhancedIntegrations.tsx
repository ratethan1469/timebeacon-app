/**
 * Enhanced Integrations Module
 * Comprehensive integration management with marketplace, analytics, and health monitoring
 */

import { useState, useEffect } from 'react';
import { Integration } from '../types';
import GoogleIntegrations from './GoogleIntegrations';

interface IntegrationMetrics {
  totalSynced: number;
  activitiesToday: number;
  timeCreated: number; // in minutes
  lastSync: string;
  syncSuccess: number;
  syncErrors: number;
}

interface AvailableIntegration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  status: 'available' | 'connected' | 'coming-soon' | 'premium';
  features: string[];
  pricing?: {
    plan: string;
    price: number;
  };
  rating: number;
  reviews: number;
  developer: string;
  lastUpdated: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  lastTriggered?: string;
  deliveryRate: number;
}

export default function EnhancedIntegrations() {
  const [activeTab, setActiveTab] = useState<'connected' | 'marketplace' | 'webhooks' | 'analytics'>('connected');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [metrics, setMetrics] = useState<Record<string, IntegrationMetrics>>({});
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const availableIntegrations: AvailableIntegration[] = [
    {
      id: 'slack-advanced',
      name: 'Slack Pro',
      description: 'Advanced Slack integration with thread tracking, channel analytics, and AI sentiment analysis',
      icon: '💬',
      category: 'Communication',
      color: '#4A154B',
      status: 'available',
      features: ['Thread tracking', 'Channel analytics', 'AI sentiment analysis', 'Custom status sync'],
      rating: 4.8,
      reviews: 2341,
      developer: 'TimeBeacon',
      lastUpdated: '2024-01-15'
    },
    {
      id: 'github-integration',
      name: 'GitHub CodeTime',
      description: 'Track coding time with commit analysis, PR reviews, and repository insights',
      icon: '🐙',
      category: 'Development',
      color: '#24292e',
      status: 'available',
      features: ['Commit tracking', 'PR review time', 'Code analytics', 'Team collaboration'],
      rating: 4.9,
      reviews: 1876,
      developer: 'TimeBeacon',
      lastUpdated: '2024-01-20'
    },
    {
      id: 'asana-premium',
      name: 'Asana Enterprise',
      description: 'Enterprise task management with advanced project analytics and team insights',
      icon: '📋',
      category: 'Project Management',
      color: '#FC636B',
      status: 'premium',
      features: ['Task automation', 'Project analytics', 'Team performance', 'Custom fields'],
      pricing: { plan: 'Pro', price: 15 },
      rating: 4.7,
      reviews: 934,
      developer: 'TimeBeacon',
      lastUpdated: '2024-01-18'
    },
    {
      id: 'linear-integration',
      name: 'Linear',
      description: 'Modern issue tracking with cycle analytics and engineering metrics',
      icon: '📐',
      category: 'Development',
      color: '#5E6AD2',
      status: 'coming-soon',
      features: ['Issue tracking', 'Cycle analytics', 'Engineering metrics', 'Roadmap planning'],
      rating: 4.6,
      reviews: 567,
      developer: 'Community',
      lastUpdated: '2024-01-10'
    },
    {
      id: 'notion-workspace',
      name: 'Notion Workspace',
      description: 'Track time spent in Notion pages, databases, and collaborative editing sessions',
      icon: '📝',
      category: 'Productivity',
      color: '#000000',
      status: 'available',
      features: ['Page tracking', 'Database analytics', 'Collaboration time', 'Content insights'],
      rating: 4.5,
      reviews: 1245,
      developer: 'TimeBeacon',
      lastUpdated: '2024-01-22'
    },
    {
      id: 'figma-design',
      name: 'Figma Design Time',
      description: 'Track design work with file analytics, collaboration insights, and version tracking',
      icon: '🎨',
      category: 'Design',
      color: '#F24E1E',
      status: 'available',
      features: ['File tracking', 'Design analytics', 'Collaboration insights', 'Version history'],
      rating: 4.8,
      reviews: 789,
      developer: 'TimeBeacon',
      lastUpdated: '2024-01-25'
    }
  ];

  useEffect(() => {
    loadIntegrations();
    loadMetrics();
    loadWebhooks();
  }, []);

  const loadIntegrations = () => {
    // Mock data - in real app would fetch from API
    setIntegrations([
      {
        id: '1',
        name: 'google-calendar',
        enabled: true,
        settings: { syncMeetings: true, includeDeclined: false },
        lastSync: new Date(Date.now() - 30000).toISOString(),
        connectedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '2', 
        name: 'slack',
        enabled: true,
        settings: { channels: ['#general', '#dev'], trackDMs: true },
        lastSync: new Date(Date.now() - 60000).toISOString(),
        connectedAt: new Date(Date.now() - 172800000).toISOString()
      }
    ]);
  };

  const loadMetrics = () => {
    setMetrics({
      'google-calendar': {
        totalSynced: 1247,
        activitiesToday: 8,
        timeCreated: 340,
        lastSync: new Date(Date.now() - 30000).toISOString(),
        syncSuccess: 98.5,
        syncErrors: 2
      },
      'slack': {
        totalSynced: 2156,
        activitiesToday: 23,
        timeCreated: 145,
        lastSync: new Date(Date.now() - 60000).toISOString(),
        syncSuccess: 96.2,
        syncErrors: 8
      }
    });
  };

  const loadWebhooks = () => {
    setWebhooks([
      {
        id: '1',
        name: 'Project Management Sync',
        url: 'https://api.timebeacon.io/webhooks/project-sync',
        events: ['time_entry.created', 'time_entry.updated'],
        active: true,
        lastTriggered: new Date(Date.now() - 120000).toISOString(),
        deliveryRate: 99.2
      },
      {
        id: '2',
        name: 'Billing System Integration',
        url: 'https://billing.company.com/timebeacon/webhook',
        events: ['time_entry.approved', 'invoice.generated'],
        active: true,
        lastTriggered: new Date(Date.now() - 300000).toISOString(),
        deliveryRate: 97.8
      }
    ]);
  };

  const categories = ['all', 'Communication', 'Development', 'Project Management', 'Productivity', 'Design'];

  const filteredIntegrations = availableIntegrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      connected: 'bg-blue-100 text-blue-800',
      'coming-soon': 'bg-yellow-100 text-yellow-800',
      premium: 'bg-purple-100 text-purple-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderConnectedTab = () => (
    <div className="space-y-6">
      {/* Google Integrations */}
      <GoogleIntegrations />

      {/* Integration Health Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Integration Health</h3>
          <p className="text-gray-600 text-sm mt-1">Monitor the performance and status of your connected integrations</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Total Activities Synced</p>
                  <p className="text-2xl font-bold text-green-900">
                    {Object.values(metrics).reduce((sum, m) => sum + m.totalSynced, 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Time Created Today</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatDuration(Object.values(metrics).reduce((sum, m) => sum + m.timeCreated, 0))}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">Average Success Rate</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {(Object.values(metrics).reduce((sum, m) => sum + m.syncSuccess, 0) / Object.values(metrics).length).toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Integrations Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Connected Services</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {integrations.map((integration) => {
            const metric = metrics[integration.name];
            return (
              <div key={integration.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">{integration.name.replace('-', ' ')}</h4>
                      <p className="text-sm text-gray-600">
                        Connected {new Date(integration.connectedAt || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${integration.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {integration.enabled ? 'Active' : 'Paused'}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {metric && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-semibold text-gray-900">{metric.activitiesToday}</p>
                      <p className="text-xs text-gray-600">Activities Today</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-semibold text-gray-900">{formatDuration(metric.timeCreated)}</p>
                      <p className="text-xs text-gray-600">Time Created</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-semibold text-gray-900">{metric.syncSuccess}%</p>
                      <p className="text-xs text-gray-600">Success Rate</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-semibold text-gray-900">{metric.totalSynced.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Total Synced</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMarketplaceTab = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${integration.color}20`, color: integration.color }}>
                    <span className="text-2xl">{integration.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                    <p className="text-sm text-gray-600">{integration.category}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(integration.status)}`}>
                  {integration.status.replace('-', ' ')}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{integration.description}</p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="flex items-center mr-4">
                    <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{integration.rating}</span>
                  </div>
                  <span>({integration.reviews} reviews)</span>
                </div>
                <div className="text-xs text-gray-500">
                  By {integration.developer} • Updated {new Date(integration.lastUpdated).toLocaleDateString()}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {integration.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                {integration.pricing && (
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">${integration.pricing.price}/mo</span>
                    <span className="text-gray-600"> per user</span>
                  </div>
                )}
                <button 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    integration.status === 'connected' 
                      ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
                      : integration.status === 'coming-soon'
                      ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  disabled={integration.status === 'connected' || integration.status === 'coming-soon'}
                >
                  {integration.status === 'connected' ? 'Connected' : 
                   integration.status === 'coming-soon' ? 'Coming Soon' : 
                   integration.status === 'premium' ? 'Upgrade to Install' : 'Install'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWebhooksTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Webhook Management</h3>
              <p className="text-gray-600 text-sm mt-1">Configure webhooks to receive real-time notifications about time tracking events</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Add Webhook
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{webhook.name}</h4>
                  <p className="text-sm text-gray-600 font-mono">{webhook.url}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${webhook.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {webhook.active ? 'Active' : 'Inactive'}
                  </span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Events</p>
                  <div className="space-y-1">
                    {webhook.events.map((event, index) => (
                      <span key={index} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded mr-1 mb-1">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Delivery Rate</p>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${webhook.deliveryRate}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{webhook.deliveryRate}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Last Triggered</p>
                  <p className="text-sm text-gray-600">
                    {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Integration Analytics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Integrations</p>
                <p className="text-3xl font-bold">{integrations.length}</p>
              </div>
              <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Data Points Synced</p>
                <p className="text-3xl font-bold">
                  {Object.values(metrics).reduce((sum, m) => sum + m.totalSynced, 0).toLocaleString()}
                </p>
              </div>
              <svg className="w-8 h-8 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Time Saved</p>
                <p className="text-3xl font-bold">
                  {formatDuration(Object.values(metrics).reduce((sum, m) => sum + m.timeCreated, 0))}
                </p>
              </div>
              <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100">Sync Errors</p>
                <p className="text-3xl font-bold">
                  {Object.values(metrics).reduce((sum, m) => sum + m.syncErrors, 0)}
                </p>
              </div>
              <svg className="w-8 h-8 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Integration Performance Chart</h4>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart placeholder - Would show sync performance over time
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'connected', label: 'Connected', icon: '🔗' },
    { id: 'marketplace', label: 'Marketplace', icon: '🏪' },
    { id: 'webhooks', label: 'Webhooks', icon: '🔗' },
    { id: 'analytics', label: 'Analytics', icon: '📊' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-1">Connect your tools to automate time tracking and boost productivity</p>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'connected' && renderConnectedTab()}
      {activeTab === 'marketplace' && renderMarketplaceTab()}
      {activeTab === 'webhooks' && renderWebhooksTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
    </div>
  );
}