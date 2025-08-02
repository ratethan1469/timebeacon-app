/**
 * TimeBeacon Database Service
 * Local-first data persistence with IndexedDB
 * Supports offline-first architecture with optional cloud sync
 */

import { TimeEntry, Project, Client, UserSettings } from '../types';

interface DatabaseSchema {
  timeEntries: TimeEntry[];
  projects: Project[];
  clients: Client[];
  settings: UserSettings;
  syncMetadata: {
    lastSync: string;
    version: number;
    deviceId: string;
  };
}

export class TimeBeaconDatabase {
  protected db: IDBDatabase | null = null;
  protected readonly dbName = 'TimeBeaconDB';
  protected readonly version = 1;
  protected readonly stores = ['timeEntries', 'projects', 'clients', 'settings', 'syncMetadata'];

  constructor() {
    this.init();
  }

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (event) => {
        console.error('Database failed to open:', event);
        console.log('ℹ️ Database issue detected. Please refresh the page or clear browser cache.');
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ TimeBeacon Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('timeEntries')) {
          const timeEntriesStore = db.createObjectStore('timeEntries', { keyPath: 'id' });
          timeEntriesStore.createIndex('date', 'date', { unique: false });
          timeEntriesStore.createIndex('project', 'project', { unique: false });
          timeEntriesStore.createIndex('client', 'client', { unique: false });
          timeEntriesStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('projects')) {
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectsStore.createIndex('name', 'name', { unique: true });
          projectsStore.createIndex('client', 'client', { unique: false });
        }

