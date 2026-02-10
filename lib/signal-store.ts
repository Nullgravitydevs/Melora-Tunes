
import { PlayableTrack } from './types';
import { safeSetItem } from './safe-storage';

const SIGNAL_KEY = 'melora_signals';
const ARTIST_SIGNAL_KEY = 'melora_artist_signals';
const MAX_SIGNALS = 1000; // Increased history size

// --- WEIGHTS ---
// Explicit > Implicit
export const WEIGHTS = {
    LIKE: 5.0,        // Strongest Positive
    REPEAT: 3.0,      // Strong Positive
    PLAY: 1.0,        // Verified listen (> 30s)
    CLICK: 0.1,       // Weak Interest
    SKIP_LATE: -0.5,  // Weak Negative (> 10s < 30s)
    SKIP_EARLY: -2.0  // Strong Negative (< 10s)
};

export type SignalType = keyof typeof WEIGHTS;

export interface SignalItem {
    id: string; // songId
    weight: number;
    timestamp: number;
    sessionId: string;
    context: string;
}

export interface ArtistSignalItem {
    artist: string;
    weight: number;
    timestamp: number;
}

// --- HELPERS ---

// 7-Day Half-Life Decay
function decay(weight: number, timestamp: number): number {
    const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    const halfLife = weight < 0 ? 3 : 7; // Negatives decay faster (3 days) vs Positives (7 days)
    return weight * Math.pow(0.5, ageDays / halfLife);
}

export const SignalStore = {
    // --- State Access ---
    getSignals: (): SignalItem[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(SIGNAL_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    },

    getArtistSignals: (): ArtistSignalItem[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(ARTIST_SIGNAL_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    },

    // Session Management (30m window)
    getSessionId: () => {
        if (typeof window === 'undefined') return 'init_session';
        const now = Date.now();
        const lastSession = parseInt(localStorage.getItem('melora_session_ts') || '0');
        let sessionId = localStorage.getItem('melora_session_id');

        if (!sessionId || (now - lastSession > 30 * 60 * 1000)) {
            sessionId = `sess_${now}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem('melora_session_id', sessionId);
        }
        localStorage.setItem('melora_session_ts', now.toString());
        return sessionId;
    },

    // --- Core Action ---
    addSignal: (track: PlayableTrack, type: 'LIKE' | 'PLAY' | 'SKIP' | 'CLICK' | 'REPEAT', context: string = 'discovery', durationPlayed = 0) => {
        if (typeof window === 'undefined') return;

        const signals = SignalStore.getSignals();
        const artistSignals = SignalStore.getArtistSignals();
        const sessionId = SignalStore.getSessionId();
        const songId = track.id; // Use Stable ID

        // 1. Determine Weight Logic
        let weight = 0;
        let finalType = type;

        if (type === 'SKIP') {
            // Smart Skip Logic
            if (durationPlayed < 10) {
                weight = WEIGHTS.SKIP_EARLY;
                finalType = 'SKIP_EARLY' as any;
            } else if (durationPlayed < 30) {
                weight = WEIGHTS.SKIP_LATE;
                finalType = 'SKIP_LATE' as any;
            } else {
                // If skipped after 30s, it's effectively a "Partial Play", not a penalty
                // Or neutral? Let's ignore late skips to avoid penalizing sampling.
                return;
            }
        } else {
            weight = WEIGHTS[type as keyof typeof WEIGHTS] || 0;
        }

        // 2. Repeat Detection (Auto-Signal)
        // Check if last signal was same song in same session (PLAY -> PLAY)
        const lastSignal = signals[0]; // Most recent
        if (type === 'PLAY' && lastSignal && lastSignal.id === songId && lastSignal.sessionId === sessionId) {
            // User played same song back-to-back?
            // Upgrade to REPEAT
            weight = WEIGHTS.REPEAT;
            finalType = 'REPEAT';
        }

        const newSignal: SignalItem = {
            id: songId,
            weight,
            timestamp: Date.now(),
            sessionId,
            context
        };

        // 3. Artist Aggregation
        // Extract primary artist (simple first-match logic for now)
        const primaryArtist = track.artist.split(',')[0].split('&')[0].trim();
        if (primaryArtist) {
            const artistSignal: ArtistSignalItem = {
                artist: primaryArtist,
                weight: weight * 0.5, // Artist signal contributes 50% of track weight
                timestamp: Date.now()
            };
            // Append and prune
            const updatedArtists = [artistSignal, ...artistSignals].slice(0, MAX_SIGNALS);
            safeSetItem(ARTIST_SIGNAL_KEY, JSON.stringify(updatedArtists));
        }

        // 4. Update Store
        const updated = [newSignal, ...signals].slice(0, MAX_SIGNALS);
        safeSetItem(SIGNAL_KEY, JSON.stringify(updated));
    },

    // --- Analytics / Ranking ---

    // Get Top Favorite IDs (with Time Decay + Session Boost)
    getTopTaste: (limit = 20): string[] => {
        const signals = SignalStore.getSignals();
        const currentSession = SignalStore.getSessionId();
        const scores = new Map<string, number>();

        signals.forEach(s => {
            // 1. Decay
            let score = decay(s.weight, s.timestamp);

            // 2. Session Boost (+30%)
            if (s.sessionId === currentSession) {
                score *= 1.3;
            }

            const current = scores.get(s.id) || 0;
            scores.set(s.id, current + score);
        });

        return Array.from(scores.entries())
            .filter(([, score]) => score > 0) // Only positive affinity
            .sort((a, b) => b[1] - a[1]) // High score first
            .slice(0, limit)
            .map(e => e[0]);
    },

    // Get Top Artists
    getTopArtists: (limit = 10): string[] => {
        const stats = SignalStore.getArtistSignals();
        const scores = new Map<string, number>();

        stats.forEach(s => {
            const score = decay(s.weight, s.timestamp);
            const current = scores.get(s.artist) || 0;
            scores.set(s.artist, current + score);
        });

        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(e => e[0]);
    }
};
