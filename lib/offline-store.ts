import { JioSaavnSong } from './jiosaavn';
import { AudioQuality } from './types';

export interface OfflineSong {
    id: string; // Composite key: songId_quality
    songId: string;
    quality: AudioQuality;
    blob: Blob;
    metadata: JioSaavnSong;
    savedAt: number;
}

const DB_NAME = 'MeloraOfflineDB';
const STORE_NAME = 'offline_songs';
const DB_VERSION = 2; // Bump version for schema change

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
                // If upgrading, clear old store to avoid schema mismatch or migrate
                // For simplicity in this refactor, we recreate.
                if (db.objectStoreNames.contains(STORE_NAME)) {
                    db.deleteObjectStore(STORE_NAME);
                }
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                // Index to find all qualities for a song
                store.createIndex('songId', 'songId', { unique: false });
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

    private getCompositeId(songId: string, quality: AudioQuality): string {
        return `${songId}_${quality}`;
    }

    async saveSong(song: JioSaavnSong, url: string, quality: AudioQuality): Promise<void> {
        try {
            // Fetch blob
            const response = await fetch(url);
            const blob = await response.blob();

            const record: OfflineSong = {
                id: this.getCompositeId(song.id, quality),
                songId: song.id,
                quality,
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

    async getSongUrl(songId: string, quality: AudioQuality): Promise<string | null> {
        try {
            const db = await this.open();
            const id = this.getCompositeId(songId, quality);
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(id);

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

    async isDownloaded(songId: string, quality?: AudioQuality): Promise<boolean> {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);

                if (quality) {
                    const id = this.getCompositeId(songId, quality);
                    const req = store.count(id);
                    req.onsuccess = () => resolve(req.result > 0);
                    req.onerror = () => reject(req.error);
                } else {
                    // Check if ANY quality exists
                    const index = store.index('songId');
                    const req = index.count(songId);
                    req.onsuccess = () => resolve(req.result > 0);
                    req.onerror = () => reject(req.error);
                }
            });
        } catch {
            return false;
        }
    }

    async removeSong(songId: string, quality?: AudioQuality): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            if (quality) {
                // Remove specific variant
                const id = this.getCompositeId(songId, quality);
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            } else {
                // Remove ALL variants for this song
                const index = store.index('songId');
                const req = index.getAllKeys(songId);

                req.onsuccess = () => {
                    const keys = req.result;
                    if (keys.length === 0) {
                        resolve();
                        return;
                    }
                    // Delete each key
                    // Note: We can't batch delete comfortably in standard IDB without cursor or multiple requests
                    let count = 0;
                    keys.forEach(key => {
                        store.delete(key).onsuccess = () => {
                            count++;
                            if (count === keys.length) resolve();
                        };
                    });
                };
                req.onerror = () => reject(req.error);
            }
        });
    }



    /**
     * Returns a map of songId -> List of downloaded qualities.
     * Efficient for hydrating UI state.
     */
    async getDownloadedState(): Promise<Record<string, AudioQuality[]>> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            // We can optimize by using keys only if needed, but getAll is fine for now
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();

            req.onsuccess = () => {
                const records = req.result as OfflineSong[];
                const state: Record<string, AudioQuality[]> = {};

                records.forEach(r => {
                    if (!state[r.songId]) state[r.songId] = [];
                    state[r.songId].push(r.quality);
                });

                resolve(state);
            };
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Returns unique songs (deduplicated by songId)
     * For UI display of "Downloaded Songs"
     */
    async getAllDownloadedSongs(): Promise<JioSaavnSong[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();

            req.onsuccess = () => {
                const records = req.result as OfflineSong[];
                // Deduplicate by songId, taking the first one found
                const map = new Map<string, JioSaavnSong>();
                records.forEach(r => {
                    if (!map.has(r.songId)) {
                        map.set(r.songId, r.metadata);
                    }
                });
                resolve(Array.from(map.values()));
            };
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Revokes an Object URL to free memory.
     * Should be called when the song finishes playing or is skipped.
     */
    revokeUrl(url: string) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
}

export const OfflineStore = new OfflineDB();