        if (!db.objectStoreNames.contains('clients')) {
          const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientsStore.createIndex('name', 'name', { unique: true });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'id' });
        }

        console.log('📦 Database schema created');
      };
    });
  }

  /**
   * Generic method to perform database operations
   */
  protected async performOperation<T>(
    storeName: string,
    operation: (store: IDBObjectStore) => IDBRequest,
    mode: IDBTransactionMode = 'readonly'
  ): Promise<T> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== TIME ENTRIES =====
  
  async addTimeEntry(entry: TimeEntry): Promise<void> {
    await this.performOperation(
      'timeEntries',
      (store) => store.add(entry),
      'readwrite'
    );
    console.log('✅ Time entry added:', entry.id);
  }

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<void> {
    const existing = await this.getTimeEntry(id);
    if (!existing) throw new Error(`Time entry ${id} not found`);
    
    const updated = { ...existing, ...updates };
    await this.performOperation(
      'timeEntries',
      (store) => store.put(updated),
      'readwrite'
    );
    console.log('✅ Time entry updated:', id);
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await this.performOperation(
      'timeEntries',
      (store) => store.delete(id),
      'readwrite'
    );
    console.log('✅ Time entry deleted:', id);
  }

  async getTimeEntry(id: string): Promise<TimeEntry | null> {
    const result = await this.performOperation<TimeEntry | undefined>(
      'timeEntries',
      (store) => store.get(id)
    );
    return result || null;
  }

  async getAllTimeEntries(): Promise<TimeEntry[]> {
    return await this.performOperation<TimeEntry[]>(
      'timeEntries',
      (store) => store.getAll()
    );
  }

  async getTimeEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    const allEntries = await this.getAllTimeEntries();
    return allEntries.filter(entry => 
      entry.date >= startDate && entry.date <= endDate
    );
  }

  // ===== PROJECTS =====

  async addProject(project: Project): Promise<void> {
    await this.performOperation(
      'projects',
      (store) => store.add(project),
      'readwrite'
    );
    console.log('✅ Project added:', project.name);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error(`Project ${id} not found`);
    
    const updated = { ...existing, ...updates };
    await this.performOperation(
      'projects',
      (store) => store.put(updated),
      'readwrite'
    );
    console.log('✅ Project updated:', id);
  }

  async deleteProject(id: string): Promise<void> {
    await this.performOperation(
      'projects',
      (store) => store.delete(id),
      'readwrite'
    );
    console.log('✅ Project deleted:', id);
  }

  async getProject(id: string): Promise<Project | null> {
    const result = await this.performOperation<Project | undefined>(
      'projects',
      (store) => store.get(id)
    );
    return result || null;
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.performOperation<Project[]>(
      'projects',
      (store) => store.getAll()
    );
  }

  // ===== CLIENTS =====

  async addClient(client: Client): Promise<void> {
    await this.performOperation(
      'clients',
      (store) => store.add(client),
      'readwrite'
    );
    console.log('✅ Client added:', client.name);
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<void> {
    const existing = await this.getClient(id);
    if (!existing) throw new Error(`Client ${id} not found`);
    
    const updated = { ...existing, ...updates };
    await this.performOperation(
      'clients',
      (store) => store.put(updated),
      'readwrite'
    );
    console.log('✅ Client updated:', id);
  }

  async deleteClient(id: string): Promise<void> {
    await this.performOperation(
      'clients',
      (store) => store.delete(id),
      'readwrite'
    );
    console.log('✅ Client deleted:', id);
  }

  async getClient(id: string): Promise<Client | null> {
    const result = await this.performOperation<Client | undefined>(
      'clients',
      (store) => store.get(id)
    );
    return result || null;
  }

  async getAllClients(): Promise<Client[]> {
    return await this.performOperation<Client[]>(
      'clients',
      (store) => store.getAll()
    );
  }

  // ===== SETTINGS =====

  async updateSettings(settings: UserSettings): Promise<void> {
    await this.performOperation(
      'settings',
      (store) => store.put({ key: 'userSettings', value: settings }),
      'readwrite'
    );
    console.log('✅ Settings updated');
  }

  async getSettings(): Promise<UserSettings | null> {
    const result = await this.performOperation<{value: UserSettings} | undefined>(
      'settings',
      (store) => store.get('userSettings')
    );
    return result?.value || null;
  }

  // ===== SYNC METADATA =====

  async updateSyncMetadata(metadata: { lastSync: string; version: number; deviceId: string }): Promise<void> {
    await this.performOperation(
      'syncMetadata',
      (store) => store.put({ id: 'sync', ...metadata }),
      'readwrite'
    );
  }

  async getSyncMetadata(): Promise<{ lastSync: string; version: number; deviceId: string } | null> {
    const result = await this.performOperation<any>(
      'syncMetadata',
      (store) => store.get('sync')
    );
    return result || null;
  }

  // ===== UTILITY METHODS =====

  /**
   * Export all data for backup/transfer
   */
  async exportAllData(): Promise<DatabaseSchema> {
    const [timeEntries, projects, clients, settings, syncMetadata] = await Promise.all([
      this.getAllTimeEntries(),
      this.getAllProjects(),
      this.getAllClients(),
      this.getSettings(),
      this.getSyncMetadata()
    ]);

    return {
      timeEntries,
      projects,
      clients,
      settings: settings || {} as UserSettings,
      syncMetadata: syncMetadata || { lastSync: '', version: 1, deviceId: crypto.randomUUID() }
    };
  }

  /**
   * Import data from backup
   */
  async importData(data: Partial<DatabaseSchema>): Promise<void> {
    const transaction = this.db!.transaction(this.stores, 'readwrite');

    try {
      if (data.timeEntries) {
        const timeEntriesStore = transaction.objectStore('timeEntries');
        for (const entry of data.timeEntries) {
          await new Promise((resolve, reject) => {
            const request = timeEntriesStore.put(entry);
            request.onsuccess = () => resolve(undefined);
            request.onerror = () => reject(request.error);
          });
        }
      }

      if (data.projects) {
        const projectsStore = transaction.objectStore('projects');
        for (const project of data.projects) {
          await new Promise((resolve, reject) => {
            const request = projectsStore.put(project);
            request.onsuccess = () => resolve(undefined);
            request.onerror = () => reject(request.error);
          });
        }
      }

      if (data.clients) {
        const clientsStore = transaction.objectStore('clients');
        for (const client of data.clients) {
          await new Promise((resolve, reject) => {
            const request = clientsStore.put(client);
            request.onsuccess = () => resolve(undefined);
            request.onerror = () => reject(request.error);
          });
        }
      }

      console.log('✅ Data import completed');
    } catch (error) {
      console.error('❌ Data import failed:', error);
      throw error;
    }
  }

  /**
   * Clear all data (for privacy/GDPR compliance)
   */
  async clearAllData(): Promise<void> {
    const transaction = this.db!.transaction(this.stores, 'readwrite');
    
    for (const storeName of this.stores) {
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }
    
    console.log('✅ All data cleared');
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    timeEntries: number;
    projects: number;
    clients: number;
    dbSize: string;
  }> {
    const [timeEntries, projects, clients] = await Promise.all([
      this.getAllTimeEntries(),
      this.getAllProjects(),
      this.getAllClients()
    ]);

    // Estimate database size
    const dataSize = JSON.stringify({ timeEntries, projects, clients }).length;
    const dbSize = `${(dataSize / 1024).toFixed(2)} KB`;

    return {
      timeEntries: timeEntries.length,
      projects: projects.length,
      clients: clients.length,
      dbSize
    };
  }
}

// Singleton instance
export const timeBeaconDB = new TimeBeaconDatabase();