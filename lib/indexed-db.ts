/**
 * Lightweight IndexedDB Wrapper for Melora
 * Handles 'melora-db' and 'history' store.
 */

const DB_NAME = 'melora-db'; // Updated name
const DB_VERSION = 1;
const STORE_HISTORY = 'history';

interface DBConfig {
    name: string;
    version: number;
    stores: string[];
}

class IndexedDBWrapper {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() { }

    async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_HISTORY)) {
                    // KeyPath 'id' ensures deduplication by Song ID if we choose,
                    // or we can use a generated ID.
                    // User wants "Last Played Wins" per song -> KeyPath should be `id` (PlayableTrack.id)
                    db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
                }
            };
        });

        return this.initPromise;
    }

    async getAll<T>(storeName: string): Promise<T[]> {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async put<T>(storeName: string, item: T): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(item); // PUT overwrites if key exists (Last Played Wins!)
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName: string, key: string | number): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName: string): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const db = new IndexedDBWrapper();
