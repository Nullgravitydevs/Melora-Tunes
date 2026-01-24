import { PlayableTrack, isPlayableTrack } from './types';

const HISTORY_KEY = 'melora_history';
const MAX_HISTORY = 50;

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
}

export const HistoryStore = {
    getHistory: (): HistoryItem[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (!raw) return [];

            const parsed = JSON.parse(raw);

            // Rule 3: Legacy Data Normalization (On Read)
            // If data looks wrong, normalize it instantly
            const normalized = parsed.map((item: any) => {
                // Ensure track shape is PlayableTrack
                let track = item.track;
                if (!track) return null;

                // Handle raw song vs PlayableTrack
                if (!('song' in track) && ('name' in track || 'id' in track)) {
                    track = { song: track, id: track.id, preferredQuality: '320' };
                }

                return {
                    id: track.id, // Enforce Stable ID (Rule 1)
                    track: track,
                    playedAt: item.playedAt || Date.now(),
                    lastPosition: item.lastPosition || 0,
                    itemType: item.itemType || 'song',
                    context: item.context || { source: 'discovery' }
                };
            }).filter(Boolean);

            return normalized;
        } catch (e) {
            console.error("Failed to load history", e);
            return [];
        }
    },

    addToHistory: (track: PlayableTrack, context: HistoryItem['context'] = { source: 'discovery' }) => {
        if (typeof window === 'undefined') return;
        try {
            const history = HistoryStore.getHistory();

            // Rule 4: Deduplication Logic (Strict + Fuzzy)
            const normalize = (str: string) => str?.toLowerCase().split('(')[0].replace(/[^a-z0-9]/g, '') || '';
            const targetKey = normalize(track.song.name) + normalize(track.song.primaryArtists);

            // Remove existing instances to bump (Rule 4)
            const filtered = history.filter(h => {
                const hName = h.track.song.name || "";
                const hArtist = h.track.song.primaryArtists || "";
                const hKey = normalize(hName) + normalize(hArtist);

                return h.id !== track.id && hKey !== targetKey;
            });

            // Add new with Stable ID
            const newItem: HistoryItem = {
                id: track.id, // Stable Identity
                track,
                playedAt: Date.now(),
                lastPosition: 0,
                itemType: 'song',
                context // Rule 5: Context persistence
            };

            const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

            // Dispatch event for UI updates
            window.dispatchEvent(new Event('melora-history-update'));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    },

    clearHistory: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(HISTORY_KEY);
        window.dispatchEvent(new Event('melora-history-update'));
    },

    // Update playback position for a track (for resume)
    updatePosition: (trackId: string, position: number) => {
        if (typeof window === 'undefined') return;
        try {
            const history = HistoryStore.getHistory();
            const updated = history.map(h => {
                if (h.id === trackId) {
                    return { ...h, lastPosition: Math.floor(position) };
                }
                return h;
            });
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to update position", e);
        }
    },

    // Get last position for a track
    getPosition: (trackId: string): number => {
        const history = HistoryStore.getHistory();
        const item = history.find(h => h.id === trackId);
        return item?.lastPosition || 0;
    }
};
