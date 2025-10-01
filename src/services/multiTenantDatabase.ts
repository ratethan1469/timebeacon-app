/**
 * Multi-Tenant Database Service
 * Enhanced privacy-first database with company/user isolation
 */

import { TimeBeaconDatabase } from './database';
import { 
  TimeEntry, 
  Project, 
  Client, 
  User, 
  Company, 
  UserSettings 
} from '../types/auth';

interface MultiTenantSchema {
  companies: Company[];
  users: User[];
  timeEntries: TimeEntry[];
  projects: Project[];
  clients: Client[];
  userSettings: { userId: string; settings: UserSettings }[];
  syncMetadata: {
    companyId: string;
    userId: string;
    lastSync: string;
    version: number;
    deviceId: string;
  }[];
}

export class MultiTenantDatabase extends TimeBeaconDatabase {
  private currentCompanyId: string | null = null;
  private currentUserId: string | null = null;

  /**
   * Set the current company and user context
   */
  setContext(companyId: string, userId: string): void {
    this.currentCompanyId = companyId;
    this.currentUserId = userId;
  }

  /**
   * Get current context
   */
  getContext(): { companyId: string | null; userId: string | null } {
    return {
      companyId: this.currentCompanyId,
      userId: this.currentUserId,
    };
  }

  /**
   * Enhanced init with multi-tenant schema
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TimeBeaconMultiTenantDB', 2);

      request.onerror = (event) => {
        console.error('Multi-tenant database failed to open:', event);
        reject(new Error('Failed to open multi-tenant database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ TimeBeacon Multi-Tenant Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create companies store
        if (!db.objectStoreNames.contains('companies')) {
          const companiesStore = db.createObjectStore('companies', { keyPath: 'id' });
          companiesStore.createIndex('accountId', 'accountId', { unique: true });
          companiesStore.createIndex('slug', 'slug', { unique: true });
        }

        // Create users store
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id' });
          usersStore.createIndex('email', 'email', { unique: true });
          usersStore.createIndex('companyId', 'companyId', { unique: false });
          usersStore.createIndex('visitorId', 'visitorId', { unique: false });
        }

        // Enhanced time entries with company/user context
        if (!db.objectStoreNames.contains('timeEntries')) {
          const timeEntriesStore = db.createObjectStore('timeEntries', { keyPath: 'id' });
          timeEntriesStore.createIndex('userId', 'userId', { unique: false });
          timeEntriesStore.createIndex('companyId', 'companyId', { unique: false });
          timeEntriesStore.createIndex('date', 'date', { unique: false });
          timeEntriesStore.createIndex('project', 'project', { unique: false });
          timeEntriesStore.createIndex('status', 'status', { unique: false });
          timeEntriesStore.createIndex('companyUser', ['companyId', 'userId'], { unique: false });
        }

        // Enhanced projects with company context
        if (!db.objectStoreNames.contains('projects')) {
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectsStore.createIndex('companyId', 'companyId', { unique: false });
          projectsStore.createIndex('name', ['companyId', 'name'], { unique: true });
          projectsStore.createIndex('managerId', 'managerId', { unique: false });
        }

        // Enhanced clients with company context
        if (!db.objectStoreNames.contains('clients')) {
          const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientsStore.createIndex('companyId', 'companyId', { unique: false });
          clientsStore.createIndex('name', ['companyId', 'name'], { unique: true });
        }

        // User-specific settings
        if (!db.objectStoreNames.contains('userSettings')) {
          const settingsStore = db.createObjectStore('userSettings', { keyPath: 'userId' });
          settingsStore.createIndex('companyId', 'companyId', { unique: false });
        }

        // Enhanced sync metadata
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: ['companyId', 'userId'] });
        }

        console.log('📦 Multi-tenant database schema created');
      };
    });
  }

  // ===== COMPANY MANAGEMENT =====

  async addCompany(company: Company): Promise<void> {
    await this.performOperation(
      'companies',
      (store) => store.add(company),
      'readwrite'
    );
    console.log('✅ Company added:', company.name);
  }

  async getCompany(id: string): Promise<Company | null> {
    const result = await this.performOperation<Company | undefined>(
      'companies',
      (store) => store.get(id)
    );
    return result || null;
  }

  async getCompanyByAccountId(accountId: string): Promise<Company | null> {
    const result = await this.performOperation<Company | undefined>(
      'companies',
      (store) => store.index('accountId').get(accountId)
    );
    return result || null;
  }

  // ===== USER MANAGEMENT =====

  async addUser(user: User): Promise<void> {
    await this.performOperation(
      'users',
      (store) => store.add(user),
      'readwrite'
    );
    console.log('✅ User added:', user.email);
  }

  async getUser(id: string): Promise<User | null> {
    const result = await this.performOperation<User | undefined>(
      'users',
      (store) => store.get(id)
    );
    return result || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.performOperation<User | undefined>(
      'users',
      (store) => store.index('email').get(email)
    );
    return result || null;
  }

  async getCompanyUsers(companyId: string): Promise<User[]> {
    return await this.performOperation<User[]>(
      'users',
      (store) => store.index('companyId').getAll(companyId)
    );
  }

  // ===== CONTEXT-AWARE TIME ENTRIES =====

  async addTimeEntry(entry: TimeEntry): Promise<void> {
    if (!this.currentCompanyId || !this.currentUserId) {
      throw new Error('Database context not set. Call setContext() first.');
    }

    const contextualEntry: TimeEntry = {
      ...entry,
      companyId: this.currentCompanyId,
      userId: this.currentUserId,
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.performOperation(
      'timeEntries',
      (store) => store.add(contextualEntry),
      'readwrite'
    );
    console.log('✅ Time entry added with context:', entry.id);
  }

  async getUserTimeEntries(userId?: string): Promise<TimeEntry[]> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId || !this.currentCompanyId) {
      throw new Error('User context required');
    }

    return await this.performOperation<TimeEntry[]>(
      'timeEntries',
      (store) => store.index('companyUser').getAll([this.currentCompanyId!, targetUserId])
    );
  }

  async getTeamTimeEntries(userIds: string[]): Promise<TimeEntry[]> {
    if (!this.currentCompanyId) {
      throw new Error('Company context required');
    }

    const allEntries: TimeEntry[] = [];
    for (const userId of userIds) {
      const entries = await this.performOperation<TimeEntry[]>(
        'timeEntries',
        (store) => store.index('companyUser').getAll([this.currentCompanyId!, userId])
      );
      allEntries.push(...entries);
    }

    return allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // ===== CONTEXT-AWARE PROJECTS =====

  async addProject(project: Project): Promise<void> {
    if (!this.currentCompanyId || !this.currentUserId) {
      throw new Error('Database context not set');
    }

    const contextualProject: Project = {
      ...project,
      companyId: this.currentCompanyId,
      createdBy: this.currentUserId,
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.performOperation(
      'projects',
      (store) => store.add(contextualProject),
      'readwrite'
    );
    console.log('✅ Project added with context:', project.name);
  }

  async getCompanyProjects(): Promise<Project[]> {
    if (!this.currentCompanyId) {
      throw new Error('Company context required');
    }

    return await this.performOperation<Project[]>(
      'projects',
      (store) => store.index('companyId').getAll(this.currentCompanyId)
    );
  }

  // ===== CONTEXT-AWARE CLIENTS =====

  async addClient(client: Omit<Client, 'companyId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.currentCompanyId || !this.currentUserId) {
      throw new Error('Database context not set');
    }

    const contextualClient: Client = {
      ...client,
      companyId: this.currentCompanyId,
      createdBy: this.currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.performOperation(
      'clients',
      (store) => store.add(contextualClient),
      'readwrite'
    );
    console.log('✅ Client added with context:', client.name);
  }

  async getCompanyClients(): Promise<Client[]> {
    if (!this.currentCompanyId) {
      throw new Error('Company context required');
    }

    return await this.performOperation<Client[]>(
      'clients',
      (store) => store.index('companyId').getAll(this.currentCompanyId)
    );
  }

  // ===== USER SETTINGS =====

  async updateUserSettings(settings: UserSettings, userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId || !this.currentCompanyId) {
      throw new Error('User context required');
    }

    await this.performOperation(
      'userSettings',
      (store) => store.put({ 
        userId: targetUserId, 
        companyId: this.currentCompanyId,
        settings,
        updatedAt: new Date().toISOString()
      }),
      'readwrite'
    );
    console.log('✅ User settings updated:', targetUserId);
  }

  async getUserSettings(userId?: string): Promise<UserSettings | null> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      throw new Error('User context required');
    }

    const result = await this.performOperation<any>(
      'userSettings',
      (store) => store.get(targetUserId)
    );
    return result?.settings || null;
  }

  // ===== PRIVACY & SECURITY =====

  /**
   * Clear all data for a specific user (GDPR compliance)
   */
  async clearUserData(userId: string): Promise<void> {
    if (!this.currentCompanyId) {
      throw new Error('Company context required');
    }

    const transaction = this.db!.transaction(['timeEntries', 'userSettings'], 'readwrite');
    
    // Clear time entries
    const timeEntriesStore = transaction.objectStore('timeEntries');
    const timeEntriesIndex = timeEntriesStore.index('companyUser');
    const timeEntriesRequest = timeEntriesIndex.openCursor([this.currentCompanyId, userId]);
    
    timeEntriesRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Clear user settings
    const settingsStore = transaction.objectStore('userSettings');
    settingsStore.delete(userId);

    console.log('✅ User data cleared:', userId);
  }

