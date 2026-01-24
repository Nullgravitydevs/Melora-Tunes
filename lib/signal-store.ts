import { PlayableTrack, isPlayableTrack } from './types';

const SIGNAL_KEY = 'melora_signals';
const MAX_SIGNALS = 500; // Keep extensive history for learning

// Weight Defs
export const WEIGHTS = {
    PLAY: 1.0,      // Verified listen > 10s
    LIKE: 5.0,      // Explicit like
    SKIP: -2.0,     // Instant skip < 10s
    CLICK: 0.1,     // Search Curiosity
    REPEAT: 2.0     // Back-to-back replay
};

export interface SignalItem {
    id: string; // songId
    weight: number;
    timestamp: number;
    sessionId: string; // Grouping ID (30m window)
    context: string;
}

export const SignalStore = {
    getSignals: (): SignalItem[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(SIGNAL_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    },

    // Session Management (30m window)
    getSessionId: () => {
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

    addSignal: (track: PlayableTrack, type: keyof typeof WEIGHTS, context: string = 'discovery') => {
        if (typeof window === 'undefined') return;

        const signals = SignalStore.getSignals();
        const sessionId = SignalStore.getSessionId();
        const songId = track.id;

        // Spam Protection: 
        // If we already have a STRONG signal (Like/Play) for this song in this SESSION, 
        // don't add another Play signal.
        const existingInSession = signals.find(s => s.id === songId && s.sessionId === sessionId);

        const newWeight = WEIGHTS[type];

        // Rules:
        if (existingInSession) {
            // 1. If existing is PLAY/CLICK, and new is LIKE -> Upgrade it
            // 2. If existing is PLAY, and new is PLAY -> Ignore (Spam)
            // 3. If existing is SKIP, and new is PLAY -> Overwrite (Changed mind)

            if (type === 'PLAY' && existingInSession.weight >= 1.0) {
                return; // Ignore repeated plays in same session (Spam)
            }

            // Cumulative or Max? Let's use Max wins logic for stability
            if (newWeight > existingInSession.weight) {
                existingInSession.weight = newWeight;
                // Update storage
                localStorage.setItem(SIGNAL_KEY, JSON.stringify(signals));
                return;
            }
        }

        const newSignal: SignalItem = {
            id: songId,
            weight: newWeight,
            timestamp: Date.now(),
            sessionId,
            context
        };

        // Keep last MAX_SIGNALS
        const updated = [newSignal, ...signals].slice(0, MAX_SIGNALS);
        localStorage.setItem(SIGNAL_KEY, JSON.stringify(updated));
    },

    // Get Top Favorite IDs
    getTopTaste: (limit = 20): string[] => {
        const signals = SignalStore.getSignals();
        const scores = new Map<string, number>();

        signals.forEach(s => {
            const current = scores.get(s.id) || 0;
            // Decay older signals? Maybe later.
            scores.set(s.id, current + s.weight);
        });

        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1]) // High score first
            .slice(0, limit)
            .map(e => e[0]);
    }
};
