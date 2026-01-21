import { JioSaavnSong } from './jiosaavn';

export interface OfflineSong {
    id: string;
    blob: Blob;
    metadata: JioSaavnSong;
    savedAt: number;
}

const DB_NAME = 'MeloraOfflineDB';
const STORE_NAME = 'offline_songs';
const DB_VERSION = 1;

/**
 * Vanilla IndexedDB Wrapper (No NPM dependencies)
 */
class OfflineDB {
    private db: IDBDatabase | null = null;

    private async open(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    }

    async saveSong(song: JioSaavnSong, audioUrl: string): Promise<void> {
        try {
            // Fetch blob
            const response = await fetch(audioUrl);
            const blob = await response.blob();

            const record: OfflineSong = {
                id: song.id,
                blob,
                metadata: song,
                savedAt: Date.now()
            };

            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(record);

                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            console.error('[OfflineDB] Save failed', error);
            throw error;
        }
    }

    async getSongUrl(songId: string): Promise<string | null> {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(songId);

                req.onsuccess = () => {
                    const record = req.result as OfflineSong;
                    if (record && record.blob) {
                        resolve(URL.createObjectURL(record.blob));
                    } else {
                        resolve(null);
                    }
                };
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            return null;
        }
    }

    async isDownloaded(songId: string): Promise<boolean> {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.count(songId);

                req.onsuccess = () => resolve(req.result > 0);
                req.onerror = () => reject(req.error);
            });
        } catch {
            return false;
        }
    }

    async removeSong(songId: string): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(songId);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async getAllDownloadedSongs(): Promise<JioSaavnSong[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();

            req.onsuccess = () => {
                const records = req.result as OfflineSong[];
                resolve(records.map(r => r.metadata));
            };
            req.onerror = () => reject(req.error);
        });
    }
}

export const OfflineStore = new OfflineDB();
