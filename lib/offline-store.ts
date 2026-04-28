import { JioSaavnSong, getLyricsWithFallback } from './jiosaavn';
import { AudioQuality } from './types';

export interface OfflineSong {
    id: string; // Composite key: songId_quality
    songId: string;
    quality: AudioQuality;
    blob: Blob;
    metadata: JioSaavnSong;
    savedAt: number;
    downloadedAt?: number;
    fileSize?: number;
    qualityLabel?: string;
}

const DB_NAME = 'MeloraOfflineDB';
const STORE_NAME = 'offline_songs';
const HISTORY_STORE_NAME = 'download_history';
const DB_VERSION = 3; // Bump version for history store

export interface DownloadHistoryEntry {
    id?: number;
    songId: string;
    name: string;
    artist: string;
    quality: AudioQuality;
    size: number;
    status: 'success' | 'failed' | 'retried';
    timestamp: number;
    error?: string;
    source: string; // e.g. 'Tidal', 'JioSaavn'
    metadataString?: string;
}

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
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('songId', 'songId', { unique: false });
                }

                if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                    const historyStore = db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('songId', 'songId', { unique: false });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
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

    private getCompositeId(songId: string, quality: AudioQuality): string {
        return `${songId}_${quality}`;
    }

    async saveSong(song: JioSaavnSong, urlOrBlob: string | Blob, quality: AudioQuality, onProgress?: (loaded: number, total: number) => void): Promise<void> {
        try {
            // 1. Quota Check
            if (navigator.storage && navigator.storage.estimate) {
                const { quota, usage } = await navigator.storage.estimate();
                if (quota !== undefined && usage !== undefined) {
                    const remaining = quota - usage;
                    const estimatedSize = (quality === 'flac' || quality === 'hires') ? 40 * 1024 * 1024 : 10 * 1024 * 1024;
                    if (remaining < estimatedSize) {
                        throw new DOMException('Not enough free space to download track.', 'QuotaExceededError');
                    }
                }
            }

            // 2. Fetch blob if string URL provided
            let blob: Blob;
            if (typeof urlOrBlob === 'string') {
                const response = await fetch(urlOrBlob);

                if (onProgress && response.body) {
                    const contentLength = response.headers.get('content-length');
                    const total = contentLength ? parseInt(contentLength, 10) : 0;
                    let loaded = 0;

                    const reader = response.body.getReader();
                    const chunks: Uint8Array[] = [];

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value) {
                            chunks.push(value);
                            loaded += value.length;
                            onProgress(loaded, total);
                        }
                    }
                    blob = new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') || 'audio/mp4' });
                } else {
                    blob = await response.blob();
                }
            } else {
                blob = urlOrBlob;
            }

            // 3. Auto-cache cover art (F25)
            let metadataToSave = JSON.parse(JSON.stringify(song)) as JioSaavnSong; // Deep clone
            try {
                if (metadataToSave.image && Array.isArray(metadataToSave.image) && metadataToSave.image.length > 0) {
                    const bestImage = metadataToSave.image[metadataToSave.image.length - 1];
                    const rawUrl = bestImage.link || (bestImage as any).url;
                    if (rawUrl && rawUrl.startsWith('http')) {
                        const imgRes = await fetch(rawUrl);
                        if (imgRes.ok) {
                            const imgBlob = await imgRes.blob();
                            const reader = new FileReader();
                            const base64data = await new Promise<string>((resolve) => {
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(imgBlob);
                            });
                            // Override all image variants to the local base64 version so offline works seamlessly
                            metadataToSave.image = metadataToSave.image.map(img => ({
                                ...img,
                                link: base64data
                            })) as any;
                        }
                    }
                }
            } catch (e) {
                console.warn('[OfflineDB] Failed to cache cover art natively', e);
            }

            // 3.5 Auto-download Lyrics (B12)
            try {
                const lyrics = await getLyricsWithFallback(song);
                if (lyrics) {
                    metadataToSave.offlineLyrics = lyrics;
                }
            } catch (e) {
                console.warn('[OfflineDB] Failed to cache lyrics softly', e);
            }

            // 4. Auto-delete lower quality clones when upgrading (F26)
            if (quality === 'flac' || quality === 'hires') {
                try {
                    await this.removeSong(song.id, '320');
                    await this.removeSong(song.id, '160');
                    await this.removeSong(song.id, '96');
                } catch { /* ignore */ }
            }

            // 5. Determine quality label
            let actualQuality = quality;
            // FAKE HIRES PROTECTION: 
            // If the blob is smaller than 10MB (approx 3-minute 320kbps is ~7.2MB), 
            // it's highly likely a lossy proxy fallback that shouldn't get the premium FLAC/Hi-Res badge.
            if ((quality === 'hires' || quality === 'flac') && blob.size < 12 * 1024 * 1024) {
                console.warn(`[OfflineDB] Down-badging ${quality} track (${blob.size} bytes) to 320kbps. Likely a proxy fallback.`);
                actualQuality = '320';
            }

            let qualityLabel = 'Standard';
            if (actualQuality === 'hires') qualityLabel = 'Hi-Res Lossless';
            else if (actualQuality === 'flac') qualityLabel = 'Lossless (FLAC)';
            else if (actualQuality === '320') qualityLabel = 'High Quality (320kbps)';
            else if (actualQuality === '160') qualityLabel = 'Standard (160kbps)';
            else if (actualQuality === '96') qualityLabel = 'Data Saver (96kbps)';

            const record: OfflineSong = {
                id: this.getCompositeId(song.id, actualQuality),
                songId: song.id,
                quality: actualQuality,
                blob,
                metadata: metadataToSave,
                savedAt: Date.now(),
                downloadedAt: Date.now(),
                fileSize: blob.size,
                qualityLabel
            };

            const db = await this.open();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(record);

                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });

            // 4. Record History
            await this.recordHistoryEntry({
                songId: song.id,
                name: song.name,
                artist: song.primaryArtists || 'Unknown',
                quality,
                size: blob.size,
                status: 'success',
                timestamp: Date.now(),
                source: (quality === 'hires' || quality === 'flac') ? 'Audiophile' : 'JioSaavn',
                metadataString: JSON.stringify(song)
            });
        } catch (error) {
            console.error('[OfflineDB] Save failed', error);
            // Log failure to history if possible
            try {
                await this.recordHistoryEntry({
                    songId: song.id,
                    name: song.name,
                    artist: song.primaryArtists || 'Unknown',
                    quality,
                    size: 0,
                    status: 'failed',
                    timestamp: Date.now(),
                    error: String(error),
                    source: (quality === 'hires' || quality === 'flac') ? 'Audiophile' : 'JioSaavn',
                    metadataString: JSON.stringify(song)
                });
            } catch { /* ignore log error */ }
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
     * Uses a cursor to read only key fields, NOT full blobs.
     */
    async getDownloadedState(): Promise<Record<string, AudioQuality[]>> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const state: Record<string, AudioQuality[]> = {};

            // Use a cursor to read only songId + quality without loading blobs
            const req = store.openCursor();

            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    const record = cursor.value as OfflineSong;
                    if (!state[record.songId]) state[record.songId] = [];
                    state[record.songId].push(record.quality);
                    cursor.continue();
                } else {
                    // Done iterating
                    resolve(state);
                }
            };
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Returns unique songs (deduplicated by songId)
     * For UI display of "Downloaded Songs"
     */
    async getAllDownloadedSongs(): Promise<JioSaavnSong[]> {
        const records = await this.getAllDownloadedDetails();
        return records.map(r => r.metadata);
    }

    /**
     * Returns full offline song details (for UI displaying quality, sizes, etc)
     */
    async getAllDownloadedDetails(): Promise<OfflineSong[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();

            req.onsuccess = () => {
                const records = req.result as OfflineSong[];
                // Deduplicate by songId, taking the highest quality (or first found)
                const map = new Map<string, OfflineSong>();
                records.forEach(r => {
                    if (!map.has(r.songId)) {
                        map.set(r.songId, r);
                    } else {
                        // Could add logic here to prefer 'flac' over '320' if multiple downloaded
                        // For now just keep first
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

    // --- History Store ---

    async recordHistoryEntry(entry: DownloadHistoryEntry): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
            const store = tx.objectStore(HISTORY_STORE_NAME);
            const req = store.add(entry);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async getHistory(): Promise<DownloadHistoryEntry[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, 'readonly');
            const store = tx.objectStore(HISTORY_STORE_NAME);
            const index = store.index('timestamp');
            const req = index.getAll(); // Will be sorted by timestamp if we use a cursor or if the index handles it

            req.onsuccess = () => {
                const records = req.result as DownloadHistoryEntry[];
                // Return reversed to show latest first
                resolve(records.sort((a, b) => b.timestamp - a.timestamp));
            };
            req.onerror = () => reject(req.error);
        });
    }

    async clearHistory(): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
            const store = tx.objectStore(HISTORY_STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // --- Storage Stats ---

    async getStorageStats(): Promise<{
        totalBytes: number;
        count: number;
        byQuality: Record<AudioQuality, { bytes: number, count: number }>;
        quota?: number;
        usage?: number;
    }> {
        const db = await this.open();
        const stats = {
            totalBytes: 0,
            count: 0,
            byQuality: {} as Record<AudioQuality, { bytes: number, count: number }>
        };

        const qualities: AudioQuality[] = ['hires', 'flac', '320', '160', '96'];
        qualities.forEach(q => {
            stats.byQuality[q] = { bytes: 0, count: 0 };
        });

        const records = await new Promise<OfflineSong[]>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result as OfflineSong[]);
            req.onerror = () => reject(req.error);
        });

        records.forEach(r => {
            stats.totalBytes += r.fileSize || 0;
            stats.count += 1;
            if (stats.byQuality[r.quality]) {
                stats.byQuality[r.quality].bytes += r.fileSize || 0;
                stats.byQuality[r.quality].count += 1;
            }
        });

        let quota, usage;
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            quota = estimate.quota;
            usage = estimate.usage;
        }

        return { ...stats, quota, usage };
    }
}

export const OfflineStore = new OfflineDB();

