import { PlayableTrack } from './types';
import { db } from './indexed-db';

const MAX_HISTORY = 500;  // Upgraded from 50
const STORE_NAME = 'history';

export interface HistoryItem {
    id: string; // STRICTLY track.id (Stable Identity)
    track: PlayableTrack;
    playedAt: number;
    lastPosition?: number; // Seconds into the track
    itemType?: 'song' | 'album' | 'playlist'; // For navigation
    context?: {
        source: 'discovery' | 'playlist' | 'album' | 'search' | 'offline';
        id?: string; // playlist/album id
    };
    preferredQuality?: string; // Persisted Preference
}

class HistoryStoreClass {
    private cache: HistoryItem[] = [];
    private initialized = false;

    constructor() { }

    async init() {
        if (this.initialized) return;
        try {
            if (typeof window === 'undefined') return;

            // 1. Load from IDB
            const allItems = await db.getAll<HistoryItem>(STORE_NAME);

            // 2. Sort by playedAt desc
            this.cache = allItems.sort((a, b) => b.playedAt - a.playedAt);

            // 3. Prune if needed (keep top 500)
            if (this.cache.length > MAX_HISTORY) {
                const toDelete = this.cache.slice(MAX_HISTORY);
                this.cache = this.cache.slice(0, MAX_HISTORY);
                // Async clean
                toDelete.forEach(item => db.delete(STORE_NAME, item.id).catch(console.error));
            }

            this.initialized = true;
            console.log(`[HistoryStore] Initialized with ${this.cache.length} items`);
            window.dispatchEvent(new Event('melora-history-update'));
        } catch (e) {
            console.error("Failed to init history", e);
            // Fallback: Cache is empty
        }
    }

    getHistory(): HistoryItem[] {
        return this.cache;
    }

    addToHistory(track: PlayableTrack, context: HistoryItem['context'] = { source: 'discovery' }) {
        if (typeof window === 'undefined') return;

        // Optimistic Update (RAM)
        const newItem: HistoryItem = {
            id: track.id,
            track,
            playedAt: Date.now(),
            lastPosition: 0,
            itemType: 'song',
            context,
            preferredQuality: track.preferredQuality // Key for Loophole Fix
        };

        // Remove existing (Dedupe / Last Played Wins)
        this.cache = this.cache.filter(h => h.id !== track.id);

        // Add to top
        this.cache.unshift(newItem);

        // Cap limit
        if (this.cache.length > MAX_HISTORY) {
            const removed = this.cache.pop();
            if (removed) db.delete(STORE_NAME, removed.id).catch(() => { });
        }

        // Notify UI
        window.dispatchEvent(new Event('melora-history-update'));

        // Async Persist
        db.put(STORE_NAME, newItem).catch(e => console.error("History save failed", e));
    }

    clearHistory() {
        this.cache = [];
        window.dispatchEvent(new Event('melora-history-update'));
        db.clear(STORE_NAME).catch(console.error);
    }

    updatePosition(trackId: string, position: number) {
        const item = this.cache.find(h => h.id === trackId);
        if (item) {
            item.lastPosition = Math.floor(position);
            // Debounce save? IDB might be okay with frequent writes if small
            // but let's just save for resume functionality
            db.put(STORE_NAME, item).catch(() => { });
        }
    }

    getPosition(trackId: string): number {
        return this.cache.find(h => h.id === trackId)?.lastPosition || 0;
    }
}

export const HistoryStore = new HistoryStoreClass();
