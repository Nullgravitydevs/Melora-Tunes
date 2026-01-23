import { PlayableTrack } from './types';

const HISTORY_KEY = 'melora_history';
const MAX_HISTORY = 50;

export interface HistoryItem {
    id: string;
    track: PlayableTrack;
    playedAt: number;
}

export const HistoryStore = {
    getHistory: (): HistoryItem[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Failed to load history", e);
            return [];
        }
    },

    addToHistory: (track: PlayableTrack) => {
        if (typeof window === 'undefined') return;
        try {
            const history = HistoryStore.getHistory();

            // Remove if existing (to bump to top)
            const filtered = history.filter(h => h.track.id !== track.id);

            // Add new
            const newItem: HistoryItem = {
                id: `${track.id}-${Date.now()}`,
                track,
                playedAt: Date.now()
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
    }
};