  /**
   * Export company data for backup/migration
   */
  async exportCompanyData(): Promise<Partial<MultiTenantSchema>> {
    if (!this.currentCompanyId) {
      throw new Error('Company context required');
    }

    const [company, users, timeEntries, projects, clients] = await Promise.all([
      this.getCompany(this.currentCompanyId),
      this.getCompanyUsers(this.currentCompanyId),
      this.performOperation<TimeEntry[]>('timeEntries', (store) => 
        store.index('companyId').getAll(this.currentCompanyId)
      ),
      this.getCompanyProjects(),
      this.getCompanyClients(),
    ]);

    return {
      companies: company ? [company] : [],
      users,
      timeEntries,
      projects,
      clients,
    };
  }

  /**
   * Get database statistics for the current company
   */
  async getCompanyStats(): Promise<{
    users: number;
    timeEntries: number;
    projects: number;
    clients: number;
    storageSize: string;
  }> {
    if (!this.currentCompanyId) {
      throw new Error('Company context required');
    }

    const [users, timeEntries, projects, clients] = await Promise.all([
      this.getCompanyUsers(this.currentCompanyId),
      this.performOperation<TimeEntry[]>('timeEntries', (store) => 
        store.index('companyId').getAll(this.currentCompanyId)
      ),
      this.getCompanyProjects(),
      this.getCompanyClients(),
    ]);

    const dataSize = JSON.stringify({ users, timeEntries, projects, clients }).length;
    const storageSize = `${(dataSize / 1024).toFixed(2)} KB`;

    return {
      users: users.length,
      timeEntries: timeEntries.length,
      projects: projects.length,
      clients: clients.length,
      storageSize,
    };
  }
}

// Singleton instance
export const multiTenantDB = new MultiTenantDatabase();