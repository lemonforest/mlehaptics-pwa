/**
 * IndexedDB Service
 * Base service for managing IndexedDB operations
 * Handles database initialization, version management, and CRUD operations
 */

const DB_NAME = 'mlehaptics-pwa-db';
const DB_VERSION = 1;

// Object store names
export const STORE_NAMES = {
  PWA_SETTINGS: 'pwa-settings',
  DEVICE_PRESETS: 'device-presets',
} as const;

export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database and create object stores
   */
  async init(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB upgrade needed, creating object stores...');

        // Create PWA Settings store (singleton)
        if (!db.objectStoreNames.contains(STORE_NAMES.PWA_SETTINGS)) {
          db.createObjectStore(STORE_NAMES.PWA_SETTINGS, { keyPath: 'id' });
          console.log('Created object store:', STORE_NAMES.PWA_SETTINGS);
        }

        // Create Device Presets store (collection)
        if (!db.objectStoreNames.contains(STORE_NAMES.DEVICE_PRESETS)) {
          db.createObjectStore(STORE_NAMES.DEVICE_PRESETS, { keyPath: 'id' });
          console.log('Created object store:', STORE_NAMES.DEVICE_PRESETS);
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInit(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Get a single item from a store
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error(`Failed to get item from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Put (insert or update) an item in a store
   */
  async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`Failed to put item in ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error(`Failed to get all items from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete an item from a store
   */
  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`Failed to delete item from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all items from a store
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`Failed to clear ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if IndexedDB is available
   */
  static isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Singleton instance
export const indexedDBService = new IndexedDBService();
