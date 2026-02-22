import { AudioAnalysisResult } from './audio-analysis';

export interface TrackMetadata extends AudioAnalysisResult {
    songId: string;
    analyzedAt: number;
}

const DB_NAME = 'MeloraMetadataDB';
const STORE_NAME = 'track_metadata';
const DB_VERSION = 1;

class MetadataDB {
    private db: IDBDatabase | null = null;

    private async open(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'songId' });
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

    async saveMetadata(songId: string, result: AudioAnalysisResult): Promise<void> {
        try {
            const db = await this.open();
            const record: TrackMetadata = {
                songId,
                ...result,
                analyzedAt: Date.now()
            };

            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(record);

                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            console.error('[MetadataDB] Save failed', error);
        }
    }

    async getMetadata(songId: string): Promise<TrackMetadata | null> {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(songId);

                req.onsuccess = () => resolve((req.result as TrackMetadata) || null);
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            console.error('[MetadataDB] Get failed', error);
            return null;
        }
    }
}

export const MetadataStore = new MetadataDB();
